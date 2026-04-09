# PLANS.md — UI Redesign: 4-Level Exploration System

## Design Philosophy

"Macro to Micro" funnel: **Global Atlas → Sub-cluster Drill-down → Gene & Signature → Trajectory & CellChat**

Each level narrows the data scope, increases analytical granularity, and unlocks level-specific visualizations. Users navigate via breadcrumb + click-to-drill interactions, never losing context of where they are in the hierarchy.

---

## Phase 0: Critical Fixes (HIGHEST PRIORITY)

### Fix 0A: Light Theme Default + Dark Mode Toggle

**Problem**: 当前 UI 硬编码为暗色主题 (`--bg: #0d1117`, `--surface: #161b22`)，所有组件中也散布着暗色 class（如 `bg-[#0e1621]`、`text-white`）。需要改为默认白色主题，支持手动切换夜间模式。

**Design**: 使用 Tailwind `dark:` variant + CSS 变量双主题系统。`<html>` 标签上通过 `class="dark"` 切换。用户偏好存入 `localStorage`。

**Light theme (default)**:
```
--bg: #ffffff
--surface: #f6f8fa
--border: #d1d9e0
--text: #1f2328
--text-muted: #656d76
--accent: #0969da
```

**Dark theme (opt-in)**:
```
--bg: #0d1117
--surface: #161b22
--border: #30363d
--text: #e6edf3
--text-muted: #8b949e
--accent: #58a6ff
```

**deck.gl 背景**: Light 模式下 deck.gl canvas 背景设为 `#f6f8fa`，dark 模式下 `#0d1117`。centroid label 颜色也需跟随主题反转。

#### TODO

- [x] **P0-01** Modify `frontend/src/index.css` — 将 `:root` 变量改为 light theme 值，新增 `.dark` 选择器下的 dark theme 值。移除所有硬编码暗色。
- [x] **P0-02** Create `frontend/src/stores/themeStore.ts` — Zustand store: `theme: 'light' | 'dark'`, `toggleTheme()`, 初始化时读取 `localStorage.getItem('theme')`，默认 `'light'`。`toggleTheme` 同时更新 `document.documentElement.classList` 和 `localStorage`。
- [x] **P0-03** Create `frontend/src/components/common/ThemeToggle.tsx` — 太阳/月亮图标按钮，调用 `themeStore.toggleTheme()`。放在 Header 右侧。
- [x] **P0-04** Modify `frontend/src/components/layout/Header.tsx` — 添加 `<ThemeToggle />` 到 header 右侧。
- [x] **P0-05** Audit and fix all components — 将所有硬编码暗色 class 替换为 CSS 变量引用或 Tailwind `dark:` variant。需要修改的文件（至少）：
  - `components/navigation/LevelRouter.tsx` — `bg-[#0e1621]` → `bg-[var(--surface)]`
  - `components/level2/ClusterView.tsx` — `bg-[#0e1621]/90` → `bg-[var(--surface)]/90`，`text-white` → `text-[var(--text)]`
  - `components/navigation/Breadcrumb.tsx` — 检查暗色引用
  - `components/layout/Header.tsx` — `bg-[var(--surface)]` 已用变量，确认 OK
  - `components/level1/GlobalSidebar.tsx` — 检查暗色引用
  - `components/level1/HexbinMap.tsx` — deck.gl 背景色需跟随主题
  - `components/level2/ClusterSidebar.tsx` — 检查暗色引用
  - `components/level3/GeneSidebar.tsx` — 检查暗色引用
  - `components/level3/GeneExplorer.tsx` — 检查暗色引用
  - `components/common/LoadingOverlay.tsx` — `bg-black/70` 在 light 模式下需调整
  - `components/charts/*.tsx` — Canvas 绘制颜色需读取 CSS 变量或接受 theme prop
- [x] **P0-06** Modify `frontend/src/components/map/UmapView.tsx` 和 Level 1/2 的 deck.gl 组件 — 根据 `themeStore.theme` 设置 `DeckGL` 的 `style.background` 属性。Light: `#f6f8fa`, Dark: `#0d1117`。
- [x] **P0-07** Modify `frontend/src/lib/colors.ts` 和 `lib/colorScales.ts` — centroid TextLayer 颜色需根据主题切换：light 模式下用深色文字 + 白色描边，dark 模式下用白色文字 + 黑色描边。

