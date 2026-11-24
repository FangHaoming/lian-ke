<script>
  import { onMount } from 'svelte'
  import { sleepRecords as normalizeSleepRecords, uid } from '../lib/workout-model.js'
  import { showToast } from '../lib/toast.js'
  import { requestConfirm } from '../lib/confirm-dialog.js'
  import SleepLineChart from '../components/sleep-line-chart.svelte'

  export let data
  let note = ''
  let chartMode = 'daily'
  let weather = { icon: '☁️', label: '正在获取天气', temperature: null }
  let weatherRequest

  onMount(() => {
    loadCurrentWeather()
  })

  $: records = normalizeSleepRecords(data.sleepRecords || [])
  $: completedRecords = records.filter((record) => record.asleepAt && record.wakeAt)
  $: latest = completedRecords[completedRecords.length - 1]
  $: previous = completedRecords[completedRecords.length - 2]
  $: openRecord = [...records].reverse().find((record) => record.asleepAt && !record.wakeAt)
  $: hasCurrentWeather = Number.isFinite(weather.temperature)
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

  function weatherInfo(code, isDay) {
    if (code === 0) return { icon: isDay ? '☀️' : '🌙', label: isDay ? '晴天' : '晴朗夜间' }
    if ([1, 2, 3].includes(code)) return { icon: isDay ? '⛅' : '☁️', label: '多云' }
    if ([45, 48].includes(code)) return { icon: '🌫️', label: '雾' }
    if ([51, 53, 55, 56, 57].includes(code)) return { icon: '🌦️', label: '毛毛雨' }
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: '🌧️', label: '下雨' }
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: '🌨️', label: '下雪' }
    if ([95, 96, 99].includes(code)) return { icon: '⛈️', label: '雷雨' }
    return { icon: '☁️', label: '天气未知' }
  }

  function loadCurrentWeather() {
    if (weatherRequest) return weatherRequest
    if (!navigator.geolocation) {
      weather = { icon: '☁️', label: '暂时无法获取天气', temperature: null }
      return Promise.resolve(false)
    }

    weatherRequest = new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const params = new URLSearchParams({
              latitude: String(coords.latitude),
              longitude: String(coords.longitude),
              current: 'weather_code,is_day,temperature_2m',
              timezone: 'auto',
            })
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
            if (!response.ok) throw new Error('weather request failed')
            const result = await response.json()
            const current = result.current || {}
            const info = weatherInfo(Number(current.weather_code), Number(current.is_day) === 1)
            const temperature = Number(current.temperature_2m)
            weather = {
              icon: info.icon,
              label: info.label,
              temperature: Number.isFinite(temperature) ? temperature : null,
            }
            resolve(true)
          } catch {
            weather = { icon: '☁️', label: '暂时无法获取天气', temperature: null }
            resolve(false)
          }
        },
        () => {
          weather = { icon: '☁️', label: '开启定位后显示天气', temperature: null }
          resolve(false)
        },
        { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 8000 },
      )
    }).finally(() => {
      weatherRequest = null
    })
    return weatherRequest
  }

  function weatherSnapshot() {
    return {
      weather: `${weather.icon} ${weather.label}`,
      temperature: weather.temperature,
    }
  }

  function notifyError(message) {
    showToast(message, { type: 'error' })
  }

  function recordAsleep() {
    const asleep = new Date()
    const currentWeather = weatherSnapshot()
    const targetId = openRecord?.id
    const next = targetId
      ? records.map((record) =>
          record.id === targetId
            ? {
                ...record,
                asleepAt: asleep.toISOString(),
                asleepWeather: currentWeather.weather,
                ...(currentWeather.temperature !== null && {
                  asleepTemperature: currentWeather.temperature,
                }),
                note: note.trim(),
              }
            : record,
        )
      : [
          ...records,
          {
            id: uid(),
            asleepAt: asleep.toISOString(),
            asleepWeather: currentWeather.weather,
            ...(currentWeather.temperature !== null && {
              asleepTemperature: currentWeather.temperature,
            }),
            note: note.trim(),
          },
        ]
    data.sleepRecords = normalizeSleepRecords(next)
    data = data
  }

  function recordWake() {
    const wake = new Date()
    const currentWeather = weatherSnapshot()
    const targetId = openRecord?.id
    const target = records.find((record) => record.id === targetId)
    if (!target?.asleepAt) {
      notifyError('请先记录入睡时间')
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
          ? {
              ...record,
              wakeAt: wake.toISOString(),
              wakeWeather: currentWeather.weather,
              ...(currentWeather.temperature !== null && {
                wakeTemperature: currentWeather.temperature,
              }),
              note: note.trim(),
            }
          : record,
      ),
    )
    data = data
    note = ''
  }

  async function recordCurrentTime() {
    const isWaking = Boolean(openRecord)
    const action = isWaking ? '醒来' : '入睡'
    const { confirmed } = await requestConfirm({
      title: `确认记录${action}？`,
      message: `确认后将记录此刻的${action}时间。`,
      confirmText: '确认',
      cancelText: '取消',
    })
    if (!confirmed) return
    if (!isWaking) await loadCurrentWeather()
    if (isWaking) recordWake()
    else recordAsleep()
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
      note = ''
    })
  }
</script>

<div class="row between sleep-heading">
  <div>
    <h1>睡眠记录</h1>
    <p class="muted">分别记录入睡和醒来时间，自动计算两者之间的睡眠时长。</p>
  </div>
</div>

<section class="sleep-entry-panel">
  <div class="sleep-event-grid">
    <div class="sleep-event-card">
      <div class="row sleep-event-actions">
        <button
          class="btn primary sleep-record-button"
          aria-label={openRecord ? '记录醒来' : '记录入睡'}
          title={hasCurrentWeather ? `${weather.label} · ${weather.temperature}°C` : undefined}
          on:click={recordCurrentTime}
        >
          <span>{openRecord ? '记录醒来' : '记录入睡'}</span>
        </button>
        {#if hasCurrentWeather}
          <div class="sleep-current-weather" aria-label={`当前天气：${weather.label}，${weather.temperature}°C`}>
            <span class="sleep-weather-icon" aria-hidden="true">{weather.icon}</span>
            <span class="sleep-weather-temperature">{weather.temperature}°C</span>
            <span class="muted small">{weather.label}</span>
          </div>
        {/if}
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
        {#if record.asleepWeather}<span class="muted small">
            入睡 {record.asleepWeather}{#if record.asleepTemperature !== undefined}
              · {record.asleepTemperature}°C{/if}
          </span>{/if}
        {#if record.wakeWeather}<span class="muted small">
            醒来 {record.wakeWeather}{#if record.wakeTemperature !== undefined}
              · {record.wakeTemperature}°C{/if}
          </span>{/if}
      </div>
    </div>
  {:else}<div class="empty">暂无睡眠记录，先记录入睡时间吧。</div>{/each}
</section>
