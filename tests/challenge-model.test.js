import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { challengeRoutes, challengeLevels } from '../src/lib/challenge-catalog.js'
import {
  challengeDefaults,
  createAttempt,
  evaluateAttempt,
  getRouteProgress,
  appendAttempt,
  removeAttempt,
  normalizeChallenges,
  completionStage,
  snapshotLevel,
} from '../src/lib/challenge-model.js'
import { defaults, KEY } from '../src/lib/workout-model.js'
import { loadData, saveData } from '../src/lib/data.js'
import { syncData } from '../src/lib/cloud.js'

const route = challengeRoutes[0]
const first = route.levels[0]
function attempt(level, stage = completionStage(level), value) {
  const goal = level.standards[stage]
  return createAttempt(
    level,
    stage,
    Array.from({ length: goal.sets }, () =>
      level.unilateral
        ? { left: value ?? goal.value, right: value ?? goal.value }
        : { both: value ?? goal.value },
    ),
    true,
  )
}
function clearRoute(route) {
  return route.levels.reduce(
    (state, level) => appendAttempt(state, attempt(level)),
    challengeDefaults(),
  )
}
function localStore(t) {
  const map = new Map()
  t.mock.method(globalThis, 'fetch', async () => {
    throw Error('Unexpected network')
  })
  const old = globalThis.localStorage
  globalThis.localStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  }
  t.after(() => {
    if (old === undefined) delete globalThis.localStorage
    else globalThis.localStorage = old
  })
  return map
}

test('all 60 catalog entries match the independently verified source table', () => {
  const doc = readFileSync(
    new URL('../docs/context/囚徒健身60关标准核验.md', import.meta.url),
    'utf8',
  )
  const lines = doc.split('\n').filter((line) => /^\| cc-/.test(line))
  assert.equal(lines.length, 60)
  assert.equal(new Set(challengeLevels.map((item) => item.id)).size, 60)
  assert.equal(challengeRoutes.length, 6)
  for (const route of challengeRoutes) assert.equal(route.levels.length, 10)
  for (const line of lines) {
    const [id, name, beginner, intermediate, top, ...tail] = line
      .split('|')
      .slice(1, -1)
      .map((v) => v.trim())
    const level = challengeLevels.find((v) => v.id === id)
    assert.ok(level, id)
    assert.equal(`${level.name}（${level.englishName}）`, name)
    assert.equal(level.sourcePage, Number(tail.at(-1)))
    assert.equal(level.unilateral, line.includes('每侧'))
    assert.equal(level.mode, beginner.includes('秒') ? 'time' : 'reps')
    for (const [stage, text] of [
      ['beginner', beginner],
      ['intermediate', intermediate],
      [level.step === 10 ? 'elite' : 'progression', top],
    ]) {
      const goal = level.standards[stage]
      const expected = text.includes('秒')
        ? [1, Number(text.split(' ')[0])]
        : text.split(/[×–]/).map(Number)
      assert.deepEqual(
        [goal.sets, goal.value, ...(goal.upper ? [goal.upper] : [])],
        expected,
        `${id} ${stage}`,
      )
    }
  }
})

test('each required set must pass; totals and multiple attempts cannot be combined', () => {
  const under = attempt(first)
  under.rows = [{ both: 75 }, { both: 75 }, { both: 0 }]
  assert.equal(evaluateAttempt(first, under).passed, false)
  assert.match(evaluateAttempt(first, under).messages.join(' '), /第 3 组还差 50/)
  under.rows = [{ both: 150 }]
  assert.equal(evaluateAttempt(first, under).passed, false)
  assert.match(evaluateAttempt(first, under).messages.join(' '), /缺少第 2 组/)
  const tries = [under, { ...under, id: 'second', rows: [{ both: 50 }, { both: 50 }] }]
  assert.equal(getRouteProgress(route, tries)[0].completed, false)
  assert.equal(evaluateAttempt(first, attempt(first)).passed, true)
})

