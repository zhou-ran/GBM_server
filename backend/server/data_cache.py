"""Singleton cache for numpy arrays and Arrow IPC bytes."""

import json
import os
from pathlib import Path

import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"

_instance: "DataCache | None" = None


class DataCache:
    """Lazy-loaded, read-only data cache. All arrays are loaded once and reused."""

    def __init__(self) -> None:
        self._schema: dict | None = None
        self._coords: np.ndarray | None = None
        self._senescence: np.ndarray | None = None
        self._meta_raw: bytes | None = None
        self._meta_columns: dict[str, np.ndarray] | None = None
        self._cells_ipc: bytes | None = None
        self._gene_index: dict[str, int] | None = None

    # -- Schema ----------------------------------------------------------

    @property
    def schema(self) -> dict:
        if self._schema is None:
            with open(DATA_DIR / "schema.json") as f:
                self._schema = json.load(f)
        return self._schema

    @property
    def n_cells(self) -> int:
        return self.schema["n_cells"]

    # -- Coordinates -----------------------------------------------------

    @property
    def coords(self) -> np.ndarray:
        """Shape (n_cells, 2), dtype float32."""
        if self._coords is None:
            self._coords = np.fromfile(
                DATA_DIR / "coords.bin", dtype=np.float32
            ).reshape(-1, 2)
        return self._coords

    # -- Senescence ------------------------------------------------------

    @property
    def senescence(self) -> np.ndarray:
        """Shape (n_cells,), dtype float32, values in [0, 1]."""
        if self._senescence is None:
            self._senescence = np.fromfile(
                DATA_DIR / "senescence.bin", dtype=np.float32
            )
        return self._senescence

    # -- Metadata columns ------------------------------------------------

    @property
    def meta_columns(self) -> dict[str, np.ndarray]:
        """Dict of column_name → numpy array, extracted from meta.bin."""
        if self._meta_columns is None:
            raw = np.fromfile(DATA_DIR / "meta.bin", dtype=np.uint8)
            n = self.n_cells
            cols: dict[str, np.ndarray] = {}
            offset = 0
            for col_def in self.schema["columns"]:
                dtype = col_def.get("dtype", "uint8")
                if dtype == "uint16":
                    # uint16 stored as raw bytes in the uint8 buffer
                    byte_len = n * 2
                    cols[col_def["name"]] = np.frombuffer(
                        raw[offset : offset + byte_len].tobytes(), dtype=np.uint16
                    )
                    offset += byte_len
                else:
                    cols[col_def["name"]] = raw[offset : offset + n]
                    offset += n
            self._meta_columns = cols
        return self._meta_columns

    # -- Gene index ------------------------------------------------------

    @property
    def gene_index(self) -> dict[str, int]:
        if self._gene_index is None:
            import anndata as ad

            h5ad_path = BASE_DIR / "data" / "AllSample_obj.h5ad"
            adata = ad.read_h5ad(str(h5ad_path), backed="r")
            try:
                self._gene_index = {
                    str(name).upper(): idx
                    for idx, name in enumerate(adata.var_names)
                }
            finally:
                adata.file.close()
        return self._gene_index

    # -- Cached Arrow IPC for /api/cells ---------------------------------

    @property
    def cells_ipc(self) -> bytes:
        if self._cells_ipc is None:
            static_arrow = DATA_DIR / "cells.arrow"
            if static_arrow.exists():
                self._cells_ipc = static_arrow.read_bytes()
                return self._cells_ipc

            from .arrow_io import build_cells_batch, serialize_ipc

            batch = build_cells_batch(
                self.coords, self.senescence, self.meta_columns, self.schema
            )
            self._cells_ipc = serialize_ipc(batch)
        return self._cells_ipc

    # -- JSON file helpers -----------------------------------------------

    def load_json(self, filename: str) -> dict | list | None:
        path = DATA_DIR / filename
        if not path.exists():
            return None
        with open(path) as f:
            return json.load(f)

    def data_file_path(self, filename: str) -> Path | None:
        path = DATA_DIR / filename
        return path if path.exists() else None


def get_cache() -> DataCache:
    global _instance
    if _instance is None:
        _instance = DataCache()
    return _instance
