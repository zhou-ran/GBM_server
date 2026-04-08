"""Step 2: Compute cellular senescence scores from gene expression."""
import numpy as np
import os
import anndata as ad
import scanpy as sc

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
H5AD_PATH = os.path.join(DATA_DIR, 'AllSample_obj.h5ad')
OUT_DIR = os.path.join(DATA_DIR, 'processed')

# Curated senescence gene set (CellAge + SenMayo core markers)
SENESCENCE_GENES = [
    # Cell cycle arrest
    'CDKN1A', 'CDKN2A', 'CDKN2B', 'TP53', 'RB1', 'CDKN1B', 'CDKN1C',
    # SASP (Senescence-Associated Secretory Phenotype)
    'IL6', 'IL8', 'CXCL8', 'IL1A', 'IL1B', 'CXCL1', 'CXCL2', 'CXCL3',
    'CCL2', 'CCL3', 'CCL5', 'MMP1', 'MMP3', 'MMP9', 'MMP10',
    'SERPINE1', 'SERPINE2', 'IGFBP3', 'IGFBP5', 'IGFBP7',
    'VEGFA', 'FGF2', 'HGF', 'AREG',
    # Senescence markers
    'GLB1', 'LMNB1', 'HMGA1', 'HMGA2',
    # DNA damage response
    'ATM', 'ATR', 'CHEK1', 'CHEK2', 'H2AFX',
    # Anti-apoptotic (senescent cells resist apoptosis)
    'BCL2', 'BCL2L1', 'MCL1',
]

CHUNK_SIZE = 50000


def run():
    print("Step 2: Computing senescence scores...")
    os.makedirs(OUT_DIR, exist_ok=True)

    adata = ad.read_h5ad(H5AD_PATH, backed='r')
    n_cells = adata.n_obs
    gene_names = list(adata.var_names)

    # Filter to genes present in the dataset
    present_genes = [g for g in SENESCENCE_GENES if g in gene_names]
    missing_genes = [g for g in SENESCENCE_GENES if g not in gene_names]
    print(f"  Senescence genes: {len(present_genes)} present, {len(missing_genes)} missing")
    if missing_genes:
        print(f"  Missing: {missing_genes[:10]}...")

    # Process in chunks to manage memory
    scores = np.zeros(n_cells, dtype=np.float32)
    n_chunks = (n_cells + CHUNK_SIZE - 1) // CHUNK_SIZE

    for i in range(n_chunks):
        start = i * CHUNK_SIZE
        end = min((i + 1) * CHUNK_SIZE, n_cells)
        print(f"  Chunk {i+1}/{n_chunks}: cells {start:,}–{end:,}")

        chunk = adata[start:end].to_memory()
        sc.pp.normalize_total(chunk, target_sum=1e4)
        sc.pp.log1p(chunk)
        sc.tl.score_genes(chunk, gene_list=present_genes, score_name='senescence_score')
        scores[start:end] = chunk.obs['senescence_score'].values.astype(np.float32)
        del chunk

    # Normalize to [0, 1]
    smin, smax = scores.min(), scores.max()
    print(f"  Raw score range: [{smin:.4f}, {smax:.4f}]")
    scores_norm = (scores - smin) / (smax - smin + 1e-8)

    scores_norm.tofile(os.path.join(OUT_DIR, 'senescence.bin'))
    print(f"  senescence.bin: {scores_norm.nbytes / 1e6:.1f} MB")

    # Binary classification: top 25% = senescent
    threshold = np.percentile(scores_norm, 75)
    is_senescent = (scores_norm >= threshold).astype(np.uint8)
    is_senescent.tofile(os.path.join(OUT_DIR, 'senescent_class.bin'))
    print(f"  Senescent cells (top 25%): {is_senescent.sum():,} / {n_cells:,}")

    adata.file.close()
    print("Step 2 complete.")


if __name__ == '__main__':
    run()
