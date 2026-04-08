"""Step 1: Extract UMAP coordinates + categorical metadata from h5ad → binary files."""
import numpy as np
import json
import os
import anndata as ad

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
H5AD_PATH = os.path.join(DATA_DIR, 'AllSample_obj.h5ad')
OUT_DIR = os.path.join(DATA_DIR, 'processed')

# Metadata columns to extract and their encoding
META_COLS = [
    'CellType',        # 9 categories → uint8
    'CellType_Level2', # 17 categories → uint8
    'IDH',             # 3 categories → uint8
    'stage',           # 3 categories → uint8
    'age_Group5565',   # 3 categories → uint8
    'sex',             # 2 categories → uint8
]

# IDH cleanup: merge "WT" and "IDH wildtype" → "WT"
IDH_MAP = {'WT': 'WT', 'IDH wildtype': 'WT', 'IDH': 'IDH'}


def run():
    print("Step 1: Extracting coordinates and metadata...")
    os.makedirs(OUT_DIR, exist_ok=True)

    adata = ad.read_h5ad(H5AD_PATH, backed='r')
    n_cells = adata.n_obs
    print(f"  Loaded {n_cells:,} cells")

    # Extract UMAP coordinates
    print("  Extracting UMAP coordinates...")
    umap = np.array(adata.obsm['X_umap'], dtype=np.float32)
    umap.tofile(os.path.join(OUT_DIR, 'coords.bin'))
    print(f"  coords.bin: {umap.nbytes / 1e6:.1f} MB, range x=[{umap[:,0].min():.2f}, {umap[:,0].max():.2f}], y=[{umap[:,1].min():.2f}, {umap[:,1].max():.2f}]")

    # Extract and encode metadata
    print("  Encoding metadata...")
    schema = {'n_cells': n_cells, 'columns': [], 'umap_bounds': {
        'xmin': float(umap[:,0].min()), 'xmax': float(umap[:,0].max()),
        'ymin': float(umap[:,1].min()), 'ymax': float(umap[:,1].max()),
    }}

    meta_arrays = []
    for col in META_COLS:
        series = adata.obs[col].copy()
        # Clean IDH values
        if col == 'IDH':
            series = series.map(IDH_MAP).fillna(series)
        categories = sorted(series.unique().tolist())
        cat_to_idx = {c: i for i, c in enumerate(categories)}
        encoded = series.map(cat_to_idx).values.astype(np.uint8)
        meta_arrays.append(encoded)
        schema['columns'].append({
            'name': col,
            'categories': categories,
            'n_categories': len(categories),
        })
        print(f"    {col}: {len(categories)} categories → {categories}")

    # Also extract donor_id and Sample as uint16 (>256 unique values)
    for col in ['donor_id', 'Sample']:
        series = adata.obs[col]
        categories = sorted(series.unique().tolist())
        cat_to_idx = {c: i for i, c in enumerate(categories)}
        encoded = series.map(cat_to_idx).values.astype(np.uint16)
        meta_arrays.append(encoded.view(np.uint8))  # store as raw bytes
        schema['columns'].append({
            'name': col,
            'categories': categories,
            'n_categories': len(categories),
            'dtype': 'uint16',
        })
        print(f"    {col}: {len(categories)} categories (uint16)")

    meta_bin = np.concatenate([a.ravel() for a in meta_arrays])
    meta_bin.tofile(os.path.join(OUT_DIR, 'meta.bin'))
    print(f"  meta.bin: {meta_bin.nbytes / 1e6:.1f} MB")

    with open(os.path.join(OUT_DIR, 'schema.json'), 'w') as f:
        json.dump(schema, f, indent=2)
    print("  schema.json written")

    adata.file.close()
    print("Step 1 complete.")


if __name__ == '__main__':
    run()
