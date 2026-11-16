import test from 'node:test'
import assert from 'node:assert/strict'
import { createHoldToRelease } from '../src/lib/hold-to-release.js'

function setup() {
  let timeout
  let completed = 0
  let state
  const gesture = createHoldToRelease({
    schedule: (callback) => {
      timeout = callback
    },
    clear: () => {
      timeout = null
    },
    onChange: (...value) => {
      state = value
    },
    onComplete: () => {
      completed++
    },
  })
  return {
    gesture,
    elapse: () => timeout?.(),
    get completed() {
      return completed
    },
    get state() {
      return state
    },
  }
}

test('holding past the threshold keeps the touch target until release', () => {
  const value = setup()
  value.gesture.start()
  value.elapse()
  assert.deepEqual(value.state, [true, true])
  assert.equal(value.completed, 0)
  value.gesture.release()
  assert.equal(value.completed, 1)
  value.gesture.release()
  assert.equal(value.completed, 1)
})

test('early release and cancelled gestures never unlock', () => {
  const value = setup()
  value.gesture.start()
  value.gesture.release()
  value.elapse()
  assert.equal(value.completed, 0)
  value.gesture.start()
  value.elapse()
  value.gesture.cancel()
  value.gesture.release()
  assert.equal(value.completed, 0)
  value.gesture.start()
  value.elapse()
  value.gesture.release()
  assert.equal(value.completed, 1)
})
