<script>
  import { onMount, tick } from 'svelte'
  import { challengeRoutes, stageLabels } from '../lib/challenge-catalog.js'
  import {
    appendAttempt,
    attemptSides,
    completionStage,
    createAttempt,
    evaluateAttempt,
    formatGoal,
    getRouteProgress,
    removeAttempt,
    sideLabels,
  } from '../lib/challenge-model.js'
  import { date } from '../lib/workout-model.js'
  import { requestConfirm } from '../lib/confirm-dialog.js'
  import { appPath, baseURL } from '../lib/config.js'
  import ExerciseIcon from '../components/exercise-icon.svelte'

  export let data
  export let dirty = false
  const defaultRoute = challengeRoutes[0]
  const defaultLevel = defaultRoute.levels[0]

  function selectionFromLocation() {
    if (typeof window === 'undefined') return { routeId: defaultRoute.id, levelId: defaultLevel.id }
    const params = new URLSearchParams(window.location.search)
    const selectedRoute = challengeRoutes.find((item) => item.id === params.get('route'))
    const selectedLevel = selectedRoute?.levels.find((item) => item.id === params.get('level'))
    return {
      routeId: selectedRoute?.id || defaultRoute.id,
      levelId: selectedLevel?.id || selectedRoute?.levels[0].id || defaultLevel.id,
    }
  }

  const initialSelection = selectionFromLocation()
  let routeId = initialSelection.routeId
  let levelId = initialSelection.levelId
  let stage = 'progression'
  let rows = [{ both: '' }, { both: '' }, { both: '' }]
  let qualityConfirmed = false
  let note = ''
  let feedback = null
  let detailHeading
  let pendingLevel = null
  let shareOpen = false
  let posterCanvas
  let posterUrl = ''
  let shareStatus = ''
  let posterLogo
  let posterLogoReady = false
  let posterQr
  let posterQrReady = false

  $: attempts = data.challenges.attempts
  $: summaries = challengeRoutes.map((route) => ({
    route,
    progress: getRouteProgress(route, attempts),
  }))
  $: route = challengeRoutes.find((item) => item.id === routeId)
  $: progress = summaries.find((item) => item.route.id === routeId).progress
  $: selected = progress.find((item) => item.level.id === levelId)
  $: level = selected.level
  $: stages = Object.keys(level.standards)
  $: history = attempts
    .filter((item) => item.levelId === level.id)
    .slice()
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))
  $: completedCount = summaries.reduce(
    (sum, item) => sum + item.progress.filter((p) => p.completed).length,
    0,
  )
  $: masterCount = summaries.filter((item) => item.progress[9].completed).length
  $: eliteCount = summaries.filter((item) => item.progress[9].achieved.elite).length
  $: sourceViewer = (page) => {
    const returnTo = `${appPath('challenges')}?route=${routeId}&level=${levelId}`
    const params = new URLSearchParams({ page: String(page), return: returnTo })
    return `${appPath('source')}?${params}`
  }
  $: dirty =
    rows.some((row) => Object.values(row).some((value) => value !== '' && value !== undefined)) ||
    qualityConfirmed ||
    Boolean(note.trim())
  $: if (typeof window !== 'undefined' && routeId && levelId) {
    const params = new URLSearchParams(window.location.search)
    if (params.get('route') !== routeId || params.get('level') !== levelId) {
      updateSelectionUrl(routeId, levelId)
    }
  }

  function resetDraft(nextLevel) {
    stage = completionStage(nextLevel)
    rows = Array.from({ length: nextLevel.standards[stage].sets }, () =>
      Object.fromEntries(attemptSides(nextLevel).map((side) => [side, ''])),
    )
    qualityConfirmed = false
    note = ''
    feedback = null
  }
  async function applyLevel(nextRoute, nextLevel) {
    routeId = nextRoute.id
    levelId = nextLevel.id
    updateSelectionUrl(routeId, levelId)
    resetDraft(nextLevel)
    await tick()
    detailHeading?.focus({ preventScroll: true })
  }

  function updateSelectionUrl(nextRouteId, nextLevelId) {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('route', nextRouteId)
    url.searchParams.set('level', nextLevelId)
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }

  function syncSelectionFromUrl() {
    const next = selectionFromLocation()
    if (next.routeId === routeId && next.levelId === levelId) return
    const nextRoute = challengeRoutes.find((item) => item.id === next.routeId)
    const nextLevel = nextRoute.levels.find((item) => item.id === next.levelId)
    routeId = next.routeId
    levelId = next.levelId
    resetDraft(nextLevel)
  }

  onMount(() => {
    updateSelectionUrl(routeId, levelId)
    posterLogo = new Image()
    posterLogo.onload = () => {
      posterLogoReady = true
      if (shareOpen) drawPoster()
    }
    // Canvas 必须使用当前站点的同源资源，否则本地预览会被跨域图片污染，无法导出海报。
    posterLogo.src = appPath('fit-log-icon.png')
    const challengeUrl = new URL('challenges', baseURL)
    challengeUrl.searchParams.set('route', routeId)
    challengeUrl.searchParams.set('level', levelId)
    fetch(
      `https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=png&data=${encodeURIComponent(challengeUrl.href)}`,
    )
      .then((response) =>
        response.ok ? response.blob() : Promise.reject(new Error('二维码加载失败')),
      )
      .then((blob) => {
        posterQr = new Image()
        posterQr.onload = () => {
          posterQrReady = true
          if (shareOpen) drawPoster()
        }
        posterQr.src = URL.createObjectURL(blob)
      })
      .catch(() => {
        posterQr = null
      })
  })

  async function chooseLevel(nextRoute, nextLevel) {
    if (nextLevel.id === levelId) return
    if (dirty) {
      pendingLevel = { nextRoute, nextLevel }
      requestConfirm({
        title: '放弃本次挑战填写？',
        message: '这次挑战成绩尚未保存，确定丢弃已填写内容吗？',
        confirmText: '放弃填写',
        destructive: true,
      }).then(({ confirmed }) => {
        if (confirmed) confirmLeaveDraft()
        else pendingLevel = null
      })
      return
    }
    await applyLevel(nextRoute, nextLevel)
  }
  async function confirmLeaveDraft() {
    const pending = pendingLevel
    pendingLevel = null
    if (pending) await applyLevel(pending.nextRoute, pending.nextLevel)
  }
  function requestRemoveLastGroup() {
    const last = rows[rows.length - 1]
    if (Object.values(last).every((value) => value === '' || value === undefined)) {
      rows = rows.slice(0, -1)
      return
    }
    requestConfirm({
      title: '移除最后一组成绩？',
      message: '这组成绩已经填写，移除后需要重新录入。',
      confirmText: '移除这一组',
      destructive: true,
    }).then(({ confirmed }) => {
      if (confirmed) confirmRemoveLastGroup()
    })
  }
  function confirmRemoveLastGroup() {
    rows = rows.slice(0, -1)
  }
  function chooseRoute(nextRoute) {
    const states = getRouteProgress(nextRoute, attempts)
    const nextLevel =
      states.find((item) => item.unlocked && !item.completed)?.level || nextRoute.levels[9]
    chooseLevel(nextRoute, nextLevel)
  }
  function chooseStage(nextStage) {
    stage = nextStage
    const needed = level.standards[stage].sets
    while (rows.length < needed) rows = [...rows, blankRow()]
    feedback = null
  }
  function blankRow() {
    return Object.fromEntries(attemptSides(level).map((side) => [side, '']))
  }
  function saveAttempt() {
    try {
      const attempt = createAttempt(level, stage, rows, qualityConfirmed, note)
      const next = appendAttempt(data.challenges, attempt)
      const result = evaluateAttempt(level, attempt, stage)
      const passed = evaluateAttempt(level, attempt).passed
      data = { ...data, challenges: next }
      resetDraft(level)
      feedback = {
        passed: result.passed,
        title: passed
          ? level.step === 10
            ? '最终技达成！本条路线已通关'
            : '本关通过，下一关已解锁'
          : result.passed
            ? `${stageLabels[attempt.stage]}目标达成`
            : '成绩已保存，继续积累力量',
        messages: result.messages,
      }
    } catch (error) {
      feedback = { passed: false, title: error.message, messages: [] }
    }
  }
  function requestDeleteAttempt(id) {
    requestConfirm({
      title: '删除这次挑战成绩？',
      message:
        '删除后会重新计算达成状态。如果这是前置关卡唯一的通关成绩，后续关卡将重新锁定；后续历史成绩保留，前置恢复通过后可重新计入。',
      confirmText: '删除成绩',
      destructive: true,
    }).then(({ confirmed }) => {
      if (confirmed) deleteAttempt(id)
    })
  }

  function deleteAttempt(id) {
    data = { ...data, challenges: removeAttempt(data.challenges, id) }
    feedback = { passed: false, title: '成绩已删除，关卡进度已重新计算', messages: [] }
  }
  function attemptDescription(attempt) {
    const unit = level.mode === 'time' ? '秒' : '次'
    return attempt.rows
      .map(
        (row, index) =>
          `第 ${index + 1} 组：${attemptSides(level)
            .map((side) => `${level.unilateral ? sideLabels[side] : ''}${row[side]} ${unit}`)
            .join(' / ')}`,
      )
      .join('；')
  }
  function beforeUnload(event) {
    if (!dirty) return
    event.preventDefault()
    event.returnValue = ''
  }

  function posterLines() {
    const routeState = summaries.find((item) => item.route.id === routeId)
    return {
      routeName: routeState?.route.name || route.name,
      routeCount: routeState?.progress.filter((item) => item.completed).length || 0,
      currentLevel: level.name,
    }
  }

  function drawFittedText(context, text, x, y, maxWidth, size, color, weight = 700) {
    let fontSize = size
    context.fillStyle = color
    context.font = `${weight} ${fontSize}px system-ui, sans-serif`
    while (context.measureText(text).width > maxWidth && fontSize > 14) {
      fontSize -= 1
      context.font = `${weight} ${fontSize}px system-ui, sans-serif`
    }
    context.fillText(text, x, y)
  }

  function drawPoster() {
    if (!posterCanvas) return
    const canvas = posterCanvas
    const context = canvas.getContext('2d')
    const width = 720
    const height = 960
    const info = posterLines()
    context.clearRect(0, 0, width, height)
    context.save()
    context.beginPath()
    context.roundRect(8, 8, width - 16, height - 16, 28)
    context.clip()
    const gradient = context.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#17251d')
    gradient.addColorStop(0.52, '#101a21')
    gradient.addColorStop(1, '#0b1015')
    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)

    context.fillStyle = '#b7f36a'
    context.globalAlpha = 0.14
    context.beginPath()
    context.arc(660, 105, 125, 0, Math.PI * 2)
    context.fill()
    context.globalAlpha = 1
    if (posterLogoReady) context.drawImage(posterLogo, 56, 91, 42, 42)
    context.fillStyle = '#b7f36a'
    context.font = '800 24px system-ui, sans-serif'
    context.fillText('练刻', 116, 113)
    context.font = '700 17px system-ui, sans-serif'
    context.fillText('LIAN KE  /  CHALLENGE LOG', 116, 140)
    drawFittedText(context, '每一步，都算进步', 56, 215, 540, 56, '#eaf2f4', 800)
    context.fillStyle = '#9fb0b4'
    context.font = '400 22px system-ui, sans-serif'
    context.fillText('我的挑战进度，正在变成力量。', 58, 258)

    context.fillStyle = '#b7f36a'
    context.font = '800 104px system-ui, sans-serif'
    context.fillText(String(completedCount).padStart(2, '0'), 56, 438)
    context.fillStyle = '#92a5ac'
    context.font = '500 24px system-ui, sans-serif'
    context.fillText('/ 60  已通关', 230, 438)
    drawFittedText(
      context,
      `${info.routeName} · 已完成 ${info.routeCount}/10 关`,
      58,
      492,
      604,
      26,
      '#eaf2f4',
      700,
    )
    context.fillStyle = '#2d4039'
    context.roundRect(58, 528, 604, 14, 7)
    context.fill()
    context.fillStyle = '#b7f36a'
    context.roundRect(58, 528, Math.max(14, 604 * (completedCount / 60)), 14, 7)
    context.fill()

    const stats = [
      ['最终技', masterCount, '/ 6'],
      ['精英成就', eliteCount, '/ 6'],
      ['挑战记录', attempts.length, '次'],
    ]
    stats.forEach(([label, value, suffix], index) => {
      const x = 58 + index * 205
      context.fillStyle = '#18242b'
      context.roundRect(x, 620, 180, 120, 14)
      context.fill()
      context.fillStyle = '#a9c5cf'
      context.font = '500 17px system-ui, sans-serif'
      context.fillText(label, x + 18, 652)
      context.fillStyle = '#f1f7f7'
      context.font = '800 35px system-ui, sans-serif'
      context.fillText(String(value), x + 18, 700)
      context.fillStyle = '#788d95'
      context.font = '500 17px system-ui, sans-serif'
      context.fillText(suffix, x + 18 + context.measureText(String(value)).width + 6, 700)
    })

    drawFittedText(context, `当前挑战：${info.currentLevel}`, 58, 822, 440, 18, '#82969d', 400)
    if (posterQrReady) {
      context.fillStyle = '#f4f7f1'
      context.roundRect(540, 788, 122, 122, 10)
      context.fill()
      context.drawImage(posterQr, 546, 794, 110, 110)
      context.fillStyle = '#82969d'
      context.font = '400 14px system-ui, sans-serif'
      context.fillText('扫码查看挑战', 540, 934)
    }
    context.fillStyle = '#b7f36a'
    context.font = '700 19px system-ui, sans-serif'
    context.fillText('循序渐进 · 持续变强', 58, 878)
    context.fillStyle = '#5d7078'
    context.font = '400 16px system-ui, sans-serif'
    context.fillText('练刻 · 我的挑战记录', 58, 918)
    context.restore()
    context.beginPath()
    context.roundRect(8, 8, width - 16, height - 16, 28)
    context.strokeStyle = '#58745b'
    context.lineWidth = 3
    context.stroke()
    posterUrl = canvas.toDataURL('image/png')
  }

  async function openSharePoster() {
    shareOpen = true
    shareStatus = ''
    await tick()
    drawPoster()
  }

  function closeSharePoster() {
    shareOpen = false
    posterUrl = ''
    shareStatus = ''
  }

  function posterBlob() {
    return new Promise((resolve) => posterCanvas.toBlob(resolve, 'image/png'))
  }

  async function sharePoster() {
    const blob = await posterBlob()
    if (!blob) return
    const file = new File([blob], 'lian-ke-challenge.png', { type: 'image/png' })
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({
          title: '我的挑战进度',
          text: `我在练刻完成了 ${completedCount}/60 关挑战`,
          files: [file],
        })
        shareStatus = '已打开系统分享面板'
      } catch (error) {
        if (error?.name !== 'AbortError') shareStatus = '分享未完成，可以改为保存图片'
      }
      return
    }
    downloadPoster()
    shareStatus = '当前设备不支持直接分享，请使用“保存图片”'
  }

  function downloadPoster() {
    const link = document.createElement('a')
    link.href = posterUrl
    link.download = 'lian-ke-challenge.png'
    link.click()
  }
