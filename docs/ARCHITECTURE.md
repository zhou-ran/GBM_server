# GBM Senescence Atlas — Architecture Design

## Overview

High-performance web application for exploring 2.26M single cells from a Glioblastoma aging/senescence study. Uses deck.gl for WebGL rendering with Apache Arrow IPC for efficient binary data transfer.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Zustand, deck.gl 9.x |
| Backend | Python 3.10+, FastAPI, Uvicorn, PyArrow, NumPy |
| Data Transfer | Apache Arrow IPC (binary stream) for cell data; JSON for small metadata |
| Rendering | deck.gl OrthographicView — HeatmapLayer (density) / ScatterplotLayer (detail) |

---

## 1. System Data Flow

### 1.1 Initial Load Sequence

```
Browser loads App
    │
    ├─ GET /api/schema ──────────────────────────────── JSON (~25KB)
    │   → category maps, UMAP bounds, column definitions
    │
    ├─ GET /api/cells ───────────────────────────────── Arrow IPC (~48MB)
    │   → RecordBatch: x(f32), y(f32), senescence(f32),
    │     CellType(u8), CellType_Level2(u8), IDH(u8),
    │     stage(u8), age_Group5565(u8), sex(u8),
    │     donor_id(u16), Sample(u16)
    │   → Frontend: tableFromIPC() → zero-copy TypedArray views
    │   → Interleave x,y → Float32Array for deck.gl
    │
    └─ Promise.all([
         GET /api/hexbin,       ── JSON (128KB)
         GET /api/centroids,    ── JSON (2.4KB)
         GET /api/patients,     ── JSON (160KB)
         GET /api/de,           ── JSON (36KB)
         GET /api/correlation   ── JSON (1.9KB)
       ])
```

### 1.2 Gene Expression Query Flow

Example: User selects CellType=TAM filter, then loads APOE gene expression.

```
1. filterStore.toggleCategory('CellType', 'TAM')
   → Rebuild Uint8Array filterMask by scanning cellTypeCodes
   → ~5ms for 2.26M cells on modern hardware

2. colorStore.loadGene('APOE')
   → fetch('/api/gene/APOE')

3. Backend: routes.py get_gene('APOE')
   → Check gene_density/APOE.bin cache
   → Cache miss: read h5ad column → normalize to [0,1]
   → Wrap as pa.RecordBatch(expression: Float32)
   → Serialize to Arrow IPC stream → Response

4. Frontend: deserialize Arrow IPC
   → table.getChild('expression').toFloat32Array()
   → colorStore.set({ geneExpr, geneName, colorMode: 'gene' })

5. useDeckLayers hook reacts to store changes
   → estimateVisibleCells(coords, filterMask, viewState)
   → count < 5000 → ScatterplotLayer (color = APOE expression)
   → count >= 5000 → HeatmapLayer (weight = APOE expression)

6. deck.gl renders: only TAM cells visible, blue→yellow→red gradient
```

---

## 2. State Management (Zustand)

### 2.1 Store Slices

