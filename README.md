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
- 挑战成绩保存在当前浏览器，也可在设置页选择“挑战成绩”同步到 Supabase，并包含在 JSON 备份中。未提交的录入在离开页面时提示确认。
- 训练计划中的动作名称如果与挑战关卡名称一致，训练完成保存后会自动按逐组训练数据生成判定。数据达标后，在挑战页确认动作质量即可正式计入通关；自定义名称不会触发挑战判定。
- 挑战页选择难度后可直接开始一次快速挑战，沿用训练计时和训练复核流程，保存后自动返回原挑战关卡。

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

## 离线支持

生产构建会生成 Service Worker，预缓存应用外壳与所有版本化的 JS/CSS 资源。动作示范、原书页面等大体积图片按访问缓存并跨版本保留；在线访问时先显示缓存，再在后台检查并更新发生变化的资源。断网后，已打开过的内容与本地训练记录仍可继续使用。Service Worker 仅在生产环境注册，本地开发不受缓存影响。

## 安装到桌面

支持安装 PWA 的 Chrome、Edge 等浏览器会在应用内显示“立即安装”；入口也会一直保留在“设置与备份”页面。iPhone 和 iPad 用户可使用 Safari 的“分享 → 添加到主屏幕”。安装后，练刻会以独立窗口运行，并提供训练、挑战闯关和体重记录快捷入口。

## 原生应用与锁屏训练

项目使用 Capacitor 8 提供 Android 原生容器。仓库通过 `.nvmrc` 固定 Node 22；宿主机无需修改默认 Node 版本，进入项目后执行：

```bash
nvm use
pnpm install
```

同步原生工程：

```bash
pnpm native:sync
```

- Android：训练开始后启动前台服务，在锁屏和通知栏展示不可滑除的训练通知及系统 Chronometer。使用 `pnpm native:android` 打开 Android Studio；Android 13 以上首次训练会请求通知权限。

网页端仍保持原有 PWA 行为；原生桥接只会在 Capacitor 环境中启用。

## GitHub Pages

仓库的 `main` 分支推送会触发 `.github/workflows/deploy.yml`。在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 添加：

- `VITE_SUPABASE_OAUTH_CLIENT_ID`：Supabase OAuth App Client ID
- `VITE_SUPABASE_OAUTH_TOKEN_URL`：OAuth token exchange Edge Function URL

启用“一键连接 Supabase”后，GitHub Pages 不再需要配置这两个变量；用户授权并选择项目后，应用会自动读取并保存项目 URL 和 publishable key。它们仍可作为本地开发和手动配置的兜底值，属于浏览器公开配置；不要添加或暴露 `service_role` key。

### Supabase 一键连接（可选）

设置页支持通过 Supabase OAuth 连接用户自己的项目，并自动执行初始化 SQL。需要先在 Supabase 创建 OAuth App，将回调地址设置为 `https://fanghaoming.github.io/lian-ke/auth/callback`，并为 OAuth App 开启 Projects Read、Secrets Read 和 Database Write 权限。

部署 `supabase/functions/supabase-oauth-token` Edge Function 后配置运行时 secrets：

```bash
supabase secrets set LIANKE_OAUTH_CLIENT_ID=... LIANKE_OAUTH_CLIENT_SECRET=...
supabase functions deploy supabase-oauth-token
```

前端构建变量为 `VITE_SUPABASE_OAUTH_CLIENT_ID` 和 `VITE_SUPABASE_OAUTH_TOKEN_URL`。其中 client ID 和 token function URL 可以公开，client secret 只能保存在 Edge Function secrets 中；不要把它写入 `VITE_*` 变量。由于 Supabase 保留了 `SUPABASE_` 前缀，Edge Function secret 使用 `LIANKE_OAUTH_CLIENT_ID` 和 `LIANKE_OAUTH_CLIENT_SECRET`。

在 **Settings → Pages → Build and deployment** 将 Source 设为 **GitHub Actions**。仓库名为 `lian-ke` 时，Vite 会自动使用 `/lian-ke/` 作为 Pages base 路径。

## GitHub Release

推送语义化版本 Tag 会自动创建 GitHub Release，并附带 Web/PWA 压缩包和带版本号、可直接安装的 Android APK：

```bash
git tag v1.0.0
git push origin v1.0.0
```

工作流只监听 `v*` Tag。APK 使用 GitHub Actions 的 Debug 签名，适合内部测试和直接安装；如果要发布到 Google Play，还需要配置正式签名密钥并改为 Release 签名构建。

为了让 Android 版本可以覆盖更新而不清除本地数据，Release 工作流要求配置一份固定的 Debug keystore。请在仓库 Settings → Secrets and variables → Actions 中添加以下 Secrets：

```text
ANDROID_DEBUG_KEYSTORE_BASE64
ANDROID_DEBUG_KEYSTORE_PASSWORD
ANDROID_DEBUG_KEY_ALIAS
ANDROID_DEBUG_KEY_PASSWORD
```

其中 `ANDROID_DEBUG_KEYSTORE_BASE64` 是同一份 PKCS12 keystore 的 Base64 内容。以后所有 APK 都使用这份签名，Android 才能识别为同一个应用并保留本地数据。
