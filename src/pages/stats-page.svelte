<script>
  import { date, fmt, num } from '../lib/workout-model.js'
  export let data
  $: records = data.records
  $: sets = records.flatMap((record) => record.results.filter((result) => result.completed))
  $: days = new Set(
    records.map((record) =>
      new Date(record.startedAt || record.finishedAt).toLocaleDateString('en-CA'),
    ),
  ).size
  $: names = [...new Set(sets.map((result) => result.name))].sort()
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
<div class="two" style="margin-top:15px">
  {#each [{ title: '近 10 次训练 · 完成组数', value: (r) => r.results.filter((s) => s.completed).length }, { title: '近 10 次训练 · 实际训练分钟', value: (r) => r.results.reduce((sum, s) => sum + (s.completed ? num(s.actualSeconds) : 0), 0) / 60 }] as chart}<section
      class="panel"
    >
      <h3>{chart.title}</h3>
      {#if records.length}<div class="row" style="align-items:end;height:180px">
          {#each records.slice(-10) as record}<div
              style={`flex:1;height:${Math.max(2, (chart.value(record) / Math.max(1, ...records.slice(-10).map(chart.value))) * 150)}px;background:#b7f36a;border-radius:4px`}
              title={String(chart.value(record))}
            ></div>{/each}
        </div>{:else}<div class="empty">暂无数据</div>{/if}
    </section>{/each}
</div>
<section class="panel">
  <h3>动作统计</h3>
  {#if names.length}<div class="grid action-stat-list">
      {#each names as name}{@const items = sets.filter((item) => item.name === name)}
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
<section class="panel">
  <h3>历史训练记录</h3>
  <div class="history-record-list">
    {#each [...records].reverse() as record (record.id)}<div class="history-record">
      <div class="setline">
        <div>
          <b>{record.planName}</b>
          <div class="muted small">
            {date(record.finishedAt)} · {record.results.filter((item) => item.completed).length} 组
          </div>
          <div class="muted small">{record.notes || ''}</div>
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
