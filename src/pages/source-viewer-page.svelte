<script>
  import { onMount, onDestroy, tick } from 'svelte'
  import PdfPage from '../components/pdf-page.svelte'
  import { appPath, appURL } from '../lib/config.js'

  export let page = 1
  let loading = true
  let error = ''
  let totalPages = 0
  let pdf = null
  let pages = []
  let priorityPages = new Set()
  let lazyReady = false
  let returnHref = appPath()
  let loadingTask
  let loadTimeout

  onDestroy(() => {
    window.clearTimeout(loadTimeout)
    void loadingTask?.destroy()
  })

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
    try {
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url,
      ).toString()
      loadingTask = pdfjs.getDocument({
        url: appURL('convict-conditioning.pdf'),
        disableStream: true,
        disableAutoFetch: true,
        rangeChunkSize: 262144,
      })
      pdf = await Promise.race([
        loadingTask.promise,
        new Promise((_, reject) => {
          loadTimeout = window.setTimeout(() => {
            reject(new Error('原书加载超时，请刷新重试，或直接打开 PDF。'))
            void loadingTask.destroy()
          }, 60000)
        }),
      ])
      window.clearTimeout(loadTimeout)
      totalPages = pdf.numPages
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
    } catch (cause) {
      error = cause?.message || '原书 PDF 加载失败'
    } finally {
      window.clearTimeout(loadTimeout)
      loading = false
    }
  })
</script>

<main class="source-viewer-page">
  <header>
    <a href={returnHref}>返回练刻</a>
  </header>
  {#if loading}<p>正在加载原书页面…</p>{/if}
  {#if error}
    <p class="error">
      {error}
      <a href={appURL('convict-conditioning.pdf')}>直接打开 PDF</a>
    </p>
  {/if}
  {#if pdf}
    <div class="source-document">
      {#each pages as pageNumber (pageNumber)}
        <PdfPage {pdf} {pageNumber} enabled={priorityPages.has(pageNumber)} lazy={lazyReady} />
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
  .error {
    color: #ffb6bd;
  }
</style>