test('single-sided targets require every set on both sides', () => {
  const level = route.levels[6]
  const a = attempt(level)
  a.rows[1].right = 19
  assert.equal(evaluateAttempt(level, a).passed, false)
  assert.match(evaluateAttempt(level, a).messages.join(' '), /右侧还差 1/)
  delete a.rows[1].right
  assert.equal(evaluateAttempt(level, a).valid, false)
  assert.throws(() => createAttempt(level, 'progression', [{ left: 20 }], true))
})

test('invalid numbers, empty fields, booleans and null never become valid scores', () => {
  for (const value of [
    -1,
    1.5,
    NaN,
    Infinity,
    -Infinity,
    '',
    ' ',
    null,
    undefined,
    true,
    '10x',
    10000,
  ]) {
    assert.throws(() => createAttempt(first, 'progression', [{ both: value }], true), String(value))
  }
  assert.equal(createAttempt(first, 'beginner', [{ both: '10' }], true).rows[0].both, 10)
  assert.equal(
    evaluateAttempt(first, createAttempt(first, 'beginner', [{ both: 0 }], true), 'beginner')
      .passed,
    false,
  )
})

test('time targets use continuous seconds, not the sum of multiple holds', () => {
  const level = challengeRoutes[5].levels[0]
  const a = createAttempt(level, 'progression', [{ both: 60 }, { both: 60 }], true)
  assert.equal(evaluateAttempt(level, a).passed, false)
  assert.equal(evaluateAttempt(level, attempt(level)).passed, true)
  assert.throws(() => createAttempt(level, 'progression', [{ both: 7201 }], true))
})

test('quality must be confirmed; unconfirmed attempts remain in history', () => {
  const a = { ...attempt(first), qualityConfirmed: false }
  assert.equal(evaluateAttempt(first, a).passed, false)
  assert.equal(appendAttempt(challengeDefaults(), a).attempts.length, 1)
  assert.equal(getRouteProgress(route, [a])[1].unlocked, false)
})

test('progression is sequential and route-specific, including the write boundary', () => {
  assert.throws(() => appendAttempt(challengeDefaults(), attempt(route.levels[1])), /前置/)
  const state = appendAttempt(challengeDefaults(), attempt(first))
  const p = getRouteProgress(route, state.attempts)
  assert.equal(p[0].completed, true)
  assert.equal(p[1].unlocked, true)
  assert.equal(p[2].unlocked, false)
  assert.equal(getRouteProgress(challengeRoutes[1], state.attempts)[0].completed, false)
  assert.equal(getRouteProgress(challengeRoutes[1], state.attempts)[0].unlocked, true)
})

test('all six final skills complete at beginner; elite is independent', () => {
  for (const r of challengeRoutes) {
    const state = clearRoute(r)
    const p = getRouteProgress(r, state.attempts)
    assert.equal(p[9].completed, true, r.name)
    assert.equal(p[9].achieved.elite, false, r.name)
    assert.equal(p.filter((x) => x.completed).length, 10)
  }
  const final = route.levels[9]
  const elite = attempt(final, 'elite')
  assert.equal(evaluateAttempt(final, elite, 'elite').passed, true)
  assert.equal(evaluateAttempt(final, elite, 'intermediate').passed, false)
  assert.equal(evaluateAttempt(final, elite, 'beginner').passed, true)
})

test('bridge elite preserves the range and grants at its lower bound', () => {
  const level = challengeRoutes[4].levels[9]
  assert.deepEqual(level.standards.elite, { sets: 2, value: 10, upper: 30 })
  assert.equal(evaluateAttempt(level, attempt(level, 'elite'), 'elite').passed, true)
  const a = attempt(level, 'elite')
  a.rows[1].both = 9
  assert.equal(evaluateAttempt(level, a, 'elite').passed, false)
})

