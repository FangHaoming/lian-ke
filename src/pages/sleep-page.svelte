<script>
  import { sleepRecords as normalizeSleepRecords, uid } from '../lib/workout-model.js'
  import { showToast } from '../lib/toast.js'
  import { requestConfirm } from '../lib/confirm-dialog.js'
  import SleepLineChart from '../components/sleep-line-chart.svelte'

  export let data
  let asleepAt = ''
  let wakeAt = ''
  let note = ''
  let editingId = ''
  let chartMode = 'daily'

  $: records = normalizeSleepRecords(data.sleepRecords || [])
  $: completedRecords = records.filter((record) => record.asleepAt && record.wakeAt)
  $: latest = completedRecords[completedRecords.length - 1]
  $: previous = completedRecords[completedRecords.length - 2]
  $: openRecord = [...records].reverse().find((record) => record.asleepAt && !record.wakeAt)
  $: sleepChangeMinutes =
    latest && previous ? durationMinutes(latest) - durationMinutes(previous) : null
  $: chartPoints = buildChartPoints(completedRecords, chartMode)

  function startOfWeek(date) {
    const result = new Date(date)
    const day = result.getDay()
    result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day))
    result.setHours(0, 0, 0, 0)
    return result
  }

  function formatShortDate(date) {
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
  }

  function formatMonth(date) {
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  function buildChartPoints(items, mode) {
    const groups = new Map()
    items.forEach((record) => {
      const wake = new Date(record.wakeAt)
      if (Number.isNaN(wake.getTime())) return
      const periodStart =
        mode === 'weekly'
          ? startOfWeek(wake)
          : mode === 'monthly'
            ? new Date(wake.getFullYear(), wake.getMonth(), 1)
            : new Date(wake.getFullYear(), wake.getMonth(), wake.getDate())
      const key = periodStart.toISOString()
      const group = groups.get(key) || { periodStart, values: [] }
      group.values.push(durationMinutes(record))
      groups.set(key, group)
    })
    return [...groups.values()]
      .sort((a, b) => a.periodStart - b.periodStart)
      .map(({ periodStart, values }) => ({
        recordedAt: periodStart.toISOString(),
        minutes: values.reduce((sum, value) => sum + value, 0) / values.length,
        label:
          mode === 'weekly'
            ? `周 ${formatShortDate(periodStart)}`
            : mode === 'monthly'
              ? formatMonth(periodStart)
              : formatShortDate(periodStart),
        period: mode === 'weekly' ? '周平均' : mode === 'monthly' ? '月平均' : '',
      }))
  }

  function toInputValue(value) {
    const date = new Date(value)
    const offset = date.getTimezoneOffset()
    return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
  }

  function formatDateTime(value) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '尚未记录'
    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  function durationMinutes(record) {
    if (!record.asleepAt || !record.wakeAt) return 0
    return Math.max(0, Math.round((new Date(record.wakeAt) - new Date(record.asleepAt)) / 60000))
  }

  function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return `${hours} 小时 ${String(rest).padStart(2, '0')} 分钟`
  }

  function selectNow(field) {
    if (field === 'asleep') asleepAt = toInputValue(new Date())
    else wakeAt = toInputValue(new Date())
  }

  function notifyError(message) {
    showToast(message, { type: 'error' })
  }

  function recordAsleep() {
    const asleep = new Date(asleepAt)
    if (!asleepAt || Number.isNaN(asleep.getTime())) {
      notifyError('请选择入睡时间')
      return
    }
    const targetId = editingId || openRecord?.id
    const next = targetId
      ? records.map((record) =>
          record.id === targetId
            ? { ...record, asleepAt: asleep.toISOString(), note: note.trim() }
            : record,
        )
      : [...records, { id: uid(), asleepAt: asleep.toISOString(), note: note.trim() }]
    data.sleepRecords = normalizeSleepRecords(next)
    data = data
    editingId = targetId || data.sleepRecords.at(-1)?.id || ''
  }

  function recordWake() {
    const wake = new Date(wakeAt)
    if (!wakeAt || Number.isNaN(wake.getTime())) {
      notifyError('请选择醒来时间')
      return
    }
    const targetId = editingId || openRecord?.id
    const target = records.find((record) => record.id === targetId)
    if (!target?.asleepAt) {
      notifyError('请先单独记录入睡时间')
      return
    }
    const asleep = new Date(target.asleepAt)
    if (wake <= asleep) {
      notifyError('醒来时间必须晚于入睡时间')
      return
    }
    data.sleepRecords = normalizeSleepRecords(
      records.map((record) =>
        record.id === targetId
          ? { ...record, wakeAt: wake.toISOString(), note: note.trim() }
          : record,
      ),
    )
    data = data
    resetEditState()
  }

  function resetEditState() {
    editingId = ''
    asleepAt = ''
    wakeAt = ''
    note = ''
  }

  function deleteIncompleteRecord(record) {
    requestConfirm({
      title: '删除未完成记录？',
      message: '这条尚未记录醒来时间的睡眠记录将被删除。',
      confirmText: '删除记录',
      destructive: true,
    }).then(({ confirmed }) => {
      if (!confirmed) return
      data.sleepRecords = records.filter((item) => item.id !== record.id)
      data = data
      if (editingId === record.id) resetEditState()
    })
  }
