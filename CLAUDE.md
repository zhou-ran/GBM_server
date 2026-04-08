# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GBM Senescence Atlas — interactive web application for exploring 2.26M single cells from a Glioblastoma (GBM) aging/senescence study. Uses deck.gl for WebGL-based rendering of million-cell UMAP plots with multi-dimensional clinical filtering.

## Tech Stack

- **Backend**: FastAPI (Python 3.12, conda env `web`)
- **Frontend**: Vanilla JS + deck.gl 9.x (CDN, no build step)
- **Data**: AnnData h5ad → preprocessed binary (float32/uint8) + JSON
- **Rendering**: deck.gl OrthographicView with HeatmapLayer (density) / ScatterplotLayer (detail)

## Commands

```bash
# Activate environment
conda activate web

# Run preprocessing pipeline (reads h5ad → data/processed/)
python preprocess/run_all.py

# Run individual preprocessing steps
python preprocess/step1_extract.py   # UMAP coords + metadata → binary
python preprocess/step2_senescence.py # Compute senescence scores
python preprocess/step3_hexbin.py     # Hexbin aggregation
python preprocess/step4_stats.py      # Centroids, patients, DE, correlation
python preprocess/step5_downsample.py # 1% stratified downsample

# Start web server (port 8050)
uvicorn server.app:app --host 0.0.0.0 --port 8050 --workers 1

# Or use the launch script (handles conda activation + preprocessing check)
./run.sh
```

## Architecture

### Data Pipeline (`preprocess/`)

Converts 62GB h5ad (2.26M cells × 57K genes) into compact files served by the API:

- `coords.bin` (float32, ~17MB) — UMAP x,y pairs
- `meta.bin` (uint8, ~13MB) — encoded categorical columns (CellType, CellType_Level2, IDH, stage, age_Group5565, sex, donor_id, Sample)
- `schema.json` — category label maps, column layout, UMAP bounds
- `senescence.bin` (float32, ~8.6MB) — normalized senescence scores [0,1]
- `senescent_class.bin` (uint8) — binary classification (top 25%)
- `hexbin.json` — pre-aggregated hexagonal bins
- `centroids.json`, `patients.json`, `de_results.json`, `correlation.json` — pre-computed stats

The meta.bin layout: first 6 columns are uint8 (nCells bytes each), last 2 (donor_id, Sample) are uint16 stored as raw bytes. Column order matches schema.json.

### Backend (`server/`)

FastAPI app serving:
- Static files from `static/`
- Binary data endpoints (`/api/coords`, `/api/meta`, `/api/senescence`) — raw file responses
- JSON endpoints (`/api/hexbin`, `/api/centroids`, `/api/patients`, `/api/de`, `/api/correlation`)
- Dynamic: `/api/region?xmin&xmax&ymin&ymax` (bounding box cell query), `/api/gene/{name}` (on-demand gene expression from h5ad, cached to `data/processed/gene_density/`)

### Frontend (`static/js/`)

Single-page app with no build step. All JS files are plain ES modules loaded in order:
1. `data.js` — DataStore: fetches binary/JSON from API, parses typed arrays, caches in memory (~26MB client-side)
2. `layers.js` — Layers: deck.gl layer factories (HeatmapLayer for >5K cells, ScatterplotLayer for <5K)
3. `filters.js` — Filters: builds filter UI from schema, manages Uint8Array filter mask
4. `panels.js` — Panels: patient metadata table, split view controls
5. `charts.js` — Charts: Canvas 2D waterfall plot (DE genes), correlation heatmap
6. `app.js` — Main: initializes deck.gl with OrthographicView, wires state management, handles zoom-based layer switching

### Rendering Strategy

- **Default zoom (>5K visible cells)**: `HeatmapLayer` — GPU-aggregated density, senescence score as weight
- **Detail zoom (<5K visible)**: `ScatterplotLayer` — individual cells colored by cell type or senescence, with hover tooltip
- Layer switching happens in `estimateVisibleCells()` which scans the coords array against viewport bounds

## Key Data Facts

- 2,259,122 cells, 57,166 genes
- 9 CellType categories, 17 CellType_Level2 categories
- IDH values cleaned: "WT" + "IDH wildtype" merged to "WT"
- 517 donors, 577 samples, 45 author studies
- Senescence scored using curated gene set (CellAge + SenMayo markers)
- Source h5ad is a symlink at `data/AllSample_obj.h5ad`
