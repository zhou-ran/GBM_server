"""Validate preprocessing outputs and binary layout consistency."""
import json
import os
from pathlib import Path

import numpy as np


DATA_DIR = Path(__file__).resolve().parent.parent / 'data' / 'processed'

REQUIRED_FILES = [
    'coords.bin',
    'meta.bin',
    'schema.json',
    'senescence.bin',
    'cells.arrow',
]

OPTIONAL_FILES = [
    'hexbin.json',
    'centroids.json',
    'patients.json',
    'de_results.json',
    'correlation.json',
    'stats.json',
    'downsample.bin',
    'downsample_idx.bin',
    'cellchat.json',
]


def _fail(message):
    raise RuntimeError(message)


def run():
    print("Validation: checking preprocessing outputs...")

    for rel in REQUIRED_FILES:
        path = DATA_DIR / rel
        if not path.exists():
            _fail(f"Missing required file: {path}")

    schema = json.loads((DATA_DIR / 'schema.json').read_text())
    n_cells = schema['n_cells']
    coords_size = (DATA_DIR / 'coords.bin').stat().st_size
    senescence_size = (DATA_DIR / 'senescence.bin').stat().st_size
    meta_size = (DATA_DIR / 'meta.bin').stat().st_size

    expected_coords = n_cells * 2 * np.dtype(np.float32).itemsize
    expected_senescence = n_cells * np.dtype(np.float32).itemsize
    if coords_size != expected_coords:
        _fail(f"coords.bin size mismatch: expected {expected_coords}, got {coords_size}")
    if senescence_size != expected_senescence:
        _fail(f"senescence.bin size mismatch: expected {expected_senescence}, got {senescence_size}")

    layout = schema.get('meta_layout', {})
    running_offset = 0
    for col in schema['columns']:
        dtype = col.get('dtype', 'uint8')
        itemsize = col.get('itemsize', np.dtype(dtype).itemsize)
        byte_offset = col.get('byte_offset', running_offset)
        byte_length = col.get('byte_length', n_cells * itemsize)
        expected_length = n_cells * itemsize

        if byte_offset != running_offset:
            _fail(
                f"Column {col['name']} offset mismatch: expected {running_offset}, got {byte_offset}"
            )
        if byte_length != expected_length:
            _fail(
                f"Column {col['name']} length mismatch: expected {expected_length}, got {byte_length}"
            )
        running_offset += byte_length

    total_bytes = layout.get('total_bytes', running_offset)
    if total_bytes != running_offset:
        _fail(f"meta_layout total mismatch: expected {running_offset}, got {total_bytes}")
    if meta_size != total_bytes:
        _fail(f"meta.bin size mismatch: expected {total_bytes}, got {meta_size}")

    for rel in OPTIONAL_FILES:
        path = DATA_DIR / rel
        if not path.exists():
            print(f"  optional file missing: {rel}")

    print("Validation complete: required files and binary layouts are consistent.")


if __name__ == '__main__':
    run()
