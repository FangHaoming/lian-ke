# 练刻 · Svelte + Vite

训练计划、计时训练、挑战闯关、训练记录与数据备份应用，部署目标为 GitHub Pages。

界面由 `src/pages/train-page.svelte`、`plans-page.svelte`、`stats-page.svelte` 和 `settings-page.svelte` 组成；时间选择器在 `src/components/time-picker.svelte`。本地数据与云端请求分别在 `src/lib/data.js` 和 `src/lib/cloud.js`。

## 挑战闯关

在“挑战闯关”中选择《囚徒健身》六艺路线，每条路线十关。关卡显示入门、中级、进阶或精英标准、动作定义、左右侧要求和原书来源。

顶部六个页面使用浏览器路由：`/`（训练）、`/plans`、`/challenges`、`/weight`、`/stats`、`/settings`。切换页面会更新地址，刷新后从当前路由恢复；旧的 `/train` 地址会自动规范化到 `/`。

邮箱注册后的授权回调使用独立路由 `/auth/callback`，授权完成后可返回训练首页。

- 前九关达到进阶标准后解锁下一关；第十关达到入门标准即获得最终技成就，精英成就独立展示。
- 每次挑战填写逐组实际成绩并确认动作质量；单侧动作需要两侧分别达标，连续保持不能跨次累加。未达标成绩也能保存并查看差距。
- 桥最终式精英原文范围为 2×10–30；应用以每组至少 10 次、共 2 组授予精英成就，展示 30 次的上限目标。
- 删除成绩会重新计算进度；前置关未通过时后续关卡重新锁定，后续历史成绩保留，前置恢复后可重新计入。
- 挑战成绩只存当前浏览器，包含在设置页导出的 JSON 备份中，暂不参与 Supabase 云同步。未提交的录入在离开页面时提示确认。

页面在 `src/pages/challenges-page.svelte`，目录及判定在 `src/lib/challenge-catalog.js`、`src/lib/challenge-model.js`。完整标准与核验来源见 [60 关标准核验](docs/context/囚徒健身60关标准核验.md)。

运行挑战业务测试（无需构建）：

```bash
node --test tests/challenge-model.test.js
```

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
