# SEO micro-spec

## Goal

让部署在 GitHub Pages 的「练刻」能被 Google 稳定发现，并以“训练计划、训练记录、挑战闯关”作为主要搜索主题展示。

## Scope

- 为静态入口补齐 title、description、canonical、Open Graph、Twitter Card 和 JSON-LD。
- 在 Svelte 应用运行后按公开路由更新页面 head；登录回调、源码查看和设置页不参与索引。
- 增加 GitHub Pages base path 下可用的 `robots.txt` 与 `sitemap.xml`。

## Done Contract

完成标准：公开入口和挑战页具备一致的绝对 URL、可读标题和描述；站点地图只列公开页面；静态检查确认路径与 JSON/XML 内容有效；不运行前端 build。

## Validation

- `git diff --check`：通过。
- Prettier check（`index.html`、`src/app-shell.svelte`、本 spec）：通过。
- 关键 meta、JSON-LD、base path URL 静态检查：通过。
- `public/sitemap.xml` XML 校验：通过。
- `node --test tests/*.test.js`：21/22 通过；1 个既有挑战目录基准测试失败（期望 73、实际 79），本次改动未触及挑战目录或模型。

## Change Log

- 入口页增加搜索摘要、规范链接、社交卡片、JSON-LD 和无 JavaScript 说明。
- 应用路由按公开/非公开页面更新 title、description、canonical 和 robots。
- 增加 GitHub Pages base path 下的 `robots.txt` 与 `sitemap.xml`。
