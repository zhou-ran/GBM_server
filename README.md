# GBM Senescence Atlas

GBM Senescence Atlas 是一个用于浏览胶质母细胞瘤单细胞衰老图谱的交互式 Web 应用。项目用 FastAPI 提供预处理后的二进制/JSON 数据，前端使用 Vanilla JS + deck.gl 渲染大规模 UMAP。

## 目录结构

- `server/`：FastAPI 应用与 API 路由
- `static/`：前端页面、样式、脚本
- `preprocess/`：从 `h5ad` 生成二进制产物的预处理脚本
- `data/processed/`：预处理输出目录
- `plans/`：代码审查和改进计划

## 运行环境

- Python 3.12
- `conda` 环境名：`web`
- 原始数据：`data/AllSample_obj.h5ad`

## 快速启动

```bash
conda activate web
./run.sh
```

默认启动地址：

```text
http://0.0.0.0:8050
```

## 预处理

全量预处理：

```bash
python preprocess/run_all.py
```

单步执行：

```bash
python preprocess/step1_extract.py
python preprocess/step2_senescence.py
python preprocess/step3_hexbin.py
python preprocess/step4_stats.py
python preprocess/step5_downsample.py
python preprocess/validate_outputs.py
```

## 关键产物

- `coords.bin`：UMAP 坐标，`float32`
- `meta.bin`：分类元数据，列式布局
- `schema.json`：列定义、类别映射、字节偏移
- `senescence.bin`：标准化衰老分数
- `hexbin.json`：概览层聚合结果
- `centroids.json`：类群中心点
- `patients.json`：病人汇总
- `de_results.json`：差异表达结果
- `correlation.json`：相关矩阵
- `stats.json`：离线全局统计

## 数据布局约定

`schema.json` 中每个 metadata 列都包含：

- `dtype`
- `itemsize`
- `byte_offset`
- `byte_length`

前端和后端都应基于这些字段解释 `meta.bin`，不要再写硬编码偏移。

## 校验

预处理完成后，执行：

```bash
python preprocess/validate_outputs.py
```

它会检查：

- 必需文件是否存在
- `coords.bin`、`senescence.bin` 文件长度是否与 `n_cells` 一致
- `meta.bin` 的列偏移和长度是否与 `schema.json` 匹配

## 当前约束

- `downsample` 与 `split view` 仍未形成完整交互链路，当前已在 UI 中隐藏。
- 若 `de_results.json`、`correlation.json` 等分析文件缺失，前端会降级显示，但建议通过完整预处理生成。

## 开发建议

- 修改 `meta.bin` 布局时，必须同步更新 `schema.json` 生成逻辑。
- 提交前至少运行一次 `python preprocess/validate_outputs.py`。
- 需要查看进一步重构建议时，参考 [plans/improvement-plan-2026-04-08.md](/data/zhouran/proj/20260408_gbm_age/plans/improvement-plan-2026-04-08.md)。
