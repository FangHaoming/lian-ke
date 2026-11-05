<script>
  import { uid, dailyWeights, dayKey } from '../lib/workout-model.js'

  export let data
  let kg = ''
  const localDateTimeValue = () => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    return new Date(now.getTime() - offset).toISOString().slice(0, 16)
  }
  let recordedAt = localDateTimeValue()
  let note = ''
  let error = ''

  $: weights = dailyWeights(data.weights || [])
  $: latest = weights[weights.length - 1]
  $: previous = weights[weights.length - 2]
  $: change = latest && previous ? Number(latest.kg) - Number(previous.kg) : null
  $: chartWeights = weights.slice(-30)
  $: minKg = chartWeights.length ? Math.floor(Math.min(...chartWeights.map((item) => Number(item.kg))) - 1) : 0
  $: maxKg = chartWeights.length ? Math.ceil(Math.max(...chartWeights.map((item) => Number(item.kg))) + 1) : 100
  $: range = Math.max(1, maxKg - minKg)
  $: chartPoints = chartWeights.map((item, index) => {
    const x = chartWeights.length === 1 ? 50 : 8 + (index / (chartWeights.length - 1)) * 84
    const y = 88 - ((Number(item.kg) - minKg) / range) * 76
    return { ...item, x, y }
  })
  $: chartTicks = chartPoints.length
    ? [...new Set([0, Math.floor((chartPoints.length - 1) / 2), chartPoints.length - 1])].map((index) => chartPoints[index])
    : []

  function formatDate(value) {
    return new Date(value).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  function addWeight() {
    const value = Number(kg)
    if (!Number.isFinite(value) || value < 0.01 || value > 999.99) {
      error = '请输入 0.01～999.99 kg 的体重'
      return
    }
    const recordedIso = new Date(recordedAt).toISOString()
    const sameDay = (data.weights || []).find((item) => dayKey(item.recordedAt) === dayKey(recordedIso))
    if (sameDay && new Date(sameDay.recordedAt) > new Date(recordedIso)) {
      error = '当天已经有更晚的记录，本次不会覆盖它'
      return
    }
    data.weights = [...(data.weights || []).filter((item) => dayKey(item.recordedAt) !== dayKey(recordedIso)), { id: uid(), recordedAt: recordedIso, kg: Math.round(value * 100) / 100, note: note.trim() }]
    data = data
    kg = ''
    note = ''
    recordedAt = localDateTimeValue()
    error = ''
  }

</script>

<div class="row between weight-heading">
  <div><h1>体重记录</h1><p class="muted">记录每天的体重变化，单位统一为 kg。</p></div>
  <span class="pill">{weights.length} 条记录</span>
</div>

<div class="weight-summary grid">
  <div class="metric"><span class="muted">当前体重</span><strong>{latest ? `${Number(latest.kg).toFixed(2)} kg` : '—'}</strong></div>
  <div class="metric"><span class="muted">最近变化</span><strong class:accent={change !== null && change <= 0} class:orange={change !== null && change > 0}>{change === null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(2)} kg`}</strong></div>
  <div class="metric"><span class="muted">记录天数</span><strong>{new Set(weights.map((item) => item.recordedAt.slice(0, 10))).size}</strong></div>
</div>

<section class="panel weight-entry-panel">
  <div><h3>新增记录</h3><p class="muted small">保存后会进入本地备份，也可在“设置/备份”中同步到远端。</p></div>
  <div class="weight-entry-grid">
    <label class="field">体重（kg）<input type="number" min="0.01" max="999.99" step="0.01" placeholder="例如 68.55" bind:value={kg} on:keydown={(event) => event.key === 'Enter' && addWeight()} /></label>
    <label class="field">记录时间<input type="datetime-local" bind:value={recordedAt} /></label>
    <label class="field">备注（可选）<input type="text" maxlength="60" placeholder="晨起 / 训练后" bind:value={note} on:keydown={(event) => event.key === 'Enter' && addWeight()} /></label>
    <button class="btn primary weight-add-button" on:click={addWeight}>＋ 添加体重</button>
  </div>
  {#if error}<p class="cloud-status error">{error}</p>{/if}
</section>

<section class="panel">
  <div class="row between"><div><h3>体重趋势</h3><p class="muted small">按天统计 · 最近 {Math.min(weights.length, 30)} 天</p></div>{#if latest}<span class="pill">最新 {Number(latest.kg).toFixed(2)} kg</span>{/if}</div>
  {#if chartPoints.length}
    <div class="weight-chart-wrap">
      <div class="weight-chart-canvas">
      <svg class="weight-chart" viewBox="0 0 100 100" role="img" aria-label="体重折线图" preserveAspectRatio="none">
        <line x1="8" x2="92" y1="88" y2="88" stroke="#334752" stroke-width=".5" />
        <line x1="8" x2="92" y1="50" y2="50" stroke="#273942" stroke-width=".4" stroke-dasharray="1.5 2" />
        <line x1="8" x2="92" y1="12" y2="12" stroke="#273942" stroke-width=".4" stroke-dasharray="1.5 2" />
        {#if chartPoints.length > 1}
          <polygon points={`${chartPoints[0].x},88 ${chartPoints.map((point) => `${point.x},${point.y}`).join(' ')} ${chartPoints[chartPoints.length - 1].x},88`} fill="url(#weight-area)" />
          <polyline points={chartPoints.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#b7f36a" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" />
        {/if}
        <defs><linearGradient id="weight-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b7f36a" stop-opacity=".22" /><stop offset="100%" stop-color="#b7f36a" stop-opacity="0" /></linearGradient></defs>
      </svg>
      {#each chartPoints as point}
        <span class="weight-chart-point" style={`left:${point.x}%;top:${point.y}%`} title={`${formatDate(point.recordedAt)} · ${Number(point.kg).toFixed(2)} kg`}></span>
      {/each}
      </div>
      <div class="chart-y-labels"><span>{maxKg.toFixed(2)} kg</span><span>{((maxKg + minKg) / 2).toFixed(2)} kg</span><span>{minKg.toFixed(2)} kg</span></div>
      <div class="chart-x-labels">{#each chartTicks as tick}<span style={`left:${tick.x}%`}>{formatDate(tick.recordedAt)}</span>{/each}</div>
    </div>
  {:else}<div class="empty">还没有体重记录，先添加今天的体重吧。</div>{/if}
</section>

<section class="panel weight-history-panel">
  <h3>历史记录</h3>
  {#each [...weights].reverse() as item (item.id)}
    <div class="setline weight-history-row"><div><b>{Number(item.kg).toFixed(2)} kg</b><div class="muted small">{new Date(item.recordedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}{item.note ? ` · ${item.note}` : ''}</div></div></div>
  {:else}<div class="empty">暂无记录</div>{/each}
</section>
