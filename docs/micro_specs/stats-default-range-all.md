# Micro Spec: 数据分析默认显示全部范围

- 目标：将数据分析趋势区域的默认范围说明从“最近一周”改为“全部”。
- 范围：调整 `src/pages/stats-page.svelte` 的显示文案和 `src/components/daily-line-chart.svelte` 的初始图表选区；保留现有按全部训练记录生成趋势数据的逻辑及用户手动拖动缩放能力。
- Done Contract：页面文案明确为“默认显示全部”，且代码检查通过。

## Change Log / Validation

- 2026-11-12：将趋势区域文案改为“默认显示全部”，并将图表底部范围选择器的初始起点改为 0，默认覆盖全部数据。
- 验证：`git diff --check` 与相关文本检查通过；初始 `dataZoom.start` 为 0，用户仍可继续拖动或缩放范围。