test('removing a prerequisite relocks later levels without deleting their history', () => {
  const state = clearRoute(route)
  const removed = removeAttempt(state, state.attempts[0].id)
  assert.equal(removed.attempts.length, 9)
  assert.equal(getRouteProgress(route, removed.attempts)[9].unlocked, false)
  const restored = appendAttempt(removed, attempt(first))
  assert.equal(getRouteProgress(route, restored.attempts)[9].completed, true)
})

test('snapshot target tampering and duplicate IDs are rejected by strict backup import', () => {
  const a = attempt(first)
  const original = JSON.stringify(a)
  const forged = structuredClone(a)
  forged.snapshot.standards.progression.value = 1
  assert.equal(evaluateAttempt(first, forged).passed, false)
  assert.throws(() => normalizeChallenges({ version: 1, attempts: [forged] }, { strict: true }))
  assert.throws(() => normalizeChallenges({ version: 1, attempts: [a, a] }, { strict: true }))
  for (const bad of [
    null,
    {},
    { version: 1, attempts: null },
    { version: 2, attempts: [] },
    { version: 1, attempts: [null] },
  ]) {
    assert.throws(() => normalizeChallenges(bad, { strict: true }))
  }
  assert.equal(JSON.stringify(a), original)
  assert.deepEqual(snapshotLevel(first), a.snapshot)
})

test('unknown standard versions remain history without granting current progress', () => {
  const a = attempt(first)
  a.snapshot.version = 'cc-v2'
  const state = normalizeChallenges({ version: 1, attempts: [a] }, { strict: true })
  assert.equal(state.attempts.length, 1)
  assert.equal(getRouteProgress(route, state.attempts)[0].completed, false)
  assert.equal(evaluateAttempt(first, a).valid, false)
})

test('inherited object properties cannot be used as a goal stage', () => {
  for (const stage of ['toString', '__proto__', 'constructor', null, 'unknown']) {
    assert.throws(() => createAttempt(first, stage, [{ both: 50 }], true), /有效/)
    const a = attempt(first)
    assert.equal(evaluateAttempt(first, a, stage).passed, false)
    a.stage = stage
    assert.throws(() => normalizeChallenges({ version: 1, attempts: [a] }, { strict: true }))
  }
})

test('legacy data, local save/reload and backup round trips preserve the expected state', (t) => {
  const map = localStore(t)
  const legacy = { plans: [], records: [], selected: null }
  map.set(KEY, JSON.stringify(legacy))
  assert.deepEqual(loadData().challenges, challengeDefaults())
  assert.deepEqual(normalizeChallenges(undefined, { strict: true }), challengeDefaults())
  const d = defaults()
  d.challenges = clearRoute(route)
  saveData(d)
  assert.deepEqual(loadData().challenges, d.challenges)
  assert.deepEqual(
    normalizeChallenges(JSON.parse(JSON.stringify(d)).challenges, { strict: true }),
    d.challenges,
  )
  const a = defaults(),
    b = defaults()
  a.challenges.attempts.push(attempt(first))
  assert.equal(b.challenges.attempts.length, 0)
  assert.equal(defaults().challenges.attempts.length, 0)
})

test('existing cloud downloads keep local challenge attempts intact and uploads add no challenge fields', async (t) => {
  const map = localStore(t)
  map.set(
    'lianke_supabase_config',
    JSON.stringify({ url: 'https://test.invalid', anonKey: 'public-test' }),
  )
  map.set(
    'lianke_supabase_session',
    JSON.stringify({ access_token: 'test', user: { id: 'test-user' } }),
  )
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    return new Response(JSON.stringify([]), { status: 200 })
  })
  const d = defaults()
  d.challenges = clearRoute(route)
  const result = await syncData('download', d)
  assert.deepEqual(result.challenges, d.challenges)
  await syncData('upload', d, {
    exerciseNames: false,
    plans: false,
    records: false,
    weights: false,
    sounds: false,
  })
  assert.equal(
    calls.some(
      (call) => call.url.includes('challenge') || call.options.body?.includes('challenge'),
    ),
    false,
  )
})
