import { KEY, defaults, names, dailyWeights, completedRecords } from './workout-model.js'

export function loadData() {
  let data
  try {
    data = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('lianke_v4'))
  } catch {}
  if (!data || !Array.isArray(data.plans) || !Array.isArray(data.records)) data = defaults()
  data.records = completedRecords(data.records)
  data.weights = dailyWeights(data.weights || [])
  data.sounds = { ...defaults().sounds, ...data.sounds }
  data.exerciseNames ??= [
    ...new Set([...names, ...data.plans.flatMap((p) => p.items.map((i) => i.name))]),
  ]
  data.exerciseNamesVersion = 2
  if (!data.plans.some((p) => p.id === data.selected)) data.selected = data.plans[0]?.id ?? null
  return data
}

export function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function flatten(plan) {
  return plan.items.flatMap((item) =>
    Array.from({ length: Number(item.sets) || 1 }, (_, index) => ({
      ...item,
      setIndex: index + 1,
    })),
  )
}