</script>

<svelte:window on:beforeunload={beforeUnload} on:popstate={syncSelectionFromUrl} />

<section class="challenge-hero">
  <div>
    <span class="challenge-eyebrow">六艺十式 · 循序进阶</span>
    <h1>每一步，都算进步</h1>
    <p class="muted">从第一式出发，走向你的最终技。一次只挑战眼前这一关。</p>
  </div>
  <span class="challenge-local">● 本地保存 · 可同步远端</span>
</section>

<div class="challenge-metrics" aria-label="挑战成就">
  <div>
    <strong>
      {completedCount}
      <small>/ 60</small>
    </strong>
    <span>已通关</span>
  </div>
  <div>
    <strong>
      {masterCount}
      <small>/ 6</small>
    </strong>
    <span>最终技成就</span>
  </div>
  <div>
    <strong>
      {eliteCount}
      <small>/ 6</small>
    </strong>
    <span>精英成就</span>
  </div>
  <div>
    <strong>{attempts.length}</strong>
    <span>挑战记录</span>
  </div>
</div>

<div class="challenge-share-strip">
  <div>
    <strong>把进步分享给朋友</strong>
    <span>生成一张专属于你的挑战进度海报</span>
  </div>
  <button type="button" class="btn primary" on:click={openSharePoster}>分享我的进度 ↗</button>
