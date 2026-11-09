<script>
  import { onMount, onDestroy } from 'svelte'
  import { mk, uid, fmt, num, completedResults } from '../lib/workout-model.js'
  import { flatten } from '../lib/data.js'
  import { playSound, prepareSound } from '../lib/sound.js'
  import Select from '../components/select.svelte'
  import TimePicker from '../components/time-picker.svelte'
  import { timeModes, trainingModes } from '../lib/select-options.js'
  import ExerciseNameSelect from '../components/exercise-name-select.svelte'
  import { requestConfirm } from '../lib/confirm-dialog.js'
  import { appendTrainingEvaluation } from '../lib/challenge-model.js'
  export let data
  export let quickItems
  let selected = data.selected || data.plans[0]?.id || ''
  let selectedPlanName = data.plans.find((item) => item.id === selected)?.name || ''
  export let session
  export let review
  export let quickStartRequest = null
  export let screenAwake = false
  let ticker
  let focusMode = false
  let nativeFullscreenActive = false
  let holding = false
  let unlockTimer
  let unlockButton
  let focusHistoryEntry = false
  let releasingFocusHistory = false
  let selectionPlanId = ''
  let selectedItemIds = []
  let wasPausedBeforeEndConfirmation = true
  let reviewHydrated = false
  let pageMounted = false
  const ACTIVE_SESSION_KEY = 'lianke_active_training_session'
  const REVIEW_DRAFT_KEY = 'lianke_review_draft'
  $: plan = data.plans.find((item) => item.id === selected) || data.plans[0]
  $: current = session?.queue?.[session.index] || null
  $: availableNames = data.exerciseNames || []
  $: canStartQuick = quickItems.length > 0 && quickItems.every((item) => item.name.trim())
  $: if (plan && selectionPlanId !== plan.id) {
    selectionPlanId = plan.id
    selectedItemIds = plan.items.map((item, index) => item.id || `${plan.id}-${index}`)
  }
  $: if (reviewHydrated && review !== undefined) persistReviewDraft()
  $: if (pageMounted && quickStartRequest) {
    const request = quickStartRequest
    quickStartRequest = null
    start(
      request.items,
      request.planName,
      request.planId,
      request.returnTo,
      request.returnSelection,
    )
  }
  onMount(() => {
    pageMounted = true
    if (!session) restoreActiveSession()
    if (!review) {
      try {
        const draft = JSON.parse(localStorage.getItem(REVIEW_DRAFT_KEY) || 'null')
        if (draft?.planName && Array.isArray(draft.results)) review = draft
      } catch {}
    }
    reviewHydrated = true
    if (session) {
      ticker = setInterval(tick, 150)
      tick()
    }
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('beforeunload', persistSessionBeforeUnload)
    const onFullscreenChange = () => {
      if (focusMode && nativeFullscreenActive && !document.fullscreenElement) exitFocus()
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('beforeunload', persistSessionBeforeUnload)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  })
  onDestroy(() => {
    clearInterval(ticker)
    cancelUnlock()
    if (focusMode && document.fullscreenElement === document.documentElement)
      void document.exitFullscreen().catch(() => {})
  })
  $: if (pageMounted) persistActiveSession(session)
  function enterFocus() {
    if (!focusMode) {
      history.pushState({ ...(history.state || {}), trainingFocus: true }, '', window.location.href)
      focusHistoryEntry = true
    }
    focusMode = true
    // The request must run in the button's user gesture. The fixed view is
    // still available on browsers that do not support the Fullscreen API.
    if (!document.fullscreenElement) {
      const request = document.documentElement.requestFullscreen?.()
      if (request)
        void request
          .then(() => {
            nativeFullscreenActive = true
          })
          .catch(() => {})
    }
  }
  function exitFocus() {
    const wasFocused = focusMode
    cancelUnlock()
    focusMode = false
    nativeFullscreenActive = false
    if (wasFocused && document.fullscreenElement === document.documentElement)
      void document.exitFullscreen().catch(() => {})
    if (focusHistoryEntry) {
      focusHistoryEntry = false
      releasingFocusHistory = true
      history.back()
    }
  }
  function beginUnlock() {
    if (holding) return
    holding = true
    unlockTimer = setTimeout(() => {
      holding = false
      exitFocus()
    }, 1200)
  }
  function cancelUnlock() {
    clearTimeout(unlockTimer)
    holding = false
  }
  function persistReviewDraft() {
    try {
      if (review) localStorage.setItem(REVIEW_DRAFT_KEY, JSON.stringify(review))
      else localStorage.removeItem(REVIEW_DRAFT_KEY)
    } catch {}
  }
  function persistActiveSession(value) {
    try {
      if (value) localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(value))
      else localStorage.removeItem(ACTIVE_SESSION_KEY)
    } catch {}
  }
  function persistSessionBeforeUnload() {
    persistActiveSession(session)
  }
  function restoreActiveSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) || 'null')
      if (
        saved &&
        Array.isArray(saved.queue) &&
        saved.queue.length &&
        Number.isInteger(saved.index) &&
        saved.index >= 0 &&
        saved.index < saved.queue.length &&
        typeof saved.phase === 'string'
      )
        session = saved
    } catch {
      localStorage.removeItem(ACTIVE_SESSION_KEY)
    }
  }
  function handleLockedKeydown(event) {
    if (focusMode && event.key === 'Tab') {
      event.preventDefault()
      unlockButton?.focus()
    }
  }
  function handleFocusNavigation() {
    if (releasingFocusHistory) {
      releasingFocusHistory = false
      return
    }
    if (!focusMode) return
    history.pushState({ ...(history.state || {}), trainingFocus: true }, '', window.location.href)
  }
  function start(items, planName, planId, returnTo = '', returnSelection = null) {
    const normalizedItems = structuredClone(items).map((item) => ({
      ...item,
      timerMode: item.mode === 'time' && item.timerMode === 'up' ? 'up' : 'down',
    }))
    const queue = flatten({ items: normalizedItems })
    if (!queue.length) return
    prepareSound()
    session = {
      planName,
      planId,
      returnTo,
      returnSelection,
      queue,
      index: 0,
      phase: 'prep',
      paused: false,
      remaining: 3,
      elapsed: 0,
      last: Date.now(),
      results: [],
      startedAt: new Date().toISOString(),
    }
    clearInterval(ticker)
    ticker = setInterval(tick, 150)
  }
  function isCountUp(item) {
    return item?.mode === 'time' && item.timerMode === 'up'
  }
  function targetDescription(item) {
    return item?.mode === 'reps' ? `目标 ${item.reps} 次` : `目标 ${item.duration} 秒`
  }
  function itemKey(item, index) {
    return item.id || `${plan?.id || 'plan'}-${index}`
  }
  function togglePlanItem(item, index) {
    const key = itemKey(item, index)
    selectedItemIds = selectedItemIds.includes(key)
      ? selectedItemIds.filter((id) => id !== key)
      : [...selectedItemIds, key]
  }
  function selectAllPlanItems() {
    selectedItemIds = plan.items.map((item, index) => itemKey(item, index))
  }
  function startSelectedPlan() {
    const items = plan.items.filter((item, index) => selectedItemIds.includes(itemKey(item, index)))
    start(items, plan.name, plan.id)
    selectAllPlanItems()
  }
  function tick() {
    if (!session || session.paused) return
    const now = Date.now()
    let delta = Math.max(0, (now - session.last) / 1000)
    session.last = now
    while (session && delta > 0) {
      const currentItem = session.queue[session.index]
      if (!currentItem) return
      if (session.phase === 'work' && (currentItem.mode === 'reps' || isCountUp(currentItem))) {
        session.elapsed += delta
        break
      }
      const step = Math.min(delta, Math.max(0, session.remaining))
      if (session.phase === 'work') session.elapsed += step
      session.remaining -= step
      delta -= step
      if (session.remaining > 0) break
      if (session.phase === 'prep') beginWork()
      else if (session.phase === 'rest') {
        playSound(data.sounds.rest)
        advance()
      } else finishSet()
    }
    if (session) session = session
  }
  function beginWork() {
    session.phase = 'work'
    const item = session.queue[session.index]
    session.remaining = item.mode === 'time' && !isCountUp(item) ? num(item.duration, 1, 7200) : 0
    session.elapsed = 0
    session.last = Date.now()
    session = session
  }
  function advance() {
    session.index++
    session.phase = 'prep'
    session.remaining = 3
    session.elapsed = 0
    session.last = Date.now()
    session = session
  }
  function finishSet() {
    const item = session.queue[session.index]
    session.results.push({
      name: item.name,
      exerciseId: item.id,
      setIndex: item.setIndex,
      sortOrder: session.index,
      mode: item.mode,
      timerMode: item.timerMode,
      targetReps: item.reps,
      targetSeconds: item.duration,
      plannedWeight: item.weight,
      plannedRest: item.rest,
      challengeStage: item.challengeStage || '',
      actualReps: item.mode === 'reps' ? item.reps : 0,
      actualLeft: item.challengeUnilateral ? item.reps : undefined,
      actualRight: item.challengeUnilateral ? item.reps : undefined,
      challengeUnilateral: item.challengeUnilateral === true,
      actualWeight: item.weight,
      actualSeconds: Math.round(session.elapsed),
      completed: true,
    })
    if (session.index === session.queue.length - 1) {
      playSound(data.sounds.finish)
      exitFocus()
      review = { ...session, finishedAt: new Date().toISOString(), notes: '' }
      session = null
      clearInterval(ticker)
      return
    }
    playSound(data.sounds.set)
    session.phase = 'rest'
    session.remaining = num(item.rest, 0, 3600)
    session.elapsed = 0
    session.last = Date.now()
    if (!session.remaining) advance()
    session = session
  }
  function next() {
    if (session.phase === 'prep') beginWork()
    else if (session.phase === 'rest') advance()
    else finishSet()
  }
  function saveReview() {
    const returnToChallenges = review.returnTo === 'challenges'
    const returnSelection = review.returnSelection
    const results = completedResults(review.results)
    if (!results.length) {
      review = null
      persistReviewDraft()
      if (returnToChallenges) returnToChallenge(returnSelection)
      return
    }
    saveTrainingRecord(review, results)
    data.exerciseNames = [...new Set([...availableNames, ...results.map((item) => item.name)])]
    data = data
    review = null
    // Clear the persisted review before navigating away. Otherwise the next
    // quick challenge can restore this already-saved review draft.
    persistReviewDraft()
    if (returnToChallenges) {
      returnToChallenge(returnSelection)
    }
  }
  function returnToChallenge(selection) {
    window.dispatchEvent(new CustomEvent('lianke-return-to-challenges', { detail: selection }))
  }
  function saveTrainingRecord(source, results) {
    const record = {
      id: uid(),
      planId: source.planId,
      planName: source.planName,
      startedAt: source.startedAt,
      finishedAt: source.finishedAt || new Date().toISOString(),
      notes: source.notes || '',
      results: structuredClone(results),
    }
    data.records = [...data.records, record]
    data.challenges = appendTrainingEvaluation(data.challenges, record)
  }
  function requestEndTraining() {
    wasPausedBeforeEndConfirmation = session?.paused ?? true
    if (session && !session.paused) {
      session.paused = true
      session.last = Date.now()
      session = session
    }
    requestConfirm({
      title: '结束训练',
      message: session?.results?.length
        ? '将保存当前已完成的 ' + session.results.length + ' 组动作，是否结束训练？'
        : '当前还没有完成的动作组，是否结束训练？',
      confirmText: '结束训练',
      cancelText: '继续训练',
      destructive: true,
    }).then(({ confirmed }) => {
      if (confirmed) endTraining()
      else cancelEndTraining()
    })
  }
  function cancelEndTraining() {
    if (session && !wasPausedBeforeEndConfirmation) {
      session.paused = false
      session.last = Date.now()
      session = session
    }
  }
  function endTraining() {
    if (!session) return
    const results = completedResults(session.results)
    if (!results.length) {
      const returnToChallenges = session.returnTo === 'challenges'
      const returnSelection = session.returnSelection
      clearInterval(ticker)
      exitFocus()
      session = null
      if (returnToChallenges) returnToChallenge(returnSelection)
      return
    }
    review = {
      ...session,
      results,
      finishedAt: new Date().toISOString(),
      notes: '',
    }
    clearInterval(ticker)
    exitFocus()
    session = null
  }
  function addQuick() {
    quickItems = [...quickItems, mk('', 1)]
  }
  function removeName(name) {
    data.exerciseNames = availableNames.filter((item) => item !== name)
    data = data
  }
