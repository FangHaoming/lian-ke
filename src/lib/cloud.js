import {
  defaults,
  dailyWeights,
  dayKey,
  sleepRecords as normalizeSleepRecords,
  completedRecords,
} from './workout-model.js'
import { isChallengeExercise, normalizeChallenges } from './challenge-model.js'
import { appURL } from './config.js'

const CONFIG_KEY = 'lianke_supabase_config'
const SESSION_KEY = 'lianke_supabase_session'
const SYNC_SELECTION_KEY = 'lianke_sync_selection'
const SYNC_BASELINE_KEY = 'lianke_sync_baseline'
const AUTH_REDIRECT_URL = import.meta.env?.VITE_AUTH_REDIRECT_URL || appURL('auth/callback')
const defaultSyncSelection = {
  exerciseNames: true,
  plans: true,
  records: true,
  weights: true,
  sleep: true,
  sounds: true,
  challenges: true,
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

function syncSnapshot(data) {
  return {
    exerciseNames: [
      ...new Set((data.exerciseNames || []).filter((name) => name && !isChallengeExercise(name))),
    ].sort(),
    plans: data.plans || [],
    records: completedRecords(data.records || []),
    weights: dailyWeights(data.weights || []),
    sleepRecords: canonicalSleepRecords(data.sleepRecords),
    sounds: data.sounds || {},
    challenges: normalizeChallenges(data.challenges),
  }
}

function canonicalTime(value) {
  const time = Date.parse(value || '')
  return Number.isFinite(time) ? new Date(time).toISOString() : ''
}

function canonicalSleepRecords(items) {
  return normalizeSleepRecords(items || [])
    .filter((record) => record.asleepAt && record.wakeAt)
    .map((record) => ({
      id: record.id,
      asleepAt: canonicalTime(record.asleepAt),
      wakeAt: canonicalTime(record.wakeAt),
      note: record.note || '',
    }))
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    )
  return value
}

function stableJson(value) {
  return JSON.stringify(stableValue(value))
}

function changedItemCount(currentItems, baselineItems, keyOf) {
  const current = new Map(currentItems.map((item) => [keyOf(item), item]))
  const baseline = new Map(baselineItems.map((item) => [keyOf(item), item]))
  const keys = new Set([...current.keys(), ...baseline.keys()])
  return [...keys].filter((key) => stableJson(current.get(key)) !== stableJson(baseline.get(key)))
    .length
}

export function loadSyncBaseline() {
  try {
    const value = JSON.parse(localStorage.getItem(SYNC_BASELINE_KEY) || 'null')
    if (value?.version !== 1 || !value.data) return null
    return {
      ...value.data,
      sleepRecords: canonicalSleepRecords(value.data.sleepRecords),
    }
  } catch {
    return null
  }
}

export function saveSyncBaseline(data, selection = defaultSyncSelection) {
  const current = syncSnapshot(data)
  const previous = loadSyncBaseline() || {}
  const next = { ...previous }
  for (const key of Object.keys(defaultSyncSelection)) {
    const snapshotKey = key === 'sleep' ? 'sleepRecords' : key
    if (selection[key]) next[snapshotKey] = current[snapshotKey]
  }
  localStorage.setItem(SYNC_BASELINE_KEY, JSON.stringify({ version: 1, data: next }))
}

