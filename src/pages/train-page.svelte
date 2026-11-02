<script>
  import { onMount, onDestroy } from 'svelte'
  import { mk, uid, fmt, num } from '../lib/workout-model.js'
  import { flatten } from '../lib/data.js'
  import { playSound } from '../lib/sound.js'
  import Select from '../components/select.svelte'
  import TimePicker from '../components/time-picker.svelte'
  import { trainingModes } from '../lib/select-options.js'
  import ExerciseNameSelect from '../components/exercise-name-select.svelte'
  export let data
  export let quickItems
  let selected = data.selected || data.plans[0]?.id || ''
  export let session
  export let review
  let ticker
  $: plan = data.plans.find((item) => item.id === selected) || data.plans[0]
  $: current = session?.queue[session.index]
  $: availableNames = data.exerciseNames || []
  $: canStartQuick = quickItems.length > 0 && quickItems.every((item) => item.name.trim())
  onMount(() => {
    if (session) {
      session.last = performance.now()
      ticker = setInterval(tick, 150)
    }
  })
  onDestroy(() => clearInterval(ticker))
  function start(items, planName, planId) {
    const queue = flatten({ items: structuredClone(items) })
    if (!queue.length) return
    session = {
      planName,
      planId,
      queue,
      index: 0,
      phase: 'prep',
      paused: false,
      remaining: 3,
      elapsed: 0,
      last: performance.now(),
      results: [],
      startedAt: new Date().toISOString(),
    }
    clearInterval(ticker)
    ticker = setInterval(tick, 150)
  }
  function tick() {
    if (!session || session.paused) return
    const now = performance.now(),
      delta = Math.max(0, (now - session.last) / 1000)
    session.last = now
    if (session.phase === 'work') session.elapsed += delta
    if (session.phase !== 'work' || current.mode === 'time') {
      session.remaining -= delta
      if (session.remaining <= 0) {
        if (session.phase === 'prep') beginWork()
        else if (session.phase === 'rest') {
          playSound(data.sounds.rest)
          advance()
        } else finishSet()
      }
    }
    session = session
  }
  function beginWork() {
    session.phase = 'work'
    session.remaining = current.mode === 'time' ? num(current.duration, 1, 7200) : 0
    session.elapsed = 0
    session.last = performance.now()
    session = session
  }
  function advance() {
    session.index++
    session.phase = 'prep'
    session.remaining = 3
    session.elapsed = 0
    session.last = performance.now()
    session = session
  }
  function finishSet() {
    const item = current
    session.results.push({
      name: item.name,
      exerciseId: item.id,
      setIndex: item.setIndex,
      mode: item.mode,
      targetReps: item.reps,
      targetSeconds: item.duration,
      plannedWeight: item.weight,
      actualReps: item.mode === 'reps' ? item.reps : 0,
      actualWeight: item.weight,
      actualSeconds: Math.round(session.elapsed),
      completed: true,
    })
    if (session.index === session.queue.length - 1) {
      playSound(data.sounds.finish)
      review = { ...session, finishedAt: new Date().toISOString(), notes: '' }
      session = null
      clearInterval(ticker)
      return
    }
    playSound(data.sounds.set)
    session.phase = 'rest'
    session.remaining = num(item.rest, 0, 3600)
    session.elapsed = 0
    session.last = performance.now()
    if (!session.remaining) advance()
    session = session
  }
  function next() {
    if (session.phase === 'prep') beginWork()
    else if (session.phase === 'rest') advance()
    else finishSet()
  }
  function saveReview() {
    data.records = [
      ...data.records,
      {
        id: uid(),
        planId: review.planId,
        planName: review.planName,
        startedAt: review.startedAt,
        finishedAt: review.finishedAt,
        notes: review.notes,
        results: review.results,
      },
    ]
    data.exerciseNames = [
      ...new Set([
        ...availableNames,
        ...review.results.filter((item) => item.completed).map((item) => item.name),
      ]),
    ]
    data = data
    review = null
  }
  function addQuick() {
    quickItems = [...quickItems, mk('', 1)]
  }
  function removeName(name) {
    data.exerciseNames = availableNames.filter((item) => item !== name)
    data = data
  }
