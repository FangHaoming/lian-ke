import {
  KEY,
  defaults,
  names,
  dailyWeights,
  sleepRecords,
  completedRecords,
} from './workout-model.js'
import { normalizeChallenges } from './challenge-model.js'

const DATABASE_NAME = 'lianke'
const DATABASE_VERSION = 2
const DATA_STORE = 'app-data'
const DATA_KEY = 'current'
const STORE_NAMES = [
  'meta',
  'plans',
  'planItems',
  'records',
  'trainingSets',
  'weights',
  'sleepRecords',
  'challengeAttempts',
  'exerciseNames',
]
let saveQueue = Promise.resolve()

function normalizeData(value) {
  let data = value
  if (!data || !Array.isArray(data.plans) || !Array.isArray(data.records)) data = defaults()
  data.records = completedRecords(data.records)
  data.weights = dailyWeights(data.weights || [])
  data.sleepRecords = sleepRecords(data.sleepRecords || [])
  data.sounds = { ...defaults().sounds, ...data.sounds }
  data.challenges = normalizeChallenges(data.challenges)
  data.exerciseNames ??= [
    ...new Set([...names, ...data.plans.flatMap((p) => p.items.map((i) => i.name))]),
  ]
  data.exerciseNamesVersion = 2
  if (!data.plans.some((p) => p.id === data.selected)) data.selected = data.plans[0]?.id ?? null
  return data
}

function readLegacyData() {
  let data
  try {
    data = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('lianke_v4'))
  } catch {}
  return normalizeData(data)
}

function indexedDbAvailable() {
  return typeof indexedDB !== 'undefined'
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!indexedDbAvailable()) {
      reject(Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = (event) => {
      const database = request.result
      const transaction = event.target.transaction
      if (!database.objectStoreNames.contains(DATA_STORE)) database.createObjectStore(DATA_STORE)
      createStores(database)
      const legacy = transaction.objectStore(DATA_STORE).get(DATA_KEY)
      legacy.onsuccess = () => {
        if (legacy.result) writeSnapshotToTransaction(transaction, normalizeData(legacy.result))
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || Error('IndexedDB open failed'))
  })
}

function createStores(database) {
  const definitions = {
    meta: { keyPath: 'id' },
    plans: { keyPath: 'id' },
    planItems: { keyPath: 'id' },
    records: { keyPath: 'id' },
    trainingSets: { keyPath: 'id' },
    weights: { keyPath: 'id' },
    sleepRecords: { keyPath: 'id' },
    challengeAttempts: { keyPath: 'id' },
    exerciseNames: { keyPath: 'id' },
  }
  for (const [name, options] of Object.entries(definitions)) {
    if (database.objectStoreNames.contains(name)) continue
    const store = database.createObjectStore(name, options)
    if (name === 'planItems') store.createIndex('planId', 'planId')
    if (name === 'trainingSets') store.createIndex('recordId', 'recordId')
    if (name === 'records') store.createIndex('finishedAt', 'finishedAt')
    if (name === 'weights') store.createIndex('recordedAt', 'recordedAt')
    if (name === 'sleepRecords') store.createIndex('asleepAt', 'asleepAt')
    if (name === 'challengeAttempts') store.createIndex('recordedAt', 'recordedAt')
  }
}

function snapshotRows(data) {
  const plans = []
  const planItems = []
  for (const plan of data.plans || []) {
    const { items = [], ...planRow } = plan
    plans.push(planRow)
    items.forEach((item, index) =>
      planItems.push({ ...item, id: item.id || `${plan.id}:${index}`, planId: plan.id }),
    )
  }

  const records = []
  const trainingSets = []
  for (const record of data.records || []) {
    const { results = [], ...recordRow } = record
    records.push(recordRow)
    results.forEach((item, index) =>
      trainingSets.push({
        ...item,
        id: `${record.id}:${index}`,
        recordId: record.id,
      }),
    )
  }

  return {
    meta: [
      {
        id: DATA_KEY,
        selected: data.selected,
        sounds: data.sounds,
        exerciseNamesVersion: data.exerciseNamesVersion,
      },
    ],
    plans,
    planItems,
    records,
    trainingSets,
    weights: (data.weights || []).map((item) => ({
      ...item,
      id: item.id || item.recordedAt,
    })),
    sleepRecords: data.sleepRecords || [],
    challengeAttempts: data.challenges?.attempts || [],
    exerciseNames: (data.exerciseNames || []).map((name) => ({ id: name, name })),
  }
}

