import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mergeChallenges,
  mergeSleepRecords,
  mergeTrainingRecords,
  pendingSyncCounts,
  saveSyncBaseline,
} from '../src/lib/cloud.js'
import { challengeLevels } from '../src/lib/challenge-catalog.js'
import { createAttempt } from '../src/lib/challenge-model.js'
import { dailyWeights } from '../src/lib/workout-model.js'

test('pending sync counts compare local data with the previous remote baseline', () => {
  const baseline = {
    exerciseNames: ['俯卧撑'],
    plans: [{ id: 'plan-1', name: '基础' }],
    records: [{ id: 'record-1', results: [{ completed: true }] }],
    weights: [{ recordedAt: '2026-11-13T08:00:00.000Z', kg: 70 }],
    sleepRecords: [],
    sounds: { set: 'triple' },
    challenges: { version: 1, attempts: [] },
  }
  const current = {
    exerciseNames: ['俯卧撑', '深蹲'],
    plans: [{ id: 'plan-1', name: '进阶' }],
    records: [
      { id: 'record-1', results: [{ completed: true }] },
      { id: 'record-2', results: [{ completed: true }] },
    ],
    weights: [
      { recordedAt: '2026-11-13T08:00:00.000Z', kg: 70 },
      { recordedAt: '2026-11-14T08:00:00.000Z', kg: 69.5 },
    ],
    sleepRecords: [],
    sounds: { set: 'double' },
    challenges: { version: 1, attempts: [] },
  }
  assert.deepEqual(pendingSyncCounts(current, baseline), {
    exerciseNames: 1,
    plans: 1,
    records: 1,
    weights: 1,
    sleep: 0,
    sounds: 1,
    challenges: 0,
  })
})

test('unfinished sleep records are excluded from pending sync', () => {
  assert.equal(
    pendingSyncCounts({ sleepRecords: [{ id: 'open', asleepAt: '2026-11-13T13:00:00.000Z' }] })
      .sleep,
    0,
  )
})

test('sleep timestamps with equivalent formats are not treated as pending changes', () => {
  const current = {
    sleepRecords: [
      {
        id: 'sleep-1',
        asleepAt: '2026-11-12T18:25:00.000Z',
        wakeAt: '2026-11-13T02:25:00.000Z',
      },
    ],
  }
  const baseline = {
    sleepRecords: [
      {
        id: 'sleep-1',
        asleepAt: '2026-11-12T18:25:00+00:00',
        wakeAt: '2026-11-13T02:25:00+00:00',
        note: '',
      },
    ],
  }
  assert.equal(pendingSyncCounts(current, baseline).sleep, 0)
})

test('completed download baseline clears merged sleep records from pending sync', () => {
  const previousStorage = globalThis.localStorage
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  }
  try {
    const merged = {
      sleepRecords: [
        {
          id: 'sleep-1',
          asleepAt: '2026-11-12T18:25:00.000Z',
          wakeAt: '2026-11-13T02:25:00.000Z',
        },
      ],
    }
    saveSyncBaseline(merged, { sleep: true })
    assert.equal(pendingSyncCounts(merged).sleep, 0)
  } finally {
    globalThis.localStorage = previousStorage
  }
})

test('incremental sync keeps local and remote training records', () => {
  const local = [
    { id: 'local', finishedAt: '2026-11-13T01:00:00.000Z', results: [{ completed: true }] },
  ]
  const remote = [
    { id: 'remote', finishedAt: '2026-11-13T02:00:00.000Z', results: [{ completed: true }] },
  ]
  assert.deepEqual(
    mergeTrainingRecords(local, remote).map((record) => record.id),
    ['local', 'remote'],
  )
})

test('incremental sync de-duplicates a locally uploaded training record', () => {
  const local = [
    { id: 'local-id', finishedAt: '2026-11-13T03:00:00.000Z', results: [{ completed: true }] },
  ]
  const remote = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      finishedAt: '2026-11-13T03:00:00.000Z',
      results: [{ completed: true }],
    },
  ]
  assert.equal(mergeTrainingRecords(local, remote).length, 1)
})

test('incremental sync keeps the latest weight for each day', () => {
  const local = [{ id: 'local', recordedAt: '2026-11-13T08:00:00.000Z', kg: 70 }]
  const remote = [{ id: 'remote', recordedAt: '2026-11-13T09:00:00.000Z', kg: 69.5 }]
  assert.deepEqual(dailyWeights([...local, ...remote]), [remote[0]])
})

test('incremental sync merges sleep records and applies the newer version', () => {
  const local = [{ id: 'sleep-1', asleepAt: '2026-11-12T13:00:00.000Z' }]
  const remote = [
    { id: 'sleep-1', asleepAt: '2026-11-12T13:00:00.000Z', wakeAt: '2026-11-12T21:00:00.000Z' },
    { id: 'sleep-2', asleepAt: '2026-11-13T13:00:00.000Z' },
  ]
  assert.deepEqual(
    mergeSleepRecords(local, remote).map(({ id, asleepAt, wakeAt, note }) => ({
      id,
      asleepAt,
      wakeAt,
      note,
    })),
    [
      {
        id: 'sleep-1',
        asleepAt: '2026-11-12T13:00:00.000Z',
        wakeAt: '2026-11-12T21:00:00.000Z',
        note: '',
      },
      { id: 'sleep-2', asleepAt: '2026-11-13T13:00:00.000Z', wakeAt: undefined, note: '' },
    ],
  )
})

test('incremental sync unions challenge attempts by id', () => {
  const level = challengeLevels[0]
  const localAttempt = createAttempt(level, 'progression', [{ both: 1 }], true)
  const remoteAttempt = createAttempt(level, 'progression', [{ both: 2 }], true)
  const merged = mergeChallenges(
    { version: 1, attempts: [localAttempt] },
    { version: 1, attempts: [remoteAttempt] },
  )
  assert.deepEqual(
    new Set(merged.attempts.map((attempt) => attempt.id)),
    new Set([localAttempt.id, remoteAttempt.id]),
  )
})
