"""Step 4: Compute centroids, patient matrix, DE results, and correlation matrix."""
import numpy as np
import json
import os
import anndata as ad
import scanpy as sc
import pandas as pd
from scipy.stats import spearmanr

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
H5AD_PATH = os.path.join(DATA_DIR, 'AllSample_obj.h5ad')
OUT_DIR = os.path.join(DATA_DIR, 'processed')


def compute_centroids():
    """Compute cluster centroids per CellType_Level2."""
    print("  Computing centroids...")
    coords = np.fromfile(os.path.join(OUT_DIR, 'coords.bin'), dtype=np.float32).reshape(-1, 2)
    senescence = np.fromfile(os.path.join(OUT_DIR, 'senescence.bin'), dtype=np.float32)

    with open(os.path.join(OUT_DIR, 'schema.json')) as f:
        schema = json.load(f)

    n_cells = schema['n_cells']
    # CellType_Level2 is the second uint8 column
    meta_bin = np.fromfile(os.path.join(OUT_DIR, 'meta.bin'), dtype=np.uint8)
    ct2_codes = meta_bin[n_cells:2*n_cells]
    ct2_names = schema['columns'][1]['categories']

    centroids = []
    for i, name in enumerate(ct2_names):
        mask = ct2_codes == i
        count = int(mask.sum())
        if count == 0:
            continue
        cx = float(coords[mask, 0].mean())
        cy = float(coords[mask, 1].mean())
        sen_mean = float(senescence[mask].mean())
        sen_std = float(senescence[mask].std())
        centroids.append({
            'name': name, 'x': round(cx, 3), 'y': round(cy, 3),
            'count': count, 'senescence_mean': round(sen_mean, 4),
            'senescence_std': round(sen_std, 4),
        })

    with open(os.path.join(OUT_DIR, 'centroids.json'), 'w') as f:
        json.dump(centroids, f, indent=2)
    print(f"    {len(centroids)} centroids written")


def compute_patient_matrix():
    """Build patient-level summary table."""
    print("  Computing patient matrix...")
    adata = ad.read_h5ad(H5AD_PATH, backed='r')
    senescence = np.fromfile(os.path.join(OUT_DIR, 'senescence.bin'), dtype=np.float32)

    obs = adata.obs[['donor_id', 'CellType', 'CellType_Level2', 'IDH', 'stage',
                      'age_Group5565', 'sex', 'age_new']].copy()
    obs['senescence'] = senescence

    # Clean IDH
    obs['IDH'] = obs['IDH'].replace({'IDH wildtype': 'WT'})

    patients = []
    for donor, grp in obs.groupby('donor_id'):
        ct_counts = grp['CellType'].value_counts().to_dict()
        patients.append({
            'donor_id': str(donor),
            'n_cells': len(grp),
            'IDH': str(grp['IDH'].mode().iloc[0]) if len(grp['IDH'].mode()) > 0 else 'unknown',
            'stage': str(grp['stage'].mode().iloc[0]) if len(grp['stage'].mode()) > 0 else 'unknown',
            'age_group': str(grp['age_Group5565'].mode().iloc[0]) if len(grp['age_Group5565'].mode()) > 0 else 'unknown',
            'sex': str(grp['sex'].mode().iloc[0]) if len(grp['sex'].mode()) > 0 else 'unknown',
            'age': int(grp['age_new'].median()) if grp['age_new'].notna().any() else -1,
            'senescence_mean': round(float(grp['senescence'].mean()), 4),
            'celltype_counts': {str(k): int(v) for k, v in ct_counts.items()},
        })

    with open(os.path.join(OUT_DIR, 'patients.json'), 'w') as f:
        json.dump(patients, f)
    print(f"    {len(patients)} patients written")
    adata.file.close()