function writeSnapshotToTransaction(transaction, data) {
  const rows = snapshotRows(data)
  for (const storeName of STORE_NAMES) {
    const store = transaction.objectStore(storeName)
    store.clear()
    for (const row of rows[storeName]) store.put(row)
  }
}

function readAll(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error || Error('IndexedDB read failed'))
  })
}

async function readStructuredData(database) {
  const transaction = database.transaction(STORE_NAMES, 'readonly')
  const rows = Object.fromEntries(
    await Promise.all(
      STORE_NAMES.map(async (storeName) => [
        storeName,
        await readAll(transaction.objectStore(storeName)),
      ]),
    ),
  )
  const meta = rows.meta.find((item) => item.id === DATA_KEY)
  if (!meta) return null
  const itemsByPlan = new Map()
  for (const item of rows.planItems) {
    const list = itemsByPlan.get(item.planId) || []
    const { planId, ...value } = item
    list.push(value)
    itemsByPlan.set(item.planId, list)
  }
  const setsByRecord = new Map()
  for (const item of rows.trainingSets) {
    const list = setsByRecord.get(item.recordId) || []
    const { id, recordId, ...value } = item
    list.push(value)
    setsByRecord.set(item.recordId, list)
  }
  const records = rows.records.map((record) => ({
    ...record,
    results: setsByRecord.get(record.id) || [],
  }))
  return normalizeData({
    selected: meta.selected,
    sounds: meta.sounds,
    exerciseNamesVersion: meta.exerciseNamesVersion,
    plans: rows.plans.map((plan) => ({ ...plan, items: itemsByPlan.get(plan.id) || [] })),
    records,
    weights: rows.weights,
    sleepRecords: rows.sleepRecords,
    challenges: { version: 1, attempts: rows.challengeAttempts },
    exerciseNames: rows.exerciseNames.map((item) => item.name),
  })
}

function writeStoredData(database, data) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAMES, 'readwrite')
    writeSnapshotToTransaction(transaction, data)
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error || Error('IndexedDB write failed'))
    transaction.onabort = () => reject(transaction.error || Error('IndexedDB write aborted'))
  })
}

function clearLegacyStoredData(database) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DATA_STORE, 'readwrite')
    transaction.objectStore(DATA_STORE).delete(DATA_KEY)
    transaction.oncomplete = resolve
    transaction.onerror = () =>
      reject(transaction.error || Error('IndexedDB legacy cleanup failed'))
    transaction.onabort = () =>
      reject(transaction.error || Error('IndexedDB legacy cleanup aborted'))
  })
}

export function loadData() {
  return readLegacyData()
}

export async function loadDataAsync() {
  try {
    const database = await openDatabase()
    const stored = await readStructuredData(database)
    if (stored) {
      await clearLegacyStoredData(database).catch(() => {})
      return normalizeData(stored)
    }
    const migrated = readLegacyData()
    await writeStoredData(database, migrated)
    localStorage.removeItem(KEY)
    localStorage.removeItem('lianke_v4')
    return migrated
  } catch {
    return readLegacyData()
  }
}

export async function requestPersistentStorage() {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  try {
    if (navigator.storage.persisted && (await navigator.storage.persisted())) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export function saveData(data) {
  const snapshot = normalizeData(JSON.parse(JSON.stringify(data)))
  if (!indexedDbAvailable()) {
    localStorage.setItem(KEY, JSON.stringify(snapshot))
    return Promise.resolve()
  }
  saveQueue = saveQueue
    .catch(() => {})
    .then(async () => {
      try {
        const database = await openDatabase()
        await writeStoredData(database, snapshot)
      } catch {
        localStorage.setItem(KEY, JSON.stringify(snapshot))
      }
    })
  return saveQueue
}

export function flatten(plan) {
  return plan.items.flatMap((item) =>
    Array.from({ length: Number(item.sets) || 1 }, (_, index) => ({
      ...item,
      setIndex: index + 1,
    })),
  )
}
