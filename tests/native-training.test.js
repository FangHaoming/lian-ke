import assert from 'node:assert/strict'
import test from 'node:test'
import { nativeTrainingSnapshot } from '../src/lib/native-training.js'

function session(overrides = {}) {
  return {
    planName: '上肢训练',
    queue: [
      { name: '标准俯卧撑', sets: 3, setIndex: 1, mode: 'reps', timerMode: 'down' },
      { name: '标准俯卧撑', sets: 3, setIndex: 2, mode: 'reps', timerMode: 'down' },
      { name: '标准俯卧撑', sets: 3, setIndex: 3, mode: 'reps', timerMode: 'down' },
    ],
    index: 1,
    phase: 'work',
    paused: false,
    remaining: 0,
    elapsed: 12,
    ...overrides,
  }
}

test('native training snapshot keeps one-based set numbers and a stable count-up start', () => {
  const originalNow = Date.now
  Date.now = () => 1_800_000_000_000
  try {
    const snapshot = nativeTrainingSnapshot(session())
    assert.equal(snapshot.currentSet, 2)
    assert.equal(snapshot.totalSets, 3)
    assert.equal(snapshot.timerStartAt, 1_799_999_988_000)
    assert.equal(snapshot.elapsedSeconds, 0)
  } finally {
    Date.now = originalNow
  }
})

test('native training snapshot exposes a countdown end date and freezes when paused', () => {
  const originalNow = Date.now
  Date.now = () => 1_800_000_000_000
  const timedQueue = [{ name: '平板支撑', sets: 1, setIndex: 1, mode: 'time', timerMode: 'down' }]
  try {
    const active = nativeTrainingSnapshot(
      session({ queue: timedQueue, index: 0, remaining: 42, elapsed: 8 }),
    )
    assert.equal(active.timerEndAt, 1_800_000_042_000)
    assert.equal(active.remainingSeconds, 0)

    const paused = nativeTrainingSnapshot(
      session({ queue: timedQueue, index: 0, remaining: 42, elapsed: 8, paused: true }),
    )
    assert.equal(paused.timerEndAt, 0)
    assert.equal(paused.remainingSeconds, 42)
    assert.equal(paused.elapsedSeconds, 8)
  } finally {
    Date.now = originalNow
  }
})