---

### Fix 0B: Static Data — 消除 Arrow IPC 运行时序列化，全部使用预生成静态文件

**Problem**: 当前 Level 2 drill-down 时，前端请求 `GET /api/cells`，后端从 numpy 数组实时构建 Arrow RecordBatch 并序列化为 IPC 流（~48MB）。这导致：
1. 首次请求慢（后端需要读取 binary 文件 + 构建 Arrow batch + 序列化）
2. 如果后端未启动或响应慢，前端卡在 "Processing data..." 不动
3. 基因表达也是运行时从 h5ad 读取 + Arrow 序列化

**Solution**: 预处理阶段直接生成 Arrow IPC 文件，后端只做静态文件服务（`FileResponse`），前端直接 fetch 静态 `.arrow` 文件。零运行时计算。

**预处理新增输出**:
- `data/processed/cells.arrow` — 预生成的 Arrow IPC 文件（包含 x, y, senescence, 所有 meta 列）
- `data/processed/gene_density/{GENE}.arrow` — 预生成的基因表达 Arrow IPC 文件（按需缓存后也是静态文件）

**后端改动**: `/api/cells` 改为 `FileResponse('cells.arrow')`，不再运行时构建。`/api/gene/{name}` 先检查 `.arrow` 缓存文件，命中则直接 `FileResponse`；未命中时从 h5ad 读取后同时写入 `.arrow` 缓存。

**前端改动**: 无需改动（仍然 `fetchArrowTable('/api/cells')`），但响应速度大幅提升。

#### TODO

- [x] **P0-08** Create `preprocess/step6_arrow.py` — 新预处理步骤：读取 coords.bin + meta.bin + senescence.bin + schema.json，构建 Arrow RecordBatch，写入 `data/processed/cells.arrow`。在 `run_all.py` 中添加此步骤。
- [x] **P0-09** Modify `backend/server/data_cache.py` — `cells_ipc` 属性改为：先检查 `data/processed/cells.arrow` 文件是否存在，存在则直接 `open().read()` 返回字节；不存在时 fallback 到运行时构建（向后兼容）。
- [x] **P0-10** Modify `backend/server/routes.py` — `/api/cells` 端点改为优先使用 `FileResponse('cells.arrow')` 直接返回静态文件，避免将整个文件读入 Python 内存。
- [x] **P0-11** Modify `backend/server/gene_service.py` — `get_gene_arrow()` 改为：先检查 `gene_density/{GENE}.arrow` 文件，命中则 `FileResponse`；未命中时从 h5ad 读取后写入 `.arrow` 文件并返回。后续请求直接走静态文件。
- [x] **P0-12** Modify `preprocess/run_all.py` — 在 step5 之后添加 step6_arrow 调用。
- [x] **P0-13** Modify `preprocess/validate_outputs.py` — 添加 `cells.arrow` 到必需文件检查列表。

---

## Level 1: Global Atlas (宏观全局图谱)

