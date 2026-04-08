"""Step 3: Pre-compute hexbin aggregations for default UMAP view."""
import numpy as np
import json
import os
import math

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
OUT_DIR = os.path.join(DATA_DIR, 'processed')

HEX_RADIUS = 0.3  # UMAP units


def hexbin_coords(x, y, radius):
    """Convert x,y to hexagonal grid indices."""
    dx = radius * 2
    dy = radius * math.sqrt(3)
    col = int(math.floor(x / dx))
    row = int(math.floor(y / dy))
    # Offset odd rows
    if row % 2:
        col = int(math.floor((x - radius) / dx))
    return (col, row)


def run():
    print("Step 3: Computing hexbin aggregations...")

    coords = np.fromfile(os.path.join(OUT_DIR, 'coords.bin'), dtype=np.float32).reshape(-1, 2)
    senescence = np.fromfile(os.path.join(OUT_DIR, 'senescence.bin'), dtype=np.float32)

    with open(os.path.join(OUT_DIR, 'schema.json')) as f:
        schema = json.load(f)

    n_cells = len(coords)
    # Load cell type metadata (first column in meta.bin)
    meta_bin = np.fromfile(os.path.join(OUT_DIR, 'meta.bin'), dtype=np.uint8)
    celltype_codes = meta_bin[:n_cells]  # First n_cells bytes = CellType
    celltype_names = schema['columns'][0]['categories']

    # Assign cells to hex bins
    print(f"  Binning {n_cells:,} cells (radius={HEX_RADIUS})...")
    bins = {}
    for i in range(n_cells):
        hx, hy = hexbin_coords(coords[i, 0], coords[i, 1], HEX_RADIUS)
        key = (hx, hy)
        if key not in bins:
            bins[key] = {'indices': [], 'x': 0.0, 'y': 0.0}
        bins[key]['indices'].append(i)
        bins[key]['x'] += coords[i, 0]
        bins[key]['y'] += coords[i, 1]

    # Compute per-bin statistics
    hexbins = []
    for (hx, hy), b in bins.items():
        idx = b['indices']
        count = len(idx)
        cx = b['x'] / count
        cy = b['y'] / count
        sen_vals = senescence[idx]
        ct_codes = celltype_codes[idx]

        # Dominant cell type
        ct_counts = np.bincount(ct_codes, minlength=len(celltype_names))
        dominant_ct = int(np.argmax(ct_counts))

        hexbins.append({
            'x': round(float(cx), 3),
            'y': round(float(cy), 3),
            'count': count,
            'senescence_mean': round(float(sen_vals.mean()), 4),
            'dominant_celltype': dominant_ct,
            'celltype_counts': ct_counts.tolist(),
        })

    print(f"  {len(hexbins)} non-empty hexbins")

    with open(os.path.join(OUT_DIR, 'hexbin.json'), 'w') as f:
        json.dump({'radius': HEX_RADIUS, 'celltype_names': celltype_names, 'bins': hexbins}, f)
    print("Step 3 complete.")


if __name__ == '__main__':
    run()
