"""Gene expression loading from h5ad with Arrow serialization."""

import os
from pathlib import Path

import numpy as np

from .arrow_io import build_gene_batch, serialize_ipc
from .data_cache import get_cache

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_GENE_CACHE_DIR = os.path.join(_BASE_DIR, "data", "processed", "gene_density")


def get_gene_arrow_path(gene_name: str) -> Path | None:
    """Return a precomputed/cached Arrow IPC file for this gene, if present."""
    normalized = gene_name.upper()
    path = Path(_GENE_CACHE_DIR) / f"{normalized}.arrow"
    return path if path.exists() else None


async def get_gene_arrow(gene_name: str) -> bytes | None:
    """Return Arrow IPC bytes for a gene's expression, or None if not found."""
    normalized = gene_name.upper()
    cache = get_cache()

    cached_arrow = get_gene_arrow_path(normalized)
    if cached_arrow is not None:
        return cached_arrow.read_bytes()

    # Backward-compatible raw Float32 cache.
    cached_path = os.path.join(_GENE_CACHE_DIR, f"{normalized}.bin")
    if os.path.exists(cached_path):
        expr = np.fromfile(cached_path, dtype=np.float32)
        ipc_bytes = serialize_ipc(build_gene_batch(expr))
        Path(_GENE_CACHE_DIR, f"{normalized}.arrow").write_bytes(ipc_bytes)
        return ipc_bytes

    # Read from h5ad
    gene_idx = cache.gene_index.get(normalized)
    if gene_idx is None:
        return None

    import anndata as ad

    h5ad_path = os.path.join(_BASE_DIR, "data", "AllSample_obj.h5ad")
    adata = ad.read_h5ad(h5ad_path, backed="r")
    try:
        expr = np.asarray(adata.X[:, gene_idx].toarray()).ravel().astype(np.float32)
    finally:
        adata.file.close()

    # Normalize to [0, 1]
    emax = expr.max()
    if emax > 0:
        expr = expr / emax

    # Cache to disk
    os.makedirs(_GENE_CACHE_DIR, exist_ok=True)
    expr.tofile(cached_path)

    ipc_bytes = serialize_ipc(build_gene_batch(expr))
    Path(_GENE_CACHE_DIR, f"{normalized}.arrow").write_bytes(ipc_bytes)
    return ipc_bytes