</script>

<svelte:window on:keydown={handleLockedKeydown} on:popstate={handleFocusNavigation} />

{#if review}
  <section class="panel training-review">
    <h1>🎉 训练完成</h1>
    <p class="muted">{review.planName} · {review.results.length} 组。请核对实际完成次数和负重。</p>
    <div class="notice">未完成的组可取消勾选；保存和同步只保留完成的组。</div>
    {#each review.results as result}<div class="review-exercise">
        <div class="review-exercise-header">
          <div>
            <b>{result.name}</b>
            <span>第 {result.setIndex} 组</span>
          </div>
          {#if !(result.mode === 'time' && result.timerMode === 'up')}<span class="review-target">
              目标 {result.mode === 'reps'
                ? `${result.targetReps} 次`
                : `${result.targetSeconds} 秒`}
            </span>{/if}
        </div>
        <div class="review-fields">
          <label class="field review-complete">
            完成状态
            <span class="review-check-control">
              <input class="review-checkbox" type="checkbox" bind:checked={result.completed} />
              <span>{result.completed ? '已完成' : '未完成'}</span>
            </span>
          </label>
          {#if result.challengeUnilateral}
            <label class="field">
              实际次数（左侧）
              <input type="number" min="0" bind:value={result.actualLeft} />
            </label>
            <label class="field">
              实际次数（右侧）
              <input type="number" min="0" bind:value={result.actualRight} />
            </label>
          {:else}
            <label class="field">
              实际次数
              <input type="number" min="0" bind:value={result.actualReps} />
            </label>
          {/if}
          <label class="field">
            实际负重 kg
            <input type="number" min="0" step="0.5" bind:value={result.actualWeight} />
          </label>
          <TimePicker label="实际用时" max={86399} bind:value={result.actualSeconds} />
        </div>
      </div>{/each}
    <label class="field">
      训练备注
      <textarea rows="3" bind:value={review.notes}></textarea>
    </label>
    <button class="btn primary" style="margin-top:12px" on:click={saveReview}>
      {review.results.some((item) => item.completed)
        ? '保存本次训练记录'
        : '结束本次训练（无完成组）'}
    </button>
  </section>
{:else if session && current}
  <div class:training-focus={focusMode} class="training-session">
    {#if focusMode}
      <div class="training-lock-screen" role="dialog" aria-modal="true" aria-label="训练防误触锁屏">
        <div class="row between training-lock-top">
          <span class="pill">防误触已开启</span>
          <span class="muted small">第 {session.index + 1} / {session.queue.length} 组</span>
        </div>
        <div class="training-lock-center">
          <div class="muted">
            {session.phase === 'prep'
              ? '准备开始'
              : session.phase === 'rest'
                ? '组间休息'
                : '正在训练'}
          </div>
          <h1>{current.name} · 第 {current.setIndex} 组</h1>
          <div class="training-target">{targetDescription(current)}</div>
          <div
            class="clock"
            class:orange={session.phase !== 'work'}
            class:accent={session.phase === 'work'}
          >
            {fmt(
              session.phase === 'work' && (current.mode === 'reps' || isCountUp(current))
                ? session.elapsed
                : Math.ceil(session.remaining),
            )}
          </div>
          <div class="muted">
            {session.paused
              ? '已暂停'
              : session.phase === 'work' && (current.mode === 'reps' || isCountUp(current))
                ? '正计时'
                : '倒计时'}
          </div>
          <div class="progress">
            <div style={`width:${(session.results.length / session.queue.length) * 100}%`}></div>
          </div>
          <div class="muted small">已完成 {session.results.length} / {session.queue.length} 组</div>
        </div>
        <button
          bind:this={unlockButton}
          class="unlock-hold"
          class:is-holding={holding}
          on:pointerdown|preventDefault={beginUnlock}
          on:pointerup={cancelUnlock}
          on:pointercancel={cancelUnlock}
          on:pointerleave={cancelUnlock}
          on:keydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              beginUnlock()
            }
          }}
          on:keyup={(event) => {
            if (event.key === 'Enter' || event.key === ' ') cancelUnlock()
          }}
          on:blur={cancelUnlock}
          on:contextmenu={(event) => event.preventDefault()}
          on:selectstart|preventDefault
          on:dragstart|preventDefault
        >
          长按退出防误触
        </button>
      </div>
    {:else}
      <section class="panel">
        <div class="row between">
          <span class="pill">
            {session.phase === 'prep'
              ? '准备开始'
              : session.phase === 'rest'
                ? '组间休息'
                : '正在训练'}
          </span>
          <span class="muted small">第 {session.index + 1} / {session.queue.length} 组</span>
        </div>
        <div class="timer">
          <div class="muted">{current.name} · 第 {current.setIndex} 组</div>
          <div class="training-target">{targetDescription(current)}</div>
          <div
            class="clock"
            class:orange={session.phase !== 'work'}
            class:accent={session.phase === 'work'}
          >
            {fmt(
              session.phase === 'work' && (current.mode === 'reps' || isCountUp(current))
                ? session.elapsed
                : Math.ceil(session.remaining),
            )}
          </div>
          <div class="muted">
            {session.paused
              ? '已暂停'
              : session.phase === 'work' && (current.mode === 'reps' || isCountUp(current))
                ? '正计时 · 手动结束本组'
                : '倒计时'}
          </div>
          {#if !session.paused && !screenAwake}<div class="muted small" style="margin-top:8px">
              请保持屏幕亮起；息屏后浏览器可能延迟提示音。
            </div>{/if}
          <div class="progress">
            <div style={`width:${(session.results.length / session.queue.length) * 100}%`}></div>
          </div>
        </div>
        <div class="row" style="justify-content:center">
          <button class="btn ghost" on:click={enterFocus}>开启防误触</button>
          <button
            class="btn ghost"
            on:click={() => {
              session.paused = !session.paused
              session.last = Date.now()
              if (!session.paused) prepareSound()
              session = session
            }}
          >
            {session.paused ? '继续' : '暂停'}
          </button>
          <button class="btn primary" on:click={next}>
            {session.phase === 'prep'
              ? '跳过准备 →'
              : session.phase === 'rest'
                ? '跳过休息 →'
                : '结束本组 →'}
          </button>
          <button class="btn red" on:click={requestEndTraining}>结束训练</button>
        </div>
      </section>
      <section class="panel">
        <h3>训练进度 · 已完成 {session.results.length}/{session.queue.length} 组</h3>
        {#each session.queue as item, i}<div class="setline">
            <span>
              {i < session.results.length ? '✓' : i === session.index ? '▶' : '○'}
              {item.name} · 第 {item.setIndex} 组
            </span>
            <span class="muted small">{item.weight} kg</span>
          </div>{/each}
      </section>
    {/if}
  </div>
{:else}
  <section class="panel">
    <h2>快速训练</h2>
    <p class="muted">不用创建每日计划，选择动作就能开始。可临时调整组数、次数、负重和休息。</p>
    <div class="row quick-add-row">
      <button class="btn" on:click={addQuick}>添加动作</button>
    </div>
    {#each quickItems as item, i (item.id)}<div class="quick-card">
        <div class="row between">
          <b class:quick-action-placeholder={!item.name.trim()}>
            {i + 1}. {item.name.trim() || '选择动作'}
          </b>
          <button
            class="btn"
            on:click={() => (quickItems = quickItems.filter((_, index) => index !== i))}
          >
            删除
          </button>
        </div>
        <div class="quick-grid">
          <div class="field quick-action-name-field">
            <span>动作名称</span>
            <ExerciseNameSelect
              label={`第 ${i + 1} 个动作名称`}
              options={[...new Set([...availableNames, item.name].filter(Boolean))]}
              bind:value={item.name}
              deletable
              on:delete={(event) => removeName(event.detail.name)}
            />
          </div>
          <div class="field">
            <span>训练类型</span>
            <Select label="训练类型" options={trainingModes} bind:value={item.mode} />
          </div>
          <label class="field">
            组数
            <input type="number" min="1" bind:value={item.sets} />
          </label>
          {#if item.mode === 'reps'}<label class="field">
              目标次数
              <input type="number" bind:value={item.reps} />
            </label>{:else}
            {#if item.timerMode !== 'up'}<TimePicker
                label="训练时长"
                max={7200}
                bind:value={item.duration}
              />{/if}
            <div class="field">
              <span>计时方式</span>
              <Select label="计时方式" options={timeModes} bind:value={item.timerMode} />
            </div>
          {/if}
          <label class="field">
            负重 kg
            <input type="number" step="0.5" bind:value={item.weight} />
          </label>
          <TimePicker label="休息时间" max={3600} bind:value={item.rest} />
        </div>
      </div>{/each}
    <div class="row between" style="margin-top:16px">
      <span class="muted">{quickItems.length} 个动作</span>
      <button
        class="btn primary"
        disabled={!canStartQuick}
        on:click={() => start(quickItems, '快速训练', 'quick')}
      >
        开始快速训练 →
      </button>
    </div>
  </section>
  {#if plan}<section class="panel">
      <h1>开始今天的训练</h1>
      <p class="muted">选择计划，准备好后开始。每组动作可设置计次数或倒计时。</p>
      <div class="plan-start-row">
        <div class="field plan-start-picker">
          <span>训练计划</span>
          <ExerciseNameSelect
            label="训练计划"
            placeholder="输入计划名称筛选"
            options={data.plans.map((option) => option.name)}
            bind:value={selectedPlanName}
            on:change={() => {
              const nextPlan = data.plans.find((item) => item.name === selectedPlanName)
              if (!nextPlan) return
              selected = nextPlan.id
              data.selected = selected
              data = data
            }}
          />
        </div>
        <button
          class="btn primary plan-start-button"
          disabled={!selectedItemIds.length}
          on:click={startSelectedPlan}
        >
          开始训练 →
        </button>
      </div>
      <p class="muted">
        已选 {selectedItemIds.length}/{plan.items.length} 个动作 · {flatten({
          items: plan.items.filter((item, index) => selectedItemIds.includes(itemKey(item, index))),
        }).length} 组
      </p>
    </section>
    <section class="panel">
      <div class="row between">
        <h3>今日训练内容</h3>
        <button class="btn tiny ghost" on:click={selectAllPlanItems}>全选动作</button>
      </div>
      <p class="muted small">勾选本次要练的动作，默认全部选中。</p>
      {#each plan.items as item, i}<label class="setline plan-action-option">
          <span class="plan-action-check">
            <input
              class="plan-action-checkbox"
              type="checkbox"
              checked={selectedItemIds.includes(itemKey(item, i))}
              on:change={() => togglePlanItem(item, i)}
            />
            <span class="plan-action-copy">
              <b>{i + 1}. {item.name}</b>
              <span class="muted small plan-action-detail">
                {item.sets} 组 · {item.mode === 'reps' ? item.reps + ' 次' : item.duration + ' 秒'} ·
                {item.weight} kg
              </span>
            </span>
          </span>
          <span class="pill">休息 {item.rest}s</span>
        </label>{/each}
    </section>{/if}
{/if}