def compute_de():
    """Differential expression: senescent vs non-senescent per cell type."""
    print("  Computing differential expression (this may take a while)...")
    adata = ad.read_h5ad(H5AD_PATH, backed='r')
    senescent_class = np.fromfile(os.path.join(OUT_DIR, 'senescent_class.bin'), dtype=np.uint8)

    celltypes = adata.obs['CellType'].unique().tolist()
    de_results = {}

    for ct in celltypes:
        print(f"    DE for {ct}...")
        mask = adata.obs['CellType'].values == ct
        idx = np.where(mask)[0]

        if len(idx) < 100:
            continue

        # Subsample if too large (max 50K per group for speed)
        sen_idx = idx[senescent_class[idx] == 1]
        non_idx = idx[senescent_class[idx] == 0]
        if len(sen_idx) > 25000:
            sen_idx = np.random.choice(sen_idx, 25000, replace=False)
        if len(non_idx) > 25000:
            non_idx = np.random.choice(non_idx, 25000, replace=False)

        sub_idx = np.concatenate([sen_idx, non_idx])
        sub_idx.sort()

        chunk = adata[sub_idx].to_memory()
        chunk.obs['group'] = ['senescent' if senescent_class[i] == 1 else 'non_senescent' for i in sub_idx]

        sc.pp.normalize_total(chunk, target_sum=1e4)
        sc.pp.log1p(chunk)
        sc.tl.rank_genes_groups(chunk, groupby='group', method='wilcoxon',
                                reference='non_senescent', n_genes=50)

        names = chunk.uns['rank_genes_groups']['names']['senescent'][:50]
        scores = chunk.uns['rank_genes_groups']['scores']['senescent'][:50]
        logfc = chunk.uns['rank_genes_groups']['logfoldchanges']['senescent'][:50]
        pvals = chunk.uns['rank_genes_groups']['pvals_adj']['senescent'][:50]

        de_results[ct] = [{
            'gene': str(names[i]),
            'score': round(float(scores[i]), 3),
            'logfc': round(float(logfc[i]), 4),
            'pval_adj': float(pvals[i]),
        } for i in range(len(names))]

        del chunk

    with open(os.path.join(OUT_DIR, 'de_results.json'), 'w') as f:
        json.dump(de_results, f)
    print(f"    DE results for {len(de_results)} cell types written")
    adata.file.close()


def compute_correlation():
    """Clinical correlation matrix at patient level."""
    print("  Computing correlation matrix...")
    with open(os.path.join(OUT_DIR, 'patients.json')) as f:
        patients = json.load(f)

    with open(os.path.join(OUT_DIR, 'schema.json')) as f:
        schema = json.load(f)

    ct_names = schema['columns'][0]['categories']  # CellType names

    rows = []
    for p in patients:
        row = {
            'age': p['age'],
            'senescence_mean': p['senescence_mean'],
            'n_cells': p['n_cells'],
        }
        total = p['n_cells']
        for ct in ct_names:
            row[f'pct_{ct}'] = p['celltype_counts'].get(ct, 0) / total if total > 0 else 0
        row['IDH_WT'] = 1 if p['IDH'] == 'WT' else 0
        row['stage_Primary'] = 1 if p['stage'] == 'Primary' else 0
        row['sex_male'] = 1 if p['sex'] == 'male' else 0
        rows.append(row)

    df = pd.DataFrame(rows)
    df = df[df['age'] > 0]

    corr_cols = [c for c in df.columns if df[c].std() > 0]
    corr_matrix = df[corr_cols].corr(method='spearman')

    result = {
        'labels': corr_cols,
        'matrix': corr_matrix.round(3).values.tolist(),
    }
    with open(os.path.join(OUT_DIR, 'correlation.json'), 'w') as f:
        json.dump(result, f)
    print(f"    {len(corr_cols)}x{len(corr_cols)} correlation matrix written")


def compute_global_stats():
    """Build global cell count statistics from schema + meta.bin."""
    print("  Computing global stats...")
    with open(os.path.join(OUT_DIR, 'schema.json')) as f:
        schema = json.load(f)

    meta = np.fromfile(os.path.join(OUT_DIR, 'meta.bin'), dtype=np.uint8)
    stats = {'total': schema['n_cells'], 'by_column': {}}

    for col in schema['columns']:
        if col.get('dtype', 'uint8') != 'uint8':
            continue
        start = col['byte_offset']
        end = start + col['byte_length']
        codes = meta[start:end]
        counts = {}
        for i, cat in enumerate(col['categories']):
            counts[cat] = int((codes == i).sum())
        stats['by_column'][col['name']] = counts

    with open(os.path.join(OUT_DIR, 'stats.json'), 'w') as f:
        json.dump(stats, f)
    print(f"    stats for {len(stats['by_column'])} columns written")


def run():
    print("Step 4: Computing statistics...")
    compute_centroids()
    compute_patient_matrix()
    compute_de()
    compute_correlation()
    compute_global_stats()
    print("Step 4 complete.")


if __name__ == '__main__':
    run()
