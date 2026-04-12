# PLANS.md — 三级下钻路由 & Layout 重构

## 实施状态

状态：核心迁移已完成并通过 `frontend` 下 `npm run build`、`npm run lint` 验证。

已完成范围：

- [x] `react-router-dom@^7` 已安装并接入
- [x] `App.tsx` 已切到 `BrowserRouter + lazy routes`
- [x] `MainLayout / Sidebar / TopNav` 已落地
- [x] `DashboardPage / ExplorerPage / AboutPage` 已创建并接入
- [x] `navigationStore` 已移除 `currentLevel/history/drillDown`，只保留选择状态
- [x] `useInitData` 已拆为 `useInitDashboardData + useInitExplorerData`
- [x] `CellDrawer` 已接入 `/explorer/cell/:cellId`
- [x] `LevelRouter / LevelTransition / Breadcrumb` 已删除
- [x] 路由切换淡入动画已接入

当前保留的后续工作：

- [ ] 浏览器手工验收：前进/后退、书签分享、直接深链访问
- [ ] 如需更强单细胞详情，再决定是否增加独立 `/api/cell/:id` 接口
- [ ] 清理旧计划中与新 URL 路由语义冲突的 Level 2/3/4 描述

## 设计理念

从 Zustand 条件渲染迁移到 `react-router-dom` v7 URL 路由，实现三级下钻：

**Dashboard (`/`) → Explorer (`/explorer`) → Cell Profiler (`/explorer/cell/:cellId`)**

支持浏览器前进/后退、书签分享、深链接。参考 `/data/zhouran/proj/20250320_claude_server` 的技术路线（BrowserRouter + lazy loading + TopNav/Sidebar 布局）。

---

## 路由结构

| Level | 路径 | 页面 | 说明 |
|-------|------|------|------|
| 1 | `/` | DashboardPage | 临床统计图表 + 降采样 UMAP 概览 |
| 2 | `/explorer` | ExplorerPage | 200 万细胞 WebGL 交互工作台（全屏，隐藏侧边栏） |
| 3 | `/explorer/cell/:cellId` | CellDrawer | 单细胞详情抽屉（嵌套路由，覆盖在 Explorer 之上） |
| — | `/about` | AboutPage | 项目介绍 |
| — | `*` | → `/` | 兜底重定向 |

Level 3 采用嵌套路由 + 右侧 Drawer 弹出，不离开 Explorer 页面，保留视口和过滤状态。

---

## 新增依赖

```bash
cd frontend && npm install react-router-dom@^7
```

---

## 文件变更清单

### 新建文件

| 文件 | 用途 |
|------|------|
| `src/layouts/MainLayout.tsx` | 全局布局：TopNav + Sidebar（条件显示） + `<Outlet />` |
| `src/layouts/Sidebar.tsx` | 侧边导航栏（Home / Explorer / About） |
| `src/layouts/TopNav.tsx` | 顶部导航栏 + 面包屑 + 主题切换 |
| `src/pages/DashboardPage.tsx` | Level 1 仪表盘（包裹现有 Level 1 组件） |
| `src/pages/ExplorerPage.tsx` | Level 2 Explorer（包裹现有 Level 2/3/4 组件 + CellDrawer） |
| `src/pages/AboutPage.tsx` | About 页面 |
| `src/components/cell-profiler/CellDrawer.tsx` | Level 3 单细胞详情抽屉 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `src/App.tsx` | 替换为 BrowserRouter + Routes + lazy loading |
| `src/stores/navigationStore.ts` | 简化：移除 currentLevel/LevelRouter 逻辑，保留选择状态 |
| `src/hooks/useInitData.ts` | 拆分为 useInitDashboardData + useInitExplorerData |
| `src/components/map/UmapView.tsx` | 新增 `onCellClick` 透传，用于 URL 深链打开 cell drawer |
| `src/hooks/useDeckLayers.ts` | ScatterplotLayer 支持 cell click picking |
| `src/components/level1/HexbinMap.tsx` | Level 1 点击改为写入选择状态并跳转 `/explorer` |
| `src/components/level1/CompositionChart.tsx` | 组合图点击改为路由导航 |
| `src/components/level2/ClusterView.tsx` | 子群点击改为更新选择状态 |
| `src/components/level2/ClusterAnalysis.tsx` | gene 选择改为写入 store，不再走旧 level drillDown |
| `src/components/level2/SubtypeBreakdown.tsx` | 子群按钮改为更新选择状态 |
| `src/components/level3/GeneSidebar.tsx` | 与新 navigationStore 适配 |

### 删除文件

| 文件 | 原因 |
|------|------|
| `src/components/navigation/LevelRouter.tsx` | 被 react-router 替代 |
| `src/components/navigation/LevelTransition.tsx` | 被路由过渡动画替代 |
| `src/components/navigation/Breadcrumb.tsx` | 被 TopNav 内置面包屑替代 |

---

## 核心代码设计

### 1. App.tsx — 路由配置

```tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { LoadingOverlay } from './components/common/LoadingOverlay';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExplorerPage = lazy(() => import('./pages/ExplorerPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingOverlay />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="explorer" element={<ExplorerPage />}>
              <Route path="cell/:cellId" element={null} />
            </Route>
            <Route path="about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

实际实现中，Level 3 的 `cell/:cellId` 仍不渲染独立 page element，而是在 `ExplorerPage` 内通过 `useMatch('/explorer/cell/:cellId')` 控制 `CellDrawer` 显示。

### 2. MainLayout.tsx — 全局布局

```tsx
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export function MainLayout() {
  const { pathname } = useLocation();
  const isExplorer = pathname.startsWith('/explorer');

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-gray-950">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        {!isExplorer && <Sidebar />}
        <main className="flex-1 overflow-hidden">
          <div key={pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
```

Explorer 全屏 WebGL 画布，隐藏侧边栏。Dashboard/About 显示侧边栏。

### 3. Sidebar.tsx — 侧边导航

```tsx
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/explorer', label: 'Explorer' },
  { to: '/about', label: 'About' },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 p-4">
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

### 4. TopNav.tsx — 顶部导航 + 面包屑

```tsx
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from '../components/common/ThemeToggle';

export function TopNav() {
  const { pathname } = useLocation();
  const crumbs = [{ label: 'GBM Atlas', to: '/' }];
  if (pathname.startsWith('/explorer')) crumbs.push({ label: 'Explorer', to: '/explorer' });
  if (pathname.startsWith('/about')) crumbs.push({ label: 'About', to: '/about' });

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b
      border-gray-200 bg-white/80 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <nav className="flex items-center gap-1 text-sm">
        {crumbs.map((c, i) => (
          <span key={c.to} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-400">/</span>}
            <Link to={c.to} className="text-gray-600 hover:text-gray-900
              dark:text-gray-400 dark:hover:text-gray-100">{c.label}</Link>
          </span>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  );
}
```

### 5. ExplorerPage.tsx — Level 2 + Level 3 嵌套

```tsx
import { useMatch, useNavigate } from 'react-router-dom';
import { CellDrawer } from '../components/cell-profiler/CellDrawer';

export default function ExplorerPage() {
  useInitExplorerData();
  const navigate = useNavigate();
  const cellMatch = useMatch('/explorer/cell/:cellId');

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />
        <UmapView onCellClick={(id) => navigate(`/explorer/cell/${id}`)} />
      </div>
      <AnalysisPanel />
      {cellMatch?.params.cellId && (
        <CellDrawer cellId={cellMatch.params.cellId} onClose={() => navigate('/explorer')} />
      )}
    </div>
  );
}
```

### 6. 路由过渡动画

CSS 淡入，无需额外库：

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fade-in 200ms ease-out; }
```

MainLayout 中 `<Outlet />` 外层包裹 `<div key={pathname} className="animate-fade-in">`。

---

## 数据加载策略

| 路由 | 加载内容 | Hook |
|------|----------|------|
| `/` | schema, hexbin, centroids, stats, patients (~160KB) | `useInitDashboardData` |
| `/explorer` | 全量 cells Arrow IPC (~48MB) + filters | `useInitExplorerData` |
| `/explorer/cell/:cellId` | 单细胞详情（当前由已加载 typed arrays 本地派生） | `CellDrawer + dataStore` |

Explorer 数据首次进入时加载，缓存在 Zustand store，返回 Dashboard 再回来不重新加载。当前 `CellDrawer` 不额外发请求，而是直接基于已加载的 cell-level arrays 与 schema 分类表回查。

---

## navigationStore 简化

```ts
interface NavigationState {
  selectedCellType: string | null;
  selectedSubCluster: string | null;
  selectedGene: string | null;
  setSelectedCellType: (ct: string | null) => void;
  setSelectedSubCluster: (sc: string | null) => void;
  setSelectedGene: (gene: string | null) => void;
  reset: () => void;
}
```

面包屑和 level 逻辑完全由 react-router-dom 的 useLocation / useParams 驱动。

---

## 迁移步骤

1. [x] `npm install react-router-dom@^7`
2. [x] 创建 `src/layouts/` — MainLayout.tsx、Sidebar.tsx、TopNav.tsx
3. [x] 创建 `src/pages/` — DashboardPage.tsx、ExplorerPage.tsx、AboutPage.tsx
4. [x] 重写 App.tsx 为 BrowserRouter + Routes
5. [x] 拆分 useInitData → useInitDashboardData + useInitExplorerData
6. [x] 简化 navigationStore.ts，移除 level 条件逻辑
7. [x] 创建 CellDrawer.tsx（Level 3 抽屉）
8. [x] 删除废弃的 LevelRouter.tsx、LevelTransition.tsx、Breadcrumb.tsx
9. [x] 添加路由过渡 CSS 动画
10. [ ] 手工验证：浏览器前进/后退、直接访问 `/explorer`、深链接 `/explorer/cell/:cellId`

## 本次代码实现与原设计的差异

- `TopNav` 额外展示了总细胞数和当前 filter mask 数量，便于替代旧 Header 的一部分状态信息。
- `ExplorerPage` 没有继续复用旧的 `Header + FilterPanel` 结构，而是直接组合现有 `LeftPanel + UmapView + AnalysisPanel`。
- `CellDrawer` 当前展示的是本地可直接回查的分类字段与基础 quantitative 信息，没有新增后端单细胞详情接口。
- 旧的 Level 2/3/4 组件仍保留在仓库中，但不再承担 URL 路由切换职责；它们现在更多作为 Explorer 内部分析组件存在。

---

## 以下为原有计划内容（保留参考）

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

---

# 增补计划 — 一级预览页面 Dashboard (`frontend/src/pages/Dashboard.tsx`)

## 目标

仅规划 Level 1 首页仪表盘的页面实现方案，不落地代码。目标页面用于一级预览和导流：

- 顶部展示 4 个核心统计卡片
- 中部展示临床统计图表区
- 右侧或主体区域展示全局 UMAP 预览占位
- 提供明确 CTA 按钮进入 Level 2 交互式 Atlas

---

## 实现范围

### 页面文件

- 新建 `frontend/src/pages/Dashboard.tsx`

### 可复用现有组件

- `frontend/src/components/level1/SummaryStatsBar.tsx`
  现有功能与新设计重叠，但视觉层级不足，建议不要直接挂载，改为将其统计逻辑迁移到新的 `StatCard` 风格布局中。
- `frontend/src/components/level1/CompositionChart.tsx`
  如内部实现可复用，可吸收到“Clinical Demographics”区域；否则用新图表直接替代。
- `frontend/src/components/level1/HexbinMap.tsx`
  可作为全局 UMAP 预览的技术参考；但首页需要更轻量的占位版，不建议直接复用重交互版本。
- `frontend/src/components/level1/GlobalSidebar.tsx`
  Dashboard 改版后不应继续作为首页主结构，建议由 `Dashboard.tsx` 直接控制布局。

### 可能新增的轻量组件

- `frontend/src/components/dashboard/StatCard.tsx`
- `frontend/src/components/dashboard/SectionCard.tsx`
- `frontend/src/components/dashboard/AtlasPreviewCard.tsx`

如果不希望增加文件数，也可全部内联在 `Dashboard.tsx` 内完成首版。

---

## 依赖建议

当前 `frontend/package.json` 未包含 `recharts` 或 `echarts`。

### 推荐方案

- 首版优先使用 `recharts`

原因：

- React 组件式 API 更适合快速拼 Dashboard
- Donut / Bar / Stacked Bar 足够覆盖本次需求
- 对 Mock 数据预览更直接，代码体量小于 ECharts

### 计划中的依赖变更

```bash
cd frontend && npm install recharts
```

如果团队更偏好配置驱动图表，可改为 `echarts` + `echarts-for-react`，但本次首页场景没有明显必要。

---

## 页面布局规划

### 总体结构

建议使用 3 段式布局：

1. 顶部 Hero + 统计卡片区
2. 中部临床统计区
3. 右侧或下方 UMAP 预览区 + CTA

### 响应式栅格

- `xl` 屏：
  左 8 列为统计与图表，右 4 列为 Global Overview
- `md` 到 `lg`：
  图表区双列，UMAP 预览下移
- `sm`：
  全部单列堆叠

### 页面骨架

```tsx
<div className="min-h-full bg-[dashboard-bg]">
  <section>{/* title + subtitle + stat cards */}</section>
  <section>{/* clinical demographics charts */}</section>
  <aside>{/* atlas preview + CTA */}</aside>
</div>
```

---

## 视觉方向

### 设计目标

- 风格现代，但保持科研产品的可信度
- 避免纯白平铺，加入轻微渐变和层次阴影
- 数据卡片要有明显主次关系，CTA 要足够醒目

### Tailwind 风格建议

- 页面背景：浅灰蓝渐变或暖灰渐变
- 容器：`rounded-2xl` / `rounded-3xl`
- 卡片：半透明白底 + 细边框 + 柔和阴影
- 标题：大字号、紧凑字距
- 强调色建议：
  - 主色：`cyan` / `sky` / `teal`
  - 辅色：`slate` / `zinc`
  - 不建议默认紫色系

### 推荐视觉分层

- Page background
- Section wrapper
- Card surface
- Chart plotting area
- CTA accent area

---

## 核心模块规划

### 1. 顶部统计卡片 Stat Cards

四张卡固定展示：

- `Total Cells`: `2,104,321`
- `Total Patients`: `45`
- `Age Range`: `30-85`
- `Identified Cell Types`: `24`

### 交互与样式

- 数字使用更大字号，建议 `text-3xl` 到 `text-4xl`
- 小标签使用大写或 tracking 拉开
- 每张卡可附带极短说明，如 “across all profiled samples”
- 可加入轻微渐变顶部描边或小色块增强辨识度

### 数据来源

- 首版直接写在 `Dashboard.tsx` 的 `const stats = [...]`
- 后续可替换为 dashboard summary API 或 `dataStore` 聚合值

---

### 2. 临床信息统计区 Clinical Demographics

建议拆成三张图卡：

#### 2.1 Donut Chart: GBM vs IDH subtype

展示示例：

- `GBM, IDH-WT`: `36`
- `Astrocytoma / IDH-mutant-like`: `9`

说明：

- 名称上用户写了“GBM 样本与 IDH 分型样本比例”，语义稍混合。
- 规划中建议统一成“按诊断 / IDH 状态分层的样本组成”，避免图例命名歧义。

#### 2.2 Bar Chart: Age Groups or Sex

首版建议默认用 `Age Groups`，因为和首页主题更一致：

- `30-39`
- `40-49`
- `50-59`
- `60-69`
- `70-79`
- `80+`

也可在图卡右上提供轻量 toggle：

- `Age`
- `Sex`

如果不做交互，直接固定 `Age Groups` 即可。

#### 2.3 Stacked Bar Chart: Major Cell Lineages

展示总体组成占比，建议 100% 堆叠横向柱：

- `Myeloid`
- `T cells`
- `Tumor cells`
- `Oligodendrocytes`
- `Endothelial`
- `Pericytes`
- `B cells`

说明：

- 如果只做一个总体堆叠条，适合首页总览
- 如果希望信息量更强，可按 `Diagnosis` 或 `Age group` 分 2 到 3 根堆叠柱
- 首版仍建议先做“总体一根 100% stacked bar”，版面最稳

---

### 3. 全局 UMAP 预览 Global Overview

### 设计目标

- 作为进入 Level 2 的视觉诱饵
- 不承担重交互分析，只负责传达“全局 atlas 可探索”

### 占位内容

首版支持两种占位方式：

- 静态图片占位
- 轻量 scatter/hex preview 占位

### 页面内容建议

- 卡片标题：`Global Cellular Atlas`
- 副标题：`Preview of the full single-cell landscape`
- 中央区域：比例固定的预览框，如 `aspect-[4/3]`
- 底部放醒目按钮：
  `Enter Interactive Atlas`
- 按钮附加说明文字：
  `Load the full atlas of 2.1M cells`

### 交互

- 点击 CTA 后触发导航到 Level 2
- 如果当前项目仍使用 Zustand 导航：
  调用 `navigationStore.drillDown(...)`
- 如果后续切到路由：
  导航到 `/explorer`

---

## Mock 数据规划

建议全部内置在 `Dashboard.tsx` 顶部，保证页面可直接预览。

### 示例结构

```ts
const statCards = [
  { label: 'Total Cells', value: '2,104,321' },
  { label: 'Total Patients', value: '45' },
  { label: 'Age Range', value: '30-85' },
  { label: 'Identified Cell Types', value: '24' },
];

const diagnosisDonutData = [
  { name: 'GBM / IDH-WT', value: 36 },
  { name: 'IDH-mutant', value: 9 },
];

const ageGroupData = [
  { label: '30-39', patients: 3 },
  { label: '40-49', patients: 6 },
  { label: '50-59', patients: 11 },
  { label: '60-69', patients: 13 },
  { label: '70-79', patients: 9 },
  { label: '80+', patients: 3 },
];

const lineageComposition = [
  { group: 'All cells', myeloid: 31, tCells: 12, tumor: 38, oligodendrocytes: 8, endothelial: 6, pericytes: 3, bCells: 2 },
];
```

### 配色建议

- Donut:
  - `GBM / IDH-WT`: 深青蓝
  - `IDH-mutant`: 橙黄或青绿
- Age bars:
  - 单色渐进 `sky`
- Stacked lineages:
  - 每个 lineage 固定类别色，后续与全局图例统一

---

## 组件职责规划

### `Dashboard.tsx`

负责：

- 页面总布局
- Mock 数据定义
- 卡片和图表的编排
- Level 2 入口按钮

不负责：

- 真实 API 拉取
- 重型 UMAP 渲染
- 复杂筛选逻辑

### 可选局部组件拆分

`StatCard`

- 接收 `label`, `value`, `hint`, `accent`
- 负责顶部数字卡视觉表现

`SectionCard`

- 接收 `title`, `subtitle`, `actions`, `children`
- 统一图表卡片外壳

`AtlasPreviewCard`

- 接收 `onEnter`
- 负责全局 UMAP 占位区域和 CTA

---

## 与现有架构的衔接

### 当前架构判断

当前 `frontend/src/App.tsx` 仍使用：

- `Header`
- `Breadcrumb`
- `LevelRouter`
- `LevelTransition`

说明首页大概率仍由 LevelRouter 按层级切换，而不是路由页面。

### 规划上的兼容处理

虽然用户指定目标文件为 `frontend/src/pages/Dashboard.tsx`，但仓库当前未进入 pages 路由结构。后续真正实现时有两种接法：

#### 方案 A：先按用户要求新增 `src/pages/Dashboard.tsx`

- 在 `LevelRouter` 中让 Level 1 渲染 `<Dashboard />`
- 优点：与未来迁移到路由页面的方向一致

#### 方案 B：直接替换当前 Level 1 入口组件

- 将新 Dashboard 内容落到现有 `components/level1` 入口
- 优点：改动更小
- 缺点：和用户指定路径不一致

### 规划结论

后续实施时优先采用方案 A：

- 新建 `frontend/src/pages/Dashboard.tsx`
- 在 `LevelRouter` 中接入该页面
- 保留现有 `components/level1/*` 作为复用组件池

---

## 页面信息架构建议

从上到下的信息顺序：

1. 页面标题
2. 项目一句话说明
3. 4 个统计卡片
4. Clinical Demographics 三图并列或两行布局
5. Global Overview 预览卡
6. CTA 进入 Explorer

推荐标题文案：

- `GBM Aging Atlas`

推荐副标题文案：

- `A multi-patient single-cell overview of glioblastoma, age, and lineage composition.`

推荐 CTA 文案：

- 主按钮：`Enter Interactive Atlas`
- 辅助说明：`Load the full atlas of 2,104,321 cells`

---

## 实施任务拆分

- [ ] **DASH-01** 新建 `frontend/src/pages/Dashboard.tsx` 页面骨架
- [ ] **DASH-02** 定义顶部 Mock 统计数据与图表数据
- [ ] **DASH-03** 实现 Hero 区与 4 个 Stat Cards
- [ ] **DASH-04** 接入 Donut Chart（诊断 / IDH 组成）
- [ ] **DASH-05** 接入 Bar Chart（Age Groups 或 Sex）
- [ ] **DASH-06** 接入 Stacked Bar Chart（major cell lineages）
- [ ] **DASH-07** 实现 Global Overview 预览卡与 CTA
- [ ] **DASH-08** 处理移动端与大屏断点布局
- [ ] **DASH-09** 在 `LevelRouter` 或未来路由入口中接入 `Dashboard.tsx`
- [ ] **DASH-10** 后续用真实 summary 数据替换 Mock 数据

---

## 风险与注意项

- 当前仓库未安装 `recharts` / `echarts`，实施前需补依赖
- 仓库当前并非 `pages` 驱动结构，实现时需要补接入口
- `Total Patients`、`Age Range`、`Identified Cell Types` 目前是示例值，后续需与真实数据统计口径统一
- “GBM 样本与 IDH 分型样本比例”这句话在数据语义上不够严谨，落地时需要统一图例命名
- UMAP 预览建议严格控制为轻量占位，不要在首页提前加载 200 万细胞

---

## 本次请求的执行边界

本次仅更新规划文档，不修改以下内容：

- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/components/*`
- `frontend/package.json`
- `frontend/src/App.tsx`

---

# 增补计划 — 二、三级预览交互视图 Explorer (`frontend/src/pages/Explorer.tsx`)

## 目标

仅规划 Level 2 Explorer 与 Level 3 Single Cell Drawer 的核心交互，不落地代码。

目标包括：

- 在一个页面中承载全细胞 deck.gl 交互工作台
- 左侧展示颜色映射控制面板和图例
- 主区域展示 `ScatterplotLayer` 并开启拾取
- 点击单细胞后，从右侧滑出抽屉展示单细胞属性
- 明确 `selectedCell` 如何由 Zustand 或 React State 驱动

---

## 当前项目现状判断

### 已具备基础

- `frontend/src/components/map/UmapView.tsx`
  已封装 deck.gl 视图容器，并绑定了 `viewStore`
- `frontend/src/hooks/useDeckLayers.ts`
  已生成 `ScatterplotLayer` / `HeatmapLayer`
- `frontend/src/components/color/ColorModeSelect.tsx`
  已有颜色模式下拉
- `frontend/src/components/color/Legend.tsx`
  已有基础图例
- `frontend/src/stores/viewStore.ts`
  已管理视口与渲染模式
- `frontend/src/stores/navigationStore.ts`
  已管理层级切换

### 当前缺口

- 仓库中尚无 `frontend/src/pages/Explorer.tsx`
- `UmapView` 尚未暴露 `onClick` / `onHover` 交互接口
- `useDeckLayers` 当前虽设置了 `pickable: true`，但没有将 `onClick` / `onHover` 绑定到 layer
- 当前无 `selectedCell` store
- 当前无右侧 Drawer / Sheet 组件
- 当前 `frontend/package.json` 未包含 shadcn/ui 依赖栈

---

## 依赖建议

### deck.gl

当前已具备：

- `@deck.gl/core`
- `@deck.gl/layers`
- `@deck.gl/react`

满足本次 Explorer 实现基础。

### Drawer / Sheet

用户点名希望结合 shadcn/ui 的 Drawer 或 Sheet。

当前依赖中未见：

- `@radix-ui/react-dialog`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `lucide-react`

### 推荐方案

Level 3 右侧面板优先采用 `Sheet`，不要采用 `Drawer`。

原因：

- 桌面端“从右侧滑出”的交互更贴近 `Sheet`
- shadcn/ui 的 `Drawer` 更偏移动端底部抽屉
- Explorer 是宽屏桌面工作台，右侧 Sheet 更符合分析工具形态

### 计划中的依赖变更

```bash
cd frontend && npm install @radix-ui/react-dialog class-variance-authority clsx tailwind-merge lucide-react
```

如果后续要完全接入 shadcn/ui 脚手架，可再补对应 `components/ui/sheet.tsx`。

---

## 页面结构规划

### 页面文件

- 新建 `frontend/src/pages/Explorer.tsx`

### 页面布局

Explorer 采用横向工作台布局：

- 左侧 20%：Control Panel
- 中间 80%：deck.gl 渲染视图
- 右侧浮层：Single Cell Sheet

### 骨架结构

```tsx
<div className="flex h-full min-h-0 bg-[explorer-bg]">
  <aside className="w-[320px] shrink-0">{/* control panel */}</aside>
  <main className="relative min-w-0 flex-1">{/* deck.gl canvas */}</main>
  <CellSheet />
