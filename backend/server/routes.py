"""API routes — Arrow IPC for cell data, JSON for metadata."""

import numpy as np
from fastapi import APIRouter, Body, Query
from fastapi.responses import FileResponse, JSONResponse, Response

from .data_cache import get_cache
from . import gene_service
from . import signature_service

router = APIRouter()

ARROW_MEDIA = "application/vnd.apache.arrow.stream"


# --- Arrow IPC endpoints ------------------------------------------------


@router.get("/cells")
async def get_cells():
    """All cell-level data as a single Arrow IPC stream (~48 MB)."""
    cache = get_cache()
    cells_path = cache.data_file_path("cells.arrow")
    if cells_path is not None:
        return FileResponse(
            cells_path,
            media_type=ARROW_MEDIA,
            filename="cells.arrow",
            headers={"Cache-Control": "public, max-age=86400"},
        )
    return Response(
        content=cache.cells_ipc,
        media_type=ARROW_MEDIA,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/gene/{gene_name}")
async def get_gene(gene_name: str):
    """Gene expression as Arrow IPC stream."""
    gene_path = gene_service.get_gene_arrow_path(gene_name)
    if gene_path is not None:
        return FileResponse(
            gene_path,
            media_type=ARROW_MEDIA,
            filename=gene_path.name,
            headers={"Cache-Control": "public, max-age=86400"},
        )

    ipc_bytes = await gene_service.get_gene_arrow(gene_name)
    if ipc_bytes is None:
        return JSONResponse(
            content={"error": f"Gene {gene_name.upper()} not found"},
            status_code=404,
        )
    return Response(content=ipc_bytes, media_type=ARROW_MEDIA)


@router.post("/signature")
async def get_signature(payload: dict = Body(...)):
    """Mean normalized expression across a gene set as Arrow IPC stream."""
    genes = payload.get("genes", [])
    ipc_bytes = await signature_service.get_signature_arrow(genes)
    if ipc_bytes is None:
        return JSONResponse(content={"error": "No valid genes supplied"}, status_code=400)
    return Response(content=ipc_bytes, media_type=ARROW_MEDIA)


# --- JSON endpoints (unchanged from original) ---------------------------


@router.get("/schema")
async def get_schema():
    return JSONResponse(content=get_cache().schema)


@router.get("/hexbin")
async def get_hexbin():
    data = get_cache().load_json("hexbin.json")
    if data is None:
        return JSONResponse(content={"error": "hexbin.json not found"}, status_code=404)
    return JSONResponse(content=data)


@router.get("/centroids")
async def get_centroids():
    data = get_cache().load_json("centroids.json")
    if data is None:
        return JSONResponse(content={"error": "centroids.json not found"}, status_code=404)
    return JSONResponse(content=data)


@router.get("/patients")
async def get_patients():
    data = get_cache().load_json("patients.json")
    if data is None:
        return JSONResponse(content={"error": "patients.json not found"}, status_code=404)
    return JSONResponse(content=data)


@router.get("/de")
async def get_de():
    data = get_cache().load_json("de_results.json")
    if data is None:
        return JSONResponse(content={"error": "de_results.json not found"}, status_code=404)
    return JSONResponse(content=data)


@router.get("/correlation")
async def get_correlation():
    data = get_cache().load_json("correlation.json")
    if data is None:
        return JSONResponse(content={"error": "correlation.json not found"}, status_code=404)
    return JSONResponse(content=data)


@router.get("/stats")
async def get_stats():
    data = get_cache().load_json("stats.json")
    if data is not None:
        return JSONResponse(content=data)
    # Compute on the fly
    cache = get_cache()
    schema = cache.schema
    meta = cache.meta_columns
    stats: dict = {"total": cache.n_cells, "by_column": {}}
    for col_def in schema["columns"]:
        dtype = col_def.get("dtype", "uint8")
        if dtype != "uint8":
            continue
        codes = meta[col_def["name"]]
        counts = {}
        for i, cat in enumerate(col_def["categories"]):
            counts[cat] = int((codes == i).sum())
        stats["by_column"][col_def["name"]] = counts
    return JSONResponse(content=stats)


@router.get("/genes/search")
async def search_genes(q: str = Query(..., min_length=1)):
    normalized = q.upper().strip()
    if not normalized:
        return JSONResponse(content=[])

    gene_names = list(get_cache().gene_index.keys())
    prefix = [gene for gene in gene_names if gene.startswith(normalized)]
    if len(prefix) >= 20:
        return JSONResponse(content=prefix[:20])

    contains = [gene for gene in gene_names if normalized in gene and gene not in prefix]
    return JSONResponse(content=(prefix + contains)[:20])


# --- Dynamic endpoints ---------------------------------------------------


@router.get("/region")
async def get_region(
    xmin: float = Query(...),
    xmax: float = Query(...),
    ymin: float = Query(...),
    ymax: float = Query(...),
):
    """Return cell indices within a UMAP bounding box."""
    coords = get_cache().coords
    mask = (
        (coords[:, 0] >= xmin)
        & (coords[:, 0] <= xmax)
        & (coords[:, 1] >= ymin)
        & (coords[:, 1] <= ymax)
    )
    indices = np.where(mask)[0].astype(np.uint32)
    return Response(content=indices.tobytes(), media_type="application/octet-stream")