export function pendingSyncCounts(data, baseline = loadSyncBaseline()) {
  const current = syncSnapshot(data)
  if (!baseline)
    return {
      exerciseNames: current.exerciseNames.length,
      plans: current.plans.length,
      records: current.records.length,
      weights: current.weights.length,
      sleep: current.sleepRecords.length,
      sounds: current.sounds ? 1 : 0,
      challenges: current.challenges.attempts.length,
    }
  baseline = { ...baseline, sleepRecords: canonicalSleepRecords(baseline.sleepRecords) }
  return {
    exerciseNames:
      baseline.exerciseNames === undefined
        ? current.exerciseNames.length
        : changedItemCount(current.exerciseNames, baseline.exerciseNames, (name) => name),
    plans:
      baseline.plans === undefined
        ? current.plans.length
        : changedItemCount(current.plans, baseline.plans, (plan) => plan.id || plan.name),
    records:
      baseline.records === undefined
        ? current.records.length
        : changedItemCount(current.records, baseline.records, (record) => record.id),
    weights:
      baseline.weights === undefined
        ? current.weights.length
        : changedItemCount(current.weights, baseline.weights, (weight) =>
            dayKey(weight.recordedAt),
          ),
    sleep:
      baseline.sleepRecords === undefined
        ? current.sleepRecords.length
        : changedItemCount(current.sleepRecords, baseline.sleepRecords, (record) => record.id),
    sounds:
      baseline.sounds === undefined || stableJson(current.sounds) !== stableJson(baseline.sounds)
        ? 1
        : 0,
    challenges:
      baseline.challenges === undefined
        ? current.challenges.attempts.length
        : changedItemCount(
            current.challenges.attempts,
            baseline.challenges.attempts || [],
            (attempt) => attempt.id,
          ),
  }
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

export async function deleteAccount() {
  const api = await client()
  const response = await request(api, `${api.endpoint}/rpc/delete_my_account`, {
    method: 'POST',
    body: '{}',
  })
  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const result = await response.json()
      message = result.message || result.hint || result.details || result.error || message
    } catch {
      // Keep the HTTP status when the API does not return JSON.
    }
    if (message.includes('delete_my_account') && message.includes('schema cache')) {
      throw Error('注销功能尚未在 Supabase 生效，请重新执行设置页中的初始化 SQL')
    }
    throw Error(message)
  }
  signOut()
}

export async function deleteRemoteData(selection = {}) {
  const api = await client()
  const user = `user_id=eq.${encodeURIComponent(api.userId)}`
  const tables = []
  if (selection.exerciseNames) tables.push('exercise_names')
  if (selection.plans) tables.push('plans')
  if (selection.records) tables.push('training_records')
  if (selection.sounds) tables.push('user_settings')
  if (selection.weights) tables.push('body_weights')
  if (selection.sleep) tables.push('sleep_records')
  if (selection.challenges) tables.push('challenge_attempts')
  for (const table of tables) await deleteRows(api, table, user)
}

function userFromAccessToken(token) {
  try {
    const payload = token.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const claims = JSON.parse(atob(padded))
    return claims.sub ? { id: claims.sub, email: claims.email || '' } : null
  } catch {
    return null
  }
}