</script>

<div class="row between sleep-heading">
  <div>
    <h1>睡眠记录</h1>
    <p class="muted">分别记录入睡和醒来时间，自动计算两者之间的睡眠时长。</p>
  </div>
</div>

<div class="sleep-summary grid">
  <div class="metric">
    <span class="muted">最近睡眠</span>
    <strong>{latest ? formatDuration(durationMinutes(latest)) : '—'}</strong>
  </div>
  <div class="metric">
    <span class="muted">变化</span>
    <strong
      class:accent={sleepChangeMinutes !== null && sleepChangeMinutes >= 0}
      class:orange={sleepChangeMinutes !== null && sleepChangeMinutes < 0}
    >
      {sleepChangeMinutes === null
        ? '—'
        : `${sleepChangeMinutes > 0 ? '+' : sleepChangeMinutes < 0 ? '-' : ''}${formatDuration(Math.abs(sleepChangeMinutes))}`}
    </strong>
  </div>
  <div class="metric">
    <span class="muted">记录次数</span>
    <strong>{completedRecords.length}</strong>
  </div>
</div>

<section class="panel sleep-entry-panel">
  <div class="row between sleep-entry-heading">
    <div>
      <h3>{editingId ? '编辑睡眠记录' : '分别记录时间'}</h3>
      <p class="muted small">入睡和醒来可以跨越午夜，支持使用当前时间快速记录。</p>
    </div>
    {#if openRecord && !editingId}<span class="pill sleep-open-pill">正在睡眠</span>{/if}
  </div>
  <div class="sleep-event-grid">
    <div class="sleep-event-card">
      <label class="field">
        入睡时间
        <input type="datetime-local" bind:value={asleepAt} />
      </label>
      <div class="row sleep-event-actions">
        <button class="btn ghost" on:click={() => selectNow('asleep')}>选中此刻</button>
        <button class="btn primary" on:click={recordAsleep}>
          {editingId ? '保存入睡时间' : '记录入睡'}
        </button>
      </div>
    </div>
    <div class="sleep-event-card">
      <label class="field">
        醒来时间
        <input type="datetime-local" bind:value={wakeAt} />
      </label>
      <div class="row sleep-event-actions">
        <button class="btn ghost" on:click={() => selectNow('wake')}>选中此刻</button>
        <button class="btn primary" on:click={recordWake}>
          {editingId ? '保存醒来时间' : '记录醒来'}
        </button>
      </div>
    </div>
  </div>
  <div class="sleep-note-row">
    <label class="field sleep-note-field">
      备注（可选）
      <input type="text" maxlength="60" placeholder="自然醒 / 午睡" bind:value={note} />
    </label>
  </div>
</section>

<section class="panel sleep-chart-panel">
  <div class="row between sleep-chart-heading">
    <div>
      <h3>睡眠趋势</h3>
      <p class="muted small">
        {chartMode === 'daily'
          ? `按天统计 · 共 ${chartPoints.length} 天`
          : chartMode === 'weekly'
            ? `按周平均 · 共 ${chartPoints.length} 周`
            : `按月平均 · 共 ${chartPoints.length} 月`}，可拖动范围查看
      </p>
    </div>
    <div class="chart-metric-switch" aria-label="选择睡眠统计周期">
      <button class:active={chartMode === 'daily'} on:click={() => (chartMode = 'daily')}>
        按天
      </button>
      <button class:active={chartMode === 'weekly'} on:click={() => (chartMode = 'weekly')}>
        周平均
      </button>
      <button class:active={chartMode === 'monthly'} on:click={() => (chartMode = 'monthly')}>
        月平均
      </button>
    </div>
  </div>
  {#if chartPoints.length}
    <div class="sleep-chart-wrap">
      <SleepLineChart points={chartPoints} />
    </div>
  {:else}<div class="empty">还没有完整睡眠记录，先记录一次入睡和醒来时间吧。</div>{/if}
</section>

<section class="panel sleep-history-panel">
  <div class="row between">
    <div>
      <h3>历史记录</h3>
      <p class="muted small">按最近记录倒序排列，历史记录不可修改。</p>
    </div>
  </div>
  {#each [...records].reverse() as record (record.id)}
    <div class="sleep-history-row">
      <div class="sleep-history-times">
        <div>
          <span class="muted small">入睡</span>
          <b>{formatDateTime(record.asleepAt)}</b>
        </div>
        <span class="sleep-arrow" aria-hidden="true">→</span>
        <div>
          <span class="muted small">醒来</span>
          <b>{formatDateTime(record.wakeAt)}</b>
        </div>
      </div>
      <div class="sleep-history-meta">
        {#if record.asleepAt && record.wakeAt}<strong>
            {formatDuration(durationMinutes(record))}
          </strong>{:else}
          <strong class="sleep-incomplete">等待醒来记录</strong>
          <button
            class="btn tiny red sleep-delete-button"
            on:click={() => deleteIncompleteRecord(record)}
          >
            删除
          </button>
        {/if}
        {#if record.note}<span class="muted small">{record.note}</span>{/if}
      </div>
    </div>
  {:else}<div class="empty">暂无睡眠记录，先记录入睡时间吧。</div>{/each}
</section>
