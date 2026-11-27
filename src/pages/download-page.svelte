<script>
  import { onMount } from 'svelte'
  import { fetchLatestAppReleases } from '../lib/native-update.js'
  import { showToast } from '../lib/toast.js'
  import { nativeAppInfo, nativeTrainingAvailable, updateNativeWebAssets } from '../lib/native-training.js'
  import packageJson from '../../package.json'

  const appVersion = `v${packageJson.version}`
  const apkURL = `https://github.com/FangHaoming/lian-ke/releases/latest/download/lianke-android-${appVersion}.apk`
  const releaseURL = 'https://github.com/FangHaoming/lian-ke/releases'
  let latestReleases = { stable: null, testing: null }
  let checking = false
  let currentVersion = packageJson.version
  let isNativeApp = false
  let assetUpdateBusy = false
  let assetUpdateProgress = { completed: 0, total: 0, percent: 0 }

  onMount(() => {
    void loadCurrentVersion()
    void checkForUpdate()
  })

  async function loadCurrentVersion() {
    const info = await nativeAppInfo()
    if (info?.version) {
      currentVersion = info.version
      isNativeApp = true
    }
  }

  async function checkForUpdate() {
    if (checking) return
    checking = true
    try {
      latestReleases = await fetchLatestAppReleases()
      if (latestReleases.stable || latestReleases.testing) {
        const versions = [
          latestReleases.stable && `正式版 v${latestReleases.stable.latestVersion}`,
          latestReleases.testing && `测试版 v${latestReleases.testing.latestVersion}`,
        ].filter(Boolean)
        showToast(`已是最新版本：${versions.join('、')}`, { type: 'success' })
      } else {
        showToast('暂未找到可用的 APK Release', { type: 'info' })
      }
    } catch {
      showToast('检查失败，请稍后重试', { type: 'error' })
    } finally {
      checking = false
    }
  }

  async function updateWebAssetsManually() {
    if (assetUpdateBusy) return
    assetUpdateBusy = true
    assetUpdateProgress = { completed: 0, total: 0, percent: 0 }
    try {
      await updateNativeWebAssets({ onProgress: (progress) => (assetUpdateProgress = progress) })
    } finally {
      assetUpdateBusy = false
    }
  }

  $: stableRelease = latestReleases.stable
  $: testingRelease = latestReleases.testing
  $: stableApkURL = stableRelease?.apkUrl || apkURL
  $: testingApkURL = testingRelease?.apkUrl || apkURL
  $: stableVersion = stableRelease?.latestVersion || packageJson.version
  $: testingVersion = testingRelease?.latestVersion || packageJson.version
</script>

<svelte:head>
  <meta name="robots" content="index,follow" />
</svelte:head>

