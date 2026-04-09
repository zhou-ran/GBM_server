# GBM Senescence Atlas 改进计划

生成日期：2026-04-08

## 审查范围

- `server/`
- `static/`
- `preprocess/`
- 项目文档与启动脚本

## 当前总体判断

项目已经具备一个可运行的原型：后端能直接分发预处理结果，前端也能完成 UMAP 浏览、筛选、病人表格和基础分析面板。但当前代码仍处于“研究演示版”阶段，主要问题集中在三类：

1. 正确性风险：部分数据布局约定没有被统一封装，已经出现前端读取二进制元数据时依赖硬编码偏移的问题。
2. 性能风险：前端和后端都有高频 O(n) 路径，在 225 万细胞规模上会很快触顶。
3. 产品完成度风险：界面上已经暴露了下采样、split view 等能力，但逻辑并未真正落地，容易误导使用者。

## 关键问题

### P0: 二进制元数据布局耦合，容易读错列

- `preprocess/step1_extract.py:46-79` 按“所有列顺序 + uint16 列转 raw bytes”写入 `meta.bin`。
- `static/js/data.js:72-82` 试图按 schema 动态读取列，但 `uint16` 列 offset 从 `0` 开始累计，没有先跳过前面的全部 `uint8` 区域，offset 计算错误。
- `static/js/app.js:49-50` 和 `static/js/layers.js:123-126` 直接用 `meta[i]`、`meta[nCells + i]` 这种硬编码偏移读取分类列，和 `DataStore.getMetaColumn()` 的抽象完全分裂。

影响：

- 现在只有少数列因为布局刚好匹配而“看起来能工作”。
- 一旦 schema 顺序调整、插入新列或前端读取 `uint16` 列，结果就会错。

改进方向：

- 统一定义元数据布局，给每个 schema column 生成显式 `byte_offset`、`dtype`、`itemsize`。
- 前端所有列访问都改成经过 `DataStore.getMetaColumn()` 或等价 accessor。
- 增加一个针对 `meta.bin` 布局的一致性校验步骤，预处理结束时直接验证。

### P0: 下采样和 split view 已出现在 UI，但实际未实现

- `static/index.html:24-27` 暴露了 `1% Downsample` 开关。
- `static/js/app.js:169-173` 这里仍是 `TODO`。
- `static/index.html:73-76` 暴露了 split view 控件。
- `static/js/panels.js:69-88` 只维护了一个 `splitMode` 布尔值和标签文案，没有真正创建双视图或分屏图层。

影响：

- 用户会把“未完成功能”当成异常或 bug。
- 前端状态复杂度已经被这些半成品功能抬高，但没有实际收益。

改进方向：

- 二选一处理：短期要么完整实现，要么从 UI 隐藏。
- 若保留，先定义清楚交互语义：下采样是否只影响绘制，还是同时影响统计/筛选/tooltip。
- split view 需要明确双视口状态同步策略、比较维度、图层复用方式。

### P1: 视口统计和图层构建存在重度 O(n) 热路径

- `static/js/app.js:66-94` 每次视图变化都扫描全部坐标估算 visible count。
- `static/js/layers.js:73-82` 与 `static/js/layers.js:103-107` 每次重绘都重新构造 JS 对象数组。
- `static/js/filters.js:56-77` 每次筛选变化都重建整个 mask。

影响：

- 对 225 万细胞规模，平移、缩放、筛选时主线程压力很大。
- 当前逻辑越往后叠加功能，掉帧和卡顿越明显。

改进方向：

- 前端绘制策略从“全量 scan + 全量对象重建”改成“预聚合 + typed array + 局部更新”。
- 优先使用预计算的 `hexbin.json` 或新的多级 LOD 数据，而不是在运行时把所有点重新装箱成 JS 对象。
- 将 visible count 改成基于服务器 `/api/region`、空间索引或网格摘要。
- 给 `Filters` 增加列缓存、位图运算或预编译索引，避免每次全表遍历。

### P1: `/api/gene/{gene_name}` 实现代价过高且缓存粗糙

- `server/routes.py:146-173` 每次缓存 miss 都会重新打开 h5ad。
- `server/routes.py:159-162` 先做 `gene_name in adata.var_names`，再 `list(adata.var_names).index(gene_name)`，会重复线性扫描。
- `server/routes.py:162` 直接把整列表达读出并 `.toarray()`，对大矩阵开销很高。

影响：

- 首次基因查询延迟大。
- 多用户并发时会给磁盘和内存带来明显压力。

改进方向：

- 启动时缓存 `var_names -> index` 映射。
- 为热门基因做离线预提取，减少在线读取 h5ad。
- 明确缓存策略：落盘缓存目录、命名规范、并发写保护、错误处理。
- 若在线查询必须保留，考虑单独的服务层封装而不是放在路由函数里。

### P1: 后端文件分发方式偏粗糙，缺少更合适的响应模式

- `server/routes.py:42-51` 每次都通过 Python 读完整文件再构造响应。
- `server/routes.py:124-143` `/stats` 每次请求都重新扫描 `meta.bin` 统计分类数量。
- `server/routes.py:35-39` 定义了 `_get_kdtree()` 但当前并未被任何路径使用。