```
┌─────────────────────────────────────────────────────────────┐
│ dataStore                                                    │
│  coords: Float32Array        // [x0,y0,x1,y1,...] 2.26M×2  │
│  senescence: Float32Array    // [0,1] normalized             │
│  cellTypeCodes: Uint8Array   // encoded category indices     │
│  cellType2Codes: Uint8Array                                  │
│  idhCodes: Uint8Array                                        │
│  stageCodes: Uint8Array                                      │
│  ageCodes: Uint8Array                                        │
│  sexCodes: Uint8Array                                        │
│  donorCodes: Uint16Array                                     │
│  sampleCodes: Uint16Array                                    │
│  schema: Schema | null                                       │
│  hexbin, centroids, patients, deResults, correlation         │
│  nCells: number                                              │
│  loadAll() → Promise<void>                                   │
├─────────────────────────────────────────────────────────────┤
│ viewStore                                                    │
│  viewState: { target, zoom, minZoom, maxZoom }               │
│  renderMode: 'overview' | 'density' | 'detail'              │
│  visibleCount: number                                        │
│  setViewState(), updateRenderMode()                          │
├─────────────────────────────────────────────────────────────┤
│ filterStore                                                  │
│  activeFilters: Record<string, Set<number>>                  │
│  filterMask: Uint8Array | null                               │
│  highlightedDonor: number | null                             │
│  toggleCategory(), highlightDonor(), rebuildMask()           │
├─────────────────────────────────────────────────────────────┤
│ colorStore                                                   │
│  colorMode: 'celltype' | 'celltype2' | 'senescence' | 'gene'│
│  geneExpr: Float32Array | null                               │
│  geneName: string | null                                     │
│  isLoadingGene: boolean                                      │
│  setColorMode(), loadGene()                                  │
├─────────────────────────────────────────────────────────────┤
│ uiStore                                                      │
│  isLoading: boolean                                          │
│  loadingMessage: string                                      │
│  activeTab: 'waterfall' | 'correlation'                      │
│  selectedDonor: string | null                                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Store Interaction Diagram

```
User Action
    │
    ├─ Filter toggle ──→ filterStore.toggleCategory()
    │                        → rebuildMask()
    │                        → viewStore.updateRenderMode()
    │
    ├─ Color mode ─────→ colorStore.setColorMode()
    │
    ├─ Gene search ────→ colorStore.loadGene()
    │                        → fetch Arrow IPC
    │                        → set geneExpr + colorMode
    │
    ├─ Donor select ───→ filterStore.highlightDonor()
    │
    └─ Zoom/Pan ───────→ viewStore.setViewState()
                             → updateRenderMode()
    │
    ▼
useDeckLayers hook (subscribes to all stores)
    → returns Layer[] → <DeckGL layers={layers} />
```

---

## 3. API Design

### 3.1 Arrow IPC Endpoints

| Endpoint | Response Type | Size | Description |
|----------|--------------|------|-------------|
| `GET /api/cells` | Arrow IPC stream | ~48MB | All cell data: x, y, senescence, 8 metadata columns |
| `GET /api/gene/{name}` | Arrow IPC stream | ~8.6MB | Single column: expression (Float32) |

### 3.2 JSON Endpoints (unchanged)

| Endpoint | Size | Description |
|----------|------|-------------|
| `GET /api/schema` | 25KB | Column definitions, category maps, UMAP bounds |
| `GET /api/hexbin` | 128KB | Pre-aggregated hexagonal bins |
| `GET /api/centroids` | 2.4KB | Cluster centroids per CellType_Level2 |
| `GET /api/patients` | 160KB | Patient-level summaries |
| `GET /api/de` | 36KB | Differential expression results |
| `GET /api/correlation` | 1.9KB | Spearman correlation matrix |
| `GET /api/stats` | ~5KB | Global cell count statistics |

### 3.3 Arrow Serialization (Backend)

```python
# arrow_io.py — core pattern
coords = np.fromfile('coords.bin', dtype=np.float32).reshape(-1, 2)
batch = pa.RecordBatch.from_arrays(
    [pa.array(coords[:, 0]), pa.array(coords[:, 1]), ...],
    names=['x', 'y', 'senescence', 'CellType', ...]
)
sink = pa.BufferOutputStream()
writer = pa.ipc.new_stream(sink, batch.schema)
writer.write_batch(batch)
writer.close()
return sink.getvalue().to_pybytes()  # cached after first build
```

### 3.4 Arrow Deserialization (Frontend)

```typescript
// api/client.ts
import { tableFromIPC } from 'apache-arrow';

const resp = await fetch('/api/cells');
const buf = await resp.arrayBuffer();
const table = tableFromIPC(new Uint8Array(buf));

