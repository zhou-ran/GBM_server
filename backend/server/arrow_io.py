"""Apache Arrow IPC serialization helpers."""

import numpy as np
import pyarrow as pa
import pyarrow.ipc as ipc


def build_cells_batch(
    coords: np.ndarray,
    senescence: np.ndarray,
    meta_columns: dict[str, np.ndarray],
    schema: dict,
) -> pa.RecordBatch:
    """Build a single Arrow RecordBatch containing all cell-level data.

    Columns: x(f32), y(f32), senescence(f32), then all metadata columns.
    """
    arrays: list[pa.Array] = [
        pa.array(coords[:, 0]),
        pa.array(coords[:, 1]),
        pa.array(senescence),
    ]
    names: list[str] = ["x", "y", "senescence"]

    for col_def in schema["columns"]:
        col_name = col_def["name"]
        col_data = meta_columns[col_name]
        arrays.append(pa.array(col_data))
        names.append(col_name)

    return pa.RecordBatch.from_arrays(arrays, names=names)


def build_gene_batch(expression: np.ndarray) -> pa.RecordBatch:
    """Build a single-column Arrow RecordBatch for gene expression."""
    return pa.RecordBatch.from_arrays(
        [pa.array(expression)],
        names=["expression"],
    )


def serialize_ipc(batch: pa.RecordBatch) -> bytes:
    """Serialize a RecordBatch to Arrow IPC stream format."""
    sink = pa.BufferOutputStream()
    writer = ipc.new_stream(sink, batch.schema)
    writer.write_batch(batch)
    writer.close()
    return sink.getvalue().to_pybytes()
