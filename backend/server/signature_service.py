"""Signature scoring service for Level 3 gene-set overlays."""

from __future__ import annotations

import hashlib
import os

import numpy as np

from .arrow_io import build_gene_batch, serialize_ipc
from .data_cache import get_cache

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_SIGNATURE_CACHE_DIR = os.path.join(_BASE_DIR, "data", "processed", "signature_cache")


def _signature_cache_path(genes: list[str]) -> str:
    normalized = sorted({gene.upper() for gene in genes if gene.strip()})
    digest = hashlib.sha1(",".join(normalized).encode("utf-8")).hexdigest()
    return os.path.join(_SIGNATURE_CACHE_DIR, f"{digest}.bin")


async def get_signature_arrow(genes: list[str]) -> bytes | None:
    normalized = sorted({gene.upper() for gene in genes if gene.strip()})
    if not normalized:
        return None

    cache = get_cache()
    valid_pairs = [(gene, cache.gene_index.get(gene)) for gene in normalized]
    valid_indices = [(gene, idx) for gene, idx in valid_pairs if idx is not None]
    if not valid_indices:
        return None

    cache_path = _signature_cache_path([gene for gene, _ in valid_indices])
    if os.path.exists(cache_path):
        expr = np.fromfile(cache_path, dtype=np.float32)
        return serialize_ipc(build_gene_batch(expr))

    import anndata as ad

    h5ad_path = os.path.join(_BASE_DIR, "data", "AllSample_obj.h5ad")
    adata = ad.read_h5ad(h5ad_path, backed="r")
    try:
        columns = []
        for _, gene_idx in valid_indices:
            expr = np.asarray(adata.X[:, gene_idx].toarray()).ravel().astype(np.float32)
            emax = expr.max()
            if emax > 0:
                expr = expr / emax
            columns.append(expr)
        signature = np.mean(np.vstack(columns), axis=0).astype(np.float32)
    finally:
        adata.file.close()

    os.makedirs(_SIGNATURE_CACHE_DIR, exist_ok=True)
    signature.tofile(cache_path)
    return serialize_ipc(build_gene_batch(signature))
