import { defaults } from './workout-model.js'

const CONFIG_KEY = 'lianke_supabase_config'
const SESSION_KEY = 'lianke_supabase_session'

export function cloudConfig() {
  const fallback = {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  }
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY)) || fallback
  } catch {
    return fallback
  }
}
export function saveCloudConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}
export function cloudSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}
export function signOut() {
  localStorage.removeItem(SESSION_KEY)
}

function saveSession(result, previous = {}) {
  const session = {
    ...previous,
    ...result,
    user: result.user || previous.user,
    expires_at:
      result.expires_at ||
      (result.expires_in
        ? Math.floor(Date.now() / 1000) + Number(result.expires_in)
        : previous.expires_at),
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export async function authenticate(action, email, password) {
  const { url, anonKey } = cloudConfig()
  if (!url || !anonKey) throw Error('请先配置 Supabase')
  const endpoint =
    action === 'signup'
      ? `/auth/v1/signup?redirect_to=${encodeURIComponent(location.origin + location.pathname)}`
      : '/auth/v1/token?grant_type=password'
  const response = await fetch(url + endpoint, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const result = await response.json()
  if (!response.ok)
    throw Error(
      result.msg || result.message || result.error_description || `HTTP ${response.status}`,
    )
  if (result.access_token) saveSession(result)
  return result
}

async function refreshSession(session, url, anonKey) {
  if (!session?.refresh_token) return session
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  })
  const result = await response.json()
  if (!response.ok || !result.access_token) {
    signOut()
    throw Error('登录状态已过期，请重新登录')
  }
  return saveSession(result, session)
}

async function client() {
  const { url, anonKey } = cloudConfig()
  let session = cloudSession()
  if (!url || !anonKey) throw Error('请先配置 Supabase')
  if (!session?.access_token || !session.user?.id) throw Error('请先登录')
  const expiresAt = Number(session.expires_at || 0)
  if (session.refresh_token && (!expiresAt || expiresAt * 1000 - Date.now() < 60_000)) {
    session = await refreshSession(session, url, anonKey)
  }
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
  const api = { endpoint: `${url}/rest/v1`, headers, userId: session.user.id }
  api.refresh = async () => {
    session = await refreshSession(session, url, anonKey)
    api.headers.Authorization = `Bearer ${session.access_token}`
  }
  return api
}

async function request(api, url, options = {}) {
  const send = () =>
    fetch(url, {
      ...options,
      headers: { ...api.headers, ...(options.headers || {}) },
    })
  let response = await send()
  if (response.status === 401 && api.refresh) {
    await api.refresh()
    response = await send()
  }
  return response
}

async function readRows(api, table, query = '') {
  const rows = []
  for (let offset = 0; ; offset += 500) {
    const response = await request(
      api,
      `${api.endpoint}/${table}?${query}${query ? '&' : ''}limit=500&offset=${offset}`,
    )
    if (!response.ok) throw Error(`${table} 读取失败 HTTP ${response.status}`)
    const page = await response.json()
    rows.push(...page)
    if (page.length < 500) return rows
  }
}

async function insertRows(api, table, rows, query = '') {
  if (!rows.length) return []
  const response = await request(api, `${api.endpoint}/${table}${query ? `?${query}` : ''}`, {
    method: 'POST',
    headers: {
      Prefer: query ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
    },
    body: JSON.stringify(rows),
  })
  if (!response.ok) throw Error(`${table} 写入失败 HTTP ${response.status}`)
  return response.json()
}

async function insertOne(api, table, row) {
  const result = await insertRows(api, table, [row])
  return result[0]
}

async function deleteRows(api, table, query) {
  if (!query) return
  const response = await request(api, `${api.endpoint}/${table}?${query}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw Error(`${table} 删除失败 HTTP ${response.status}`)
}

function inQuery(field, ids) {
  return `${field}=in.(${ids.join(',')})`
}

async function readCloudData(api) {
  const user = `user_id=eq.${encodeURIComponent(api.userId)}`
  const [names, plans, records, settings] = await Promise.all([
    readRows(api, 'exercise_names', `${user}&select=name&order=name`),
    readRows(api, 'plans', `${user}&select=id,name,updated_at&order=created_at,id`),
    readRows(
      api,
      'training_records',
      `${user}&select=id,plan_id,plan_name,started_at,finished_at,notes&order=finished_at,id`,
    ),
    readRows(api, 'user_settings', `${user}&select=sounds`),
  ])
  const [items, sets] = await Promise.all([
    plans.length
      ? readRows(
          api,
          'plan_items',
          `${inQuery(
            'plan_id',
            plans.map((plan) => plan.id),
          )}&select=id,plan_id,exercise_name,mode,sets,reps,duration,weight,rest,sort_order&order=sort_order,id`,
        )
      : [],
    records.length
      ? readRows(
          api,
          'training_sets',
          `${inQuery(
            'record_id',
            records.map((record) => record.id),
          )}&select=record_id,exercise_name,set_index,completed,target_reps,target_seconds,planned_weight,actual_reps,actual_weight,actual_seconds&order=set_index`,
        )
      : [],
  ])
  const itemsByPlan = new Map()
  items.forEach((item) => {
    const list = itemsByPlan.get(item.plan_id) || []
    list.push({
      id: item.id,
      name: item.exercise_name,
      mode: item.mode,
      sets: item.sets,
      reps: item.reps,
      duration: item.duration,
      weight: item.weight,
      rest: item.rest,
    })
    itemsByPlan.set(item.plan_id, list)
  })
  const setsByRecord = new Map()
  sets.forEach((item) => {
    const list = setsByRecord.get(item.record_id) || []
    list.push({
      name: item.exercise_name,
      setIndex: item.set_index,
      completed: item.completed,
      targetReps: item.target_reps,
      targetSeconds: item.target_seconds,
      plannedWeight: item.planned_weight,
      actualReps: item.actual_reps,
      actualWeight: item.actual_weight,
      actualSeconds: item.actual_seconds,
    })
    setsByRecord.set(item.record_id, list)
  })
  return {
    exerciseNames: names.map((item) => item.name),
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      items: itemsByPlan.get(plan.id) || [],
    })),
    records: records.map((record) => ({
      id: record.id,
      planId: record.plan_id,
      planName: record.plan_name,
      startedAt: record.started_at,
      finishedAt: record.finished_at,
      notes: record.notes || '',
      results: setsByRecord.get(record.id) || [],
    })),
    sounds: { ...defaults().sounds, ...(settings[0]?.sounds || {}) },
  }
}

async function uploadCloudData(api, data) {
  const user = `user_id=eq.${encodeURIComponent(api.userId)}`
  const oldPlans = await readRows(api, 'plans', `${user}&select=id`)
  const oldRecords = await readRows(api, 'training_records', `${user}&select=id`)
  const oldNames = await readRows(api, 'exercise_names', `${user}&select=id,name`)

  const planIds = new Map()
  for (const plan of data.plans || []) {
    const remote = await insertOne(api, 'plans', {
      user_id: api.userId,
      name: plan.name,
      updated_at: new Date().toISOString(),
    })
    planIds.set(plan.id, remote.id)
    await insertRows(
      api,
      'plan_items',
      (plan.items || []).map((item, index) => ({
        plan_id: remote.id,
        exercise_name: item.name,
        mode: item.mode,
        sets: Number(item.sets) || 1,
        reps: Number(item.reps) || 0,
        duration: Number(item.duration) || 0,
        weight: Number(item.weight) || 0,
        rest: Number(item.rest) || 0,
        sort_order: index,
      })),
    )
  }

  for (const record of data.records || []) {
    const remote = await insertOne(api, 'training_records', {
      user_id: api.userId,
      plan_id: planIds.get(record.planId) || null,
      plan_name: record.planName || '训练记录',
      started_at: record.startedAt || null,
      finished_at: record.finishedAt || new Date().toISOString(),
      notes: record.notes || null,
    })
    await insertRows(
      api,
      'training_sets',
      (record.results || []).map((item) => ({
        record_id: remote.id,
        exercise_name: item.name,
        set_index: Number(item.setIndex) || 0,
        completed: item.completed !== false,
        target_reps: item.targetReps ?? null,
        target_seconds: item.targetSeconds ?? null,
        planned_weight: item.plannedWeight ?? null,
        actual_reps: item.actualReps ?? null,
        actual_weight: item.actualWeight ?? null,
        actual_seconds: item.actualSeconds ?? null,
      })),
    )
  }
  const names = [...new Set((data.exerciseNames || []).filter(Boolean))]
  const sounds = { ...defaults().sounds, ...(data.sounds || {}) }
  await insertRows(
    api,
    'exercise_names',
    names.map((name) => ({ user_id: api.userId, name })),
    'on_conflict=user_id,name',
  )
  await insertRows(api, 'user_settings', [{ user_id: api.userId, sounds }], 'on_conflict=user_id')

  // Only remove the previous snapshot after every new row was written.
  if (oldRecords.length)
    await deleteRows(
      api,
      'training_sets',
      inQuery(
        'record_id',
        oldRecords.map((row) => row.id),
      ),
    )
  if (oldRecords.length)
    await deleteRows(
      api,
      'training_records',
      inQuery(
        'id',
        oldRecords.map((row) => row.id),
      ),
    )
  if (oldPlans.length)
    await deleteRows(
      api,
      'plan_items',
      inQuery(
        'plan_id',
        oldPlans.map((row) => row.id),
      ),
    )
  if (oldPlans.length)
    await deleteRows(
      api,
      'plans',
      inQuery(
        'id',
        oldPlans.map((row) => row.id),
      ),
    )
  const extraNames = oldNames.filter((row) => !names.includes(row.name))
  if (extraNames.length)
    await deleteRows(
      api,
      'exercise_names',
      inQuery(
        'id',
        extraNames.map((row) => row.id),
      ),
    )
  return {
    plans: data.plans?.length || 0,
    records: data.records?.length || 0,
    names: names.length,
    sounds: Object.keys(sounds).length,
  }
}

export async function syncData(direction, localData) {
  const api = await client()
  if (direction === 'upload') {
    return uploadCloudData(api, localData)
  }
  const remote = await readCloudData(api)
  const selected = remote.plans.some((plan) => plan.id === localData.selected)
    ? localData.selected
    : remote.plans[0]?.id || null
  return { ...defaults(), ...remote, selected }
}

export async function syncNames(direction, localNames) {
  const data = { ...defaults(), exerciseNames: localNames }
  if (direction === 'upload') {
    await syncData(direction, data)
    return localNames
  }
  return (await syncData(direction, data)).exerciseNames
}
