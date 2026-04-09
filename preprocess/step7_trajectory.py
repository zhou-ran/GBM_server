"""Step 7: infer per-cell-type diffusion pseudotime and gene trends.

Outputs one full-length float32 vector per major cell type. Cells outside the
target type are encoded as NaN so clients can reuse global cell indices.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import anndata as ad
import numpy as np
import scanpy as sc


DATA_DIR = Path(__file__).resolve().parent.parent / 'data'
H5AD_PATH = DATA_DIR / 'AllSample_obj.h5ad'
OUT_DIR = DATA_DIR / 'processed'
MAX_DPT_CELLS = int(os.environ.get('MAX_DPT_CELLS', '25000'))
N_TREND_GENES = int(os.environ.get('N_TREND_GENES', '12'))
N_PSEUDOTIME_BINS = 25


def _safe_name(value: str) -> str:
    return value.replace('/', '_').replace(' ', '_')


def _choose_indices(mask: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    indices = np.flatnonzero(mask)
    if indices.size <= MAX_DPT_CELLS:
        return indices
    chosen = rng.choice(indices, size=MAX_DPT_CELLS, replace=False)
    return np.sort(chosen)


def _normalize_pseudotime(values: np.ndarray) -> np.ndarray:
    finite = np.isfinite(values)
    if not finite.any():
        return values.astype(np.float32)
    lo = float(np.nanmin(values[finite]))
    hi = float(np.nanmax(values[finite]))
    values = (values - lo) / (hi - lo + 1e-8)
    return values.astype(np.float32)


def _compute_gene_trends(adata_sub, pseudotime: np.ndarray) -> dict:
    finite = np.isfinite(pseudotime)
    if finite.sum() < 10:
        return {'genes': [], 'bins': []}

    expr = adata_sub.X
    if hasattr(expr, 'toarray'):
        expr = expr.toarray()
    expr = np.asarray(expr, dtype=np.float32)

    variances = expr[finite].var(axis=0)
    top_idx = np.argsort(variances)[-N_TREND_GENES:][::-1]
    bins = np.linspace(0, 1, N_PSEUDOTIME_BINS + 1)
    bin_centers = ((bins[:-1] + bins[1:]) / 2).astype(float).tolist()

    trends = []
    for gene_idx in top_idx:
        means = []
        for lo, hi in zip(bins[:-1], bins[1:]):
            in_bin = finite & (pseudotime >= lo) & (pseudotime <= hi)
            means.append(float(expr[in_bin, gene_idx].mean()) if in_bin.any() else None)
        trends.append({
            'gene': str(adata_sub.var_names[gene_idx]),
            'mean_expression': means,
        })

    return {'bins': bin_centers, 'genes': trends}


def _infer_subset(adata_sub, senescence_sub: np.ndarray) -> np.ndarray:
    if 'X_pca' not in adata_sub.obsm:
        sc.pp.normalize_total(adata_sub, target_sum=1e4)
        sc.pp.log1p(adata_sub)
        sc.pp.pca(adata_sub, n_comps=min(50, max(2, adata_sub.n_vars - 1)))

    sc.pp.neighbors(adata_sub, use_rep='X_pca' if 'X_pca' in adata_sub.obsm else None)
    sc.tl.diffmap(adata_sub)

    # Use the least-senescent sampled cell as the root for senescence progression.
    adata_sub.uns['iroot'] = int(np.nanargmin(senescence_sub))
    sc.tl.dpt(adata_sub, n_dcs=min(10, adata_sub.obsm['X_diffmap'].shape[1] - 1))
    return _normalize_pseudotime(adata_sub.obs['dpt_pseudotime'].to_numpy(dtype=np.float32))


def run():
    print("Step 7: Inferring diffusion pseudotime trajectories...")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    schema = json.loads((OUT_DIR / 'schema.json').read_text())
    senescence = np.fromfile(OUT_DIR / 'senescence.bin', dtype=np.float32)
    rng = np.random.default_rng(20260408)

    adata = ad.read_h5ad(H5AD_PATH, backed='r')
    try:
        celltypes = sorted(str(value) for value in adata.obs['CellType'].dropna().unique())
        for celltype in celltypes:
            print(f"  trajectory: {celltype}")
            celltype_mask = adata.obs['CellType'].astype(str).to_numpy() == celltype
            subset_indices = _choose_indices(celltype_mask, rng)
            if subset_indices.size < 50:
                print(f"    skip: only {subset_indices.size} cells")
                continue

            subset = adata[subset_indices].to_memory()
            subset_senescence = senescence[subset_indices]
            subset_pseudotime = _infer_subset(subset, subset_senescence)

            full = np.full(schema['n_cells'], np.nan, dtype=np.float32)
            full[subset_indices] = subset_pseudotime
            safe = _safe_name(celltype)
            full.tofile(OUT_DIR / f'trajectory_{safe}.bin')

            trends = _compute_gene_trends(subset, subset_pseudotime)
            trends.update({
                'celltype': celltype,
                'n_cells': int(celltype_mask.sum()),
                'n_cells_used': int(subset_indices.size),
            })
            (OUT_DIR / f'trajectory_{safe}_genes.json').write_text(json.dumps(trends, indent=2))
            print(f"    used {subset_indices.size:,} cells; trend genes: {len(trends['genes'])}")
    finally:
        adata.file.close()

    print("Step 7 complete.")


if __name__ == '__main__':
    run()