<main class="download-page">
  <section class="download-hero">
    <p class="download-eyebrow">ANDROID APP</p>
    <div class="download-version-row">
      {#if isNativeApp}
        <p class="download-version">当前版本 v{currentVersion}</p>
      {:else}
        <p class="download-version">最新正式版 v{stableVersion}</p>
      {/if}
      <button class="download-check" type="button" on:click={checkForUpdate} disabled={checking}>
        {checking ? '检查中…' : '检查更新'}
      </button>
    </div>
    <h1>
      <span>把训练</span>
      <span>带到锁屏上</span>
    </h1>
    <p class="download-lead">
      下载练刻 Android App，训练时锁定屏幕也能持续查看动作、组数和倒计时。
    </p>
    <div class="download-actions">
      <a class="btn download-primary" href={stableApkURL}>
        下载正式版 v{stableVersion}
        <span>↓</span>
      </a>
      <a class="btn download-testing" href={testingApkURL}>
        下载测试版 v{testingVersion}
        <span>↓</span>
      </a>
    </div>
    {#if nativeTrainingAvailable()}
      <button class="download-manual-update" type="button" on:click={updateWebAssetsManually} disabled={assetUpdateBusy}>
        {assetUpdateBusy
          ? `更新界面内容 ${assetUpdateProgress.percent}%`
          : '更新界面内容'}
      </button>
      {#if assetUpdateBusy}
        <div class="download-update-progress" aria-live="polite">
          <div class="download-update-progress-row">
            <span>正在并发下载界面资源</span>
            <strong>{assetUpdateProgress.percent}%</strong>
          </div>
          <div class="download-update-progress-track">
            <span style={`width:${assetUpdateProgress.percent}%`}></span>
          </div>
          <small>{assetUpdateProgress.completed} / {assetUpdateProgress.total} 个资源已完成</small>
        </div>
      {/if}
      <p class="download-manual-update-note">
        仅更新页面界面、文字和图片，不包含 App 原生功能、权限或安装包版本。
      </p>
    {/if}
    <p class="download-note">
      点击按钮会直接下载当前版本 APK。首次安装时，请允许浏览器或系统安装未知来源应用。
    </p>
  </section>

  <section class="download-features" aria-label="App 功能">
    <article>
      <span>◷</span>
      <h2>锁屏训练</h2>
      <p>训练计时通过系统通知持续显示，不需要一直亮着 App 页面。</p>
    </article>
    <article>
      <span>▣</span>
      <h2>离线可用</h2>
      <p>打开过的训练内容会保存在设备上，网络不稳定时也能继续记录。</p>
    </article>
    <article>
      <span>↗</span>
      <h2>持续更新</h2>
      <p>每次发布都会在 GitHub Release 提供最新安装包和版本说明。</p>
    </article>
  </section>

  <p class="download-release-link"><a href={releaseURL}>查看全部版本与更新说明 →</a></p>
</main>

<style>
  .download-page {
    width: min(980px, 100%);
    min-height: 100vh;
    margin: 0 auto;
    padding: 34px 22px 70px;
    color: #eaf2f4;
  }
  .download-brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    color: inherit;
    text-decoration: none;
  }
  .download-brand-icon {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border: 1px solid #3b5361;
    border-radius: 14px;
    background: #17232c;
  }
  .download-brand-icon img {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
  .download-brand strong {
    display: block;
    font-size: 25px;
    letter-spacing: 1px;
    line-height: 1;
  }
  .download-brand strong span {
    color: #b7f36a;
  }
  .download-brand small {
    display: block;
    margin-top: 5px;
    color: #8fa4ad;
    font-size: 10px;
    letter-spacing: 0.14em;
  }
  .download-hero {
    max-width: 760px;
    padding: 24px 0 76px;
  }
  .download-eyebrow {
    margin: 0 0 14px;
    color: #b7f36a;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.16em;
  }
  .download-version {
    display: inline-flex;
    margin: 0;
    padding: 5px 10px;
    border: 1px solid #3d5a43;
    border-radius: 999px;
    color: #c9f39c;
    background: #b7f36a12;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .download-version-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }
  .download-check {
    min-width: 0;
    height: 36px;
    padding: 0 14px;
    border: 1px solid #3b5968;
    border-radius: 999px;
    background: #172630;
    color: #cbdde2;
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
  }
  .download-check:hover:not(:disabled) {
    border-color: #b7f36a;
    color: #e9f8d8;
  }
  h1 {
    max-width: 620px;
    margin: 24px 0 0;
    color: #f3f9f4;
    font-size: clamp(42px, 7.2vw, 76px);
    line-height: 1.08;
    letter-spacing: -0.055em;
  }
  h1 span {
    display: inline;
  }
  .download-lead {
    max-width: 530px;
    margin: 22px 0 30px;
    color: #aabcc3;
    font-size: 17px;
    line-height: 1.85;
  }
  .download-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .download-actions a {
    text-decoration: none;
  }
  .download-primary {
    background: #b7f36a;
    border-color: #b7f36a;
    color: #14200a;
    font-weight: 800;
  }
  .download-primary:hover {
    background: #d0ff9a;
    border-color: #d0ff9a;
    color: #14200a;
  }
  .download-primary span {
    margin-left: 8px;
    font-size: 18px;
  }
  .download-secondary {
    color: #d1e0e2;
  }
  .download-testing {
    border: 1px solid #405561;
    background: #172630;
    color: #d1e0e2;
  }
  .download-testing:hover {
    border-color: #9bcf64;
    color: #eff9e8;
  }
  .download-note {
    max-width: 550px;
    margin: 17px 0 0;
    color: #758b96;
    font-size: 11px;
    line-height: 1.7;
  }
  .download-manual-update {
    margin-top: 18px;
    min-height: 40px;
    padding: 0 16px;
    border: 1px solid #3b5968;
    border-radius: 999px;
    background: #172630;
    color: #cbdde2;
    font-weight: 700;
  }
  .download-manual-update-note {
    margin: 8px 0 0;
    color: #8299a3;
    font-size: 12px;
  }
  .download-update-progress {
    max-width: 520px;
    margin-top: 14px;
    padding: 14px 16px;
    border: 1px solid #395463;
    border-radius: 14px;
    background: #12212a;
    color: #cbdde2;
  }
  .download-update-progress-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
  }
  .download-update-progress-row strong {
    color: #b7f36a;
    font-variant-numeric: tabular-nums;
  }
  .download-update-progress-track {
    height: 8px;
    margin: 10px 0 8px;
    overflow: hidden;
    border-radius: 999px;
    background: #2a3c44;
  }
  .download-update-progress-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #b7f36a;
    transition: width 180ms ease;
  }
  .download-update-progress small {
    color: #8299a3;
    font-size: 11px;
  }
  .download-features {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .download-features article {
    padding: 22px;
    border: 1px solid #2b3d47;
    border-radius: 16px;
    background: #121d24;
  }
  .download-features article > span {
    color: #b7f36a;
    font-size: 22px;
  }
  .download-features h2 {
    margin: 15px 0 8px;
    font-size: 15px;
  }
  .download-features p {
    margin: 0;
    color: #8fa3ac;
    font-size: 12px;
    line-height: 1.7;
  }
  .download-release-link {
    margin: 26px 0 0;
    font-size: 12px;
  }
  .download-release-link a {
    color: #b7f36a;
  }
  @media (max-width: 650px) {
    .download-page {
      padding-inline: 18px;
    }
    .download-hero {
      padding-top: 28px;
      padding-bottom: 60px;
    }
    h1 {
      margin-top: 20px;
      font-size: clamp(40px, 12vw, 62px);
    }
    h1 span {
      display: block;
    }
    .download-lead {
      font-size: 15px;
    }
    .download-features {
      grid-template-columns: 1fr;
    }
    .download-features article {
      padding: 18px;
    }
  }
</style>
