export const KEY = 'lianke_v3'
export const completedResults = (results) =>
  (results || []).filter((item) => item.completed === true)
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
    : `${t.getFullYear()}/${String(t.getMonth() + 1).padStart(2, '0')}/${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`
}
export const dayKey = (value) => {
  const t = new Date(value)
  if (Number.isNaN(t.getTime())) return ''
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}
export const dailyWeights = (items = []) => {
  const latestByDay = new Map()
  items.forEach((item) => {
    const key = dayKey(item.recordedAt)
    if (!key || !Number(item.kg)) return
    const current = latestByDay.get(key)
    if (!current || new Date(item.recordedAt) >= new Date(current.recordedAt))
      latestByDay.set(key, item)
  })
  return [...latestByDay.values()].sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt))
}
export const mk = (
  name,
  sets = 3,
  reps = 10,
  weight = 0,
  mode = 'reps',
  duration = 40,
  rest = 60,
) => ({ id: uid(), name, sets, reps, weight, mode, duration, rest })
export const defaults = () => ({
  plans: [],
  records: [],
  weights: [],
  selected: null,
  sounds: { set: 'triple', rest: 'double', finish: 'victory' },
  exerciseNames: [],
})