// Zero-copy typed array views
const x = table.getChild('x')!.toArray() as Float32Array;
const y = table.getChild('y')!.toArray() as Float32Array;
```

---

## 4. Rendering Strategy

### 4.1 Three Rendering Modes

| Mode | Condition | Layer | Data |
|------|-----------|-------|------|
| Detail | visibleCount < 5,000 | ScatterplotLayer | Individual cells, colored by mode |
| Overview | No filters + hexbin available | ScatterplotLayer (hexbin) | Pre-aggregated bins |
| Density | Default (>5K visible) | HeatmapLayer | Coords + weight (senescence/gene) |

Centroid labels (TextLayer) always rendered on top.

### 4.2 Color Modes

| Mode | Source | Mapping |
|------|--------|---------|
| celltype | cellTypeCodes (Uint8) | 9-color categorical palette |
| celltype2 | cellType2Codes (Uint8) | 17-color categorical palette |
| senescence | senescence (Float32) | Blue → Yellow → Red continuous |
| gene | geneExpr (Float32) | Blue → Yellow → Red continuous |

---

## 5. Component Hierarchy

```
<App>
  ├── <Header />                    Stats bar: total, filtered, visible, mode
  └── <main>
      ├── <LeftPanel>
      │   ├── <FilterPanel>         Schema-driven filter chips
      │   │   └── <FilterChip />
      │   ├── <ColorModeSelect />   Dropdown + conditional GeneSearch
      │   │   └── <GeneSearch />
      │   ├── <PatientTable />      Sortable, click → highlight donor
      │   └── <Legend />            Categorical or continuous
      ├── <UmapView />             deck.gl <DeckGL> + OrthographicView
      └── <AnalysisPanel>
          ├── <WaterfallChart />    Canvas 2D, click → load gene
          └── <CorrelationHeatmap />Canvas 2D
```

---

## 6. Directory Structure

```
20260408_gbm_age/
├── data/                          # Preprocessed data (unchanged)
│   ├── AllSample_obj.h5ad         # Source h5ad (symlink)
│   └── processed/                 # Binary + JSON outputs
├── preprocess/                    # Pipeline scripts (unchanged)
├── docs/
│   └── ARCHITECTURE.md            # This document
├── backend/
│   ├── pyproject.toml
│   └── server/
│       ├── __init__.py
│       ├── app.py                 # FastAPI + CORS + static mount
│       ├── routes.py              # API router (Arrow + JSON)
│       ├── arrow_io.py            # Arrow IPC serialization helpers
│       ├── data_cache.py          # Singleton numpy/Arrow cache
│       └── gene_service.py        # Gene expression from h5ad
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/                   # Fetch + Arrow deserialization
│       ├── stores/                # Zustand stores (5 slices)
│       ├── components/            # React components
│       │   ├── layout/
│       │   ├── map/
│       │   ├── filters/
│       │   ├── color/
│       │   ├── patients/
│       │   └── charts/
│       ├── hooks/                 # useInitData, useDeckLayers, useFilterMask
│       ├── lib/                   # Colors, constants
│       └── types/                 # TypeScript type definitions
├── start.sh
├── run.sh
└── CLAUDE.md
```

---

## 7. Key Design Decisions

1. **Single `/api/cells` endpoint** — Replaces 3 separate binary fetches. One Arrow RecordBatch with all columns eliminates 2 round-trips. Arrow columnar format keeps per-column efficiency.

2. **JSON for small endpoints** — Hexbin, centroids, patients, DE, correlation are small (<200KB total) and have nested/heterogeneous structures. Arrow overhead not justified.

3. **Client-side filtering** — The 2.26M-element Uint8Array mask rebuild takes ~5ms. Server-side filtering would add network latency to every toggle.

4. **Interleaved coords for deck.gl** — Arrow delivers separate x,y columns. Frontend interleaves once at load time for optimal deck.gl `getPosition` performance.

5. **Zustand over Redux** — Minimal boilerplate, supports selectors for fine-grained re-renders, works well with mutable TypedArrays stored by reference.
