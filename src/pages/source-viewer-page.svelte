<script>
  import { onMount, tick } from 'svelte'
  import PdfPage from '../components/pdf-page.svelte'

  export let page = 1
  let loading = true
  let error = ''
  let totalPages = 0
  let pdf = null
  let pages = []
  let returnHref = import.meta.env.BASE_URL || '/'

  const scrollToTarget = () => {
    const targetPage = Math.min(Math.max(1, page), totalPages)
    document.getElementById(`source-page-${targetPage}`)?.scrollIntoView()
  }

  onMount(async () => {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
    const returnValue = new URLSearchParams(window.location.search).get('return')
    try {
      const returnUrl = returnValue ? new URL(returnValue, window.location.origin) : null
      const challengesPath = `${base}/challenges`
      if (returnUrl?.origin === window.location.origin && returnUrl.pathname === challengesPath) {
        returnHref = `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`
      }
    } catch {
      returnHref = `${base}/`
    }
    try {
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url,
      ).toString()
      pdf = await pdfjs.getDocument(`${base}/convict-conditioning.pdf`).promise
      totalPages = pdf.numPages
      pages = Array.from({ length: totalPages }, (_, index) => index + 1)
      await tick()
      scrollToTarget()
      // PDF canvas 渲染会逐步改变页面高度，首次定位后再补两次，避免被后续页面撑开而偏移。
      window.setTimeout(scrollToTarget, 1200)
      window.setTimeout(scrollToTarget, 3000)
    } catch (cause) {
      error = cause?.message || '原书 PDF 加载失败'
    } finally {
      loading = false
    }
  })
</script>

<main class="source-viewer-page">
  <header>
    <a href={returnHref}>返回练刻</a>
  </header>
  {#if loading}<p>正在加载原书页面…</p>{/if}
  {#if error}<p class="error">{error}</p>{/if}
  {#if pdf}
    <div class="source-document">
      {#each pages as pageNumber}<PdfPage {pdf} {pageNumber} />{/each}
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
  .error {
    color: #ffb6bd;
  }
</style>
