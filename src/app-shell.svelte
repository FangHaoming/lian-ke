<script>
  import { onMount } from 'svelte'
  import { defaults } from './lib/workout-model.js'
  import { loadData, saveData } from './lib/data.js'
  import { consumeAuthCallback } from './lib/cloud.js'
  import TrainPage from './pages/train-page.svelte'
  import PlansPage from './pages/plans-page.svelte'
  import StatsPage from './pages/stats-page.svelte'
  import SettingsPage from './pages/settings-page.svelte'
  import WeightPage from './pages/weight-page.svelte'
  import ChallengesPage from './pages/challenges-page.svelte'
  import AuthCallbackPage from './pages/auth-callback-page.svelte'

  let data = defaults()
  let tab = 'train'
  let ready = false
  let today = ''
  let session = null
  let review = null
  let quickItems = []
  let wakeLock = null
  let wakeLockPending = false
  let screenAwake = false
  let challengeDirty = false
  let authCallback = false

  const routes = {
    train: '',
    plans: 'plans',
    challenges: 'challenges',
    weight: 'weight',
    stats: 'stats',
    settings: 'settings',
  }
  const routeTabs = Object.fromEntries(Object.entries(routes).map(([tabId, path]) => [path, tabId]))
  routeTabs.train = 'train'

  function routePath(next) {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
    return `${base}/${routes[next] || routes.train}`
  }

  function tabFromLocation() {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
    const pathname = window.location.pathname
      .replace(new RegExp(`^${base}`), '')
      .replace(/^\/+|\/+$/g, '')
    const hashPath = window.location.hash.replace(/^#\/?/, '').replace(/^\/+|\/+$/g, '')
    return routeTabs[pathname] || routeTabs[hashPath] || 'train'
  }

  function isAuthCallbackLocation() {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
    const pathname = window.location.pathname
      .replace(new RegExp(`^${base}`), '')
      .replace(/^\/+|\/+$/g, '')
    return pathname === 'auth/callback'
  }

  function canLeaveCurrentTab() {
    return (
      tab !== 'challenges' ||
      !challengeDirty ||
      confirm('这次挑战成绩尚未保存，确定丢弃已填写内容吗？')
    )
  }

  function switchTab(next) {
    if (next === tab) return
    if (!canLeaveCurrentTab()) return
    challengeDirty = false
    tab = next
    history.pushState({ ...(history.state || {}), tab: next }, '', routePath(next))
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
    data = loadData()
    authCallback = isAuthCallbackLocation()
    if (!authCallback) {
      consumeAuthCallback()
      tab = tabFromLocation()
      history.replaceState({ ...(history.state || {}), tab }, '', routePath(tab))
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
      if (!canLeaveCurrentTab()) {
        history.pushState({ ...(history.state || {}), tab }, '', routePath(tab))
        return
      }
      challengeDirty = false
      tab = next
    }
    window.addEventListener('popstate', onPopState)
    const onVisibilityChange = () => syncWakeLock(Boolean(session && !session.paused))
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (wakeLock) void wakeLock.release().catch(() => {})
    }
  })
  $: if (ready) saveData(data)
  $: if (ready) syncWakeLock(Boolean(session && !session.paused))
</script>

<div class="app">
  {#if authCallback}
    {#if ready}<AuthCallbackPage />{/if}
  {:else}
    <header class="top">
      <div>
        <div class="brand-lockup">
          <span class="brand-icon-shell">
            <img class="brand-icon" src="fit-log-icon.png" alt="练刻图标" />
          </span>
          <div class="logo">
            练
            <span>刻</span>
            <span style="font-size:12px;color:#7c909b;font-weight:400">FIT LOG</span>
          </div>
        </div>
        <div class="muted small brand-subtitle">你的训练节奏、计划与进步</div>
      </div>
      <span class="pill">{today}</span>
    </header>
    <nav class="tabs" aria-label="主导航">
      {#each [['train', '◉ 训练'], ['plans', '▦ 训练计划'], ['challenges', '⚑ 挑战闯关'], ['weight', '◒ 体重'], ['stats', '▥ 数据分析'], ['settings', '⚙ 设置/备份']] as [id, label]}
        <button class:active={tab === id} class="tab" on:click={() => switchTab(id)}>
          {label}
        </button>
      {/each}
    </nav>
    {#if ready}
      {#if tab === 'train'}<TrainPage
          bind:data
          bind:session
          bind:review
          bind:quickItems
          {screenAwake}
        />
      {:else if tab === 'plans'}<PlansPage bind:data />
      {:else if tab === 'challenges'}<ChallengesPage bind:data bind:dirty={challengeDirty} />
      {:else if tab === 'weight'}<WeightPage bind:data />
      {:else if tab === 'stats'}<StatsPage bind:data />
      {:else}<SettingsPage bind:data />{/if}
    {/if}
  {/if}
</div>