export async function consumeAuthCallback() {
  if (!location.hash || !location.hash.includes('access_token=')) return null
  const params = new URLSearchParams(location.hash.slice(1))
  const accessToken = params.get('access_token')
  if (!accessToken) return null
  let session = saveSession({
    access_token: accessToken,
    refresh_token: params.get('refresh_token') || '',
    token_type: params.get('token_type') || 'bearer',
    expires_in: Number(params.get('expires_in') || 0),
    expires_at: Number(params.get('expires_at') || 0),
    user: userFromAccessToken(accessToken),
  })
  history.replaceState(history.state, '', location.pathname + location.search)
  if (!session.user?.email) {
    const { url, anonKey } = cloudConfig()
    try {
      const response = await fetch(`${url}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      })
      if (response.ok) {
        const user = await response.json()
        session = saveSession({ ...session, user: { id: user.id, email: user.email || '' } })
      }
    } catch {
      // The access token is still usable even if the profile lookup fails.
    }
  }
  return session
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
      ? '/auth/v1/signup?redirect_to=' + encodeURIComponent(AUTH_REDIRECT_URL)
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

function latestTime(...values) {
  return Math.max(
    0,
    ...values.map((value) => {
      const time = Date.parse(value || '')
      return Number.isFinite(time) ? time : 0
    }),
  )
}

function mergeByKey(localItems, remoteItems, keyOf, timeOf) {
  const merged = new Map()
  for (const item of [...localItems, ...remoteItems]) {
    const key = keyOf(item)
    if (!key) continue
    const previous = merged.get(key)
    if (!previous || timeOf(item) >= timeOf(previous)) merged.set(key, item)
  }
  return [...merged.values()]
}

function trainingRecordKey(record) {
  const timeKey = `${record.startedAt || ''}|${record.finishedAt || ''}`
  return timeKey !== '|' ? `time:${timeKey}` : `id:${record.id || ''}`
}

export function mergeTrainingRecords(localRecords = [], remoteRecords = []) {
  return completedRecords(
    mergeByKey(localRecords, remoteRecords, trainingRecordKey, (record) =>
      latestTime(record.finishedAt, record.startedAt),
    ),
  ).sort(
    (left, right) =>
      latestTime(left.finishedAt, left.startedAt) - latestTime(right.finishedAt, right.startedAt),
  )
}

export function mergeSleepRecords(localRecords = [], remoteRecords = []) {
  return normalizeSleepRecords(
    mergeByKey(
      localRecords,
      remoteRecords,
      (record) => record.id,
      (record) => latestTime(record.wakeAt, record.asleepAt),
    ),
  )
}

export function mergeChallenges(localChallenges, remoteChallenges) {
  const local = normalizeChallenges(localChallenges)
  const remote = normalizeChallenges(remoteChallenges)
  return normalizeChallenges({
    version: 1,
    attempts: mergeByKey(
      local.attempts,
      remote.attempts,
      (attempt) => attempt.id,
      (attempt) => latestTime(attempt.recordedAt),
    ),
  })
}

async function readCloudData(api, selection = defaultSyncSelection) {
  const user = `user_id=eq.${encodeURIComponent(api.userId)}`
  const [names, plans, records, weights, sleep, settings, challengeAttempts] = await Promise.all([
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
    selection.sleep
      ? readRows(
          api,
          'sleep_records',
          `${user}&select=id,asleep_at,wake_at,note&order=asleep_at,id`,
        )
      : [],
    readRows(api, 'user_settings', `${user}&select=sounds`),
    selection.challenges
      ? readRows(
          api,
          'challenge_attempts',
          `${user}&select=id,level_id,stage,recorded_at,rows,quality_confirmed,note,snapshot&order=recorded_at,id`,
        )
      : [],
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
    exerciseNames: names.map((item) => item.name).filter((name) => !isChallengeExercise(name)),
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
    sleepRecords: normalizeSleepRecords(
      sleep.map((item) => ({
        id: item.id,
        asleepAt: item.asleep_at,
        wakeAt: item.wake_at,
        note: item.note || '',
      })),
    ).filter((record) => record.asleepAt && record.wakeAt),
    sounds: { ...defaults().sounds, ...(settings[0]?.sounds || {}) },
    challenges: normalizeChallenges({
      version: 1,
      attempts: challengeAttempts.map((attempt) => ({
        id: attempt.id,
        levelId: attempt.level_id,
        stage: attempt.stage,
        recordedAt: attempt.recorded_at,
        rows: attempt.rows,
        qualityConfirmed: attempt.quality_confirmed,
        note: attempt.note || '',
        snapshot: attempt.snapshot,
      })),
    }),
  }
}

async function uploadCloudData(api, data, selection) {
  const user = `user_id=eq.${encodeURIComponent(api.userId)}`
  const [oldPlans, oldRecords, oldWeights, oldSleepRecords, oldNames, oldChallenges] =
    await Promise.all([
      readRows(api, 'plans', `${user}&select=id,name`),
      readRows(
        api,
        'training_records',
        `${user}&select=id,plan_id,plan_name,started_at,finished_at,notes`,
      ),
      readRows(api, 'body_weights', `${user}&select=id,recorded_at,recorded_on,kg,note`),
      selection.sleep
        ? readRows(api, 'sleep_records', `${user}&select=id,asleep_at,wake_at,note`)
        : [],
      readRows(api, 'exercise_names', `${user}&select=id,name`),
      selection.challenges
        ? readRows(
            api,
            'challenge_attempts',
            `${user}&select=id,level_id,stage,recorded_at,rows,quality_confirmed,note,snapshot`,
          )
        : [],
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
  const localSleepRecords = normalizeSleepRecords(data.sleepRecords || []).filter(
    (record) => record.asleepAt && record.wakeAt,
  )
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

  const sleepRows = localSleepRecords.map((record) => ({
    id: record.id,
    user_id: api.userId,
    asleep_at: record.asleepAt || null,
    wake_at: record.wakeAt || null,
    note: record.note || null,
  }))
  const oldSleepById = new Map(oldSleepRecords.map((record) => [record.id, record]))
  const changedSleepRecords = sleepRows.filter((record) => {
    const previous = oldSleepById.get(record.id)
    return (
      !previous ||
      !sameTime(previous.asleep_at, record.asleep_at) ||
      !sameTime(previous.wake_at, record.wake_at) ||
      (previous.note || null) !== record.note
    )
  })
  if (selection.sleep) await insertRows(api, 'sleep_records', changedSleepRecords, 'on_conflict=id')

  const names = [
    ...new Set((data.exerciseNames || []).filter((name) => name && !isChallengeExercise(name))),
  ]
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

  const challenges = normalizeChallenges(data.challenges)
  const challengeRows = challenges.attempts.map((attempt) => ({
    id: attempt.id,
    user_id: api.userId,
    level_id: attempt.levelId,
    stage: attempt.stage,
    recorded_at: attempt.recordedAt,
    rows: attempt.rows,
    quality_confirmed: attempt.qualityConfirmed,
    note: attempt.note || null,
    snapshot: attempt.snapshot,
  }))
  const oldChallengeById = new Map(oldChallenges.map((attempt) => [attempt.id, attempt]))
  const changedChallengeRows = challengeRows.filter((row) => {
    const previous = oldChallengeById.get(row.id)
    return (
      !previous ||
      JSON.stringify({ ...previous, user_id: undefined }) !==
        JSON.stringify({ ...row, user_id: undefined })
    )
  })
  if (selection.challenges) {
    await insertRows(api, 'challenge_attempts', changedChallengeRows, 'on_conflict=id')
  }

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
    deletedWeights: 0,
    sleep: selection.sleep ? changedSleepRecords.length : 0,
    deletedSleep: 0,
    names: selection.exerciseNames ? names.length : 0,
    sounds: selection.sounds ? Object.keys(sounds).length : 0,
    challenges: selection.challenges ? changedChallengeRows.length : 0,
  }
}

export async function syncData(direction, localData, selection = defaultSyncSelection) {
  selection = { ...defaultSyncSelection, ...selection }
  const api = await client()
  if (direction === 'upload') {
    const result = await uploadCloudData(api, localData, selection)
    saveSyncBaseline(localData, selection)
    return result
  }
  const remote = await readCloudData(api, selection)
  const selected = selection.plans
    ? remote.plans.some((plan) => plan.id === localData.selected)
      ? localData.selected
      : remote.plans[0]?.id || null
    : localData.selected
  const nextData = {
    ...localData,
    ...(selection.exerciseNames && { exerciseNames: remote.exerciseNames }),
    ...(selection.plans && { plans: remote.plans }),
    ...(selection.records && { records: mergeTrainingRecords(localData.records, remote.records) }),
    ...(selection.weights && {
      weights: dailyWeights([...(localData.weights || []), ...remote.weights]),
    }),
    ...(selection.sleep && {
      sleepRecords: mergeSleepRecords(localData.sleepRecords, remote.sleepRecords),
    }),
    ...(selection.sounds && { sounds: remote.sounds }),
    ...(selection.challenges && {
      challenges: mergeChallenges(localData.challenges, remote.challenges),
    }),
    selected,
  }
  saveSyncBaseline(nextData, selection)
  return nextData
}

export async function syncNames(direction, localNames) {
  const data = { ...defaults(), exerciseNames: localNames }
  const namesOnly = {
    exerciseNames: true,
    plans: false,
    records: false,
    weights: false,
    sleep: false,
    sounds: false,
    challenges: false,
  }
  if (direction === 'upload') {
    await syncData(direction, data, namesOnly)
    return localNames
  }
  return (await syncData(direction, data, namesOnly)).exerciseNames
}
