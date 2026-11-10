# Micro Spec: 全局阻止确认密码框自动填充

- 目标：修复删除远端数据/注销账号确认弹窗被浏览器或密码管理器自动填入密码的问题，避免确认类危险操作误用自动填充值。
- 范围：共享组件 `src/components/confirm-dialog-input.svelte`；登录表单仍允许正常使用 `current-password` 自动填充。
- 方案：密码类型的确认输入统一强制使用 `autocomplete="new-password"`，并添加 1Password、LastPass、Bitwarden 等常见密码管理器的忽略标记。
- 风险：不能影响确认弹窗文本输入，也不能关闭登录页的密码自动填充；通过静态检查和 Svelte 编译诊断验证。
- Done Contract：所有 `ConfirmDialogInput` 密码框不再声明 `current-password`；登录页密码框保持 `current-password`；相关前端诊断通过。

## Change Log

- 2026-11-10：共享确认输入组件对密码类型强制使用 `new-password`，并增加常见密码管理器忽略标记；登录表单保持原有自动填充策略。

## Validation

- Prettier、`git diff --check` 与两个相关 Svelte 文件编译诊断通过；确认组件不再使用 `current-password`，登录表单仍保留该值。
