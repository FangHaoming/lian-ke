import { defaults, dailyWeights, dayKey, completedRecords } from './workout-model.js'

const CONFIG_KEY = 'lianke_supabase_config'
const SESSION_KEY = 'lianke_supabase_session'
const SYNC_SELECTION_KEY = 'lianke_sync_selection'
const defaultSyncSelection = {
  exerciseNames: true,
  plans: true,
  records: true,
  weights: true,
  sounds: true,
}

export function loadSyncSelection() {
  try {
    return { ...defaultSyncSelection, ...JSON.parse(localStorage.getItem(SYNC_SELECTION_KEY)) }
  } catch {
    return { ...defaultSyncSelection }
  }
}

export function saveSyncSelection(selection) {
  localStorage.setItem(
    SYNC_SELECTION_KEY,
    JSON.stringify({ ...defaultSyncSelection, ...selection }),
  )
}

export function cloudConfig() {
  const fallback = {
    url: import.meta.env?.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
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

async function updateRow(api, table, id, changes) {
  const response = await request(api, `${api.endpoint}/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
  if (!response.ok) throw Error(`${table} 更新失败 HTTP ${response.status}`)
}

function inQuery(field, ids) {
  return `${field}=in.(${ids.join(',')})`
}

function sameTime(left, right) {
  return left === right || (left && right && Date.parse(left) === Date.parse(right))
}

async function readCloudData(api) {
  const user = `user_id=eq.${encodeURIComponent(api.userId)}`
  const [names, plans, records, weights, settings] = await Promise.all([
    readRows(api, 'exercise_names', `${user}&select=name&order=name`),
    readRows(api, 'plans', `${user}&select=id,name,updated_at&order=created_at,id`),
    readRows(
      api,
      'training_records',
      `${user}&select=id,plan_id,plan_name,started_at,finished_at,notes&order=finished_at,id`,
    ),
    readRows(
      api,
      'body_weights',
      `${user}&select=id,recorded_at,recorded_on,kg,note&order=recorded_at,id`,
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
          )}&select=record_id,exercise_name,set_index,sort_order,mode,completed,target_reps,target_seconds,planned_weight,planned_rest,actual_reps,actual_weight,actual_seconds&order=sort_order.nullslast,set_index,id`,
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
      sortOrder: item.sort_order,
      mode: item.mode,
      completed: item.completed,
      targetReps: item.target_reps,
      targetSeconds: item.target_seconds,
      plannedWeight: item.planned_weight,
      plannedRest: item.planned_rest,
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
    records: completedRecords(
      records.map((record) => ({
        id: record.id,
        planId: record.plan_id,
        planName: record.plan_name,
        startedAt: record.started_at,
        finishedAt: record.finished_at,
        notes: record.notes || '',
        results: setsByRecord.get(record.id) || [],
      })),
    ),
    weights: dailyWeights(
      weights.map((item) => ({
        id: item.id,
        recordedAt: item.recorded_at,
        kg: Number(item.kg),
        note: item.note || '',
      })),
    ),
    sounds: { ...defaults().sounds, ...(settings[0]?.sounds || {}) },
  }
}

async function uploadCloudData(api, data, selection) {
  const user = `user_id=eq.${encodeURIComponent(api.userId)}`
  const [oldPlans, oldRecords, oldWeights, oldNames] = await Promise.all([
    readRows(api, 'plans', `${user}&select=id,name`),
    readRows(
      api,
      'training_records',
      `${user}&select=id,plan_id,plan_name,started_at,finished_at,notes`,
    ),
    readRows(api, 'body_weights', `${user}&select=id,recorded_at,recorded_on,kg,note`),
    readRows(api, 'exercise_names', `${user}&select=id,name`),
  ])
  const [oldItems, oldSets] = await Promise.all([
    oldPlans.length
      ? readRows(
          api,
          'plan_items',
          `${inQuery(
            'plan_id',
            oldPlans.map((row) => row.id),
          )}&select=plan_id,exercise_name,mode,sets,reps,duration,weight,rest,sort_order`,
        )
      : [],
    oldRecords.length
      ? readRows(
          api,
          'training_sets',
          `${inQuery(
            'record_id',
            oldRecords.map((row) => row.id),
          )}&select=record_id,exercise_name,set_index,sort_order,mode,completed,target_reps,target_seconds,planned_weight,planned_rest,actual_reps,actual_weight,actual_seconds&order=sort_order.nullslast,set_index,id`,
        )
      : [],
  ])
  const weights = dailyWeights(data.weights || [])
  const planIds = new Map()
  const usedPlanIds = new Set()
  for (const plan of data.plans || []) {
    const existing =
      oldPlans.find((row) => row.id === plan.id) || oldPlans.find((row) => row.name === plan.name)
    if (existing) planIds.set(plan.id, existing.id)
  }
  const planItemKey = (item) =>
    JSON.stringify([
      item.exercise_name,
      item.mode,
      Number(item.sets),
      Number(item.reps),
      Number(item.duration),
      Number(item.weight),
      Number(item.rest),
      Number(item.sort_order),
    ])

  if (selection.plans)
    for (const plan of data.plans || []) {
      const existing =
        oldPlans.find((row) => !usedPlanIds.has(row.id) && row.id === plan.id) ||
        oldPlans.find((row) => !usedPlanIds.has(row.id) && row.name === plan.name)
      const remoteId =
        existing?.id ||
        (
          await insertOne(api, 'plans', {
            user_id: api.userId,
            name: plan.name,
            updated_at: new Date().toISOString(),
          })
        ).id
      usedPlanIds.add(remoteId)
      planIds.set(plan.id, remoteId)
      const items = (plan.items || []).map((item, index) => ({
        plan_id: remoteId,
        exercise_name: item.name,
        mode: item.mode,
        sets: Number(item.sets) || 1,
        reps: Number(item.reps) || 0,
        duration: Number(item.duration) || 0,
        weight: Number(item.weight) || 0,
        rest: Number(item.rest) || 0,
        sort_order: index,
      }))
      const previousItems = oldItems
        .filter((item) => item.plan_id === remoteId)
        .sort((a, b) => a.sort_order - b.sort_order)
      if (
        existing?.name !== plan.name ||
        JSON.stringify(items.map(planItemKey)) !== JSON.stringify(previousItems.map(planItemKey))
      ) {
        if (existing)
          await updateRow(api, 'plans', remoteId, {
            name: plan.name,
            updated_at: new Date().toISOString(),
          })
        if (previousItems.length) await deleteRows(api, 'plan_items', `plan_id=eq.${remoteId}`)
        await insertRows(api, 'plan_items', items)
      }
    }

  const usedRecordIds = new Set()
  let changedRecords = 0
  const setKey = (item) =>
    JSON.stringify([
      item.exercise_name,
      Number(item.set_index),
      item.sort_order == null ? null : Number(item.sort_order),
      item.mode,
      item.completed,
      item.target_reps == null ? null : Number(item.target_reps),
      item.target_seconds == null ? null : Number(item.target_seconds),
      item.planned_weight == null ? null : Number(item.planned_weight),
      item.planned_rest == null ? null : Number(item.planned_rest),
      item.actual_reps == null ? null : Number(item.actual_reps),
      item.actual_weight == null ? null : Number(item.actual_weight),
      item.actual_seconds == null ? null : Number(item.actual_seconds),
    ])
  const setKeys = (items) => items.map(setKey).join('\n')
  if (selection.records)
    for (const record of completedRecords(data.records)) {
      const values = {
        user_id: api.userId,
        plan_id: planIds.get(record.planId) || null,
        plan_name: record.planName || '训练记录',
        started_at: record.startedAt || null,
        finished_at: record.finishedAt || new Date().toISOString(),
        notes: record.notes || null,
      }
      const sets = record.results.map((item, index) => ({
        exercise_name: item.name,
        set_index: Number(item.setIndex) || 0,
        sort_order:
          item.sortOrder === null
            ? null
            : Number.isInteger(item.sortOrder)
              ? item.sortOrder
              : index,
        mode: item.mode || null,
        completed: true,
        target_reps: item.targetReps ?? null,
        target_seconds: item.targetSeconds ?? null,
        planned_weight: item.plannedWeight ?? null,
        planned_rest: item.plannedRest ?? null,
        actual_reps: item.actualReps ?? null,
        actual_weight: item.actualWeight ?? null,
        actual_seconds: item.actualSeconds ?? null,
      }))
      const existing =
        oldRecords.find((row) => !usedRecordIds.has(row.id) && row.id === record.id) ||
        oldRecords.find(
          (row) =>
            !usedRecordIds.has(row.id) &&
            sameTime(row.finished_at, values.finished_at) &&
            sameTime(row.started_at, values.started_at),
        )
      const previousSets = existing ? oldSets.filter((item) => item.record_id === existing.id) : []
      const setsChanged = setKeys(sets) !== setKeys(previousSets)
      const headerChanged =
        !existing ||
        ['plan_id', 'plan_name', 'notes'].some((key) => existing[key] !== values[key]) ||
        !sameTime(existing.started_at, values.started_at) ||
        !sameTime(existing.finished_at, values.finished_at)
      if (existing) {
        usedRecordIds.add(existing.id)
        if (headerChanged) await updateRow(api, 'training_records', existing.id, values)
        if (setsChanged) {
          if (previousSets.length)
            await deleteRows(api, 'training_sets', `record_id=eq.${existing.id}`)
          await insertRows(
            api,
            'training_sets',
            sets.map((item) => ({ ...item, record_id: existing.id })),
          )
        }
      } else {
        const remote = await insertOne(api, 'training_records', values)
        await insertRows(
          api,
          'training_sets',
          sets.map((item) => ({ ...item, record_id: remote.id })),
        )
      }
      if (headerChanged || setsChanged) changedRecords++
    }

  const weightByDay = new Map(oldWeights.map((item) => [item.recorded_on, item]))
  const weightRows = weights.map((item) => ({
    user_id: api.userId,
    recorded_at: item.recordedAt,
    recorded_on: dayKey(item.recordedAt),
    kg: Number(item.kg),
    note: item.note || null,
  }))
  const changedWeights = weightRows.filter((item) => {
    const previous = weightByDay.get(item.recorded_on)
    return (
      !previous ||
      !sameTime(previous.recorded_at, item.recorded_at) ||
      Number(previous.kg) !== item.kg ||
      (previous.note || null) !== item.note
    )
  })
  if (selection.weights)
    await insertRows(api, 'body_weights', changedWeights, 'on_conflict=user_id,recorded_on')

  const names = [...new Set((data.exerciseNames || []).filter(Boolean))]
  const sounds = { ...defaults().sounds, ...(data.sounds || {}) }
  if (selection.exerciseNames)
    await insertRows(
      api,
      'exercise_names',
      names.map((name) => ({ user_id: api.userId, name })),
      'on_conflict=user_id,name',
    )
  if (selection.sounds)
    await insertRows(api, 'user_settings', [{ user_id: api.userId, sounds }], 'on_conflict=user_id')

  const localDays = new Set(weightRows.map((item) => item.recorded_on))
  const staleWeightIds = oldWeights
    .filter((row) => !localDays.has(row.recorded_on))
    .map((row) => row.id)
  if (selection.weights && staleWeightIds.length)
    await deleteRows(api, 'body_weights', inQuery('id', staleWeightIds))
  const stalePlanIds = oldPlans.filter((row) => !usedPlanIds.has(row.id)).map((row) => row.id)
  if (selection.plans && stalePlanIds.length)
    await deleteRows(api, 'plans', inQuery('id', stalePlanIds))
  const extraNames = oldNames.filter((row) => !names.includes(row.name))
  if (selection.exerciseNames && extraNames.length)
    await deleteRows(
      api,
      'exercise_names',
      inQuery(
        'id',
        extraNames.map((row) => row.id),
      ),
    )

  return {
    plans: selection.plans ? data.plans?.length || 0 : 0,
    records: selection.records ? changedRecords : 0,
    weights: selection.weights ? changedWeights.length : 0,
    deletedWeights: selection.weights ? staleWeightIds.length : 0,
    names: selection.exerciseNames ? names.length : 0,
    sounds: selection.sounds ? Object.keys(sounds).length : 0,
  }
}

export async function syncData(direction, localData, selection = defaultSyncSelection) {
  selection = { ...defaultSyncSelection, ...selection }
  const api = await client()
  if (direction === 'upload') {
    return uploadCloudData(api, localData, selection)
  }
  const remote = await readCloudData(api)
  const selected = selection.plans
    ? remote.plans.some((plan) => plan.id === localData.selected)
      ? localData.selected
      : remote.plans[0]?.id || null
    : localData.selected
  return {
    ...localData,
    ...(selection.exerciseNames && { exerciseNames: remote.exerciseNames }),
    ...(selection.plans && { plans: remote.plans }),
    ...(selection.records && { records: remote.records }),
    ...(selection.weights && { weights: remote.weights }),
    ...(selection.sounds && { sounds: remote.sounds }),
    selected,
  }
}

export async function syncNames(direction, localNames) {
  const data = { ...defaults(), exerciseNames: localNames }
  const namesOnly = {
    exerciseNames: true,
    plans: false,
    records: false,
    weights: false,
    sounds: false,
  }
  if (direction === 'upload') {
    await syncData(direction, data, namesOnly)
    return localNames
  }
  return (await syncData(direction, data, namesOnly)).exerciseNames
}
