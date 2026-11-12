<script>
  import { uid, dailyWeights, dayKey } from '../lib/workout-model.js'
  import WeightLineChart from '../components/weight-line-chart.svelte'

  export let data
  let kg = ''
  let note = ''
  let error = ''

  $: weights = dailyWeights(data.weights || [])
  $: latest = weights[weights.length - 1]
  $: previous = weights[weights.length - 2]
  $: change = latest && previous ? Number(latest.kg) - Number(previous.kg) : null
  $: chartWeights = weights

  function formatRecordedAt(value) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '时间未知'
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${weekday} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  function addWeight() {
    const value = Number(kg)
    if (!Number.isFinite(value) || value < 0.01 || value > 999.99) {
      error = '请输入 0.01～999.99 kg 的体重'
      return
    }
    const recordedIso = new Date().toISOString()
    const sameDay = (data.weights || []).find(
      (item) => dayKey(item.recordedAt) === dayKey(recordedIso),
    )
    if (sameDay && new Date(sameDay.recordedAt) > new Date(recordedIso)) {
      error = '当天已经有更晚的记录，本次不会覆盖它'
      return
    }
    data.weights = [
      ...(data.weights || []).filter((item) => dayKey(item.recordedAt) !== dayKey(recordedIso)),
      { id: uid(), recordedAt: recordedIso, kg: Math.round(value * 100) / 100, note: note.trim() },
    ]
    data = data
    kg = ''
    note = ''
    error = ''
  }
</script>

<div class="row between weight-heading">
  <div>
    <h1>体重记录</h1>
    <p class="muted">记录每天的体重变化，单位统一为 kg。</p>
  </div>
  <span class="pill">{weights.length} 条记录</span>
</div>

<div class="weight-summary grid">
  <div class="metric">
    <span class="muted">当前体重</span>
    <strong>{latest ? `${Number(latest.kg).toFixed(2)} kg` : '—'}</strong>
  </div>
  <div class="metric">
    <span class="muted">最近变化</span>
    <strong
      class:accent={change !== null && change <= 0}
      class:orange={change !== null && change > 0}
    >
      {change === null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(2)} kg`}
    </strong>
  </div>
  <div class="metric">
    <span class="muted">记录天数</span>
    <strong>{new Set(weights.map((item) => item.recordedAt.slice(0, 10))).size}</strong>
  </div>
</div>

<section class="panel weight-entry-panel">
  <div>
    <h3>新增记录</h3>
    <p class="muted small">保存后会进入本地备份，也可在“设置/备份”中同步到远端。</p>
  </div>
  <div class="weight-entry-grid">
    <label class="field">
      体重（kg）
      <input
        type="number"
        min="0.01"
        max="999.99"
        step="0.01"
        placeholder="例如 68.55"
        bind:value={kg}
        on:keydown={(event) => event.key === 'Enter' && addWeight()}
      />
    </label>
    <label class="field">
      备注（可选）
      <input
        type="text"
        maxlength="60"
        placeholder="晨起 / 训练后"
        bind:value={note}
        on:keydown={(event) => event.key === 'Enter' && addWeight()}
      />
    </label>
    <button class="btn primary weight-add-button" on:click={addWeight}>＋ 添加体重</button>
  </div>
  {#if error}<p class="cloud-status error">{error}</p>{/if}
</section>

<section class="panel">
  <div class="row between">
    <div>
      <h3>体重趋势</h3>
      <p class="muted small">按天统计 · 共 {weights.length} 天，可拖动范围查看</p>
    </div>
    {#if latest}<span class="pill">最新 {Number(latest.kg).toFixed(2)} kg</span>{/if}
  </div>
  {#if chartWeights.length}
    <div class="weight-chart-wrap">
      <WeightLineChart points={chartWeights} />
    </div>
  {:else}<div class="empty">还没有体重记录，先添加今天的体重吧。</div>{/if}
</section>

<section class="panel weight-history-panel">
  <h3>历史记录</h3>
  {#each [...weights].reverse() as item (item.id)}
    <div class="setline weight-history-row">
      <div>
        <b>{Number(item.kg).toFixed(2)} kg</b>
        <div class="muted small">
          {formatRecordedAt(item.recordedAt)}{item.note ? ` · ${item.note}` : ''}
        </div>
      </div>
    </div>
  {:else}<div class="empty">暂无记录</div>{/each}
</section>
