"""Step 8: compute a lightweight ligand-receptor communication summary.

This produces the JSON contract used by Level 4. It scores curated LR pairs by
mean ligand expression in source cell types times mean receptor expression in
target cell types. A full LIANA/CellChat workflow can replace this file while
keeping the same output schema.
"""
from __future__ import annotations

import json
from pathlib import Path

import anndata as ad
import numpy as np


DATA_DIR = Path(__file__).resolve().parent.parent / 'data'
H5AD_PATH = DATA_DIR / 'AllSample_obj.h5ad'
OUT_DIR = DATA_DIR / 'processed'
MAX_CELLS_PER_TYPE = 4000

LR_PAIRS = [
    ('IL6', 'IL6R', 'SASP'),
    ('IL6', 'IL6ST', 'SASP'),
    ('CXCL8', 'CXCR1', 'cytokine'),
    ('CXCL8', 'CXCR2', 'cytokine'),
    ('CCL2', 'CCR2', 'cytokine'),
    ('CCL5', 'CCR5', 'cytokine'),
    ('VEGFA', 'KDR', 'angiogenesis'),
    ('VEGFA', 'FLT1', 'angiogenesis'),
    ('TGFB1', 'TGFBR1', 'TGFb'),
    ('TGFB1', 'TGFBR2', 'TGFb'),
    ('AREG', 'EGFR', 'growth_factor'),
    ('HGF', 'MET', 'growth_factor'),
]


def _to_dense_float(matrix) -> np.ndarray:
    if hasattr(matrix, 'toarray'):
        matrix = matrix.toarray()
    return np.asarray(matrix, dtype=np.float32)


def run():
    print("Step 8: Computing ligand-receptor communication summary...")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(20260408)

    adata = ad.read_h5ad(H5AD_PATH, backed='r')
    try:
        genes = {str(name).upper(): index for index, name in enumerate(adata.var_names)}
        usable_pairs = [(l, r, p) for l, r, p in LR_PAIRS if l in genes and r in genes]
        celltypes = sorted(str(value) for value in adata.obs['CellType'].dropna().unique())
        means: dict[str, dict[str, float]] = {}

        for celltype in celltypes:
            mask = adata.obs['CellType'].astype(str).to_numpy() == celltype
            indices = np.flatnonzero(mask)
            if indices.size > MAX_CELLS_PER_TYPE:
                indices = np.sort(rng.choice(indices, size=MAX_CELLS_PER_TYPE, replace=False))
            pair_gene_indices = sorted({genes[l] for l, _, _ in usable_pairs} | {genes[r] for _, r, _ in usable_pairs})
            expr = _to_dense_float(adata[indices, pair_gene_indices].X)
            gene_to_local = {gene_idx: local for local, gene_idx in enumerate(pair_gene_indices)}
            means[celltype] = {
                name: float(expr[:, gene_to_local[gene_idx]].mean())
                for name, gene_idx in genes.items()
                if gene_idx in gene_to_local
            }

        edges = []
        heatmap_pairs = []
        for ligand, receptor, pathway in usable_pairs:
            pair_scores = []
            for source in celltypes:
                ligand_mean = means[source].get(ligand, 0.0)
                for target in celltypes:
                    receptor_mean = means[target].get(receptor, 0.0)
                    score = ligand_mean * receptor_mean
                    if score <= 0:
                        continue
                    pair_scores.append({
                        'source': source,
                        'target': target,
                        'score': score,
                    })
                    edges.append({
                        'source': source,
                        'target': target,
                        'ligand': ligand,
                        'receptor': receptor,
                        'pair': f'{ligand}-{receptor}',
                        'pathway': pathway,
                        'score': score,
                    })
            heatmap_pairs.append({'pair': f'{ligand}-{receptor}', 'pathway': pathway, 'scores': pair_scores})

        edges.sort(key=lambda item: item['score'], reverse=True)
        payload = {
            'nodes': [{'id': celltype, 'label': celltype} for celltype in celltypes],
            'edges': edges[:250],
            'pairs': heatmap_pairs,
        }
        (OUT_DIR / 'cellchat.json').write_text(json.dumps(payload, indent=2))
        print(f"  wrote cellchat.json: {len(payload['nodes'])} nodes, {len(payload['edges'])} top edges")
    finally:
        adata.file.close()

    print("Step 8 complete.")


if __name__ == '__main__':
    run()
