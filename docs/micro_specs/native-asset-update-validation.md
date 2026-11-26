# 静默资源更新验证

目标：资源下载、完整性检查、原子提交、冷启动目录选择由自动化验证；不能将下载成功等同于当前页面已经应用。

生产约束：每个版本使用独立目录，运行期间不替换旧目录、不刷新 WebView；完整文件清单及本地 SHA-256 检查通过后提交版本标记。启动前选择目录，由 Capacitor 原生服务器处理路由、桥接和 MIME。旧版未验证资源回退到 APK，下一次下载后迁移。

本地入口：`pnpm test:native-assets`，要求 JDK（可通过 `LIANKE_JAVA_HOME` 指定临时 JDK）。直接编译生产 `AssetStore.java`，运行真实磁盘事务测试，然后执行 JS 到 Java 的集成测试。Release 工作流在打包前执行同一入口，失败即停止。

覆盖：首次启动、下载未提交、缺少 CSS、空文件、文件截断及等长篡改、版本目录不可变、原子标记中断、非法路径、旧目录迁移、同版本多次启动、下载/提交/清单失败、JS 下载到 Java 激活后重新读取 CSS。

边界：本地 JVM 和 Node 测试不等同于 Android WebView 或真机 UI 测试；页面路径回退、桥接注入、白屏时长仍需 Android 环境验证。没有 Android SDK 时不宣布真机问题已解决。

验证记录（2026-11-26）：临时 JDK 21 本地执行 `LIANKE_JAVA_HOME=/private/tmp/lianke-test-jdk/jdk-21.0.13.1+2/Contents/Home node scripts/test-native-assets.js`，10 个生产 Java 文件事务测试及 7 个 Node 测试全部通过，包含 1 个 JS→Java→冷启动读取 CSS 的集成测试，没有跳过。生产 AssetStore 以 Java 8 API 目标编译通过；未编译整个 Android App。

旧代码反证：提取 b0ec6a8 的更新函数连续执行两次，同版本触发两次激活，可复现 rc.12 循环刷新条件。全仓库原有测试 43 项中 39 通过、4 失败；通过在临时目录展开 HEAD 重新运行，确认四项为基线既有失败（挑战目录、关联训练记录及两项训练计时），此次未修改它们。

交付状态：修改和测试保留在本地，尚未提交、推送或发布新 APK。下一步是在 Android 环境验证原生桥接和页面加载时序，不能把上述 JVM 集成测试称为真机端到端测试。