### What the user sees

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Breadcrumb: Global Atlas]                    2,259,122 cells total │
├────────────┬────────────────────────────────────────────────────────┤
│            │                                                        │
│  Color By  │              Hexbin Density Map                        │
│  ○ CellType│         (pre-aggregated, ~3K hexagons)                 │
│  ○ Age     │                                                        │
│  ○ IDH     │         Each hex colored by dominant cell type         │
│  ○ Senesc. │         or senescence mean, sized by count             │
│            │                                                        │
│ ────────── │         [Centroid labels: AC, TAM, Malignant...]       │
│            │                                                        │
│  Cell Type │         Click any cluster region → drill to Level 2    │
│  Composit. │                                                        │
│  (pie/bar) │                                                        │
│            │                                                        │
│ ────────── ├────────────────────────────────────────────────────────┤
│            │  Summary Stats Bar                                     │
│  Patient   │  9 cell types | 120 donors | IDH: 60% WT / 40% Mut   │
│  Overview  │  Age: 35% ≤55 / 30% 55-65 / 35% ≥65                  │
│  (counts)  │  Senescence: mean 0.32 ± 0.18                         │
└────────────┴────────────────────────────────────────────────────────┘
```

### Rendering strategy
- Default: `HexbinLayer` from pre-computed `hexbin.json` (~128KB, instant load)
- Color modes: dominant CellType per hex, mean senescence, mean age group proportion
- Centroid labels from `centroids.json` always visible
- NO individual cell rendering at this level — pure aggregation

### Left panel content
- Color mode selector (CellType / Age / IDH / Senescence)
- Cell type composition chart (horizontal stacked bar or mini pie)
- Patient count summary (grouped by IDH, stage, age)
- Global senescence distribution (mini histogram)

### Drill-down interaction
- Click a centroid label or hexbin cluster → sets `navigationStore.selectedCellType` → transitions to Level 2
- Alternatively: click a cell type in the composition chart → same drill-down

### Data requirements
- Already available: `hexbin.json`, `centroids.json`, `schema.json`, `stats` endpoint
- New preprocessing needed: **None**

### TODO

- [x] **P1-01** Create `stores/navigationStore.ts` — manages current level (1-4), drill-down history stack, selected cell type, selected sub-cluster, breadcrumb state
- [x] **P1-02** Create `components/navigation/Breadcrumb.tsx` — clickable breadcrumb trail: "Global Atlas > TAM > APOE > Trajectory". Click any segment to navigate back.
- [x] **P1-03** Create `components/navigation/LevelTransition.tsx` — animated transition wrapper between levels (fade/slide)
- [x] **P1-04** Create `components/level1/HexbinMap.tsx` — deck.gl hexbin visualization using pre-computed `hexbin.json`. Color by dominant celltype or senescence mean. Click hex → identify cluster → drill to Level 2.
- [x] **P1-05** Create `components/level1/GlobalSidebar.tsx` — left panel for Level 1: color mode selector, cell type composition bar chart, patient summary counts, senescence histogram
- [x] **P1-06** Create `components/level1/CompositionChart.tsx` — horizontal stacked bar chart showing cell type proportions. Clickable bars → drill to Level 2.
- [x] **P1-07** Create `components/level1/SummaryStatsBar.tsx` — bottom bar with key global statistics (cell count, donor count, IDH split, age distribution, mean senescence)
- [x] **P1-08** Modify `hooks/useInitData.ts` — initial load fetches only schema + hexbin + centroids + stats (lightweight). Full cell data deferred to Level 2 entry.
- [x] **P1-09** Modify `App.tsx` — replace fixed layout with level-aware router: render Level 1/2/3/4 components based on `navigationStore.currentLevel`

---

## Level 2: Sub-cluster Drill-down (亚群精细探索)

### What the user sees

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Global Atlas > TAM (Tumor-Associated Macrophages)]   385,210 cells│
├────────────┬────────────────────────────────────────────────────────┤
│            │                                                        │
│  Filters   │         ScatterplotLayer (filtered cells only)         │
│  □ IDH     │         Colored by CellType_Level2 sub-clusters:       │
│  □ Stage   │           BDM (blue), MG (green), Mon (orange),        │
│  □ Age     │           DC (purple), Mast (pink)                     │
│  □ Sex     │                                                        │
│            │         Hover → tooltip: cell type, donor, senescence  │
│ ────────── │         Lasso select → show stats for selection        │
│            │         Click sub-cluster label → drill to Level 3     │
│  Sub-types │                                                        │
│  ■ BDM  52%├────────────────────────────────────────────────────────┤
│  ■ MG   31%│  Analysis Tabs                                        │
│  ■ Mon  12%│  [Sub-type Proportions] [Senescence by Sub-type]      │
│  ■ DC    3%│  [Patient Breakdown]    [DE Genes ▼]                  │
│  ■ Mast  2%│                                                        │
│            │  Waterfall: top DE genes for TAM (senescent vs non-)   │
│ ────────── │  Click gene bar → drill to Level 3 with that gene     │
│  Donor     │                                                        │
│  Highlight │                                                        │
│  [search]  │                                                        │
└────────────┴────────────────────────────────────────────────────────┘
```

### Rendering strategy
- On entering Level 2: apply CellType filter mask → load only matching cells into ScatterplotLayer
- Cell count typically 100K-400K depending on cell type → use density (HeatmapLayer) if >50K, scatter if <50K
- Color by CellType_Level2 sub-clusters within the selected major type
- Centroid labels for sub-clusters only

