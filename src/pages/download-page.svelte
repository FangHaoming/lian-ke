<script>
  import { appPath, appURL } from '../lib/config.js'
  import packageJson from '../../package.json'

  const appVersion = `v${packageJson.version}`
  const apkURL = `https://github.com/FangHaoming/lian-ke/releases/latest/download/lianke-android-${appVersion}.apk`
  const releaseURL = 'https://github.com/FangHaoming/lian-ke/releases/latest'
</script>

<svelte:head>
  <meta name="robots" content="index,follow" />
</svelte:head>

<main class="download-page">
  <a class="download-brand" href={appPath('')} aria-label="返回练刻首页">
    <span class="download-brand-icon"><img src={appURL('fit-log-icon.png')} alt="" /></span>
    <span>
      <strong>
        练
        <span>刻</span>
      </strong>
      <small>FIT LOG</small>
    </span>
  </a>

  <section class="download-hero">
    <p class="download-eyebrow">ANDROID APP</p>
    <p class="download-version">当前版本 v{packageJson.version}</p>
    <h1>把训练带到锁屏上</h1>
    <p class="download-lead">
      下载练刻 Android App，训练时锁定屏幕也能持续查看动作、组数和倒计时。
    </p>
    <div class="download-actions">
      <a class="btn download-primary" href={apkURL}>
        下载 Android APK <span>↓</span>
      </a>
      <a class="btn download-secondary" href={appPath('')}>打开 Web 版</a>
    </div>
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
    max-width: 700px;
    padding: clamp(82px, 14vh, 150px) 0 84px;
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
    margin: 0 0 18px;
    padding: 5px 10px;
    border: 1px solid #3d5a43;
    border-radius: 999px;
    color: #c9f39c;
    background: #b7f36a12;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  h1 {
    max-width: 620px;
    margin: 0;
    color: #f3f9f4;
    font-size: clamp(42px, 8vw, 78px);
    line-height: 1.03;
    letter-spacing: -0.055em;
  }
  .download-lead {
    max-width: 530px;
    margin: 26px 0 30px;
    color: #aabcc3;
    font-size: 17px;
    line-height: 1.85;
  }
  .download-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
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
  .download-note {
    max-width: 550px;
    margin: 17px 0 0;
    color: #758b96;
    font-size: 11px;
    line-height: 1.7;
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
      padding-top: 80px;
      padding-bottom: 60px;
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