</div>

<div class="challenge-routes" aria-label="选择挑战路线">
  {#each summaries as { route: item, progress: states }}
    {@const count = states.filter((p) => p.completed).length}
    {@const next = states.find((p) => p.unlocked && !p.completed)}
    <button
      type="button"
      class="challenge-route"
      class:selected={routeId === item.id}
      aria-pressed={routeId === item.id}
      on:click={() => chooseRoute(item)}
    >
      <div class="challenge-route-top">
        <span class="challenge-route-icon"><ExerciseIcon kind={item.id} size={24} /></span>
        <span class="challenge-route-count">
          {count}
          <small>/ 10</small>
        </span>
      </div>
      <strong>{item.name}</strong>
      <span class="challenge-route-subtitle">{item.subtitle}</span>
      <div class="challenge-mini-progress" aria-hidden="true">
        <span style={`width:${count * 10}%`}></span>
      </div>
      <span class="challenge-route-next">
        {next ? `当前第 ${next.level.step} 关 · ${next.level.name}` : '最终技已达成 · 继续挑战精英'}
      </span>
    </button>
  {/each}
</div>

<div class="challenge-layout">
  <section class="panel challenge-path" aria-label={`${route.name}十关路线`}>
    <div class="row between challenge-section-heading">
      <h2>{route.name}</h2>
      <span class="badge">十式进阶</span>
    </div>
    <ol>
      {#each progress as state}
        <li>
          <button
            type="button"
            class="challenge-step"
            class:current={levelId === state.level.id}
            class:complete={state.completed}
            class:locked={!state.unlocked}
            aria-current={levelId === state.level.id ? 'step' : undefined}
            on:click={() => chooseLevel(route, state.level)}
          >
            <span class="challenge-step-number" aria-hidden="true">
              {state.completed ? '✓' : String(state.level.step).padStart(2, '0')}
            </span>
            <span class="challenge-step-text">
              <strong>{state.level.name}</strong>
              <small>
                {state.completed
                  ? state.level.step === 10
                    ? '最终技已达成'
                    : '已通关'
                  : state.unlocked
                    ? '可挑战'
                    : '未解锁 · 可查看标准'}
              </small>
            </span>
            {#if state.level.step === 10}<span class="challenge-master-label">最终技</span>{/if}
          </button>
        </li>
      {/each}
    </ol>
  </section>

  <div class="challenge-detail">
    <section class="panel">
      <div class="row between">
        <span class="challenge-eyebrow">
          {route.name} / 第 {String(level.step).padStart(2, '0')} 关
        </span>
        <span class="pill">
          {level.unilateral ? '左右侧分别达标' : level.mode === 'time' ? '连续保持' : '双侧动作'}
        </span>
      </div>
      <h2 class="challenge-level-title" tabindex="-1" bind:this={detailHeading}>{level.name}</h2>
      <p class="challenge-english">{level.englishName}</p>
      <div class="challenge-objective">
        <span>{level.step === 10 ? '最终技达成标准' : '本关通关标准'}</span>
        <strong>{formatGoal(level, completionStage(level))}</strong>
        <small>
          {level.step === 10
            ? '入门达标即获得最终技成就；精英成就独立展示。'
            : '同一次挑战逐组达标，并确认动作质量，解锁下一关。'}
        </small>
      </div>
      <div class="challenge-standards" aria-label="三档达成标准">
        {#each stages as key}
          <div class:achieved={selected.achieved[key]}>
            <span>
              {stageLabels[key]}
              <span aria-label={selected.achieved[key] ? '已达成' : '未达成'}>
                {selected.achieved[key] ? '✓' : '○'}
              </span>
            </span>
            <strong>{formatGoal(level, key)}</strong>
          </div>
        {/each}
      </div>
      {#if level.id === 'cc-bridge-10'}
        <p class="notice">
          精英目标原文为 2 组×10–30 次。本应用以 2 组、每组至少 10 次授予精英成就，30
          次作为上限目标。
        </p>
      {/if}
      <div class="challenge-technique">
        <h3>动作与计数</h3>
        <p>{level.tip}</p>
        <p class="muted small">
          {level.mode === 'time'
            ? '单组连续保持，中断后重新计时，不能累加多次保持时长。'
            : '每组分别记录完整动作次数，不将不同组或不同次挑战的成绩相加。'}{level.unilateral
            ? '左右两侧均须完成全部目标组数。'
            : ''}
        </p>
      </div>
      <a
        class="challenge-source"
        href={sourceViewer(level.sourcePage)}
        target="_blank"
        rel="noreferrer"
      >
        在线查看《囚徒健身》原书 · 第 {level.sourcePage} 页 ↗
      </a>
      {#if selected.completedAt}<p class="muted small">
          首次达成：{date(selected.completedAt)}
        </p>{/if}
    </section>

    <section class="panel challenge-attempt-panel">
      <h2>记录本次挑战</h2>
      {#if !selected.unlocked}
        <div class="warning">
          先通过第 {level.step - 1} 关「{route.levels[level.step - 2]
            .name}」，再来挑战这一关。你可以提前查看本关标准。
        </div>
      {:else}
        <p class="muted small">填写实际完成成绩。未达标也能保存，留下每一次进步。</p>
        <form on:submit|preventDefault={saveAttempt}>
          <fieldset class="challenge-targets">
            <legend>本次目标</legend>
            {#each stages as key}
              <button
                type="button"
                class:active={stage === key}
                aria-pressed={stage === key}
                on:click={() => chooseStage(key)}
              >
                {stageLabels[key]}
              </button>
            {/each}
          </fieldset>
          <p class="challenge-target-caption">
            {formatGoal(level, stage)}{level.step !== 10 && stage !== 'progression'
              ? ' · 达成进阶目标后才解锁下一关'
              : ''}
          </p>
          {#each rows as row, index}
            <div class="challenge-input-row">
              <span class="challenge-group-label">第 {index + 1} 组</span>
              {#each attemptSides(level) as side}
                <label class="field">
                  {level.unilateral ? sideLabels[side] : '实际完成'}（{level.mode === 'time'
                    ? '连续秒数'
                    : '次数'}）
                  <input
                    type="number"
                    min="0"
                    max={level.mode === 'time' ? 7200 : 9999}
                    step="1"
                    inputmode="numeric"
                    placeholder="填写实际成绩"
                    required
                    bind:value={row[side]}
                    on:input={() => (feedback = null)}
                  />
                </label>
              {/each}
            </div>
          {/each}
          <div class="row challenge-group-actions">
            <button
              type="button"
              class="btn tiny ghost"
              disabled={rows.length >= 3}
              on:click={() => (rows = [...rows, blankRow()])}
            >
              ＋ 增加一组
            </button>
            <button
              type="button"
              class="btn tiny ghost"
              disabled={rows.length <= 1}
              on:click={requestRemoveLastGroup}
            >
              移除最后一组
            </button>
          </div>
          <label class="challenge-quality">
            <input type="checkbox" bind:checked={qualityConfirmed} />
            <span>
              我确认本次按以上动作定义完成，{level.mode === 'time'
                ? '保持未中断'
                : '按完整动作计数'}{level.unilateral ? '，左右侧分别记录' : ''}。
            </span>
          </label>
          <label class="field challenge-note">
            本次感受（选填）
            <textarea
              rows="2"
              maxlength="500"
              placeholder="记录动作、节奏或下次想改进的地方"
              bind:value={note}
            ></textarea>
          </label>
          <button type="submit" class="btn primary challenge-save">保存成绩并检查达标</button>
        </form>
      {/if}
      {#if feedback}
        <div
          class="challenge-feedback"
          class:success={feedback.passed}
          role="status"
          aria-live="polite"
        >
          <strong>{feedback.title}</strong>
          {#if feedback.messages.length}<ul>
              {#each feedback.messages as message}<li>{message}</li>{/each}
            </ul>{/if}
        </div>
      {/if}
    </section>

    <section class="panel challenge-history">
      <div class="row between">
        <h2>本关挑战记录</h2>
        <span class="badge">{history.length} 次尝试</span>
      </div>
      {#if !history.length}
        <p class="empty">还没有成绩。完成一次尝试，就是你的第一步。</p>
      {:else}
        {#each history as attempt (attempt.id)}
          {@const result = evaluateAttempt(level, attempt, attempt.stage)}
          <article class="challenge-record">
            <div class="row between">
              <strong>
                {stageLabels[attempt.stage]} · {result.passed
                  ? '目标达成'
                  : result.valid
                    ? '未达目标'
                    : '历史版本'}
              </strong>
              <button
                type="button"
                class="btn tiny ghost"
                aria-label={`删除 ${date(attempt.recordedAt)} 的挑战成绩`}
                on:click={() => requestDeleteAttempt(attempt.id)}
              >
                删除
              </button>
            </div>
            <p class="muted small">
              {date(attempt.recordedAt)}{!selected.unlocked
                ? ' · 前置关卡未通过，暂不计入进度'
                : ''}
            </p>
            <p>{attemptDescription(attempt)}</p>
            {#if !attempt.qualityConfirmed}<p class="muted small">未确认动作质量</p>{/if}
            {#if attempt.note}<p class="challenge-record-note">{attempt.note}</p>{/if}
            {#if !result.passed}<p class="muted small">{result.messages.join(' ')}</p>{/if}
          </article>
        {/each}
      {/if}
    </section>
  </div>
</div>

<p class="challenge-footnote">
  成绩由你自行记录与确认，保存在当前浏览器，可在“设置/备份”导出
  JSON。暂不参与云端同步。训练中如有疼痛或不适，请停止本次挑战。
</p>

{#if shareOpen}
  <div class="challenge-share-backdrop" role="presentation" on:click|self={closeSharePoster}>
    <section
      class="challenge-share-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-poster-title"
    >
      <div class="row between">
        <div>
          <span class="challenge-eyebrow">CHALLENGE POSTER</span>
          <h2 id="share-poster-title">分享我的进度</h2>
        </div>
        <button
          type="button"
          class="btn tiny ghost"
          aria-label="关闭分享海报"
          on:click={closeSharePoster}
        >
          关闭
        </button>
      </div>
      <div class="challenge-poster-preview">
        <canvas
          bind:this={posterCanvas}
          width="720"
          height="960"
          aria-label="挑战进度海报预览"
        ></canvas>
        {#if posterUrl}<img src={posterUrl} alt="我的挑战进度海报" />{/if}
      </div>
      <p class="muted small">海报会展示你的通关数、成就和当前挑战，不包含任何个人账号信息。</p>
      <div class="row challenge-share-actions">
        <button type="button" class="btn primary" on:click={sharePoster}>分享</button>
        <button type="button" class="btn ghost" on:click={downloadPoster}>保存图片</button>
      </div>
      {#if shareStatus}<p class="challenge-share-status" role="status">{shareStatus}</p>{/if}
    </section>
  </div>
{/if}