### Left panel content
- Clinical filters (IDH, stage, age, sex) — same filter chips as before
- Sub-type breakdown (mini bar chart with counts and percentages)
- Donor search + highlight

### Analysis panel (bottom)
- Tab 1: Sub-type proportion stacked bar (across clinical conditions)
- Tab 2: Senescence score violin/box per sub-type
- Tab 3: Patient breakdown table (filtered to this cell type)
- Tab 4: DE waterfall chart (from `de_results.json` for selected cell type)

### Drill-down interaction
- Click sub-cluster centroid label → sets `navigationStore.selectedSubCluster` → Level 3 with that sub-type focused
- Click DE gene bar → sets `colorStore.geneName` → Level 3 with gene expression overlay
- Both paths lead to Level 3

### Data requirements
- Already available: full cell data (Arrow IPC), filter mask, DE results per cell type, patient data
- New preprocessing needed: **None** (sub-cluster centroids can be computed client-side from filtered data)

### TODO

- [x] **P2-01** Create `components/level2/ClusterView.tsx` — main deck.gl view for Level 2. Applies CellType filter, renders ScatterplotLayer colored by CellType_Level2. Adaptive: HeatmapLayer if >50K visible, ScatterplotLayer if <50K.
- [x] **P2-02** Create `components/level2/ClusterSidebar.tsx` — left panel: clinical filters, sub-type breakdown chart, donor search
- [x] **P2-03** Create `components/level2/SubtypeBreakdown.tsx` — horizontal bar chart showing sub-cluster proportions within selected cell type. Clickable → drill to Level 3.
- [x] **P2-04** Create `components/level2/ClusterAnalysis.tsx` — bottom tabbed panel: sub-type proportions, senescence violin, patient table, DE waterfall
- [x] **P2-05** Create `components/charts/ViolinPlot.tsx` — Canvas 2D violin/box plot for senescence distribution per sub-type. Reusable for Level 3.
- [x] **P2-06** Create `components/charts/WaterfallChart.tsx` — Canvas 2D waterfall (bar chart sorted by log2FC). Click bar → drill to Level 3 with gene. Port from legacy `static/js/charts.js`.
- [x] **P2-07** Create `components/charts/PatientTable.tsx` — sortable table filtered to current cell type. Columns: donor_id, n_cells, IDH, stage, age, sex, senescence_mean. Click row → highlight donor on map.
- [x] **P2-08** Modify `stores/filterStore.ts` — add `setCellTypeFilter(cellType: string)` action that auto-applies when entering Level 2 from Level 1 drill-down
- [x] **P2-09** Create `hooks/useClusterStats.ts` — computes sub-cluster centroids, proportions, and senescence stats from filtered data (client-side, memoized)
- [x] **P2-10** Modify `stores/dataStore.ts` — add lazy loading: full cell Arrow IPC data loaded on first Level 2 entry (not at app init). Show progress indicator during load.

---

## Level 3: Gene & Senescence Signature (基因与衰老特征)

