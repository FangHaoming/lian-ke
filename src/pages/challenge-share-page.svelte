<script>
  import { onMount } from 'svelte'
  import { challengeRoutes, stageLabels } from '../lib/challenge-catalog.js'
  import { completionStage, formatGoal } from '../lib/challenge-model.js'
  import { appPath } from '../lib/config.js'
  import { decodeShareToken } from '../lib/share-token.js'

  let mode = 'level'
  let route
  let level
  let routeCount = 0
  let attemptCount = 0
  let completedCount = 0
  let achievedStages = []
  let routeCounts = []
  let shareDate = ''
  let invalid = true
  let floatingButton
  let floatingPosition = null
  let floatingDrag = null
  let suppressFloatingClick = false

  $: actionIcon =
    route && level
      ? appPath(`action-icons/${route.id}-${String(level.step).padStart(2, '0')}.png`)
      : ''
  $: challengeHref =
    route && level
      ? `${appPath('challenges')}?route=${encodeURIComponent(route.id)}&level=${encodeURIComponent(level.id)}`
      : appPath('challenges')

  onMount(async () => {
    const params = new URLSearchParams(window.location.search)
    let payload = null
    if (params.get('s')) {
      try {
        payload = await decodeShareToken(params.get('s'))
      } catch {
        payload = null
      }
    } else {
      payload = {
        mode: params.get('mode') || 'level',
        route: params.get('route') || '',
        level: params.get('level') || '',
        count: params.get('count') || 0,
        attempts: params.get('attempts') || 0,
        completed: params.get('completed') || 0,
        routes: (params.get('routes') || '').split(','),
        achieved: (params.get('achieved') || '').split(','),
      }
    }
    if (payload) {
      mode = payload.mode || 'level'
      route = challengeRoutes.find((item) => item.id === payload.route)
      level = route?.levels.find((item) => item.id === payload.level)
      routeCount = boundedNumber(payload.count, 0, 10)
      attemptCount = boundedNumber(payload.attempts, 0, 999)
      completedCount = boundedNumber(payload.completed, 0, 60)
      routeCounts = (payload.routes || []).map((count) => boundedNumber(count, 0, 10))
      achievedStages = (payload.achieved || []).filter((stage) => Boolean(stageLabels[stage]))
      invalid = mode !== 'overview' && (!route || !level)
    }
    const now = new Date()
    shareDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

    const moveFloatingButton = (event) => {
      if (!floatingDrag) return
      floatingPosition = clampFloatingPosition(
        event.clientX - floatingDrag.offsetX,
        event.clientY - floatingDrag.offsetY,
      )
      if (
        Math.abs(floatingPosition.x - floatingDrag.startX) > 4 ||
        Math.abs(floatingPosition.y - floatingDrag.startY) > 4
      )
        floatingDrag.moved = true
    }
    const finishFloatingDrag = () => {
      if (!floatingDrag) return
      if (floatingDrag.moved) {
        suppressFloatingClick = true
        setTimeout(() => (suppressFloatingClick = false), 0)
      }
      floatingDrag = null
    }
    window.addEventListener('pointermove', moveFloatingButton)
    window.addEventListener('pointerup', finishFloatingDrag)
    return () => {
      window.removeEventListener('pointermove', moveFloatingButton)
      window.removeEventListener('pointerup', finishFloatingDrag)
    }
  })

  function boundedNumber(value, min, max) {
    const number = Number.parseInt(value || '', 10)
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : 0
  }

  function clampFloatingPosition(x, y) {
    const width = floatingButton?.offsetWidth || 170
    const height = floatingButton?.offsetHeight || 52
    return {
      x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    }
  }

  function beginFloatingDrag(event) {
    if (event.button !== undefined && event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    floatingPosition = clampFloatingPosition(rect.left, rect.top)
    floatingDrag = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: floatingPosition.x,
      startY: floatingPosition.y,
      moved: false,
    }
  }

  function activateFloatingButton(event) {
    if (!suppressFloatingClick) return
    event.preventDefault()
    suppressFloatingClick = false
  }
