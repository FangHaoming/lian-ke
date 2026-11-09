<script>
  import { onMount, onDestroy } from 'svelte'

  export let pageNumber
  export let src
  export let enabled = true
  export let lazy = false
  let section
  let observer
  let error = ''
  let mounted = false
  let started = false
  onMount(() => {
    mounted = true
  })
  onDestroy(() => {
    observer?.disconnect()
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

  $: if (mounted && enabled) started = true
</script>

<section bind:this={section} class="pdf-page" id={`source-page-${pageNumber}`}>
  <div class="pdf-page-label">第 {pageNumber} 页</div>
  {#if error}<p class="error">{error}</p>{/if}
  {#if started}
    <img
      {src}
      alt={`原书第 ${pageNumber} 页`}
      loading={enabled ? 'eager' : 'lazy'}
      decoding="async"
      on:error={() => (error = '页面图片加载失败')}
    />
  {:else}
    <div class="pdf-page-placeholder" role="img" aria-label={`原书第 ${pageNumber} 页，等待加载`} />
  {/if}
</section>

<style>
  .pdf-page {
    position: relative;
    width: min(100%, 920px);
    padding: 14px 0 22px;
  }
  .pdf-page img,
  .pdf-page-placeholder {
    display: block;
    width: 100%;
    aspect-ratio: 612 / 792;
    background: #fff;
    box-shadow: 0 8px 30px #0006;
  }
  .pdf-page img {
    height: auto;
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