### What the user sees

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Global > TAM > BDM sub-cluster]  Gene: APOE       198,432 cells   │
├────────────┬──────────────────────────┬─────────────────────────────┤
│            │                          │                             │
│  Gene      │   Feature Plot (UMAP)   │   Violin Plot               │
│  Search    │   Cells colored by APOE  │   APOE expression by:       │
│  [APOE   ] │   expression intensity   │   - Age group               │
│  [Load]    │   (blue→yellow→red)      │   - IDH status              │
│            │                          │   - Senescent vs Non-sen.   │
│ ────────── │                          │                             │
│            │                          │                             │
│  Signature │                          │                             │
│  Presets   ├──────────────────────────┼─────────────────────────────┤
│  ○ SASP    │                          │                             │
│  ○ Cell    │   Dot Plot               │   Correlation Scatter       │
│    Cycle   │   Top DE genes ×         │   Gene expr vs Senescence   │
│    Arrest  │   sub-clusters           │   score (per cell)          │
│  ○ DNA     │   Size = % expressing    │   with regression line      │
│    Damage  │   Color = mean expr      │                             │
│  ○ Anti-   │                          │                             │
│    Apoptot.│                          │                             │
│  ○ Custom  │                          │                             │
│            │                          │                             │
└────────────┴──────────────────────────┴─────────────────────────────┘
```

### Layout
- Split into 2×2 grid on the right side:
  - Top-left: Feature Plot (UMAP colored by gene expression)
  - Top-right: Violin Plot (expression across conditions)
  - Bottom-left: Dot Plot (genes × sub-clusters)
  - Bottom-right: Correlation scatter (gene vs senescence)

### Left panel content
- Gene search input (with autocomplete from gene index)
- Senescence signature presets (curated gene sets from step2_senescence.py):
  - SASP: IL6, IL8, CXCL1-3, CCL2-5, MMP1/3/9/10, SERPINE1/2, IGFBP3/5/7, VEGFA, FGF2, HGF, AREG
  - Cell Cycle Arrest: CDKN1A, CDKN2A, CDKN2B, TP53, RB1
  - DNA Damage: ATM, ATR, CHEK1/2, H2AFX
  - Anti-Apoptotic: BCL2, BCL2L1, MCL1
  - Custom: user-defined gene list
- Selecting a signature → compute mean expression across gene set → color UMAP by signature score

### Data requirements
- Already available: gene expression via `/api/gene/{name}`, DE results, senescence scores, all metadata
- New backend endpoint needed: `POST /api/signature` — accepts gene list, returns mean expression score per cell (Arrow IPC)
- New preprocessing: **None** (signature scoring done on-the-fly server-side)

### TODO

- [x] **P3-01** Create `components/level3/GeneExplorer.tsx` — main Level 3 layout: 2×2 grid with Feature Plot, Violin, Dot Plot, Correlation scatter
- [x] **P3-02** Create `components/level3/GeneSidebar.tsx` — left panel: gene search with autocomplete, signature presets, selected gene info
- [x] **P3-03** Create `components/level3/FeaturePlot.tsx` — deck.gl ScatterplotLayer colored by gene expression (blue→yellow→red). Reuses filtered cell positions from Level 2.
- [x] **P3-04** Create `components/charts/ViolinPlotMulti.tsx` — multi-group violin plot: gene expression split by age group / IDH / senescent class. Canvas 2D.
- [x] **P3-05** Create `components/charts/DotPlot.tsx` — genes (rows) × sub-clusters (columns). Circle size = % cells expressing. Circle color = mean expression. Canvas 2D.
- [x] **P3-06** Create `components/charts/CorrelationScatter.tsx` — gene expression (x) vs senescence score (y) per cell. Subsample to ~5K points for performance. Show Spearman r + regression line.
- [x] **P3-07** Create `components/level3/SignaturePresets.tsx` — radio buttons for curated senescence gene sets. Selecting a preset triggers signature score computation.
- [x] **P3-08** Add backend endpoint `POST /api/signature` in `backend/server/routes.py` — accepts `{ genes: string[] }`, computes mean normalized expression across genes per cell, returns Arrow IPC (Float32 column).
- [x] **P3-09** Add `backend/server/signature_service.py` — loads multiple gene columns from h5ad, normalizes, computes mean score, serializes to Arrow IPC. Cache result by gene set hash.
- [x] **P3-10** Create `components/level3/GeneAutocomplete.tsx` — input with debounced autocomplete against gene index. Backend already has gene_index in data_cache.
- [x] **P3-11** Add backend endpoint `GET /api/genes/search?q=APO` in `backend/server/routes.py` — returns top 20 matching gene names from gene_index for autocomplete.
- [x] **P3-12** Modify `stores/colorStore.ts` — add `loadSignature(genes: string[])` action that calls `/api/signature` and stores result as `signatureScore: Float32Array`

---

## Level 4: Trajectory & Cell Communication (拟时序与细胞通讯)

### What the user sees

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Global > TAM > BDM > Trajectory]                                  │
├────────────┬──────────────────────────┬─────────────────────────────┤
│            │                          │                             │
│  Mode      │   Pseudotime UMAP       │   Gene Trend Along          │
│  ○ Pseudo- │   Cells colored by      │   Pseudotime                │
│    time    │   pseudotime value       │   (line plot, top genes)    │
│  ○ CellChat│   (purple→yellow)       │                             │
│            │   Arrow overlay showing  │   X: pseudotime             │
│ ────────── │   trajectory direction   │   Y: expression             │
│            │                          │   Lines: CDKN1A, IL6, etc.  │
│  Trajectory│                          │                             │
│  Root Cell │                          │                             │
│  [Auto]    ├──────────────────────────┼─────────────────────────────┤
│            │                          │                             │
│ ────────── │   CellChat Network      │   L-R Pair Heatmap          │
│            │   Force-directed graph   │   Ligand-Receptor pairs     │
│  CellChat  │   Nodes = cell types     │   between cell types        │
│  Pathway   │   Edges = interactions   │   Color = interaction       │
│  ○ All     │   Width = strength       │   strength                  │
│  ○ SASP    │                          │                             │
│  ○ Cytokine│                          │                             │
│            │                          │                             │
└────────────┴──────────────────────────┴─────────────────────────────┘
```

