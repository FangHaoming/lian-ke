import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeActiveSession } from '../src/lib/workout-model.js'

test('normalizes duplicate active-session results and resumes at the first unfinished set', () => {
  const restored = normalizeActiveSession({
    queue: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    index: 1,
    phase: 'work',
    remaining: 1,
    elapsed: 2,
    results: [
      { sortOrder: 0, completed: true },
      { sortOrder: 1, completed: true },
      { sortOrder: 1, completed: true },
    ],
  })

  assert.equal(restored.index, 2)
  assert.equal(restored.phase, 'prep')
  assert.equal(restored.results.length, 2)
  assert.ok(restored.last <= Date.now())
})

test('drops an active session when every set is already completed', () => {
  assert.equal(
    normalizeActiveSession({
      queue: [{ name: 'A' }],
      index: 0,
      phase: 'work',
      results: [
        { sortOrder: 0, completed: true },
        { sortOrder: 0, completed: true },
      ],
    }),
    null,
  )
})
