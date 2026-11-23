import { challengeDefaults } from './challenge-model.js'

export const KEY = 'lianke_v3'
export const completedResults = (results) =>
  (results || []).filter((item) => item.completed === true)

// Active sessions are persisted while the timer is running. Keep recovery
// bounded even if an older client wrote duplicate results while finishing a
// set, otherwise parsing/rendering the session can lock up the app on reload.
export const normalizeActiveSession = (value) => {
  if (
    !value ||
    !Array.isArray(value.queue) ||
    !value.queue.length ||
    !Number.isInteger(value.index) ||
    value.index < 0 ||
    value.index >= value.queue.length ||
    !['prep', 'work', 'rest'].includes(value.phase)
  )
    return null

  const resultsByOrder = new Map()
  for (const result of Array.isArray(value.results) ? value.results : []) {
    const order = Number(result?.sortOrder)
    if (Number.isInteger(order) && order >= 0 && order < value.queue.length)
      resultsByOrder.set(order, result)
  }
  const results = [...resultsByOrder.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, result]) => result)
  const nextIndex = value.queue.findIndex((_, index) => !resultsByOrder.has(index))
  if (nextIndex < 0) return null

  return {
    ...value,
    index: nextIndex,
    phase: nextIndex === value.index ? value.phase : 'prep',
    paused: value.paused === true,
    remaining: Number.isFinite(Number(value.remaining)) ? Math.max(0, Number(value.remaining)) : 3,
    elapsed: Number.isFinite(Number(value.elapsed)) ? Math.max(0, Number(value.elapsed)) : 0,
    last: Date.now(),
    results,
  }
}
export const completedRecords = (records) =>
  (records || [])
    .map((record) => ({ ...record, results: completedResults(record.results) }))
    .filter((record) => record.results.length > 0)
export const names = ['引体向上', '俯卧撑', '深蹲', '保加利亚蹲', '上推哑铃', '健腹轮']
export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
export const escape = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
export const num = (v, min = 0, max = 9999) => Math.max(min, Math.min(max, Number(v) || 0))
export const fmt = (s) => {
  s = Math.max(0, Math.floor(s))
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0'),
    ss = String(s % 60).padStart(2, '0')
  return s >= 3600
    ? `${String(Math.floor(s / 3600)).padStart(2, '0')}:${mm}:${ss}`
    : `${String(Math.floor(s / 60)).padStart(2, '0')}:${ss}`
}
export const date = (d) => {
  const t = new Date(d)
  return Number.isNaN(t.getTime())
    ? '时间未知'
    : `${t.getFullYear()}/${String(t.getMonth() + 1).padStart(2, '0')}/${String(t.getDate()).padStart(2, '0')} ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][t.getDay()]} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
}
export const dayKey = (value) => {
  const t = new Date(value)
  if (Number.isNaN(t.getTime())) return ''
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}
export const dailyWeights = (items = []) => {
  const weightsByDay = new Map()
  items.forEach((item) => {
    const key = dayKey(item.recordedAt)
    const kg = Number(item.kg)
    if (!key || !Number.isFinite(kg) || kg <= 0) return
    const sampleCount =
      Number.isInteger(item.sampleCount) && item.sampleCount > 0 ? item.sampleCount : 1
    const storedTotal = Number(item.kgTotal)
    const kgTotal = Number.isFinite(storedTotal) && storedTotal > 0 ? storedTotal : kg * sampleCount
    const current = weightsByDay.get(key) || { latest: item, sampleCount: 0, kgTotal: 0 }
    if (new Date(item.recordedAt) >= new Date(current.latest.recordedAt)) current.latest = item
    current.sampleCount += sampleCount
    current.kgTotal += kgTotal
    weightsByDay.set(key, current)
  })
  return [...weightsByDay.values()]
    .map(({ latest, sampleCount, kgTotal }) => ({
      ...latest,
      kg: kgTotal / sampleCount,
      sampleCount,
      kgTotal,
    }))
    .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt))
}
export const sleepRecords = (items = []) =>
  (items || [])
    .filter(
      (item) =>
        item &&
        ((typeof item.asleepAt === 'string' && Number.isFinite(Date.parse(item.asleepAt))) ||
          (typeof item.wakeAt === 'string' && Number.isFinite(Date.parse(item.wakeAt)))),
    )
    .map((item) => {
      const asleepAt = Number.isFinite(Date.parse(item.asleepAt)) ? item.asleepAt : ''
      const wakeAt = Number.isFinite(Date.parse(item.wakeAt)) ? item.wakeAt : ''
      // `Number(null)` is 0, but a missing temperature must stay missing so
      // sync baselines do not oscillate between null and 0 on every compare.
      const asleepTemperature =
        item.asleepTemperature === null ||
        item.asleepTemperature === undefined ||
        item.asleepTemperature === ''
          ? NaN
          : Number(item.asleepTemperature)
      const wakeTemperature =
        item.wakeTemperature === null ||
        item.wakeTemperature === undefined ||
        item.wakeTemperature === ''
          ? NaN
          : Number(item.wakeTemperature)
      return {
        id: item.id || uid(),
        ...(asleepAt && (!wakeAt || new Date(wakeAt) > new Date(asleepAt)) && { asleepAt }),
        ...(wakeAt && (!asleepAt || new Date(wakeAt) > new Date(asleepAt)) && { wakeAt }),
        note: String(item.note || ''),
        ...(item.asleepWeather && { asleepWeather: String(item.asleepWeather) }),
        ...(Number.isFinite(asleepTemperature) && { asleepTemperature }),
        ...(item.wakeWeather && { wakeWeather: String(item.wakeWeather) }),
        ...(Number.isFinite(wakeTemperature) && { wakeTemperature }),
      }
    })
    .filter((item) => item.asleepAt || item.wakeAt)
    .sort((a, b) => new Date(a.asleepAt || a.wakeAt) - new Date(b.asleepAt || b.wakeAt))
export const mk = (
  name,
  sets = 3,
  reps = 10,
  weight = 0,
  mode = 'reps',
  duration = 40,
  rest = 60,
) => ({ id: uid(), name, sets, reps, weight, mode, duration, rest, timerMode: 'down' })
export const defaults = () => ({
  plans: [],
  records: [],
  weights: [],
  sleepRecords: [],
  selected: null,
  sounds: { set: 'triple', rest: 'double', finish: 'victory', vibrate: false },
  exerciseNames: [],
  challenges: challengeDefaults(),
})