</div>
```

### 响应式策略

- `xl` / `lg`：固定左栏，右侧 Sheet 覆盖主视图
- `md`：左栏收窄为 280px
- `sm`：左栏改为顶部折叠区，Sheet 仍从右侧或全屏弹出

---

## Level 2 规划 — 全细胞交互工作台

### 1. 左侧 Control Panel

建议内容从上到下排列：

1. 页面标题与说明
2. Color By 下拉
3. Gene 输入框或 autocomplete
4. Legend
5. Hover cell quick info
6. Explorer 状态摘要

### 颜色映射选项

按用户要求至少包含：

- `Cell Type`
- `Age Group`
- `Gene Expression`

结合现有 store，实施时建议枚举扩展为：

- `celltype`
- `age`
- `gene`

保留未来扩展位：

- `celltype2`
- `idh`
- `senescence`

### Control Panel 与现有组件的关系

- `ColorModeSelect.tsx`
  现有可继续使用，但需要补 `age` 选项文案与可能的基因输入 UX
- `Legend.tsx`
  需要补齐 `age` 模式对应的离散图例
- `FilterPanel.tsx`
  如内容过重，不建议直接塞到首版 Explorer 左栏，避免和本次“预览交互”目标冲突

---

### 2. deck.gl 主视图

### 基础要求

- 使用 `ScatterplotLayer`
- `pickable: true`
- 绑定 `onClick`
- 绑定 `onHover`

### 交互职责

`onHover`

- 更新 `hoveredCell`
- 显示轻量 tooltip
- Tooltip 内容可含：
  - barcode
  - cell subtype
  - age group

`onClick`

- 将该点写入 `selectedCell`
- 打开右侧 Sheet
- 不跳离当前 Explorer 视图

### 与现有 `useDeckLayers` 的衔接方式

当前 `useDeckLayers` 只负责返回 layer 数组。后续落地时建议升级成：

```ts
useDeckLayers({
  onCellClick,
  onCellHover,
})
```

在 `ScatterplotLayer` 中补充：

```ts
onClick: (info) => onCellClick?.(info.object?.index ?? null)
onHover: (info) => onCellHover?.(info.object?.index ?? null, info)
```

说明：

- 当前 `positions` 数组中每个点已有 `index`
- 这足以作为“回查 typed arrays 中该 cell 所有字段”的索引

### 视图模式建议

首页预览版 Explorer 优先固定为 detail scatter 模式，避免 `HeatmapLayer` 抢占交互焦点。

如仍保留 density/detail 切换，则：

- `detail` 模式启用点击拾取
- `density` 模式禁用单点点击或仅允许 hover 无 drawer

---

## Level 3 规划 — Single Cell Drawer / Sheet

### 推荐 UI 形态

右侧 `Sheet`，而非底部 `Drawer`。

### 触发逻辑

- 用户点击 `ScatterplotLayer` 中某个 point
- 写入 `selectedCellIndex`
- 由 `selectedCellIndex` 派生 `selectedCell`
- `open = !!selectedCell`
- 右侧 Sheet 打开

### Header 设计

顶部醒目展示：

- `Cell Barcode`
- `Detailed Subcluster`

示例：

- `AAACCTGAGTACGTAA-1`
- `Microglia_Apoe+`

### 内容分区

#### QC Metrics

展示：

- `n_counts / UMI`
- `n_genes`
- `percent_mito`

#### Signature

展示：

- `Age`
- `Patient ID`

#### Top Expressed Genes

首版只用 Mock 数据，推荐样式：

- 简单列表
- 或迷你横向条形图

示例 5 项：

- `APOE`
- `C1QA`
- `C1QB`
- `LPL`
- `SPP1`

---

## 状态管理规划

### 推荐使用 Zustand

原因：

- 项目当前已大面积使用 Zustand
- `selectedCell` 与 deck.gl hover / click / panel open 是跨组件状态
- 比把状态塞进 `Explorer.tsx` 单页面 state 更容易与 tooltip、legend、未来 URL 状态融合

### 新增 store 建议

- 新建 `frontend/src/stores/explorerStore.ts`

### 数据结构

```ts
interface HoveredCellState {
  index: number;
  x: number;
  y: number;
}

