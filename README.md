# 练刻 · Svelte + Vite

训练计划、计时训练、训练记录与数据备份应用，部署目标为 GitHub Pages。

界面由 `src/pages/train-page.svelte`、`plans-page.svelte`、`stats-page.svelte` 和 `settings-page.svelte` 组成；时间选择器在 `src/components/time-picker.svelte`。本地数据与云端请求分别在 `src/lib/data.js` 和 `src/lib/cloud.js`。

## 本地开发

```bash
pnpm install
pnpm dev
```

## GitHub Pages

仓库的 `main` 分支推送会触发 `.github/workflows/deploy.yml`。在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 添加：

- `VITE_SUPABASE_URL`：Supabase Project URL
- `VITE_SUPABASE_ANON_KEY`：Supabase anon public key 或 publishable key

这两个值会在构建阶段注入静态前端。它们属于浏览器公开配置；不要添加或暴露 `service_role` key。首次使用还需要在 Supabase SQL Editor 中按项目需要创建表并配置 RLS。

在 **Settings → Pages → Build and deployment** 将 Source 设为 **GitHub Actions**。仓库名为 `lian-ke` 时，Vite 会自动使用 `/lian-ke/` 作为 Pages base 路径。
