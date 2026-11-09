<script>
  import { onMount, onDestroy } from 'svelte'

  export let pdf
  export let pageNumber
  export let scale = 1.05
  export let enabled = true
  export let lazy = false
  let section
  let observer
  let renderTask
  let disposed = false
  let canvas
  let error = ''
  let mounted = false
  let started = false
  onMount(() => {
    mounted = true
  })
  onDestroy(() => {
    disposed = true
    observer?.disconnect()
    renderTask?.cancel()
  })

  $: if (mounted && lazy && !enabled && !started && !observer) {
    observer = new IntersectionObserver(handleIntersection, { rootMargin: '600px 0px' })
    observer.observe(section)
  }

  function handleIntersection(entries) {
    if (entries.some((entry) => entry.isIntersecting)) {
      enabled = true
      observer.disconnect()
    }
  }

  $: if (mounted && enabled && !started) {
    started = true
    void renderPage()
  }

  async function renderPage() {
    try {
      const page = await pdf.getPage(pageNumber)
      if (disposed) return
      const viewport = page.getViewport({ scale })
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`
      renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport })
      await renderTask.promise
    } catch (cause) {
      if (disposed) return
      error = cause?.message || '页面渲染失败'
    }
  }
</script>

<section bind:this={section} class="pdf-page" id={`source-page-${pageNumber}`}>
  <div class="pdf-page-label">第 {pageNumber} 页</div>
  {#if error}<p class="error">{error}</p>{/if}
  <canvas bind:this={canvas} width="1" height="1" aria-label={`原书第 ${pageNumber} 页`} />
</section>

<style>
  .pdf-page {
    position: relative;
    width: min(100%, 920px);
    padding: 14px 0 22px;
  }
  .pdf-page canvas {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 612 / 792;
    background: #fff;
    box-shadow: 0 8px 30px #0006;
  }
  .pdf-page-label {
    margin-bottom: 8px;
    color: #8fa4ad;
    font:
      12px system-ui,
      sans-serif;
    text-align: center;
  }
  .error {
    color: #ffb6bd;
  }
</style>
