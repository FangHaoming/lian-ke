import {
  dailyWeights,
  dayKey,
  sleepRecords as normalizeSleepRecords,
  completedRecords,
} from './workout-model.js'
import { normalizeChallenges } from './challenge-model.js'

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

export function trainingRecordKey(record) {
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

export function mergeWeightRecords(localRecords = [], remoteRecords = []) {
  const localDays = new Set(localRecords.map((record) => dayKey(record.recordedAt)).filter(Boolean))
  return dailyWeights([
    ...localRecords,
    ...remoteRecords.filter((record) => !localDays.has(dayKey(record.recordedAt))),
  ])
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
