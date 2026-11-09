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
      const challengesPath = appPath('challenges')
      if (returnUrl?.origin === window.location.origin && returnUrl.pathname === challengesPath) {
        returnHref = `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`
      }
    } catch {
      returnHref = appPath()
    }
    totalPages = TOTAL_PAGES
    const targetPage = Math.min(Math.max(1, page), totalPages)
    const firstPriorityPage = Math.max(1, targetPage - 5)
    const lastPriorityPage = Math.min(totalPages, targetPage + 10)
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
    <a href={returnHref}>返回练刻</a>
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
</style>