</script>

<svelte:head>
  <title>{route && level ? `${route.name} · ${level.name} · 练刻` : '挑战分享 · 练刻'}</title>
  <meta name="description" content="查看练刻挑战进度分享，继续完成你的自重训练挑战。" />
  <meta name="robots" content="index,follow" />
</svelte:head>

<main class="challenge-share-page">
  {#if invalid}
    <section class="challenge-share-invalid">
      <span class="challenge-share-eyebrow">链接已失效</span>
      <h1>找不到这条挑战分享</h1>
      <p>请返回挑战页，重新生成一个分享链接。</p>
      <a
        bind:this={floatingButton}
        class="challenge-share-primary"
        class:dragging={Boolean(floatingDrag)}
        class:positioned={Boolean(floatingPosition)}
        href={appPath('challenges')}
        style={floatingPosition ? `left:${floatingPosition.x}px;top:${floatingPosition.y}px` : ''}
        on:pointerdown={beginFloatingDrag}
        on:click={activateFloatingButton}
      >
        查看挑战
      </a>
    </section>
  {:else if mode === 'overview'}
    <section class="challenge-share-card challenge-share-overview">
      <h1>六种动作 · 挑战总览</h1>
      <p class="challenge-share-description">六条动作路线，记录每一步完成情况。</p>
      <strong class="challenge-share-total">
        {completedCount}
        <small>/ 60 已通关</small>
      </strong>
      <div class="challenge-share-progress" aria-hidden="true">
        <span style={`width:${Math.max(2, (completedCount / 60) * 100)}%`}></span>
      </div>
      <div class="challenge-share-overview-routes">
        {#each challengeRoutes as overviewRoute, index}
          <div>
            <span>{overviewRoute.name}</span>
            <div class="challenge-share-route-count">
              <strong>{routeCounts[index] || 0}</strong>
              <small>/ 10 关</small>
            </div>
            <div
              class="challenge-share-route-progress"
              aria-label={`${overviewRoute.name} 已通关 ${routeCounts[index] || 0} / 10`}
            >
              <span
                style={`width:${Math.max(0, Math.min(100, ((routeCounts[index] || 0) / 10) * 100))}%`}
              ></span>
            </div>
          </div>
        {/each}
      </div>
      <div class="challenge-share-poster-footer">
        <strong>循序渐进 · 持续变强</strong>
        <small>练刻 · 我的挑战记录 · {shareDate}</small>
      </div>
      <a
        bind:this={floatingButton}
        class="challenge-share-primary"
        class:dragging={Boolean(floatingDrag)}
        class:positioned={Boolean(floatingPosition)}
        href={appPath('challenges')}
        style={floatingPosition ? `left:${floatingPosition.x}px;top:${floatingPosition.y}px` : ''}
        on:pointerdown={beginFloatingDrag}
        on:click={activateFloatingButton}
      >
        查看挑战
      </a>
    </section>
  {:else if mode === 'route'}
    <section class="challenge-share-card challenge-share-route-card">
      <div class="challenge-share-action-icon">
        <img src={actionIcon} alt="{route.name}最新通过动作" />
      </div>
      <span class="challenge-share-eyebrow">SINGLE ACTION ROUTE</span>
      <h1>{route.name}</h1>
      <strong class="challenge-share-total">
        {routeCount.toString().padStart(2, '0')}
        <small>/ 10 已通关</small>
      </strong>
      <div class="challenge-share-progress" aria-label={`已通关 ${routeCount} / 10`}>
        <span style={`width:${Math.max(2, (routeCount / 10) * 100)}%`}></span>
      </div>
      <div class="challenge-share-route-stats">
        <div>
          <span>已通关</span>
          <div class="challenge-share-route-stat-value">
            <strong>{routeCount}</strong>
            <small>/ 10</small>
          </div>
        </div>
        <div>
          <span>最终技</span>
          <div class="challenge-share-route-stat-value">
            <strong>{routeCount === 10 ? '✓' : '未达成'}</strong>
            {#if routeCount === 10}<small>已达成</small>{/if}
          </div>
        </div>
        <div>
          <span>挑战记录</span>
          <div class="challenge-share-route-stat-value">
            <strong>{attemptCount}</strong>
            <small>次</small>
          </div>
        </div>
      </div>
      <div class="challenge-share-poster-footer">
        <strong>循序渐进 · 持续变强</strong>
        <small>练刻 · 我的挑战记录 · {shareDate}</small>
      </div>
      <a
        bind:this={floatingButton}
        class="challenge-share-primary"
        class:dragging={Boolean(floatingDrag)}
        class:positioned={Boolean(floatingPosition)}
        href={challengeHref}
        style={floatingPosition ? `left:${floatingPosition.x}px;top:${floatingPosition.y}px` : ''}
        on:pointerdown={beginFloatingDrag}
        on:click={activateFloatingButton}
      >
        查看挑战
      </a>
    </section>
  {:else}
    <section class="challenge-share-card challenge-share-level-card">
      <div class="challenge-share-action-icon">
        <img src={actionIcon} alt="{route.name} · {level.name}" />
      </div>
      <span class="challenge-share-eyebrow">CHALLENGE PROGRESS</span>
      <p class="challenge-share-route">
        {route.name} · 第 {String(level.step).padStart(2, '0')} 关
      </p>
      <h1>{level.name}</h1>
      <p class="challenge-share-english">{level.englishName}</p>
      <span class="challenge-share-standard">本关通关标准</span>
      <strong class="challenge-share-goal">{formatGoal(level, completionStage(level))}</strong>
      <p class="challenge-share-tip">{level.tip}</p>
      <div class="challenge-share-stages">
        {#each Object.keys(level.standards) as stage}
          <div class:achieved={achievedStages.includes(stage)}>
            <span>{stageLabels[stage]}</span>
            <strong>{achievedStages.includes(stage) ? '✓' : '—'}</strong>
            <small>{achievedStages.includes(stage) ? '已达成' : '未达成'}</small>
          </div>
        {/each}
      </div>
      <div class="challenge-share-poster-footer">
        <strong>循序渐进 · 持续变强</strong>
        <small>练刻 · 我的挑战记录 · {shareDate}</small>
      </div>
      <a
        bind:this={floatingButton}
        class="challenge-share-primary"
        class:dragging={Boolean(floatingDrag)}
        class:positioned={Boolean(floatingPosition)}
        href={challengeHref}
        style={floatingPosition ? `left:${floatingPosition.x}px;top:${floatingPosition.y}px` : ''}
        on:pointerdown={beginFloatingDrag}
        on:click={activateFloatingButton}
      >
        查看挑战
      </a>
    </section>
  {/if}
</main>

<style>
  .challenge-share-page {
    width: min(100%, 840px);
    min-height: calc(100vh - 40px);
    margin: 0 auto;
    padding: 26px 24px 48px;
    color: #eaf2f4;
  }

  .challenge-share-meta,
  .challenge-share-stages {
    display: flex;
    align-items: center;
  }
  .challenge-share-eyebrow,
  .challenge-share-standard {
    color: #9fb0b4;
    font-size: 11px;
    letter-spacing: 0.08em;
  }

  .challenge-share-card,
  .challenge-share-invalid {
    position: relative;
    overflow: hidden;
    width: min(100%, 720px);
    min-height: 960px;
    margin: 0 auto;
    padding: 106px 48px 52px;
    border: 1px solid #58745b;
    border-radius: 24px;
    background: linear-gradient(145deg, #17251d, #101a21 54%, #0b1015);
    box-shadow: 0 24px 70px #0008;
  }

  .challenge-share-card::before {
    position: absolute;
    top: -75px;
    right: -48px;
    width: 230px;
    height: 230px;
    border-radius: 50%;
    background: #b7f36a24;
    content: '';
  }

  .challenge-share-action-icon {
    position: absolute;
    top: 92px;
    right: 28px;
    z-index: 1;
    width: 136px;
    height: 136px;
  }

  .challenge-share-action-icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .challenge-share-card h1,
  .challenge-share-invalid h1 {
    position: relative;
    margin: 16px 0 8px;
    font-size: clamp(40px, 8vw, 58px);
    line-height: 1.1;
  }

  .challenge-share-route,
  .challenge-share-english,
  .challenge-share-description,
  .challenge-share-tip,
  .challenge-share-invalid p {
    color: #9fb0b4;
  }

  .challenge-share-route,
  .challenge-share-english,
  .challenge-share-description,
  .challenge-share-tip {
    margin: 0;
  }

  .challenge-share-route,
  .challenge-share-standard {
    color: #b7f36a;
    font-weight: 750;
  }
  .challenge-share-route {
    margin-top: 18px;
    font-size: 20px;
  }
  .challenge-share-english {
    margin-top: 10px;
    font-size: 18px;
  }
  .challenge-share-standard {
    display: block;
    margin-top: 108px;
    letter-spacing: 0;
  }
  .challenge-share-goal {
    display: block;
    margin-top: 12px;
    font-size: clamp(32px, 6vw, 42px);
  }
  .challenge-share-tip {
    margin-top: 14px;
    font-size: 16px;
    line-height: 1.6;
  }

  .challenge-share-total {
    display: block;
    position: relative;
    margin-top: 42px;
    color: #b7f36a;
    font-size: clamp(72px, 15vw, 112px);
    line-height: 0.95;
  }

  .challenge-share-total small {
    margin-left: 12px;
    color: #92a5ac;
    font-size: 22px;
    font-weight: 500;
  }

  .challenge-share-progress {
    height: 12px;
    margin: 30px 0 22px;
    overflow: hidden;
    border-radius: 99px;
    background: #2d4039;
  }

  .challenge-share-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #b7f36a;
  }

  .challenge-share-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 7px;
    margin-top: 26px;
    padding: 15px 17px;
    border-radius: 14px;
    background: #18242b;
  }

  .challenge-share-meta span {
    color: #9fb0b4;
    font-size: 12px;
  }
  .challenge-share-meta strong {
    color: #eaf2f4;
    font-size: 16px;
  }

  .challenge-share-stages {
    gap: 12px;
    margin-top: 70px;
  }

  .challenge-share-stages div {
    display: grid;
    flex: 1;
    gap: 5px;
    padding: 13px;
    border-radius: 12px;
    background: #18242b;
  }

  .challenge-share-stages div.achieved strong {
    color: #eaf2f4;
  }
  .challenge-share-stages div:not(.achieved) {
    opacity: 0.62;
  }

  .challenge-share-stages span,
  .challenge-share-stages small {
    color: #a9c5cf;
    font-size: 12px;
  }
  .challenge-share-stages strong {
    font-size: 26px;
  }

  .challenge-share-primary {
    display: inline-flex;
    position: fixed;
    z-index: 30;
    align-items: center;
    justify-content: center;
    min-width: 160px;
    right: 24px;
    bottom: 24px;
    left: auto;
    padding: 18px 24px;
    border-radius: 12px;
    background: #b7f36a;
    color: #14200a;
    cursor: grab;
    font-weight: 800;
    text-decoration: none;
    box-shadow: 0 12px 30px #000b;
    touch-action: none;
    transform: none;
  }

  .challenge-share-primary.dragging {
    cursor: grabbing;
  }
  .challenge-share-primary.positioned {
    right: auto;
    bottom: auto;
    transform: none;
  }

  .challenge-share-footer {
    margin: 24px 0 0;
    color: #7d929b;
    text-align: center;
    font-size: 12px;
  }

  /* The level card mirrors the 720 × 960 poster canvas coordinates. */
  .challenge-share-level-card {
    min-height: 0;
    aspect-ratio: 720 / 960;
    padding: 0;
  }

  .challenge-share-level-card::before {
    top: -2.1%;
    right: auto;
    left: 74.3%;
    width: 34.7%;
    height: auto;
    aspect-ratio: 1;
  }

  .challenge-share-level-card .challenge-share-action-icon {
    top: 3.75%;
    right: auto;
    left: 80%;
    width: 18.9%;
    height: auto;
    aspect-ratio: 1;
  }

  .challenge-share-level-card .challenge-share-eyebrow,
  .challenge-share-level-card .challenge-share-route,
  .challenge-share-level-card h1,
  .challenge-share-level-card .challenge-share-english,
  .challenge-share-level-card .challenge-share-standard,
  .challenge-share-level-card .challenge-share-goal,
  .challenge-share-level-card .challenge-share-tip,
  .challenge-share-level-card .challenge-share-stages {
    position: absolute;
    left: 7.8%;
    width: 84.4%;
  }

  .challenge-share-level-card .challenge-share-eyebrow {
    top: 19%;
    font-size: 17px;
    line-height: 1.2;
  }

  .challenge-share-level-card .challenge-share-route {
    top: 22.1%;
    margin: 0;
    font-size: 26px;
    line-height: 1.2;
  }

  .challenge-share-level-card h1 {
    top: 25.2%;
    margin: 0;
    font-size: clamp(36px, 7.2vw, 52px);
    line-height: 1.1;
  }

  .challenge-share-level-card .challenge-share-english {
    top: 32.5%;
    margin: 0;
    font-size: 22px;
    line-height: 1.2;
  }

  .challenge-share-level-card .challenge-share-standard {
    top: 44.3%;
    margin: 0;
    font-size: 20px;
    line-height: 1.2;
  }

  .challenge-share-level-card .challenge-share-goal {
    top: 48.1%;
    margin: 0;
    font-size: clamp(26px, 4.8vw, 34px);
    line-height: 1.2;
  }

  .challenge-share-level-card .challenge-share-tip {
    top: 54.1%;
    margin: 0;
    font-size: 18px;
    line-height: 1.35;
  }

  .challenge-share-level-card .challenge-share-stages {
    top: 58.3%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3.5%;
    height: 12.5%;
    margin: 0;
  }

  .challenge-share-level-card .challenge-share-stages div {
    min-width: 0;
    padding: 12%;
  }

  .challenge-share-level-card .challenge-share-stages strong {
    font-size: clamp(22px, 4vw, 32px);
  }

  .challenge-share-route-card {
    min-height: 0;
    aspect-ratio: 720 / 960;
    padding: 0;
  }

  .challenge-share-route-card::before {
    top: -2.1%;
    right: auto;
    left: 74.3%;
    width: 34.7%;
    height: auto;
    aspect-ratio: 1;
  }

  .challenge-share-route-card .challenge-share-action-icon {
    top: 3.75%;
    right: auto;
    left: 80%;
    width: 18.9%;
    height: auto;
    aspect-ratio: 1;
  }

  .challenge-share-route-card .challenge-share-eyebrow,
  .challenge-share-route-card h1,
  .challenge-share-route-card .challenge-share-total,
  .challenge-share-route-card .challenge-share-progress,
  .challenge-share-route-card .challenge-share-route-stats {
    position: absolute;
    left: 7.8%;
    width: 84.4%;
  }

  .challenge-share-route-card .challenge-share-eyebrow {
    top: 19%;
  }

  .challenge-share-route-card h1 {
    top: 25.2%;
    margin: 0;
  }

  .challenge-share-route-card .challenge-share-total {
    top: 39%;
    margin: 0;
  }

  .challenge-share-route-card .challenge-share-progress {
    top: 54.2%;
    height: 1.5%;
    margin: 0;
  }

  .challenge-share-route-stats {
    top: 58.3%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3.5%;
    height: 12.5%;
  }

  .challenge-share-route-stats div {
    display: block;
    padding: 10% 10%;
    border-radius: 14px;
    background: #18242b;
    text-align: center;
  }

  .challenge-share-route-stats span {
    display: block;
  }

  .challenge-share-route-stats span {
    color: #a9c5cf;
    font-size: 17px;
  }

  .challenge-share-route-stat-value {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 7px;
    margin-top: 12%;
  }

  .challenge-share-route-stat-value strong {
    color: #f1f7f7;
    font-size: clamp(28px, 4.8vw, 35px);
    line-height: 1;
    white-space: nowrap;
  }

  .challenge-share-route-stat-value small {
    color: #a9c5cf;
    font-size: 17px;
    white-space: nowrap;
  }

  .challenge-share-route-stats div:nth-child(2) strong {
    color: #788d95;
  }

  .challenge-share-overview {
    min-height: 0;
    aspect-ratio: 720 / 960;
    padding: 0;
  }

  .challenge-share-overview .challenge-share-eyebrow,
  .challenge-share-overview h1,
  .challenge-share-overview .challenge-share-description,
  .challenge-share-overview .challenge-share-total,
  .challenge-share-overview .challenge-share-progress,
  .challenge-share-overview-routes {
    position: absolute;
    left: 7.8%;
    width: 84.4%;
  }

  .challenge-share-overview h1 {
    top: 17.2%;
    margin: 0;
    font-size: clamp(34px, 6.7vw, 48px);
    line-height: 1.2;
  }

  .challenge-share-overview .challenge-share-description {
    top: 24.2%;
    margin: 0;
    font-size: 22px;
    line-height: 1.3;
  }

  .challenge-share-overview .challenge-share-total {
    top: 39%;
    margin: 0;
  }

  .challenge-share-overview .challenge-share-progress {
    top: 54.2%;
    height: 1.5%;
    margin: 0;
  }

  .challenge-share-overview-routes {
    top: 58.3%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3.5%;
  }

  .challenge-share-overview-routes > div {
    display: block;
    min-height: 130px;
    padding: 14px 18px;
    border-radius: 14px;
    background: #18242b;
    text-align: center;
  }

  .challenge-share-overview-routes > div > span {
    display: block;
  }

  .challenge-share-overview-routes > div > span {
    color: #a9c5cf;
    font-size: 16px;
  }

  .challenge-share-route-count {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 7px;
    margin-top: 10%;
  }

  .challenge-share-route-count strong {
    color: #f1f7f7;
    font-size: clamp(26px, 4.2vw, 30px);
    line-height: 1;
  }

  .challenge-share-route-count small {
    color: #a9c5cf;
    font-size: 16px;
  }

  .challenge-share-route-progress {
    width: 82%;
    height: 7px;
    margin: 12px auto 0;
    overflow: hidden;
    border-radius: 99px;
    background: #2d4039;
  }

  .challenge-share-route-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #b7f36a;
  }

  .challenge-share-poster-footer {
    position: absolute;
    top: 91.4%;
    left: 7.8%;
    display: grid;
    gap: 8px;
  }

  .challenge-share-poster-footer strong {
    color: #b7f36a;
    font-size: 14px;
  }

  .challenge-share-poster-footer small {
    color: #5d7078;
    font-size: 11px;
  }

  @media (max-width: 520px) {
    .challenge-share-page {
      padding: 18px 12px 36px;
    }
    .challenge-share-card,
    .challenge-share-invalid {
      min-height: 760px;
      padding: 88px 24px 32px;
    }
    .challenge-share-level-card {
      min-height: 0;
      padding: 0;
      height: clamp(620px, 165vw, 860px);
      aspect-ratio: auto;
    }
    .challenge-share-route-card {
      min-height: 0;
      padding: 0;
      height: clamp(620px, 165vw, 860px);
      aspect-ratio: auto;
    }
    .challenge-share-overview {
      height: clamp(620px, 165vw, 860px);
      aspect-ratio: auto;
    }

    .challenge-share-level-card .challenge-share-eyebrow,
    .challenge-share-route-card .challenge-share-eyebrow {
      font-size: 14px;
    }

    .challenge-share-level-card .challenge-share-route {
      font-size: 18px;
    }

    .challenge-share-level-card h1,
    .challenge-share-route-card h1 {
      font-size: clamp(30px, 8vw, 42px);
    }

    .challenge-share-level-card .challenge-share-english {
      font-size: 16px;
    }

    .challenge-share-level-card .challenge-share-standard {
      font-size: 16px;
    }

    .challenge-share-level-card .challenge-share-goal {
      font-size: clamp(24px, 6vw, 32px);
    }

    .challenge-share-level-card .challenge-share-tip {
      font-size: 13px;
    }

    .challenge-share-level-card .challenge-share-stages {
      gap: 8px;
      height: 96px;
    }

    .challenge-share-level-card .challenge-share-stages div {
      padding: 8px;
    }

    .challenge-share-level-card .challenge-share-stages span,
    .challenge-share-level-card .challenge-share-stages small {
      font-size: 10px;
    }

    .challenge-share-level-card .challenge-share-stages strong {
      font-size: 22px;
    }

    .challenge-share-route-card .challenge-share-total,
    .challenge-share-overview .challenge-share-total {
      font-size: clamp(64px, 17vw, 92px);
    }

    .challenge-share-route-card .challenge-share-route-stats {
      height: 96px;
      gap: 8px;
    }

    .challenge-share-route-stats div {
      padding: 8px;
    }

    .challenge-share-route-stats span,
    .challenge-share-route-stat-value small {
      font-size: 11px;
    }

    .challenge-share-route-stat-value {
      gap: 3px;
      margin-top: 10px;
    }

    .challenge-share-route-stat-value strong {
      font-size: clamp(22px, 6vw, 30px);
    }

    .challenge-share-overview h1 {
      font-size: clamp(30px, 7.5vw, 42px);
    }

    .challenge-share-overview .challenge-share-description {
      font-size: 15px;
    }

    .challenge-share-overview-routes {
      gap: 12px 8px;
    }

    .challenge-share-overview-routes > div {
      min-height: 0;
      height: 95px;
      padding: 10px;
    }

    .challenge-share-overview-routes > div > span,
    .challenge-share-route-count small {
      font-size: 12px;
    }

    .challenge-share-route-count {
      gap: 4px;
      margin-top: 7px;
    }

    .challenge-share-route-count strong {
      font-size: 25px;
    }

    .challenge-share-route-progress {
      width: 88%;
      height: 5px;
      margin-top: 9px;
    }

    .challenge-share-poster-footer {
      top: 91.4%;
      gap: 5px;
    }

    .challenge-share-poster-footer strong {
      font-size: 11px;
    }

    .challenge-share-poster-footer small {
      font-size: 9px;
    }

    .challenge-share-action-icon {
      top: 72px;
      right: 12px;
      width: 116px;
      height: 116px;
    }
    .challenge-share-stages {
      gap: 6px;
    }
    .challenge-share-stages div {
      padding: 10px 8px;
    }

    .challenge-share-primary {
      min-width: 128px;
      width: 128px;
      height: 42px;
      right: 16px;
      bottom: 16px;
      left: auto;
      padding: 0 12px;
      font-size: 13px;
      transform: none;
    }
  }
</style>
