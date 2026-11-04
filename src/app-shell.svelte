<script>
  import { onMount } from 'svelte'
  import { defaults } from './lib/workout-model.js'
  import { loadData, saveData } from './lib/data.js'
  import TrainPage from './pages/train-page.svelte'
  import PlansPage from './pages/plans-page.svelte'
  import StatsPage from './pages/stats-page.svelte'
  import SettingsPage from './pages/settings-page.svelte'
  import WeightPage from './pages/weight-page.svelte'

  let data = defaults()
  let tab = 'train'
  let ready = false
  let today = ''
  let session = null
  let review = null
  let quickItems = []
  onMount(() => {
    data = loadData()
    today = new Date().toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    })
    ready = true
  })
  $: if (ready) saveData(data)
</script>

<div class="app">
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
    {#each [['train', '◉ 训练'], ['plans', '▦ 训练计划'], ['weight', '◒ 体重'], ['stats', '▥ 数据分析'], ['settings', '⚙ 设置/备份']] as [id, label]}
      <button class:active={tab === id} class="tab" on:click={() => (tab = id)}>{label}</button>
    {/each}
  </nav>
  {#if ready}
    {#if tab === 'train'}<TrainPage bind:data bind:session bind:review bind:quickItems />
    {:else if tab === 'plans'}<PlansPage bind:data />
    {:else if tab === 'weight'}<WeightPage bind:data />
    {:else if tab === 'stats'}<StatsPage bind:data />
    {:else}<SettingsPage bind:data />{/if}
  {/if}
</div>
