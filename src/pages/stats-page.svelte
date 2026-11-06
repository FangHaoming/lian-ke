<script>
  import { onDestroy } from 'svelte'
  import { date, dayKey, fmt, num } from '../lib/workout-model.js'
  import ExerciseNameSelect from '../components/exercise-name-select.svelte'
  import DailyLineChart from '../components/daily-line-chart.svelte'
  export let data
  $: records = data.records
  $: sets = records.flatMap((record) => record.results.filter((result) => result.completed))
  $: days = new Set(
    records.map((record) =>
      new Date(record.startedAt || record.finishedAt).toLocaleDateString('en-CA'),
    ),
  ).size
  $: names = [...new Set(sets.map((result) => result.name))].sort()
  let actionQuery = ''
  $: normalizedActionQuery = actionQuery.trim().toLocaleLowerCase()
  $: filteredSets = normalizedActionQuery
    ? sets.filter((item) => item.name.toLocaleLowerCase().includes(normalizedActionQuery))
    : sets
  $: filteredNames = normalizedActionQuery
    ? names.filter((name) => name.toLocaleLowerCase().includes(normalizedActionQuery))
    : names
  let chartMetrics = ['sets', 'minutes']
  let chartActionQuery = ''
  let selectedChartDay = null
  $: if (typeof document !== 'undefined') {
    document.body.classList.toggle('chart-modal-open', Boolean(selectedChartDay))
  }
  onDestroy(() => {
    if (typeof document !== 'undefined') document.body.classList.remove('chart-modal-open')
  })
  $: normalizedChartQuery = chartActionQuery.trim().toLocaleLowerCase()
  $: chartDailyByKey = records
    .reduce((days, record) => {
      const key = dayKey(record.startedAt || record.finishedAt)
      if (!key) return days
      const current = days.get(key) || { key, sets: 0, seconds: 0, details: [] }
      const matchingResults = record.results.filter((result) => {
        if (
          !result.completed ||
          (normalizedChartQuery &&
            !result.name.toLocaleLowerCase().includes(normalizedChartQuery))
        )
          return false
        return true
      })
      current.sets += matchingResults.length
      current.seconds += matchingResults.reduce(
        (seconds, result) => seconds + num(result.actualSeconds),
        0,
      )
      if (matchingResults.length) {
        current.details.push({
          planName: record.planName || '未命名训练',
          notes: record.notes || '',
          sets: matchingResults.length,
          minutes: Math.ceil(
            matchingResults.reduce((seconds, result) => seconds + num(result.actualSeconds), 0) / 60,
          ),
          exercises: [...new Set(matchingResults.map((result) => result.name))],
          results: matchingResults,
        })
      }
      days.set(key, current)
      return days
    }, new Map())
  $: chartDailyKeys = [...chartDailyByKey.keys()].sort()
  $: chartPoints = chartDailyKeys.length
    ? (() => {
        const end = new Date(chartDailyKeys.at(-1) + 'T12:00:00')
        const start = new Date(chartDailyKeys[0] + 'T12:00:00')
        const days = []
        for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
          const key = dayKey(cursor)
          const item = chartDailyByKey.get(key) || { key, sets: 0, seconds: 0, details: [] }
          days.push({
            key,
            sets: item.sets,
            minutes: Math.ceil(item.seconds / 60),
            details: item.details,
          })
        }
        return days
      })()
    : []
  $: hasChartData = chartPoints.some((item) => item.sets || item.minutes)
  function targetText(result) {
    if (result.mode === 'time') return String(result.targetSeconds ?? 0) + ' 秒'
    if (result.mode === 'reps') return String(result.targetReps ?? 0) + ' 次'
    if (result.mode === 'both') {
      return (
        String(result.targetReps ?? 0) +
        ' 次 / ' +
        String(result.targetSeconds ?? 0) +
        ' 秒'
      )
    }
    if (result.targetSeconds != null) return String(result.targetSeconds) + ' 秒'
    if (result.targetReps != null) return String(result.targetReps) + ' 次'
    return '未设置目标'
  }
  function actualText(result) {
    if (result.mode === 'time') return fmt(num(result.actualSeconds))
    if (result.mode === 'reps') return String(result.actualReps ?? 0) + ' 次'
    if (result.mode === 'both') {
      return String(result.actualReps ?? 0) + ' 次 / ' + fmt(num(result.actualSeconds))
    }
    if (result.actualSeconds != null && num(result.actualSeconds) > 0) {
      return fmt(num(result.actualSeconds))
    }
    return String(result.actualReps ?? 0) + ' 次'
  }
  function download() {
    const blob = new Blob(
      [JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob),
      link = document.createElement('a')
    link.href = url
    link.download = `练刻-训练备份-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
</script>

<div class="row between">
  <div>
    <h1>数据分析</h1>
    <p class="muted">根据实际训练计时统计，不包含组间休息。</p>
  </div>
  <button class="btn ghost tiny" on:click={download}>导出备份</button>
</div>
<div class="grid">
  <div class="metric">
    <span class="muted">训练次数</span>
    <strong>{records.length}</strong>
  </div>
  <div class="metric">
    <span class="muted">训练天数</span>
    <strong>{days} 天</strong>
  </div>
  <div class="metric">
    <span class="muted">完成组数</span>
    <strong>{sets.length}</strong>
  </div>
  <div class="metric">
    <span class="muted">实际训练时长</span>
    <strong>{fmt(sets.reduce((sum, item) => sum + num(item.actualSeconds), 0))}</strong>
  </div>
</div>
<section class:chart-modal-active={selectedChartDay} class="panel daily-chart-panel">
  <div class="daily-chart-heading">
    <div>
      <h3>按天训练趋势</h3>
      <p class="muted small">默认显示最近一周 · 支持横向滚动、双指缩放和折线图</p>
    </div>
    <div class="daily-chart-controls">
      <div class="chart-metric-switch" aria-label="选择统计指标">
        {#each [{ key: 'sets', label: '组数' }, { key: 'minutes', label: '分钟' }] as metric}
          <button
            class:active={chartMetrics.includes(metric.key)}
            type="button"
            aria-pressed={chartMetrics.includes(metric.key)}
            on:click={() => {
              chartMetrics = chartMetrics.includes(metric.key)
                ? chartMetrics.filter((item) => item !== metric.key)
                : [...chartMetrics, metric.key]
            }}
          >{metric.label}</button>
        {/each}
      </div>
      {#if names.length}<div class="stats-filter-control chart-action-filter">
          <ExerciseNameSelect
            label="图表动作筛选"
            placeholder="全部动作 / 输入动作"
            options={names}
            bind:value={chartActionQuery}
          />
          {#if chartActionQuery}<button
              type="button"
              class="stats-filter-clear"
              aria-label="清除图表动作筛选"
              on:click={() => (chartActionQuery = '')}
            >×</button>{/if}
        </div>{/if}
    </div>
  </div>
  {#if hasChartData}
    {#if chartMetrics.length}
      <DailyLineChart
        points={chartPoints}
        metrics={chartMetrics}
        on:select={(event) => (selectedChartDay = event.detail)}
      />
    {:else}<div class="empty">至少选择一个统计指标</div>{/if}
  {:else}<div class="empty">暂无按天训练数据</div>{/if}
</section>
{#if false}
<section class="panel">
  <h3>历史训练记录</h3>
  <div class="history-record-list">
    {#each [...records].reverse() as record (record.id)}<div class="history-record">
      <div class="setline">
        <div>
          <b>{record.planName}</b>
          <div class="history-meta">
            <time class="muted small">{date(record.finishedAt)}</time>
            <span class="history-set-count">完成 {record.results.filter((item) => item.completed).length} 组</span>
          </div>
          {#if record.notes}<div class="muted small history-note">{record.notes}</div>{/if}
        </div>
      </div>
      <details class="history-sets">
        <summary>查看当时的动作组（{record.results.length} 组）</summary>
        {#each record.results as result}
          <div class="history-set">
            <b>{result.name} · 第 {result.setIndex} 组</b>
            <span class="muted small">{result.completed ? '已完成' : '未完成'}</span>
            <div class="muted small">
              目标：{result.mode === 'time'
                ? `${result.targetSeconds ?? 0} 秒`
                : result.mode === 'reps'
                  ? `${result.targetReps ?? 0} 次`
                  : `${result.targetReps ?? 0} 次 / ${result.targetSeconds ?? 0} 秒`} · {result.plannedWeight ??
                0} kg
              {#if result.plannedRest != null}
                · 休息 {result.plannedRest} 秒{/if}
            </div>
            <div class="muted small">
              实际：{result.actualReps ?? 0} 次 · {result.actualWeight ?? 0} kg · {fmt(
                num(result.actualSeconds),
              )}
            </div>
          </div>
        {/each}
      </details>
    </div>{:else}<div class="empty">暂无训练历史</div>{/each}
  </div>
</section>
{/if}
{#if selectedChartDay}
  <div class="chart-detail-backdrop" role="presentation" on:click={() => (selectedChartDay = null)}>
    <section
      class="chart-detail-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chart-detail-title"
      on:click|stopPropagation
    >
      <div class="chart-detail-header row between">
        <div>
          <h3 id="chart-detail-title">{selectedChartDay.key}</h3>
          <p class="muted small">当天训练记录</p>
        </div>
        <button class="btn ghost tiny" type="button" on:click={() => (selectedChartDay = null)}>关闭</button>
      </div>
      <div class="chart-detail-list">
        {#each selectedChartDay.details as detail}
          <article class="chart-detail-item">
            <b>{detail.planName}</b>
            {#if detail.notes}<div class="chart-detail-note muted small">备注：{detail.notes}</div>{/if}
            <div class="muted small">完成 {detail.sets} 组 · 实际训练 {detail.minutes} 分钟</div>
            <div class="chart-detail-results">
              {#each detail.results as result}
                <div class="chart-detail-result">
                  <span>{result.name} · 第 {result.setIndex} 组</span>
                  <span class="muted small">
                    {#if result.mode === 'time' && result.timerMode !== 'down'}
                      实际：{actualText(result)}
                    {:else}
                      目标：{targetText(result)} · 实际：{actualText(result)}
                    {/if}
                  </span>
                </div>
              {/each}
            </div>
          </article>
        {:else}<div class="empty">当天没有匹配的训练记录</div>{/each}
      </div>
    </section>
  </div>
{/if}
<section class="panel">
  <div class="row between action-stat-heading">
    <h3>动作统计</h3>
    {#if names.length}<label class="stats-filter">
        <span class="muted small">筛选动作</span>
        <div class="stats-filter-control">
          <ExerciseNameSelect
            label="筛选动作"
            placeholder="全部动作 / 输入动作"
            options={names}
            bind:value={actionQuery}
          />
          {#if actionQuery}<button
              type="button"
              class="stats-filter-clear"
              aria-label="清除动作筛选"
              on:click={() => (actionQuery = '')}
            >×</button>{/if}
        </div>
      </label>{/if}
  </div>
  {#if filteredNames.length}<div class="grid action-stat-list">
      {#each filteredNames as name}{@const items = filteredSets.filter((item) => item.name === name)}
        <div class="metric">
          <b>{name}</b>
          <div class="muted small">
            完成 {items.length} 组 · {items.reduce((sum, item) => sum + num(item.actualReps), 0)} 次
          </div>
          <div class="muted small">
            最大负重 {Math.max(...items.map((item) => num(item.actualWeight)))} kg
          </div>
          <div class="muted small">
            实际训练 {fmt(items.reduce((sum, item) => sum + num(item.actualSeconds), 0))}
          </div>
        </div>{/each}
    </div>{:else}<div class="empty">暂无动作数据</div>{/if}
</section>
