# GBM Senescence Atlas

Interactive web application for exploring 2.26 million single cells from a Glioblastoma (GBM) aging and senescence study.

[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com/)
[![deck.gl](https://img.shields.io/badge/deck.gl-9.x-orange)](https://deck.gl/)
[![Apache Arrow](https://img.shields.io/badge/Apache%20Arrow-IPC-red)](https://arrow.apache.org/)

## Overview

GBM Senescence Atlas is a high-performance web application for visualizing and analyzing single-cell RNA sequencing data from glioblastoma samples. It features:

- **WebGL-powered rendering**: Interactive UMAP visualization of 2.26M cells using deck.gl
- **Multi-dimensional filtering**: Filter by cell type, IDH status, disease stage, age group, sex, donor, and sample
- **Gene expression analysis**: Dynamic loading and visualization of any gene from the 57K gene set
- **Senescence scoring**: Curated senescence gene set analysis (CellAge + SenMayo markers)
- **Smart rendering modes**: Automatic switching between heatmap (density) and scatterplot (detail) views
- **Apache Arrow IPC**: Efficient binary data transfer for optimal performance

## Data Statistics

| Metric | Value |
|--------|-------|
| Total Cells | 2,259,122 |
| Genes | 57,166 |
| Cell Types (Level 1) | 9 categories |
| Cell Types (Level 2) | 17 categories |
| Donors | 517 |
| Samples | 577 |
| Studies | 45 |
| Source Data | 62GB h5ad file |

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Visualization**: deck.gl 9.x (WebGL)
- **Data**: Apache Arrow IPC deserialization

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Server**: Uvicorn
- **Data Processing**: PyArrow, NumPy, AnnData
- **Serialization**: Apache Arrow IPC

### Data Pipeline
- **Source**: AnnData h5ad format
- **Output**: Binary files (float32/uint8/uint16) + JSON metadata
- **Preprocessing**: 8-step pipeline with validation

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- conda
- Source data file: `data/AllSample_obj.h5ad` (symlink)

### Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:zhou-ran/GBM_server.git
   cd GBM_server
   ```

2. **Create conda environment**
   ```bash
   conda create -n web python=3.12
   conda activate web
   ```

3. **Install backend dependencies**
   ```bash
   pip install -e ./backend
   ```

4. **Install frontend dependencies**
   ```bash
   cd frontend && npm install && cd ..
   ```

### Development Mode

Start both backend and frontend in development mode:

```bash
./start.sh
```

This will launch:
- Backend: http://0.0.0.0:8050
- Frontend: http://0.0.0.0:5174

### Production Mode

Build and serve the application:

```bash
./run.sh
```

The application will be available at http://0.0.0.0:8050

## Data Preprocessing

The preprocessing pipeline converts the 62GB h5ad file into optimized binary formats:

### Run All Steps
```bash
python preprocess/run_all.py
```

### Run Individual Steps
```bash
python preprocess/step1_extract.py      # UMAP coords + metadata
python preprocess/step2_senescence.py   # Compute senescence scores
python preprocess/step3_hexbin.py       # Hexbin aggregation
python preprocess/step4_stats.py        # Centroids, patients, DE, correlation
python preprocess/step5_downsample.py   # 1% stratified downsample
python preprocess/step6_arrow.py        # Arrow format conversion
python preprocess/step7_trajectory.py   # Trajectory analysis
python preprocess/step8_cellchat.py     # CellChat analysis
python preprocess/validate_outputs.py   # Validate all outputs
```

### Preprocessing Outputs

| File | Size | Description |
|------|------|-------------|
| `coords.bin` | ~17MB | UMAP coordinates (float32) |
| `meta.bin` | ~13MB | Encoded categorical metadata |
| `senescence.bin` | ~8.6MB | Normalized senescence scores [0,1] |
| `senescent_class.bin` | ~2.3MB | Binary classification (top 25%) |
| `schema.json` | ~25KB | Category mappings, column layout, UMAP bounds |
| `hexbin.json` | ~128KB | Pre-aggregated hexagonal bins |
| `centroids.json` | ~2.4KB | Cluster centroids per CellType_Level2 |
| `patients.json` | ~160KB | Patient-level summaries |
| `de_results.json` | ~36KB | Differential expression results |
| `correlation.json` | ~1.9KB | Spearman correlation matrix |

## Project Structure

```
GBM_server/
├── backend/                    # FastAPI backend
│   ├── pyproject.toml
│   └── server/
│       ├── app.py             # FastAPI app, CORS, lifespan
│       ├── routes.py          # API router (Arrow IPC + JSON)
│       ├── arrow_io.py        # Arrow RecordBatch serialization
│       ├── data_cache.py      # Lazy-loaded numpy/Arrow cache
│       └── gene_service.py    # Gene expression from h5ad
├── frontend/                   # React + Vite + TypeScript
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── api/               # Fetch wrappers, Arrow IPC deserialization
│       ├── stores/            # Zustand stores (data, view, filter, color, ui)
│       ├── components/        # React components
│       │   ├── layout/        # Layout components
│       │   ├── map/           # UMAP visualization
│       │   ├── filters/       # Filter panels
│       │   ├── color/         # Color mode controls
│       │   ├── patients/      # Patient table
│       │   └── charts/        # Analysis charts
│       ├── hooks/             # useInitData, useDeckLayers
│       ├── lib/               # Color palettes, constants
│       └── types/             # TypeScript type definitions
├── preprocess/                 # Data preprocessing pipeline
│   ├── run_all.py
│   ├── step1_extract.py
│   ├── step2_senescence.py
│   ├── step3_hexbin.py
│   ├── step4_stats.py
│   ├── step5_downsample.py
│   ├── step6_arrow.py
│   ├── step7_trajectory.py
│   ├── step8_cellchat.py
│   └── validate_outputs.py
├── data/
│   ├── AllSample_obj.h5ad     # Source data (symlink)
│   └── processed/             # Preprocessing outputs
├── docs/
│   └── ARCHITECTURE.md        # Detailed architecture design
├── start.sh                   # Development launcher
└── run.sh                     # Production launcher
```

## API Endpoints

### Arrow IPC Endpoints

| Endpoint | Method | Response | Description |
|----------|--------|----------|-------------|
| `/api/cells` | GET | Arrow IPC (~48MB) | All cell data: x, y, senescence, metadata columns |
| `/api/gene/{name}` | GET | Arrow IPC (~8.6MB) | Single gene expression values |

### JSON Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/schema` | Column definitions, category maps, UMAP bounds |
| `/api/hexbin` | Pre-aggregated hexagonal bins |
| `/api/centroids` | Cluster centroids per CellType_Level2 |
| `/api/patients` | Patient-level summaries |
| `/api/de` | Differential expression results |
| `/api/correlation` | Spearman correlation matrix |
| `/api/stats` | Global cell count statistics |
| `/api/region` | Bounding box cell query |

## Rendering Strategy

The application automatically switches between three rendering modes based on visible cell count:

| Mode | Condition | Layer | Description |
|------|-----------|-------|-------------|
| **Detail** | < 5,000 cells | ScatterplotLayer | Individual cells with full color |
| **Density** | ≥ 5,000 cells | HeatmapLayer | GPU-aggregated density with weight |
| **Overview** | No filters + hexbin | ScatterplotLayer | Pre-aggregated hexbin data |

Color modes: Cell Type (Level 1/2), Senescence Score, Gene Expression

## Data Flow

```
Backend: numpy arrays → pa.RecordBatch → pa.ipc.new_stream() → bytes (cached)
    ↓
HTTP Response (application/vnd.apache.arrow.stream)
    ↓
Frontend: fetch → arrayBuffer → tableFromIPC() → zero-copy TypedArray views
    ↓
Zustand stores → useDeckLayers hook → deck.gl WebGL render
```

## Development Guidelines

### State Management

The application uses Zustand with 5 store slices:
- `dataStore`: Cell data, schema, pre-computed JSON
- `viewStore`: Viewport state, render mode, visible count
- `filterStore`: Active filters, filter mask, donor highlight
- `colorStore`: Color mode, gene expression data
- `uiStore`: Loading state, active tab, selected donor

### Adding New Features

1. **Backend**: Add routes in `backend/server/routes.py`
2. **Frontend API**: Add fetch wrappers in `frontend/src/api/`
3. **State**: Extend relevant Zustand store in `frontend/src/stores/`
4. **Components**: Create components in `frontend/src/components/`
5. **Types**: Update TypeScript definitions in `frontend/src/types/`

### Validation

Always run validation after preprocessing:
```bash
python preprocess/validate_outputs.py
```

## License

This project is for academic research purposes. Please cite appropriately if using the data or code.

## Acknowledgments

- Single-cell data processed using Scanpy and AnnData
- Visualization powered by deck.gl and WebGL
- Data transfer optimized with Apache Arrow
- Senescence gene sets from CellAge and SenMayo

---

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