### Data requirements — NOT YET AVAILABLE
This level requires new preprocessing that does not currently exist:

1. **Pseudotime inference** — requires RNA velocity (scVelo) or diffusion pseudotime (scanpy `dpt`)
2. **CellChat analysis** — requires CellChat R package or Python equivalent (e.g., `liana`)

### TODO

- [x] **P4-01** Create `preprocess/step7_trajectory.py` — compute pseudotime using `scanpy.tl.dpt` (diffusion pseudotime) per major cell type. Output: `trajectory_{celltype}.bin` (float32 pseudotime per cell) + `trajectory_{celltype}_genes.json` (top varying genes along trajectory).
- [x] **P4-02** Create `preprocess/step8_cellchat.py` — compute cell-cell communication summary. Output: `cellchat.json` with ligand-receptor pairs, source/target cell types, interaction scores.
- [x] **P4-03** Add backend endpoints: `GET /api/trajectory/{celltype}` → Arrow IPC (pseudotime values), `GET /api/trajectory/{celltype}/genes` → JSON (gene trends), `GET /api/cellchat` → JSON (interaction network)
- [x] **P4-04** Create `components/level4/TrajectoryView.tsx` — main Level 4 layout: 2×2 grid with pseudotime UMAP, gene trends, CellChat network, L-R heatmap
- [x] **P4-05** Create `components/level4/PseudotimeMap.tsx` — deck.gl ScatterplotLayer colored by pseudotime (purple→yellow). Optional arrow overlay for trajectory direction.
- [x] **P4-06** Create `components/charts/GeneTrendPlot.tsx` — line chart: X = pseudotime bins, Y = mean expression. Multiple gene lines with legend. Canvas 2D or lightweight SVG.
- [x] **P4-07** Create `components/level4/CellChatNetwork.tsx` — force-directed graph (d3-force or deck.gl ArcLayer). Nodes = cell types, edges = interaction strength. Filterable by pathway.
- [x] **P4-08** Create `components/charts/LRHeatmap.tsx` — ligand-receptor pair heatmap. Rows = L-R pairs, columns = cell type pairs. Color = interaction score.
- [x] **P4-09** Create `components/level4/TrajectorySidebar.tsx` — left panel: mode toggle (pseudotime/cellchat), trajectory root cell selector, CellChat pathway filter

---

## Cross-Cutting: Navigation & State Architecture

### Navigation State

```typescript
// stores/navigationStore.ts
interface NavigationState {
  currentLevel: 1 | 2 | 3 | 4;
  history: BreadcrumbEntry[];       // stack for back-navigation
  selectedCellType: string | null;  // Level 1 → 2 (e.g., "TAM")
  selectedSubCluster: string | null;// Level 2 → 3 (e.g., "BDM")
  selectedGene: string | null;      // Level 3 context
  
  drillDown: (target: DrillDownTarget) => void;
  navigateBack: (toLevel: number) => void;
  reset: () => void;
}
```

### Data Loading Strategy (Progressive)

```
Level 1 (instant):
  App init → schema.json + hexbin.json + centroids.json + stats
  Total: ~160KB, loads in <200ms

Level 2 (on drill-down):
  First entry → /api/cells (Arrow IPC, ~48MB)
  Cached after first load. Progress bar during download.
  Subsequent drill-downs reuse cached data with different filter masks.

Level 3 (on gene select):
  Per gene → /api/gene/{name} (Arrow IPC, ~8.6MB)
  Per signature → /api/signature (Arrow IPC, ~8.6MB)
  Cached per gene/signature.

Level 4 (on trajectory entry):
  Per cell type → /api/trajectory/{type} (Arrow IPC, ~2MB)
  CellChat → /api/cellchat (JSON, ~50KB)
  Loaded once per session.
```