影响：

- 不必要的内存拷贝和重复 IO。
- API 结构中已经出现未使用代码，说明设计有漂移。

改进方向：

- 静态二进制文件优先考虑 `FileResponse` 或在反向代理层直接分发。
- `/stats` 在预处理阶段离线生成。
- 删除无用索引，或把它真正用到 `/region` 等查询。

### P2: 文档和工程化不足，维护成本偏高

- `README.md` 目前只有重复标题，几乎没有可用信息。
- 项目没有测试目录，也没有针对预处理产物的校验脚本。
- 前端通过 CDN 和全局变量组织脚本，原型阶段可接受，但继续扩展会快速失控。

影响：

- 新成员难以理解数据格式、启动方式和依赖。
- 回归风险高，尤其是二进制格式和前端读取代码之间的协作面。

改进方向：

- 先把 README 补到可独立启动、可理解数据流的程度。
- 增加最小测试集：schema/meta 一致性、API smoke test、关键前端数据访问逻辑。
- 视项目演进决定是否保持“无构建”模式；如果会持续扩展，建议逐步迁移到 ES module + 简单打包。

## 分阶段执行建议

### Phase 1: 修正正确性和未完成功能暴露

目标：先把“会错”和“会误导”的问题清掉。

- 统一 `schema.json` 的列描述，补齐每列 `dtype`、`itemsize`、`byte_offset`。
- 修复 `DataStore.getMetaColumn()` offset 计算。
- 清理所有硬编码元数据偏移访问，统一走 accessor。
- 决定 `downsample-toggle` 与 split view 的策略：
  - 要么实现完整链路。
  - 要么先从 UI 移除。
- 补一个预处理后校验脚本，验证 schema 与二进制文件布局一致。

验收标准：

- 任意分类列都能通过统一 accessor 正确读取。
- donor/sample 等 `uint16` 列可被前端稳定读取。
- UI 上不再出现“可点但无效”的控件。

### Phase 2: 性能与渲染重构

目标：让 225 万细胞数据在常见交互下保持可接受响应。

- 将 visible count 计算从前端全量扫描中移出。
- 重新设计 LOD：
  - 远景使用预聚合 hexbin 或 grid。
  - 中景使用更轻量的 sampled points。
  - 近景才进入明细散点。
- 避免每次渲染重建庞大对象数组，优先复用 typed arrays 或更接近 deck.gl 原生输入。
- 评估是否把过滤后的索引集合缓存为 `Uint32Array`，避免多处重复遍历。

验收标准：

- 平移和缩放时不再出现明显主线程卡顿。
- 筛选切换延迟显著下降。
- 近景/远景切换逻辑稳定，无明显闪烁。

### Phase 3: 后端查询与数据服务层优化

目标：把 API 从“直接读文件”升级到“可维护的数据服务层”。

- 为二进制/JSON 资源增加统一的响应帮助层。
- 优化基因查询：基因索引缓存、失败处理、并发安全、预提取策略。
- 将 `/stats` 等派生统计提前到预处理。
- 审查并收敛动态端点职责，删除未使用的 `_kdtree`，或真正引入空间索引能力。

验收标准：

- 基因查询首次和重复访问的延迟可量化。
- API 不再存在明显的重复 IO 和重复计算热点。

### Phase 4: 文档、测试、可维护性

目标：让项目从单人原型变成可持续维护代码库。

- 重写 README。
- 增加基础测试与数据校验命令。
- 为预处理产物定义版本和格式说明。
- 明确运行依赖和目录约定。

验收标准：

- 新开发者可以只看 README 完成启动。
- 改动二进制格式后，测试能及时报错。

## 推荐实施顺序

1. Phase 1 中的 schema/meta 统一抽象。
2. 处理 downsample 与 split view 的“实现或下线”决策。
3. 重做前端可视化 LOD 与 visible count。
4. 优化基因查询和后端静态资源分发。
5. 补文档与测试。

## 可直接进入开发的任务清单

- 新增 `preprocess/validate_outputs.py`，校验 `schema.json`、`meta.bin`、`coords.bin`、`senescence.bin` 的长度和布局。
- 在预处理阶段把每列的 `dtype/itemsize/byte_offset` 写入 `schema.json`。
- 重构 `static/js/data.js`，让 `getMetaColumn()` 成为唯一元数据读取入口。
- 重构 `static/js/app.js` 与 `static/js/layers.js`，移除对 `meta` 的裸偏移访问。
- 临时隐藏或完整实现 `downsample-toggle` 和 split view。
- 评估 `/api/coords`、`/api/meta`、`/api/senescence` 改为更直接的文件响应方式。
- 为 `/api/gene/{gene_name}` 增加 gene index cache。
- 补充 README 的启动、数据准备、预处理产物说明。

## 备注

这份计划优先级是按“先保正确，再保性能，再补工程化”排序的。对当前这个项目而言，最不划算的路线是继续往现有前端状态管理和硬编码二进制偏移上叠功能，那会把后续重构成本继续抬高。