interface SelectedCellState {
  index: number;
}

interface ExplorerState {
  hoveredCell: HoveredCellState | null;
  selectedCellIndex: number | null;
  isCellSheetOpen: boolean;

  setHoveredCell: (cell: HoveredCellState | null) => void;
  selectCell: (index: number | null) => void;
  setCellSheetOpen: (open: boolean) => void;
  clearSelectedCell: () => void;
}
```

### 派生数据而非重复存储

不要把完整 `selectedCell` 对象直接塞进 store。

推荐只存：

- `selectedCellIndex`

再由 selector + typed arrays / schema / mock annotation 映射得到：

- `barcode`
- `subcluster`
- `n_counts`
- `n_genes`
- `percent_mito`
- `age`
- `patientId`

原因：

- 避免 store 中复制大对象
- 与当前 Arrow typed arrays 架构一致
- 便于 future lazy fetch 单细胞详情

### 核心状态流

```tsx
ScatterplotLayer.onClick(point)
  -> explorerStore.selectCell(point.index)
  -> selectedCellIndex 更新
  -> Explorer.tsx 中 selectedCell 派生成功
  -> <CellSheet open={!!selectedCell} />
```

关闭 Sheet：

```tsx
onOpenChange(false)
  -> explorerStore.clearSelectedCell()
