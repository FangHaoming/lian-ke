---
name: release-routing
description: Decide whether a release request for this project should deploy the web app from main or create a version tag for the Android App release.
---

# 练刻发版路由

当用户说“发版”“发布测试版”“上线”或类似表达时，先检查当前工作区改动和仓库工作流，再选择发布目标。默认把未特别说明的“发版”理解为 Web 发布；只有用户明确要求 App/Android/APK，或改动必须通过原生构建才能生效时，才切换到 App 发布。

## 项目发布入口

- 推送 `main` 会触发 `.github/workflows/deploy.yml`，发布 GitHub Pages Web 版本。
- 推送 `v*` 标签会触发 `.github/workflows/release.yml`，构建 Web 压缩包、Android APK，并创建 GitHub Release。
- 当前 Android App 使用 APK 内置 Web 资源启动；因此仅修改 HTML/CSS/JavaScript 后，已安装 APK 不会获得这些改动。若用户说的是“App 测试版/安装包”，必须走 Tag 发布。

## 如何判断发布目标

先区分“代码改动类型”和“用户要更新的产品”。判断优先级如下：

- 涉及 `android/`、`capacitor.config.json`、Capacitor 原生配置/插件、Manifest、Gradle、原生 Java/Kotlin 的改动，属于 App 必须发布改动。
- 只涉及 `src/`、`public/`、HTML、CSS、Vite 配置的改动，按 Web 发布处理；这些改动虽然也会被 App 使用，但除非用户明确要求更新已安装 App，否则不需要走 App Tag 发布。

选择“只发布 Web”（提交并推送 `main`，不打 Tag）时：

- 用户明确说 Web、网页、GitHub Pages 或仅上线网站；或
- 改动只涉及网页内容，且用户没有要求更新已安装的 Android App。

选择“发布 App”（更新版本号、提交并推送 `main` 与版本 Tag）时：

- 用户明确说 App、APK、Android、测试版安装包；或
- 改动涉及上述 App 必须发布文件；或
- 用户明确要求让已安装 Android App 获取这次前端改动。

如果改动属于共享前端改动，而用户只说“发版/上线”，直接发布 Web，不要因为 Android App 复用了前端资源而追问目标。仅当用户明确提到 App/Android/APK，或明确要求让已安装 App 获取这次改动时，才询问测试版还是正式版（若渠道尚未指定）。

## App 发布前确认

确认目标为 Android App 后，且用户没有明确指定渠道，必须再暂停并询问用户选择：

- 测试版：使用下一个 `-rc.N` 标签，GitHub Actions 创建 Pre-release。
- 正式版：使用不带 `-rc` 的稳定版本标签，GitHub Actions 创建正式 Release。

在用户确认之前，不得修改版本号、创建 Tag、提交或推送 App 发布相关改动。用户已经明确说“测试版”“正式版”时，不需要再次询问。

## App 版本发布规则

- 先读取 `package.json` 与 `android/app/build.gradle` 的当前版本。
- 测试版递增 patch，并使用下一个未使用的 `-rc.N` 标签，例如 `1.0.10-rc.6` → `1.0.10-rc.7`；同时递增 Android `versionCode`。
- 稳定版使用不带 `-rc` 的版本标签，除非用户指定其他版本策略。
- 提交消息应说明发布内容；Tag 使用 `v` 前缀，例如 `v1.0.10-rc.7`。
- 发布前运行 `git diff --check`，确认工作区没有意外文件；不要覆盖用户未提交的无关修改。
- 需要外部写入时，先在 commentary 简短说明将推送的分支/标签和触发的工作流；获得权限后再执行提交和推送。

## 交付说明

报告实际执行的目标、commit、tag 和触发的工作流。不要把“已推送 Tag”说成“APK 已构建完成”；除非确认 GitHub Actions 成功，否则只说明发布流程已触发，并提供 Releases 链接。
