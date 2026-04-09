"""API routes for serving preprocessed data."""
import os
import json
from pathlib import Path
import numpy as np
from fastapi import APIRouter, Query
from fastapi.responses import Response, JSONResponse, FileResponse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'processed')

router = APIRouter()

# Lazy-loaded globals
_coords = None
_schema = None
_gene_index = None


def _get_schema():
    global _schema
    if _schema is None:
        with open(os.path.join(DATA_DIR, 'schema.json')) as f:
            _schema = json.load(f)
    return _schema


def _get_coords():
    global _coords
    if _coords is None:
        _coords = np.fromfile(os.path.join(DATA_DIR, 'coords.bin'), dtype=np.float32).reshape(-1, 2)
    return _coords


def _resolve_data_path(path: str) -> Path:
    return Path(DATA_DIR) / path


def _binary_response(path: str):
    resolved = _resolve_data_path(path)
    if not resolved.exists():
        return JSONResponse(content={'error': f'{path} not found'}, status_code=404)
    return FileResponse(resolved, media_type='application/octet-stream')


def _json_response(path: str):
    resolved = _resolve_data_path(path)
    if not resolved.exists():
        return JSONResponse(content={'error': f'{path} not found'}, status_code=404)
    with open(resolved) as f:
        data = json.load(f)
    return JSONResponse(content=data)


def _get_gene_index():
    global _gene_index
    if _gene_index is None:
        import anndata as ad

        h5ad_path = os.path.join(BASE_DIR, 'data', 'AllSample_obj.h5ad')
        adata = ad.read_h5ad(h5ad_path, backed='r')
        try:
            _gene_index = {str(name).upper(): idx for idx, name in enumerate(adata.var_names)}
        finally:
            adata.file.close()
    return _gene_index


# --- Binary data endpoints ---

@router.get("/coords")
async def get_coords():
    return _binary_response('coords.bin')


@router.get("/meta")
async def get_meta():
    return _binary_response('meta.bin')


@router.get("/schema")
async def get_schema():
    return _json_response('schema.json')


@router.get("/senescence")
async def get_senescence():
    return _binary_response('senescence.bin')


@router.get("/hexbin")
async def get_hexbin():
    return _json_response('hexbin.json')


@router.get("/centroids")
async def get_centroids():
    return _json_response('centroids.json')


@router.get("/patients")
async def get_patients():
    return _json_response('patients.json')


@router.get("/de")
async def get_de():
    return _json_response('de_results.json')


@router.get("/correlation")
async def get_correlation():
    return _json_response('correlation.json')


@router.get("/downsample")
async def get_downsample():
    return _binary_response('downsample.bin')


@router.get("/downsample_idx")
async def get_downsample_idx():
    return _binary_response('downsample_idx.bin')


# --- Dynamic endpoints ---

@router.get("/region")
async def get_region(
    xmin: float = Query(...), xmax: float = Query(...),
    ymin: float = Query(...), ymax: float = Query(...)
):
    """Return cell indices within a UMAP bounding box."""
    coords = _get_coords()
    # Fast bounding box filter on numpy array
    mask = (
        (coords[:, 0] >= xmin) & (coords[:, 0] <= xmax) &
        (coords[:, 1] >= ymin) & (coords[:, 1] <= ymax)
    )
    indices = np.where(mask)[0].astype(np.uint32)
    return Response(content=indices.tobytes(), media_type='application/octet-stream')


@router.get("/stats")
async def get_stats():
    """Global cell count statistics."""
    stats_path = _resolve_data_path('stats.json')
    if stats_path.exists():
        return _json_response('stats.json')

    schema = _get_schema()
    stats = {'total': schema['n_cells'], 'by_column': {}}
    meta = np.fromfile(os.path.join(DATA_DIR, 'meta.bin'), dtype=np.uint8)

    for col in schema['columns']:
        if col.get('dtype', 'uint8') != 'uint8':
            continue
        start = col.get('byte_offset', 0)
        end = start + col.get('byte_length', schema['n_cells'])
        codes = meta[start:end]
        counts = {}
        for i, cat in enumerate(col['categories']):
            counts[cat] = int((codes == i).sum())
        stats['by_column'][col['name']] = counts

    return JSONResponse(content=stats)


@router.get("/gene/{gene_name}")
async def get_gene(gene_name: str):
    """Get expression values for a specific gene (on-demand from h5ad)."""
    normalized_gene = gene_name.upper()
    # Check pre-extracted genes first
    gene_path = os.path.join(DATA_DIR, 'gene_density', f'{normalized_gene}.bin')
    if os.path.exists(gene_path):
        return _binary_response(f'gene_density/{normalized_gene}.bin')

    # Fall back to reading from h5ad
    import anndata as ad
    h5ad_path = os.path.join(BASE_DIR, 'data', 'AllSample_obj.h5ad')
    try:
        gene_index = _get_gene_index()
        gene_idx = gene_index.get(normalized_gene)
        if gene_idx is None:
            return JSONResponse(content={'error': f'Gene {normalized_gene} not found'}, status_code=404)

        adata = ad.read_h5ad(h5ad_path, backed='r')
        try:
            expr = np.asarray(adata.X[:, gene_idx].toarray()).ravel().astype(np.float32)
        finally:
            adata.file.close()

        # Normalize to [0, 1]
        emax = expr.max()
        if emax > 0:
            expr = expr / emax

        # Cache for next time
        os.makedirs(os.path.join(DATA_DIR, 'gene_density'), exist_ok=True)
        expr.tofile(gene_path)

        return Response(content=expr.tobytes(), media_type='application/octet-stream')
    except Exception as e:
        return JSONResponse(content={'error': str(e)}, status_code=500)