</script>

{#if review}
  <section class="panel">
    <h1>🎉 训练完成</h1>
    <p class="muted">{review.planName} · {review.results.length} 组。请核对实际完成次数和负重。</p>
    <div class="notice">未完成的组可取消勾选，统计只计算完成的组。</div>
    {#each review.results as result}<div class="review-exercise">
        <div class="review-exercise-header">
          <div>
            <b>{result.name}</b>
            <span>第 {result.setIndex} 组</span>
          </div>
          <span class="review-target">
            目标 {result.mode === 'reps' ? `${result.targetReps} 次` : `${result.targetSeconds} 秒`}
          </span>
        </div>
        <div class="review-fields">
          <label class="field review-complete">
            完成状态
            <span class="review-check-control">
              <input class="review-checkbox" type="checkbox" bind:checked={result.completed} />
              <span>{result.completed ? '已完成' : '未完成'}</span>
            </span>
          </label>
          <label class="field">
            实际次数
            <input type="number" min="0" bind:value={result.actualReps} />
          </label>
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
      保存本次训练记录
    </button>
  </section>
{:else if session}
  <section class="panel">
    <div class="row between">
      <span class="pill">
        {session.phase === 'prep' ? '准备开始' : session.phase === 'rest' ? '组间休息' : '正在训练'}
      </span>
      <span class="muted small">第 {session.index + 1} / {session.queue.length} 组</span>
    </div>
    <div class="timer">
      <div class="muted">{current.name} · 第 {current.setIndex} 组</div>
      <div
        class="clock"
        class:orange={session.phase !== 'work'}
        class:accent={session.phase === 'work'}
      >
        {fmt(
          session.phase === 'work' && current.mode === 'reps'
            ? session.elapsed
            : Math.ceil(session.remaining),
        )}
      </div>
      <div class="muted">
        {session.paused
          ? '已暂停'
          : session.phase === 'work' && current.mode === 'reps'
            ? '正计时 · 手动结束本组'
            : '倒计时'}
      </div>
      <div class="progress">
        <div style={`width:${(session.results.length / session.queue.length) * 100}%`}></div>
      </div>
    </div>
    <div class="row" style="justify-content:center">
      <button
        class="btn ghost"
        on:click={() => {
          session.paused = !session.paused
          session.last = performance.now()
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
      <button
        class="btn red"
        on:click={() => {
          if (confirm('放弃本次训练？')) {
            clearInterval(ticker)
            session = null
          }
        }}
      >
        放弃训练
      </button>
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
            </label>{:else}<TimePicker
              label="训练时长"
              max={7200}
              bind:value={item.duration}
            />{/if}
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
          <Select
            label="训练计划"
            options={data.plans.map((option) => ({ value: option.id, label: option.name }))}
            bind:value={selected}
            on:change={() => {
              data.selected = selected
              data = data
            }}
          />
        </div>
        <button
          class="btn primary plan-start-button"
          on:click={() => start(plan.items, plan.name, plan.id)}
        >
          开始训练 →
        </button>
      </div>
      <p class="muted">{plan.items.length} 个动作 · {flatten(plan).length} 组</p>
    </section>
    <section class="panel">
      <h3>今日训练内容</h3>
      {#each plan.items as item, i}<div class="setline">
          <div>
            <b>{i + 1}. {item.name}</b>
            <div class="muted small">
              {item.sets} 组 · {item.mode === 'reps' ? item.reps + ' 次' : item.duration + ' 秒'} · {item.weight}
              kg
            </div>
          </div>
          <span class="pill">休息 {item.rest}s</span>
        </div>{/each}
    </section>{/if}
{/if}
