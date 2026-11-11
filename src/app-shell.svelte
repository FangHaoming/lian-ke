<script>
  import { onMount } from 'svelte'
  import { defaults, normalizeActiveSession } from './lib/workout-model.js'
  import { loadData, saveData } from './lib/data.js'
  import { consumeAuthCallback, cloudSession, signOut } from './lib/cloud.js'
  import AuthCallbackPage from './pages/auth-callback-page.svelte'
  import SourceViewerPage from './pages/source-viewer-page.svelte'
  import GlobalDialog from './components/global-dialog.svelte'
  import GlobalToast from './components/global-toast.svelte'
  import { requestConfirm } from './lib/confirm-dialog.js'
  import { appPath, appURL, basePath } from './lib/config.js'

  let data = defaults()
  let tab = 'train'
  let ready = false
  let today = ''
  let session = null
  let review = null
  let quickItems = []
  let quickStartRequest = null
  let wakeLock = null
  let wakeLockPending = false
  let screenAwake = false
  let challengeDirty = false
  let authCallback = false
  let sourceViewer = false
  let sourcePage = 1
  let pageComponents = {}
  let pageLoading = {}
  let pageLoadErrors = {}
  let sidebarOpen = typeof window === 'undefined' ? true : window.innerWidth > 760
  let accountSession = cloudSession()
  let pendingTab = null
  let sessionPersistTimer
  const ACTIVE_SESSION_KEY = 'lianke_active_training_session'

  const routes = {
    train: '',
    challenges: 'challenges',
    weight: 'weight',
    stats: 'stats',
    settings: 'settings',
  }
  const routeTabs = Object.fromEntries(Object.entries(routes).map(([tabId, path]) => [path, tabId]))
  routeTabs.train = 'train'

  const pageLoaders = {
    train: () => import('./pages/train-page.svelte'),
    challenges: () => import('./pages/challenges-page.svelte'),
    weight: () => import('./pages/weight-page.svelte'),
    stats: () => import('./pages/stats-page.svelte'),
    settings: () => import('./pages/settings-page.svelte'),
  }

  async function loadPageComponent(next) {
    if (pageComponents[next] || pageLoading[next] || !pageLoaders[next]) return
    pageLoading = { ...pageLoading, [next]: true }
    try {
      const module = await pageLoaders[next]()
      pageComponents = { ...pageComponents, [next]: module.default }
    } catch (cause) {
      pageLoadErrors = {
        ...pageLoadErrors,
        [next]: cause?.message || '页面加载失败',
      }
    } finally {
      pageLoading = { ...pageLoading, [next]: false }
    }
  }

  function routePath(next) {
    return appPath(routes[next] || routes.train)
  }

  function tabFromLocation() {
    const pathname = window.location.pathname
      .replace(new RegExp(`^${basePath}`), '')
      .replace(/^\/+|\/+$/g, '')
    const hashPath = window.location.hash.replace(/^#\/?/, '').replace(/^\/+|\/+$/g, '')
    return routeTabs[pathname] || routeTabs[hashPath] || 'train'
  }

  function isAuthCallbackLocation() {
    const pathname = window.location.pathname
      .replace(new RegExp(`^${basePath}`), '')
      .replace(/^\/+|\/+$/g, '')
    return pathname === 'auth/callback'
  }

  function isSourceViewerLocation() {
    const pathname = window.location.pathname
      .replace(new RegExp(`^${basePath}`), '')
      .replace(/^\/+|\/+$/g, '')
    return pathname === 'source'
  }

  function sourcePageFromLocation() {
    const value = Number.parseInt(
      new URLSearchParams(window.location.search).get('page') || '1',
      10,
    )
    return Number.isFinite(value) && value > 0 ? value : 1
  }

  function restoreGithubPagesRoute() {
    const key = 'lianke:github-pages-redirect'
    let redirect
    try {
      redirect = JSON.parse(sessionStorage.getItem(key) || 'null')
      sessionStorage.removeItem(key)
    } catch {
      sessionStorage.removeItem(key)
      return
    }
    if (!redirect?.pathname || !redirect.pathname.startsWith(`${basePath}/`)) return
    history.replaceState(
      history.state,
      '',
      `${redirect.pathname}${redirect.search || ''}${redirect.hash || ''}`,
    )
  }

  function switchTab(next) {
    if (next === tab) return
    if (tab === 'challenges' && challengeDirty) {
      pendingTab = next
      requestConfirm({
        title: '放弃本次挑战填写？',
        message: '这次挑战成绩尚未保存，确定丢弃已填写内容吗？',
        confirmText: '放弃填写',
        destructive: true,
      }).then(({ confirmed }) => {
        if (confirmed) confirmLeaveChallenge()
        else pendingTab = null
      })
      return
    }
    challengeDirty = false
    tab = next
    history.pushState({ ...(history.state || {}), tab: next }, '', routePath(next))
  }

  function confirmLeaveChallenge() {
    const next = pendingTab
    pendingTab = null
    if (!next || next === tab) return
    challengeDirty = false
    tab = next
    history.pushState({ ...(history.state || {}), tab: next }, '', routePath(next))
  }

  function openDeleteAccount() {
    switchTab('settings')
    setTimeout(() => window.dispatchEvent(new CustomEvent('open-delete-account')), 0)
    sidebarOpen = false
  }

  function requestSignOut() {
    requestConfirm({
      title: '退出登录',
      message: '退出后本设备将清除当前登录状态，确定退出吗？',
      confirmText: '确认退出',
    }).then(({ confirmed }) => {
      if (confirmed) confirmSignOut()
    })
  }

  function confirmSignOut() {
    signOut()
    accountSession = null
    window.dispatchEvent(new CustomEvent('lianke-auth-change'))
  }

  function selectTab(next) {
    switchTab(next)
    if (window.innerWidth <= 760) sidebarOpen = false
  }

  function startChallengeTraining(event) {
    const request = event.detail
    if (!request?.items?.length) return
    quickStartRequest = request
    tab = 'train'
    history.pushState({ ...(history.state || {}), tab: 'train' }, '', routePath('train'))
  }

  function returnToChallenge(event) {
    const selection = event.detail || {}
    tab = 'challenges'
    const params = new URLSearchParams()
    if (selection.routeId) params.set('route', selection.routeId)
    if (selection.levelId) params.set('level', selection.levelId)
    const query = params.toString()
    history.pushState(
      { ...(history.state || {}), tab: 'challenges' },
      '',
      `${routePath('challenges')}${query ? `?${query}` : ''}#challenge-history`,
    )
  }

  function persistActiveSession(value) {
    clearTimeout(sessionPersistTimer)
    if (!value) {
      localStorage.removeItem(ACTIVE_SESSION_KEY)
      return
    }
    sessionPersistTimer = setTimeout(() => {
      try {
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(value))
      } catch {}
    }, 300)
  }

  function restoreActiveSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) || 'null')
      const restored = normalizeActiveSession(saved)
      if (restored) session = restored
      else if (saved) localStorage.removeItem(ACTIVE_SESSION_KEY)
    } catch {
      localStorage.removeItem(ACTIVE_SESSION_KEY)
    }
  }

  function syncWakeLock(active) {
    if (!active || document.visibilityState !== 'visible') {
      if (wakeLock) {
        const lock = wakeLock
        wakeLock = null
        screenAwake = false
        void lock.release().catch(() => {})
      }
      return
    }
    if (!navigator.wakeLock || wakeLock || wakeLockPending) return
    wakeLockPending = true
    navigator.wakeLock
      .request('screen')
      .then((lock) => {
        if (session && !session.paused && document.visibilityState === 'visible') {
          wakeLock = lock
          screenAwake = true
          lock.addEventListener('release', () => {
            if (wakeLock === lock) {
              wakeLock = null
              screenAwake = false
            }
          })
        } else void lock.release().catch(() => {})
      })
      .catch(() => {
        screenAwake = false
      })
      .finally(() => {
        wakeLockPending = false
      })
  }
  onMount(() => {
    sidebarOpen = window.innerWidth > 760
    restoreGithubPagesRoute()
    data = loadData()
    restoreActiveSession()
    authCallback = isAuthCallbackLocation()
    sourceViewer = isSourceViewerLocation()
    sourcePage = sourcePageFromLocation()
    if (!authCallback && !sourceViewer) {
      consumeAuthCallback()
      tab = tabFromLocation()
      const routeUrl = routePath(tab)
      const search = tab === 'challenges' ? window.location.search : ''
      history.replaceState(
        { ...(history.state || {}), tab },
        '',
        `${routeUrl}${search}${window.location.hash}`,
      )
    }
    today = new Date().toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    })
    ready = true
    const onPopState = () => {
      const nextIsAuthCallback = isAuthCallbackLocation()
      if (nextIsAuthCallback) {
        authCallback = true
        return
      }
      if (authCallback) authCallback = false
      const next = tabFromLocation()
      if (next === tab) return
      if (tab === 'challenges' && challengeDirty) {
        pendingTab = next
        requestConfirm({
          title: '放弃本次挑战填写？',
          message: '这次挑战成绩尚未保存，确定丢弃已填写内容吗？',
          confirmText: '放弃填写',
          destructive: true,
        }).then(({ confirmed }) => {
          if (confirmed) confirmLeaveChallenge()
          else {
            pendingTab = null
            history.pushState({ ...(history.state || {}), tab }, '', routePath(tab))
          }
        })
        history.pushState({ ...(history.state || {}), tab }, '', routePath(tab))
        return
      }
      challengeDirty = false
      tab = next
    }
    window.addEventListener('popstate', onPopState)
    const onVisibilityChange = () => syncWakeLock(Boolean(session && !session.paused))
    const onAuthChange = () => (accountSession = cloudSession())
    const onRequestSignOut = () => requestSignOut()
    const onStartChallengeTraining = (event) => startChallengeTraining(event)
    const onReturnToChallenge = (event) => returnToChallenge(event)
    window.addEventListener('lianke-auth-change', onAuthChange)
    window.addEventListener('request-sign-out', onRequestSignOut)
    window.addEventListener('lianke-start-challenge-training', onStartChallengeTraining)
    window.addEventListener('lianke-return-to-challenges', onReturnToChallenge)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('lianke-auth-change', onAuthChange)
      window.removeEventListener('request-sign-out', onRequestSignOut)
      window.removeEventListener('lianke-start-challenge-training', onStartChallengeTraining)
      window.removeEventListener('lianke-return-to-challenges', onReturnToChallenge)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (wakeLock) void wakeLock.release().catch(() => {})
    }
  })
  $: if (ready) saveData(data)
  $: if (ready) persistActiveSession(session)
  $: if (ready) syncWakeLock(Boolean(session && !session.paused))
  $: if (ready && !authCallback && !sourceViewer) void loadPageComponent(tab)
