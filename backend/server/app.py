"""FastAPI application — GBM Senescence Atlas (Arrow IPC backend)."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .routes import router

BASE_DIR = Path(__file__).resolve().parent.parent.parent


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up: pre-load schema on startup (lightweight)
    from .data_cache import get_cache

    _ = get_cache().schema
    yield


app = FastAPI(title="GBM Senescence Atlas", lifespan=lifespan)

# CORS — allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(router, prefix="/api")

# Serve frontend build in production
frontend_dist = BASE_DIR / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the SPA index.html for all non-API routes."""
        return FileResponse(frontend_dist / "index.html")
