"""API routes for serving preprocessed data."""
import os
import json
import numpy as np
from fastapi import APIRouter, Query
from fastapi.responses import Response, JSONResponse
from scipy.spatial import cKDTree

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'processed')

router = APIRouter()

# Lazy-loaded globals
_coords = None
_kdtree = None
_schema = None


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


def _get_kdtree():
    global _kdtree
    if _kdtree is None:
        _kdtree = cKDTree(_get_coords())
    return _kdtree


def _binary_response(path: str):
    with open(os.path.join(DATA_DIR, path), 'rb') as f:
        data = f.read()
    return Response(content=data, media_type='application/octet-stream')


def _json_response(path: str):
    with open(os.path.join(DATA_DIR, path)) as f:
        data = json.load(f)
    return JSONResponse(content=data)


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
    schema = _get_schema()
    stats = {'total': schema['n_cells'], 'by_column': {}}
    n = schema['n_cells']
    meta = np.fromfile(os.path.join(DATA_DIR, 'meta.bin'), dtype=np.uint8)

    offset = 0
    for col in schema['columns']:
        if col.get('dtype') == 'uint16':
            break
        codes = meta[offset:offset + n]
        counts = {}
        for i, cat in enumerate(col['categories']):
            counts[cat] = int((codes == i).sum())
        stats['by_column'][col['name']] = counts
        offset += n

    return JSONResponse(content=stats)


@router.get("/gene/{gene_name}")
async def get_gene(gene_name: str):
    """Get expression values for a specific gene (on-demand from h5ad)."""
    # Check pre-extracted genes first
    gene_path = os.path.join(DATA_DIR, 'gene_density', f'{gene_name}.bin')
    if os.path.exists(gene_path):
        return _binary_response(f'gene_density/{gene_name}.bin')

    # Fall back to reading from h5ad
    import anndata as ad
    h5ad_path = os.path.join(BASE_DIR, 'data', 'AllSample_obj.h5ad')
    try:
        adata = ad.read_h5ad(h5ad_path, backed='r')
        if gene_name not in adata.var_names:
            return JSONResponse(content={'error': f'Gene {gene_name} not found'}, status_code=404)
        gene_idx = list(adata.var_names).index(gene_name)
        expr = np.array(adata.X[:, gene_idx].toarray().flatten(), dtype=np.float32)
        # Normalize to [0, 1]
        emax = expr.max()
        if emax > 0:
            expr = expr / emax
        adata.file.close()

        # Cache for next time
        os.makedirs(os.path.join(DATA_DIR, 'gene_density'), exist_ok=True)
        expr.tofile(gene_path)

        return Response(content=expr.tobytes(), media_type='application/octet-stream')
    except Exception as e:
        return JSONResponse(content={'error': str(e)}, status_code=500)
