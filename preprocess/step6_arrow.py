"""Step 6: pre-build Arrow IPC streams for static cell-level downloads."""
from pathlib import Path
import sys

import numpy as np
import pyarrow.ipc as ipc


ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / 'data' / 'processed'

sys.path.insert(0, str(ROOT_DIR))
from backend.server.arrow_io import build_cells_batch  # noqa: E402
from backend.server.data_cache import DataCache  # noqa: E402


def _write_batch(path: Path, batch) -> None:
    tmp_path = path.with_suffix(path.suffix + '.tmp')
    with ipc.new_stream(str(tmp_path), batch.schema) as writer:
        writer.write_batch(batch)
    tmp_path.replace(path)


def run():
    print("Step 6: Building static Arrow IPC file...")

    cache = DataCache()
    batch = build_cells_batch(
        cache.coords,
        cache.senescence,
        cache.meta_columns,
        cache.schema,
    )

    output_path = DATA_DIR / 'cells.arrow'
    _write_batch(output_path, batch)

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"  wrote {output_path} ({size_mb:.1f} MB)")
    print(f"  rows: {cache.n_cells:,}; columns: {len(batch.schema.names)}")


if __name__ == '__main__':
    run()