```

---

## `selectedCell` 派生策略

### 当前数据 store 的现实限制

`dataStore.ts` 当前存的是：

- coords
- cellTypeCodes
- cellType2Codes
- ageCodes
- sexCodes
- donorCodes
- sampleCodes

但没有直接暴露：

- barcode
- n_counts
- n_genes
- percent_mito

### 规划建议

后续真实实现时有两条路径：

#### 方案 A：扩展 Arrow cells 数据

在 `loadLevel2()` 中增加读取列：

- `barcode`
- `n_counts`
- `n_genes`
- `percent_mito`

优点：

- 点击后本地即可秒开 Drawer
- 不需要额外请求

缺点：

- Arrow 文件会稍增大

#### 方案 B：Drawer 按 cellId 二次请求详情

点击点位后只记录索引或 cellId，再调用：

- `GET /api/cell/{cellId}`

优点：

- Explorer 主数据更轻

缺点：

- 首次打开 Drawer 有等待
- 需要后端补接口

### 规划结论

首版预览交互优先走方案 A，但仍允许先用 Mock 字段填充 Drawer 内容。

---

## Mock 数据规划

为了满足“只展示交互预览”的目标，建议在 `Explorer.tsx` 内置一份轻量 mock 详情映射。

### 示例结构

```ts
const mockCellDetailsByIndex = {
  128: {
    barcode: 'AAACCTGAGTACGTAA-1',
    subtype: 'Microglia_Apoe+',
    n_counts: 15432,
    n_genes: 4211,
    percent_mito: 6.4,
    age: '70-79',
    patientId: 'GBM_014',
    topGenes: [
      { gene: 'APOE', value: 9.2 },
      { gene: 'C1QA', value: 8.8 },
      { gene: 'C1QB', value: 8.5 },
      { gene: 'LPL', value: 7.9 },
      { gene: 'SPP1', value: 7.3 },
    ],
  },
};
```

如果点击索引未命中 mock 表，可回退生成占位值：

- barcode: `CELL-${index}`
- subtype: 从 `cellType2Codes` 派生
- age: 从 `ageCodes` 派生

---

## 文件变更规划

### 新建文件

- `frontend/src/pages/Explorer.tsx`
- `frontend/src/stores/explorerStore.ts`
- `frontend/src/components/explorer/ControlPanel.tsx`
- `frontend/src/components/explorer/CellSheet.tsx`
- `frontend/src/components/explorer/CellTooltip.tsx`

### 修改文件

- `frontend/src/components/map/UmapView.tsx`
  暴露 `onCellClick` / `onCellHover`
- `frontend/src/hooks/useDeckLayers.ts`
  为 `ScatterplotLayer` 注入 `onClick` / `onHover`
- `frontend/src/components/color/ColorModeSelect.tsx`
  增补 `Age Group`
- `frontend/src/components/color/Legend.tsx`
  支持 `age` 的离散图例
- `frontend/src/components/navigation/LevelRouter.tsx`
  将 Level 2 / Level 3 入口逐步过渡到 `Explorer.tsx`

---

## 与现有 LevelRouter 架构的衔接

当前仓库仍是：

- Level 2: `ClusterSidebar + ClusterView + ClusterAnalysis`
- Level 3: `GeneSidebar + GeneExplorer`

而用户这次要求的是“Level 2 deck.gl Explorer + Level 3 单细胞抽屉”。

这意味着后续实施时应把二、三级的“预览态”收束到同一个 `Explorer.tsx` 页面，而不是继续拆成两个割裂页面。

### 推荐接入策略

#### 阶段 1：保守接法

- 新建 `frontend/src/pages/Explorer.tsx`
- 在 `LevelRouter` 的 `currentLevel === 2` 和 `currentLevel === 3` 时统一渲染 `<Explorer />`
- `currentLevel === 3` 时只是在 Explorer 内默认打开右侧 Sheet

#### 阶段 2：未来路由化

- 路由切到 `/explorer`
- 点击 cell 后进入 `/explorer/cell/:cellId`
- 但页面主体仍保持 Explorer，仅 Sheet 状态变化

### 规划结论

为兼容当前 Zustand 层级切换，首版实施优先采用阶段 1。

---

## 页面交互流程

### Hover

1. 用户将鼠标移到某个点
2. `ScatterplotLayer.onHover` 触发
3. 更新 `hoveredCell`
4. 显示浮动 tooltip

### Click

1. 用户点击某个点
2. `ScatterplotLayer.onClick` 触发
3. `explorerStore.selectCell(index)`
4. `selectedCellIndex` 更新
5. 右侧 `CellSheet` 打开

### Close

1. 用户点击 Sheet 关闭按钮或遮罩
2. `onOpenChange(false)`
3. `explorerStore.clearSelectedCell()`
4. Sheet 收起

---

## 视觉建议

### Explorer 主视图

- 背景用深浅适中的科研风中性色，不建议纯黑
- deck.gl canvas 外层保留圆角和边框，降低“裸画布”感
- 左栏采用高对比但低噪声的控制面板

### Control Panel

- 顶部有标题：`Interactive Cell Explorer`
- 小字说明当前模式：`2.1M cells rendered with WebGL`
- 每个模块独立卡片化，避免一个长表单

### Cell Sheet

- 宽度建议 380px 到 440px
- 分区标题短而明确：`QC Metrics`, `Signature`, `Top Expressed Genes`
- 顶部 cell barcode 使用等宽字体
- subtype 使用 pill badge 或二级标题

---

## 实施任务拆分

- [ ] **EXP-01** 新建 `frontend/src/pages/Explorer.tsx` 工作台布局
- [ ] **EXP-02** 新建 `frontend/src/stores/explorerStore.ts` 管理 hover / selectedCell
- [ ] **EXP-03** 提取左侧 `ControlPanel`，组合颜色模式与图例
- [x] **EXP-04** 扩展 `ColorModeSelect.tsx` 支持 `Age Group`
- [x] **EXP-05** 扩展 `Legend.tsx` 支持 `age` 离散图例
- [x] **EXP-06** 改造 `useDeckLayers.ts`，为 `ScatterplotLayer` 注入 `onClick` / `onHover`
- [x] **EXP-07** 改造 `UmapView.tsx`，透传 cell hover / click 事件
- [x] **EXP-08** 新建 `CellTooltip` 展示 hover 信息
- [ ] **EXP-09** 新建右侧 `CellSheet`，展示 Header / QC / Signature / Top Genes
- [ ] **EXP-10** 使用 Mock 单细胞详情数据完成首版抽屉内容
- [ ] **EXP-11** 在 `LevelRouter` 中将 Level 2/3 预览接入 `Explorer.tsx`
- [ ] **EXP-12** 后续再替换为真实 cell barcode / QC 数据来源

补充说明：

- 当前 `CellDrawer` 已覆盖右侧抽屉的基础交互，但内容仍以本地 typed arrays 可回查字段为主，还没有完整达到 `EXP-09` 里定义的 barcode / QC / top genes 版本。
- `EXP-11` 原描述基于旧 `LevelRouter` 架构，现已被 URL 路由方案替代，不应再按该条原文执行。

---

## 风险与注意项

- 当前 `dataStore` 缺少 barcode 与 QC 指标列，无法直接完整支撑 Drawer 真实内容
- 当前无 shadcn/ui 基础设施，实施前需补 `Sheet` 相关依赖或自行实现等价抽屉
- `useDeckLayers` 现在会在 `renderMode !== detail` 时切换到 `HeatmapLayer`，会削弱单细胞点击能力
- 当前 `navigationStore.currentLevel` 的“Level 3”语义是基因探索，不是“单细胞抽屉”，需要重新统一产品语义
- 200 万点级别下如果始终使用 `ScatterplotLayer`，需要继续关注半径、透明度和过滤后的性能

---

## 本次请求的执行边界

本次仅更新规划文档，不修改以下内容：

- `frontend/src/pages/Explorer.tsx`
- `frontend/src/components/map/UmapView.tsx`
- `frontend/src/hooks/useDeckLayers.ts`
- `frontend/src/stores/*`
- `frontend/package.json`

---

# 数据预加载优化方案

> 创建日期：2026-04-12
> 问题：用户打开网页时看到 "Loading integrated atlas" loading 状态

## 问题诊断

用户打开网页时看到 "Loading integrated atlas" 是因为：

1. **后端预热不足**：`app.py` lifespan 只预热 `schema`，cells.arrow (49MB) 在首次请求时才加载
2. **前端请求滞后**：`uiStore` 初始 `isLoading=true`，页面组件挂载后才发起请求
3. **无预请求机制**：App 初始化时不预请求，等到 DashboardPage/ExplorerPage 挂载

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔴 问题根因分析                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. 后端预热不足                                                              │
│     • app.py lifespan 只预热 schema (轻量)                                   │
│     • cells.arrow (49MB) 在首次请求时才加载                                   │
│                                                                             │
│  2. 前端请求时机滞后                                                          │
│     • uiStore 初始 isLoading=true                                            │
│     • 页面组件挂载后才发起请求                                                 │
│     • 没有 App 级预请求机制                                                   │
│                                                                             │
│  3. 数据传输时间                                                              │
│     • cells.arrow ~49MB，传输需要时间                                         │
│     • 用户打开页面必定看到 loading                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 解决方案

### Phase 1: 后端预热优化 [核心]

**目标**：后端启动时预热所有数据，首次请求立即返回

**修改文件**：`backend/server/app.py`

**改动**：
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    from .data_cache import get_cache
    cache = get_cache()

    # 预热 schema (已有)
    _ = cache.schema

    # 新增：预热 cells_ipc (49MB)
    _ = cache.cells_ipc

    # 新增：预热 JSON 文件
    for json_file in ["hexbin.json", "centroids.json", "stats.json", "patients.json"]:
        cache.load_json(json_file)

    print("Backend data cache warmed up")
    yield
```

**影响分析**：
- 启动时间增加 ~2-5 秒（加载 49MB 到内存）
- 首次请求响应时间从 ~3s 降到 ~50ms
- 内存占用增加 ~50MB（可接受）

---

### Phase 2: 前端预请求机制 [推荐]

**目标**：App 初始化时就预请求核心数据，页面挂载时数据已就绪

**修改文件**：
- `frontend/src/App.tsx`
- 新增 `frontend/src/hooks/useAppPreload.ts`

**改动**：

新增 `useAppPreload.ts`：
```ts
import { useEffect } from 'react';
import { useDataStore } from '../stores/dataStore';

export function useAppPreload() {
  const loadLevel1 = useDataStore((s) => s.loadLevel1);
  const isLevel1Loaded = useDataStore((s) => s.isLevel1Loaded);

  useEffect(() => {
    // App 初始化时立即开始预请求，不等页面组件挂载
    if (!isLevel1Loaded) {
      loadLevel1().catch(console.error);
    }
  }, []); // 空依赖，只在 App 初始化时执行一次
}
```

修改 `App.tsx`：
```tsx
function App() {
  // 新增：App 级预请求
  useAppPreload();

  return (
    // ...existing JSX
  );
}
```

---

### Phase 3: Loading 状态优化 [必须配合 Phase 1]

**目标**：不一开始就显示 loading，只在真正等待时显示

**修改文件**：`frontend/src/stores/uiStore.ts`

**改动**：
```ts
// 初始状态改为 false
isLoading: false,
loadingMessage: '',
levelLoading: { 1: false }, // 改为 false
levelProgress: { 1: '' },
```

**逻辑调整**：
- 只有在发起请求时（`loadLevel1` 开始）才设置 loading
- 页面渲染时如果数据已就绪，不显示 loading
- 如果数据未就绪且请求进行中，显示 loading

---

### Phase 4: HTML preload link [可选优化]

**目标**：浏览器在 HTML 解析时就开始下载 cells.arrow

**修改文件**：`frontend/index.html`

**改动**：
```html
<head>
  <!-- 新增 preload -->
  <link rel="preload" href="/api/cells" as="fetch" crossorigin>
  <link rel="preload" href="/api/schema" as="fetch" crossorigin>
</head>
```

**效果**：浏览器在解析 HTML 时就开始下载，不等 JS 执行

---

## 实施顺序

| 顺序 | Phase | 必要性 | 说明 |
|------|-------|--------|------|
| 1 | Phase 1 | 核心 | 后端预热，影响最大 |
| 2 | Phase 3 | 必须 | uiStore 初始状态调整，配合 Phase 1 |
| 3 | Phase 2 | 推荐 | 前端预请求，Phase 1 后已足够快 |
| 4 | Phase 4 | 可选 | HTML preload，边际优化 |

---

## 验证方法

1. 启动后端，观察启动日志是否显示 "Backend data cache warmed up"
2. 打开浏览器，访问 http://localhost:5174
3. 观察是否**不再显示** "Loading integrated atlas" loading 状态
4. 检查 Network tab，确认请求响应时间 < 100ms

---

## 预期结果

- 用户打开页面时**不再看到 loading 状态**
- 数据已预加载，页面渲染立即可用
- 首屏加载时间从 ~5s 降到 ~0.5s

---

## 实施任务清单

- [ ] **PRELOAD-01** 修改 `backend/server/app.py` 预热 cells_ipc 和 JSON 文件
- [ ] **PRELOAD-02** 修改 `frontend/src/stores/uiStore.ts` 初始 loading 状态改为 false
- [ ] **PRELOAD-03** 新增 `frontend/src/hooks/useAppPreload.ts` App 级预请求
- [ ] **PRELOAD-04** 修改 `frontend/src/App.tsx` 接入 useAppPreload
- [ ] **PRELOAD-05** [可选] 修改 `frontend/index.html` 添加 preload link
- [ ] **PRELOAD-06** 验证：启动服务，打开页面确认无 loading 状态
