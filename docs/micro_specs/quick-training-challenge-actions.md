# Micro Spec: 快速训练支持挑战动作

- 目标：快速训练的动作选择器应与训练计划编辑器一样，包含挑战页面的全部动作。
- 范围：`src/pages/train-page.svelte`；复用现有 `challengeLevels` 数据，不改变保存格式、训练流程或自定义动作能力。
- 风险：候选项重复或影响旧数据；通过 `Set` 去重，并保留当前动作值。
- Done Contract：快速训练候选项包含所有挑战动作；定向静态检查与差异检查通过；不运行生产构建。

## Change Log

- 2026-11-10：快速训练动作候选项合并 `challengeLevels`，并使用 `Set` 去重。

## Validation

- `git diff --check` 通过。
- Prettier 检查通过：本 micro spec；快速训练页存在本次改动前的既有格式差异，因此未对整页执行格式化。
- Svelte parser 检查通过：`src/pages/train-page.svelte`。
