<script>
  import { onDestroy, onMount, tick } from 'svelte'
  import PdfPage from '../components/pdf-page.svelte'
  import FloatingBackButton from '../components/floating-back-button.svelte'
  import { actionGuides } from '../lib/action-guide-catalog.js'
  import { appPath, appURL } from '../lib/config.js'

  export let page = 1
  export let action = ''
  const TOTAL_PAGES = 1529
  let loading = true
  let totalPages = 0
  let pages = []
  let priorityPages = new Set()
  let lazyReady = false
  let returnHref = appPath()
  let leaving = false
  let activeGuide = null
  let guideExpanded = true
  let pageObserver
  let observedGuidePages = []

  const pageImageURL = (pageNumber) =>
    appURL(`convict-conditioning-pages/page-${String(pageNumber).padStart(4, '0')}.webp`)

  const scrollToTarget = () => {
    const targetPage = Math.min(Math.max(1, page), totalPages)
    document.getElementById(`source-page-${targetPage}`)?.scrollIntoView()
  }

  function returnToPreviousPage() {
    if (leaving) return
    leaving = true
    window.location.href = returnHref
  }

  function interceptBrowserBack() {
    returnToPreviousPage()
  }

  function observeGuidePages() {
    pageObserver?.disconnect()
    observedGuidePages = []
    activeGuide = null
    if (!actionGuides.length || typeof IntersectionObserver === 'undefined') {
      return
    }
    observedGuidePages = actionGuides.flatMap((guide) =>
      pages
        .filter((pageNumber) => pageNumber >= guide.startPage && pageNumber <= guide.endPage)
        .map((pageNumber) => ({
          guide,
          element: document.getElementById(`source-page-${pageNumber}`),
        }))
        .filter(({ element }) => element),
    )
    pageObserver = new IntersectionObserver(updateActiveGuide, {
      rootMargin: '-12% 0px -12% 0px',
      threshold: 0.01,
    })
    observedGuidePages.forEach(({ element }) => pageObserver.observe(element))
    updateActiveGuide()
  }

  function updateActiveGuide() {
    const viewportCenter = window.innerHeight / 2
    const topBoundary = window.innerHeight * 0.12
    const bottomBoundary = window.innerHeight * 0.88
    const visible = observedGuidePages
      .map(({ guide, element }) => {
        const rect = element.getBoundingClientRect()
        return {
          guide,
          distanceToCenter: Math.abs(rect.top + rect.height / 2 - viewportCenter),
          inRange: rect.bottom > topBoundary && rect.top < bottomBoundary,
        }
      })
      .filter((item) => item.inRange)
      .sort((left, right) => left.distanceToCenter - right.distanceToCenter)
    activeGuide = visible[0]?.guide || null
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
    history.pushState(
      { ...(history.state || {}), sourceViewerGuard: true },
      '',
      window.location.href,
    )
    window.addEventListener('popstate', interceptBrowserBack)
    window.addEventListener('scroll', updateActiveGuide, { passive: true })
    window.addEventListener('resize', updateActiveGuide)
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
    await tick()
    observeGuidePages()
  })

  onDestroy(() => {
    pageObserver?.disconnect()
    window.removeEventListener('scroll', updateActiveGuide)
    window.removeEventListener('resize', updateActiveGuide)
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
  </header>
  <FloatingBackButton label="返回练刻" on:click={returnToPreviousPage} />
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
  {#if activeGuide}
    <aside class:collapsed={!guideExpanded} class="action-guide-float" aria-live="polite">
      <button
        class="action-guide-toggle"
        type="button"
        aria-label={guideExpanded ? '收起动作示范' : '展开动作示范'}
        aria-expanded={guideExpanded}
        on:click={() => (guideExpanded = !guideExpanded)}
      >
        <span aria-hidden="true">{guideExpanded ? '→' : '←'}</span>
      </button>
      <div class="action-guide-content" aria-hidden={!guideExpanded}>
        <div class="action-guide-float-heading">
          <div>
            <strong>{activeGuide.title}</strong>
            <span>原书第 {activeGuide.startPage}–{activeGuide.endPage} 页</span>
          </div>
        </div>
        <img src={appURL(activeGuide.gif)} alt={`${activeGuide.action} GIF 动作示范`} />
        <p>{activeGuide.description}</p>
      </div>
    </aside>
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
  .source-document {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: min(100%, 920px);
    margin: 0 auto;
  }
  .action-guide-float {
    position: fixed;
    right: max(24px, calc((100vw - 1180px) / 2));
    top: 88px;
    z-index: 5;
    width: min(280px, calc(100vw - 36px));
    padding: 12px;
    border: 1px solid #536b59;
    border-radius: 16px;
    background: #111a20ee;
    box-shadow: 0 16px 44px #0009;
    backdrop-filter: blur(12px);
    transition:
      transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 180ms ease;
    will-change: transform;
  }
  .action-guide-float.collapsed {
    transform: translateX(calc(100% - 52px));
    padding: 0;
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    pointer-events: none;
  }
  .action-guide-content {
    opacity: 1;
    transform: translateX(0);
    transition:
      opacity 180ms ease,
      transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .action-guide-float.collapsed .action-guide-content {
    opacity: 0;
    transform: translateX(12px);
    pointer-events: none;
  }
  .action-guide-float-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
    padding-right: 44px;
  }
  .action-guide-float-heading div {
    display: grid;
    gap: 3px;
  }
  .action-guide-float-heading strong {
    color: #eff8f8;
    font-size: 14px;
  }
  .action-guide-float-heading span,
  .action-guide-float p {
    color: #a7b9c4;
    font-size: 11px;
  }
  .action-guide-toggle {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 42px;
    height: 42px;
    border: 1px solid #3b4e58;
    border-radius: 50%;
    background: transparent;
    color: #d8e5e7;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    transition:
      left 260ms cubic-bezier(0.22, 1, 0.36, 1),
      right 260ms cubic-bezier(0.22, 1, 0.36, 1),
      background 160ms ease,
      transform 160ms ease;
    z-index: 1;
  }
  .action-guide-toggle span {
    display: block;
    transform: translateY(-1px);
    transition: transform 180ms ease;
  }
  .action-guide-float.collapsed .action-guide-toggle {
    right: auto;
    top: 0;
    left: 0;
    pointer-events: auto;
  }
  .action-guide-toggle:hover {
    background: #263b47;
  }
  .action-guide-toggle:active {
    transform: scale(0.92);
  }
  .action-guide-float img {
    display: block;
    width: 100%;
    border-radius: 10px;
    background: #0b1220;
  }
  .action-guide-float p {
    margin: 8px 2px 0;
    line-height: 1.5;
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
    .action-guide-float {
      right: 12px;
      top: 72px;
      width: min(230px, calc(100vw - 24px));
    }
  }
</style>
