<script>
  import { createEventDispatcher, onMount, tick } from 'svelte'
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
    confirmTrainingEvaluation,
    sideLabels,
  } from '../lib/challenge-model.js'
  import { date } from '../lib/workout-model.js'
  import { requestConfirm } from '../lib/confirm-dialog.js'
  import { appPath } from '../lib/config.js'
  import ChallengeShareDialog from '../components/challenge-share-dialog.svelte'
  import ExerciseIcon from '../components/exercise-icon.svelte'

  export let data
  export let dirty = false
  const dispatch = createEventDispatcher()
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
  const initialHasExplicitLevel =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('level')
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
  let quickStartOpen = false
  let floatingPosition = null
  let floatingDrag = null
  let suppressFloatingClick = false
  let floatingButton
  const FLOATING_BUTTON_KEY = 'lianke_challenge_floating_button'

  $: attempts = data.challenges.attempts
  $: summaries = challengeRoutes.map((route) => ({
    route,
    progress: getRouteProgress(route, attempts),
  }))
  $: route = challengeRoutes.find((item) => item.id === routeId)
  $: progress = summaries.find((item) => item.route.id === routeId).progress
  $: selected = progress.find((item) => item.level.id === levelId)
  $: level = selected.level
  $: quickStartLevel =
    selected?.unlocked ? level : progress.find((item) => item.unlocked)?.level || level
  $: stages = Object.keys(level.standards)
  $: allHistory = attempts.filter((item) => item.levelId === level.id).slice()
  $: history = allHistory
    .sort((a, b) => {
      const aPassed = recordPassed(a)
      const bPassed = recordPassed(b)
      if (aPassed !== bPassed) return Number(bPassed) - Number(aPassed)
      return Date.parse(b.recordedAt) - Date.parse(a.recordedAt)
    })
    .slice(0, 3)
  $: completedCount = summaries.reduce(
    (sum, item) => sum + item.progress.filter((p) => p.completed).length,
    0,
  )
  $: masterCount = summaries.filter((item) => item.progress[9].completed).length
  $: eliteCount = summaries.filter((item) => item.progress[9].achieved.elite).length
  $: sharePosterData = {
    routeId,
    levelId,
    routeName: route.name,
    routeCount: progress.filter((item) => item.completed).length,
    routes: summaries.map(({ route: routeItem, progress: routeProgress }) => ({
      name: routeItem.name,
      count: routeProgress.filter((item) => item.completed).length,
    })),
    currentLevel: level.name,
    level,
    selected,
    stages,
    completedCount,
    masterCount,
    eliteCount,
    attempts,
  }
  $: sourceViewer = (page, nextRouteId = routeId, nextLevelId = levelId) => {
    const returnTo = `${appPath('challenges')}?route=${nextRouteId}&level=${nextLevelId}#challenge-path`
    const params = new URLSearchParams({ page: String(page), return: returnTo })
    return `${appPath('source')}?${params}`
  }
  $: dirty = false
  $: if (typeof window !== 'undefined' && routeId && levelId) {
    const params = new URLSearchParams(window.location.search)
    if (params.get('route') !== routeId || params.get('level') !== levelId) {
      updateSelectionUrl(routeId, levelId)
    }
  }

  function defaultStageFor(level) {
    const ownerRoute = challengeRoutes.find((item) =>
      item.levels.some((entry) => entry.id === level.id),
    )
    const state =
      ownerRoute &&
      getRouteProgress(ownerRoute, attempts).find((item) => item.level.id === level.id)
    return (
      Object.keys(level.standards).find((key) => !state?.achieved?.[key]) || completionStage(level)
    )
  }

  function resetDraft(nextLevel) {
    stage = defaultStageFor(nextLevel)
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
    try {
      const saved = JSON.parse(localStorage.getItem(FLOATING_BUTTON_KEY) || 'null')
      if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y))
        floatingPosition = clampFloatingPosition(saved.x, saved.y)
    } catch {}
    const moveFloatingButton = (event) => {
      if (!floatingDrag) return
      const next = clampFloatingPosition(
        event.clientX - floatingDrag.offsetX,
        event.clientY - floatingDrag.offsetY,
      )
      if (Math.abs(next.x - floatingDrag.startX) > 4 || Math.abs(next.y - floatingDrag.startY) > 4)
        floatingDrag.moved = true
      floatingPosition = next
    }
    const finishFloatingDrag = () => {
      if (!floatingDrag) return
      const moved = floatingDrag.moved
      if (floatingPosition)
        localStorage.setItem(FLOATING_BUTTON_KEY, JSON.stringify(floatingPosition))
      floatingDrag = null
      if (moved) {
        suppressFloatingClick = true
        setTimeout(() => (suppressFloatingClick = false), 0)
      }
    }
    const resizeFloatingButton = () => {
      if (!floatingPosition) return
      const next = clampFloatingPosition(floatingPosition.x, floatingPosition.y)
      if (next.x === floatingPosition.x && next.y === floatingPosition.y) return
      floatingPosition = next
      localStorage.setItem(FLOATING_BUTTON_KEY, JSON.stringify(next))
    }
    window.addEventListener('pointermove', moveFloatingButton)
    window.addEventListener('pointerup', finishFloatingDrag)
    window.addEventListener('resize', resizeFloatingButton)
    const params = new URLSearchParams(window.location.search)
    if (!initialHasExplicitLevel) {
      const nextRoute =
        challengeRoutes.find((item) => item.id === params.get('route')) || defaultRoute
      const states = getRouteProgress(nextRoute, attempts)
      const current =
        states.find((item) => item.unlocked && !item.completed)?.level ||
        states[states.length - 1].level
      routeId = nextRoute.id
      levelId = current.id
      resetDraft(current)
    }
    updateSelectionUrl(routeId, levelId)
    const anchorId = window.location.hash.replace(/^#/, '')
    if (anchorId === 'challenge-path' || anchorId === 'challenge-history') {
      requestAnimationFrame(() =>
        document.getElementById(anchorId)?.scrollIntoView({ block: 'start' }),
      )
    }
    return () => {
      window.removeEventListener('pointermove', moveFloatingButton)
      window.removeEventListener('pointerup', finishFloatingDrag)
      window.removeEventListener('resize', resizeFloatingButton)
    }
  })

  function clampFloatingPosition(x, y) {
    const width = floatingButton?.offsetWidth || 178
    const height = floatingButton?.offsetHeight || 48
    return {
      x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    }
  }

  function beginFloatingDrag(event) {
    if (event.button !== undefined && event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const position = floatingPosition || { x: rect.left, y: rect.top }
    floatingPosition = clampFloatingPosition(position.x, position.y)
    floatingDrag = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: floatingPosition.x,
      startY: floatingPosition.y,
      moved: false,
    }
  }

  async function chooseLevel(nextRoute, nextLevel) {
    if (nextLevel.id === levelId && nextRoute.id === routeId) return
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

  function openLevelSource(nextRoute, nextLevel) {
    window.open(
      sourceViewer(nextLevel.sourcePage, nextRoute.id, nextLevel.id),
      '_blank',
      'noopener,noreferrer',
    )
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
  function startQuickChallenge(
    targetLevel = level,
    targetStage = stage,
    targetRouteId = routeId,
    targetLevelId = levelId,
  ) {
    const goal = targetLevel.standards[targetStage]
    const item = {
      id: `challenge-${targetLevel.id}-${targetStage}`,
      name: targetLevel.name,
      sets: goal.sets,
      reps: targetLevel.mode === 'reps' ? goal.value : 0,
      duration: targetLevel.mode === 'time' ? goal.value : 40,
      weight: 0,
      mode: targetLevel.mode,
      challengeUnilateral: targetLevel.unilateral,
      rest: 60,
      timerMode: 'down',
      challengeStage: targetStage,
    }
    const detail = {
      items: [item],
      planName: `挑战 · ${targetLevel.name} · ${stageLabels[targetStage]}`,
      planId: 'challenge-quick',
      returnTo: 'challenges',
      returnSelection: { routeId: targetRouteId, levelId: targetLevelId },
    }
    dispatch('startChallengeTraining', detail)
  }

  function startFloatingChallenge() {
    if (suppressFloatingClick) return
    openQuickStartPicker()
  }

  function openQuickStartPicker() {
    quickStartOpen = true
  }

  function closeQuickStartPicker() {
    quickStartOpen = false
  }

  function startSelectedQuickChallenge(nextStage) {
    quickStartOpen = false
    if (selected?.unlocked) {
      startQuickChallenge(level, nextStage, routeId, levelId)
      return
    }
    const latest = [...progress].reverse().find((item) => item.unlocked)?.level
    if (latest) {
      const fallbackStage = latest.standards[nextStage] ? nextStage : defaultStageFor(latest)
      startQuickChallenge(latest, fallbackStage, routeId, latest.id)
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
  function confirmTrainingAttempt(attempt) {
    try {
      data = { ...data, challenges: confirmTrainingEvaluation(data.challenges, attempt.id) }
      feedback = { passed: true, title: '已确认训练数据，挑战正式达成', messages: [] }
    } catch (error) {
      feedback = { passed: false, title: error.message, messages: [] }
    }
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
  function trainingDataPassed(attempt) {
    return evaluateAttempt(level, { ...attempt, qualityConfirmed: true }, attempt.stage).passed
  }
  function recordPassed(attempt) {
    return (
      evaluateAttempt(level, attempt, attempt.stage).passed ||
      (attempt.source?.type === 'training-record' && trainingDataPassed(attempt))
    )
  }
  function trainingDataMessage(attempt, result) {
    if (attempt.source?.type !== 'training-record') return result.messages.join(' ')
    const goal = level.standards[attempt.stage]
    const unit = level.mode === 'time' ? '秒' : '次'
    const missingSets = Math.max(0, goal.sets - attempt.rows.length)
    const lowSets = attempt.rows.filter((row) =>
      attemptSides(level).some((side) => row[side] < goal.value),
    ).length
    const messages = []
    if (missingSets)
      messages.push(
        `本次记录完成 ${attempt.rows.length}/${goal.sets} 组，还需完成 ${missingSets} 组，每组至少 ${goal.value} ${unit}。`,
      )
    if (lowSets) messages.push(`已有 ${lowSets} 组未达到标准，每组至少 ${goal.value} ${unit}。`)
    return messages.join(' ') || '训练数据已达到标准；确认动作质量后即可计入通关。'
  }
  function beforeUnload(event) {
    if (!dirty) return
    event.preventDefault()
    event.returnValue = ''
  }

  async function openSharePoster() {
    shareOpen = true
  }

  function closeSharePoster() {
    shareOpen = false
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
  <section id="challenge-path" class="panel challenge-path" aria-label={`${route.name}十关路线`}>
    <div class="row between challenge-section-heading">
      <h2>{route.name}</h2>
      <span class="badge">十式进阶</span>
    </div>
    <p id="challenge-source-hint" class="challenge-path-hint">
      双击关卡查看动作
    </p>
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
            aria-describedby="challenge-source-hint"
            title={`双击查看《囚徒健身》第 ${state.level.sourcePage} 页`}
            on:click={() => chooseLevel(route, state.level)}
            on:dblclick={() => openLevelSource(route, state.level)}
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

    <section id="challenge-history" class="panel challenge-history">
      <div class="row between">
        <h2>本关挑战记录</h2>
        <span class="badge">
          {#if allHistory.length > history.length}
            显示 {history.length} / 共 {allHistory.length} 条
          {:else}{allHistory.length} 次尝试{/if}
        </span>
      </div>
      {#if !history.length}
        <p class="empty">还没有成绩。完成一次尝试，就是你的第一步。</p>
      {:else}
        {#each history as attempt (attempt.id)}
          {@const result = evaluateAttempt(level, attempt, attempt.stage)}
          {@const autoPassed =
            attempt.source?.type === 'training-record' ? trainingDataPassed(attempt) : false}
          <article class="challenge-record">
            <div class="row between">
              <strong>
                {stageLabels[attempt.stage]} · {autoPassed && !attempt.qualityConfirmed
                  ? '训练数据达标 · 待确认动作质量'
                  : result.passed
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
            {#if attempt.source?.type === 'training-record'}
              <p class="notice small">
                来自训练记录的自动判定：{trainingDataPassed(attempt)
                  ? '成绩达标'
                  : '未达到本次挑战标准'}
              </p>
              {#if trainingDataPassed(attempt) && !attempt.qualityConfirmed}
                <button
                  type="button"
                  class="btn tiny primary"
                  on:click={() => confirmTrainingAttempt(attempt)}
                >
                  确认动作质量并计入通关
                </button>
              {/if}
            {/if}
            {#if !attempt.qualityConfirmed}<p class="muted small">未确认动作质量</p>{/if}
            {#if attempt.note}<p class="challenge-record-note">{attempt.note}</p>{/if}
            {#if !result.passed}<p class="muted small">
                {trainingDataMessage(attempt, result)}
              </p>{/if}
          </article>
        {/each}
      {/if}
    </section>
  </div>
</div>

<p class="challenge-footnote">
  成绩由你自行记录与确认，保存在当前浏览器，可在“设置/备份”导出
  JSON，也可通过“设置/备份”同步到云端。训练中如有疼痛或不适，请停止本次挑战。
</p>

{#if selected}
  <button
    type="button"
    class="challenge-floating-start"
    bind:this={floatingButton}
    style={floatingPosition
      ? `left:${floatingPosition.x}px;top:${floatingPosition.y}px;right:auto;bottom:auto;`
      : ''}
    aria-label="拖动或点击快速开始挑战"
    on:pointerdown={beginFloatingDrag}
    on:click={startFloatingChallenge}
  >
    <span aria-hidden="true">⚑</span>
    快速开始挑战
  </button>
{/if}

{#if quickStartOpen}
  <div class="challenge-start-backdrop" role="presentation" on:click|self={closeQuickStartPicker}>
    <section
      class="challenge-start-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-start-title"
    >
      <div class="row between">
        <div>
          <span class="challenge-eyebrow">QUICK CHALLENGE</span>
          <h2 id="challenge-start-title">选择挑战难度</h2>
        </div>
        <button
          type="button"
          class="btn tiny ghost"
          aria-label="关闭"
          on:click={closeQuickStartPicker}
        >
          ×
        </button>
      </div>
      <p class="muted small">
        {selected?.unlocked ? `当前动作：${quickStartLevel.name}` : '当前动作尚未解锁，将使用最新可挑战动作'}
      </p>
      <a
        class="btn ghost challenge-start-source-button"
        href={sourceViewer(quickStartLevel.sourcePage, routeId, quickStartLevel.id)}
        target="_blank"
        rel="noreferrer"
      >
        查看动作原文 · 第 {quickStartLevel.sourcePage} 页 ↗
      </a>
      <div class="challenge-start-options">
        {#each stages as key}
          <button type="button" on:click={() => startSelectedQuickChallenge(key)}>
            <strong>{stageLabels[key]}</strong>
            <span>
              {formatGoal(quickStartLevel, key)}
            </span>
          </button>
        {/each}
      </div>
    </section>
  </div>
{/if}

<ChallengeShareDialog open={shareOpen} posterData={sharePosterData} on:close={closeSharePoster} />
