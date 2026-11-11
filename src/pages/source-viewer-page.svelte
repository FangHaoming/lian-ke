<script>
  import { onMount, tick } from 'svelte'
  import PdfPage from '../components/pdf-page.svelte'
  import { appPath, appURL } from '../lib/config.js'

  export let page = 1
  const TOTAL_PAGES = 1529
  let loading = true
  let totalPages = 0
  let pages = []
  let priorityPages = new Set()
  let lazyReady = false
  let returnHref = appPath()

  const pageImageURL = (pageNumber) =>
    appURL(`convict-conditioning-pages/page-${String(pageNumber).padStart(4, '0')}.webp`)

  const scrollToTarget = () => {
    const targetPage = Math.min(Math.max(1, page), totalPages)
    document.getElementById(`source-page-${targetPage}`)?.scrollIntoView()
  }

  onMount(async () => {
    const returnValue = new URLSearchParams(window.location.search).get('return')
    try {
      const returnUrl = returnValue ? new URL(returnValue, window.location.origin) : null
      const returnPaths = new Set([appPath(), appPath('plans'), appPath('challenges')])
      if (returnUrl?.origin === window.location.origin && returnPaths.has(returnUrl.pathname)) {
        returnHref = `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`
      }
    } catch {
      returnHref = appPath()
    }
    totalPages = TOTAL_PAGES
    const targetPage = Math.min(Math.max(1, page), totalPages)
    const firstPriorityPage = Math.max(1, targetPage - 2)
    const lastPriorityPage = Math.min(totalPages, targetPage + 2)
    priorityPages = new Set(
      Array.from(
        { length: lastPriorityPage - firstPriorityPage + 1 },
        (_, index) => firstPriorityPage + index,
      ),
    )
    pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    await tick()
    scrollToTarget()
    lazyReady = true
    loading = false
  })
</script>

<main class="source-viewer-page">
  <header>
    <div class="source-brand">
      <img src={appURL('fit-log-icon.png')} alt="练刻图标" />
      <div>
        <div class="source-brand-name">
          <strong>
            练
            <span>刻</span>
          </strong>
          <small>FIT LOG</small>
        </div>
        <p>你的训练节奏、计划与进步</p>
      </div>
    </div>
    <a class="source-return" href={returnHref}>← 返回练刻</a>
  </header>
  {#if loading}<p>正在加载原书页面…</p>{/if}
  {#if pages.length}
    <div class="source-document">
      {#each pages as pageNumber (pageNumber)}
        <PdfPage
          {pageNumber}
          src={pageImageURL(pageNumber)}
          enabled={priorityPages.has(pageNumber)}
          lazy={lazyReady}
        />
      {/each}
    </div>
  {/if}
</main>

<style>
  .source-viewer-page {
    min-height: 100vh;
    padding: 20px;
    background: #202124;
    color: #eaf2f4;
  }
  header {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    max-width: 920px;
    margin: 0 auto;
    padding: 12px 0;
    background: #202124ee;
  }
  header a {
    color: #b7f36a;
    text-decoration: none;
  }
  .source-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .source-brand > img {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    border-radius: 10px;
  }
  .source-brand-name {
    display: flex;
    align-items: baseline;
    gap: 7px;
    white-space: nowrap;
  }
  .source-brand-name strong {
    color: #eff7f8;
    font-size: 20px;
    letter-spacing: 1px;
  }
  .source-brand-name strong span {
    color: #b7f36a;
  }
  .source-brand-name small {
    color: #7c909b;
    font-size: 9px;
    letter-spacing: 0.08em;
  }
  .source-brand p {
    margin: 2px 0 0;
    color: #8196a0;
    font-size: 10px;
    white-space: nowrap;
  }
  .source-return {
    flex: 0 0 auto;
    font-weight: 700;
  }
  .source-document {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: min(100%, 920px);
    margin: 0 auto;
  }
  p {
    max-width: 920px;
    margin: 40px auto;
    color: #aebfc8;
  }
  @media (max-width: 520px) {
    .source-viewer-page {
      padding: 12px;
    }
    .source-brand p,
    .source-brand-name small {
      display: none;
    }
    .source-return {
      font-size: 14px;
    }
  }
</style>
