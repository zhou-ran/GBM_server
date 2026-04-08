"""Step 5: Stratified 1% downsample for fast interactive mode."""
import numpy as np
import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
OUT_DIR = os.path.join(DATA_DIR, 'processed')

SAMPLE_FRACTION = 0.01


def run():
    print("Step 5: Creating 1% stratified downsample...")

    coords = np.fromfile(os.path.join(OUT_DIR, 'coords.bin'), dtype=np.float32).reshape(-1, 2)
    senescence = np.fromfile(os.path.join(OUT_DIR, 'senescence.bin'), dtype=np.float32)

    with open(os.path.join(OUT_DIR, 'schema.json')) as f:
        schema = json.load(f)

    n_cells = schema['n_cells']
    meta_bin = np.fromfile(os.path.join(OUT_DIR, 'meta.bin'), dtype=np.uint8)
    # CellType_Level2 is the second column (offset = n_cells)
    ct2_codes = meta_bin[n_cells:2*n_cells]
    ct2_names = schema['columns'][1]['categories']

    # Stratified sampling by CellType_Level2
    selected = []
    np.random.seed(42)
    for i in range(len(ct2_names)):
        idx = np.where(ct2_codes == i)[0]
        n_sample = max(1, int(len(idx) * SAMPLE_FRACTION))
        if len(idx) > 0:
            chosen = np.random.choice(idx, n_sample, replace=False)
            selected.append(chosen)
            print(f"    {ct2_names[i]}: {len(idx):,} → {n_sample:,}")

    selected = np.sort(np.concatenate(selected))
    print(f"  Total downsampled: {len(selected):,}")

    # Write downsampled data: coords (float32) + senescence (float32) + meta columns (uint8)
    ds_coords = coords[selected]
    ds_senescence = senescence[selected]

    # Extract all uint8 meta columns for selected cells
    n_uint8_cols = sum(1 for c in schema['columns'] if c.get('dtype', 'uint8') == 'uint8')
    ds_meta_parts = []
    for col_idx in range(n_uint8_cols):
        col_data = meta_bin[col_idx * n_cells:(col_idx + 1) * n_cells]
        ds_meta_parts.append(col_data[selected])

    # Pack: [n_cells(uint32)] [coords(float32)] [senescence(float32)] [meta_cols(uint8)]
    n_ds = np.array([len(selected)], dtype=np.uint32)
    with open(os.path.join(OUT_DIR, 'downsample.bin'), 'wb') as f:
        n_ds.tofile(f)
        ds_coords.tofile(f)
        ds_senescence.tofile(f)
        for part in ds_meta_parts:
            part.tofile(f)

    # Also save indices for mapping back
    selected.astype(np.uint32).tofile(os.path.join(OUT_DIR, 'downsample_idx.bin'))

    print("Step 5 complete.")


if __name__ == '__main__':
    run()