</script>

<div class:source-mode={sourceViewer} class="app">
  {#if sourceViewer}
    <SourceViewerPage page={sourcePage} />
  {:else if authCallback}
    <div class="app-content">
      {#if ready}<AuthCallbackPage />{/if}
    </div>
  {:else}
    <aside class:collapsed={!sidebarOpen} class="sidebar">
      <button
        type="button"
        class="sidebar-brand"
        aria-label={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
        on:click={() => (sidebarOpen = !sidebarOpen)}
      >
        <span class="brand-icon-shell">
          <img class="brand-icon" src={appURL('fit-log-icon.png')} alt="练刻图标" />
        </span>
        {#if sidebarOpen}<span class="sidebar-brand-copy">
            <strong>
              练
              <span>刻</span>
            </strong>
            <small>FIT LOG</small>
          </span>{/if}
      </button>
      {#if sidebarOpen}<div class="sidebar-tagline">你的训练节奏、计划与进步</div>{/if}
      {#if sidebarOpen}
        {#if accountSession?.user?.email}
          <button type="button" class="sidebar-account" on:click={() => selectTab('settings')}>
            <span class="sidebar-account-label">当前账号</span>
            <strong>{accountSession.user.email}</strong>
          </button>
        {:else}
          <button
            class="sidebar-account sidebar-account-empty"
            on:click={() => selectTab('settings')}
          >
            <span class="sidebar-account-label">未登录</span>
            <strong>去设置登录账号</strong>
          </button>
        {/if}
      {/if}
      <nav class="sidebar-nav" aria-label="主导航">
        {#each [['train', '◉', '训练'], ['challenges', '⚑', '挑战闯关'], ['weight', '◒', '体重'], ['stats', '▥', '数据分析'], ['settings', '⚙', '设置/备份']] as [id, icon, label]}
          <button
            class:active={tab === id}
            class="sidebar-link"
            aria-label={label}
            title={sidebarOpen ? undefined : label}
            on:click={() => {
              selectTab(id)
            }}
          >
            <span aria-hidden="true">{icon}</span>
            {#if sidebarOpen}<span>{label}</span>{/if}
          </button>
        {/each}
      </nav>
      <div class="sidebar-bottom">
        {#if accountSession?.user?.email}
          <button
            class="sidebar-link sidebar-action"
            aria-label="退出登录"
            title={sidebarOpen ? undefined : '退出登录'}
            on:click={requestSignOut}
          >
            <span aria-hidden="true">↪</span>
            {#if sidebarOpen}<span>退出登录</span>{/if}
          </button>
          <button
            class="sidebar-link sidebar-action danger"
            aria-label="注销账号"
            title={sidebarOpen ? undefined : '注销账号'}
            on:click={openDeleteAccount}
          >
            <span aria-hidden="true">⌫</span>
            {#if sidebarOpen}<span>注销账号</span>{/if}
          </button>
        {/if}
        <button
          class="sidebar-collapse"
          aria-label={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
          on:click={() => (sidebarOpen = !sidebarOpen)}
        >
          {sidebarOpen ? '‹' : '›'}
        </button>
      </div>
    </aside>
    {#if sidebarOpen}<button
        class="sidebar-backdrop"
        aria-label="收起导航"
        on:click={() => (sidebarOpen = false)}
      ></button>{/if}
    <div class="app-content">
      <header class="top">
        <div>
          <div class="brand-lockup">
            <button
              class="mobile-sidebar-toggle"
              aria-label="打开导航"
              on:click={() => (sidebarOpen = true)}
            >
              ☰
            </button>
            <div class="logo">
              练
              <span>刻</span>
              <small>FIT LOG</small>
            </div>
          </div>
          <div class="muted small brand-subtitle">你的训练节奏、计划与进步</div>
        </div>
        <span class="pill">{today}</span>
      </header>
      {#if ready}
        {#if pageLoadErrors[tab]}
          <p class="page-error">{pageLoadErrors[tab]}</p>
        {:else if !pageComponents[tab]}
          <p class="page-loading">正在加载页面…</p>
        {:else if tab === 'train'}<svelte:component
            this={pageComponents.train}
            bind:data
            bind:session
            bind:review
            bind:quickItems
            bind:quickStartRequest
            {screenAwake}
          />
        {:else if tab === 'challenges'}<svelte:component
            this={pageComponents.challenges}
            bind:data
            bind:dirty={challengeDirty}
            on:startChallengeTraining={(event) => startChallengeTraining(event)}
          />
        {:else if tab === 'weight'}<svelte:component this={pageComponents.weight} bind:data />
        {:else if tab === 'stats'}<svelte:component this={pageComponents.stats} bind:data />
        {:else}<svelte:component this={pageComponents.settings} bind:data />{/if}
      {/if}
    </div>
  {/if}
  <GlobalDialog />
  <GlobalToast />
</div>