### TODO

- [x] **PX-01** Create `stores/navigationStore.ts` — level state, drill-down history, breadcrumb management
- [x] **PX-02** Create `components/navigation/Breadcrumb.tsx` — clickable breadcrumb: "Global Atlas > TAM > BDM > APOE". Each segment navigable.
- [x] **PX-03** Create `components/navigation/LevelRouter.tsx` — conditional renderer: switches between Level 1/2/3/4 component trees based on `navigationStore.currentLevel`
- [x] **PX-04** Refactor `App.tsx` — replace current fixed layout with: `<Header>` + `<Breadcrumb>` + `<LevelRouter>`. Each level has its own sidebar + main + analysis layout.
- [x] **PX-05** Refactor `hooks/useInitData.ts` — split into `useLevel1Data()` (lightweight, app init) and `useLevel2Data()` (heavy, on first drill-down). Lazy loading pattern.
- [x] **PX-06** Add loading states per level in `stores/uiStore.ts` — `levelLoading: Record<number, boolean>`, `levelProgress: Record<number, string>`
- [x] **PX-07** Create `components/common/LoadingOverlay.tsx` — reusable loading overlay with progress message, used during level transitions

---

## Shared / Reusable Components

- [x] **PS-01** Create `components/common/MiniHistogram.tsx` — small Canvas histogram for sidebar use (senescence distribution, expression distribution)
- [x] **PS-02** Create `components/common/StackedBar.tsx` — horizontal stacked bar chart for composition views
- [x] **PS-03** Create `components/common/Tooltip.tsx` — unified tooltip component for deck.gl hover and chart hover
- [x] **PS-04** Create `components/common/TabPanel.tsx` — reusable tabbed panel container (replaces current AnalysisPanel tab logic)
- [x] **PS-05** Create `lib/colorScales.ts` — centralized color scale functions: categorical palettes, sequential (senescence), diverging (correlation), pseudotime

---

## Implementation Priority

### Phase 0: Critical Fixes (DO FIRST)
P0-01 through P0-13 (light theme + static data)

### Phase 1: Navigation Framework + Level 1 (foundation)
PX-01, PX-02, PX-03, PX-04, PX-05, PX-06, PX-07,
P1-01 through P1-09, PS-01 through PS-05

### Phase 2: Level 2 — Sub-cluster Drill-down
P2-01 through P2-10

### Phase 3: Level 3 — Gene & Signature
P3-01 through P3-12

### Phase 4: Level 4 — Trajectory & CellChat (requires new preprocessing)
P4-01 through P4-09

---

## New Backend Endpoints Summary

| Endpoint | Method | Response | Level | Status |
|----------|--------|----------|-------|--------|
| `GET /api/cells` | GET | Static Arrow IPC file (`cells.arrow`) | L2 | **Refactor** → FileResponse |
| `GET /api/gene/{name}` | GET | Static Arrow IPC file (cached `.arrow`) | L3 | **Refactor** → FileResponse |
| `GET /api/genes/search?q=` | GET | JSON | L3 | **New** |
| `POST /api/signature` | POST | Arrow IPC | L3 | **New** |
| `GET /api/trajectory/{celltype}` | GET | Arrow IPC | L4 | **New** (needs preprocessing) |
| `GET /api/trajectory/{celltype}/genes` | GET | JSON | L4 | **New** (needs preprocessing) |
| `GET /api/cellchat` | GET | JSON | L4 | **New** (needs preprocessing) |

---

## New Preprocessing Steps Summary

| Script | Output | Level | Priority |
|--------|--------|-------|----------|
| `step6_arrow.py` | `cells.arrow` (pre-built Arrow IPC, ~48MB) | L2 | **Phase 0** |
| `step7_trajectory.py` | `trajectory_{type}.bin`, `trajectory_{type}_genes.json` | L4 | Phase 4 |
| `step8_cellchat.py` | `cellchat.json` | L4 | Phase 4 |

Levels 1-3 require NO new preprocessing beyond `step6_arrow.py` — all other data already exists.
