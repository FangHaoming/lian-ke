import { challengeLevels } from './challenge-catalog.js'

const byId = new Map(challengeLevels.map((level) => [level.id, level]))
const byName = new Map(challengeLevels.map((level) => [level.name, level]))
const validStage = (level, stage) =>
  typeof stage === 'string' && Object.hasOwn(level.standards, stage)
export const challengeDefaults = () => ({ version: 1, attempts: [] })
export const completionStage = (level) => (level.step === 10 ? 'beginner' : 'progression')
export const attemptSides = (level) => (level.unilateral ? ['left', 'right'] : ['both'])
export const sideLabels = { left: '左侧', right: '右侧', both: '双侧动作' }

export function formatGoal(level, stage) {
  const goal = validStage(level, stage) ? level.standards[stage] : null
  if (!goal) return ''
  const amount = goal.upper ? `${goal.value}–${goal.upper}` : goal.value
  const target = level.mode === 'time' ? `连续 ${amount} 秒` : `${goal.sets} 组 × ${amount} 次`
  return `${level.unilateral ? '每侧 ' : ''}${target}`
}

export function snapshotLevel(level) {
  return {
    version: level.version,
    name: level.name,
    mode: level.mode,
    unilateral: level.unilateral,
    standards: structuredClone(level.standards),
    sourcePage: level.sourcePage,
  }
}

function matchesSnapshot(level, snapshot) {
  if (
    snapshot?.version !== level.version ||
    snapshot.mode !== level.mode ||
    snapshot.unilateral !== level.unilateral ||
    !snapshot.standards ||
    Object.keys(snapshot.standards).length !== Object.keys(level.standards).length
  )
    return false
  return Object.entries(level.standards).every(([stage, goal]) => {
    const stored = snapshot.standards[stage]
    return stored?.sets === goal.sets && stored.value === goal.value && stored.upper === goal.upper
  })
}

function validValue(value, mode) {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= (mode === 'time' ? 7200 : 9999)
  )
}

function validRows(level, rows) {
  return (
    Array.isArray(rows) &&
    rows.length >= 1 &&
    rows.length <= 3 &&
    rows.every(
      (row) =>
        row &&
        typeof row === 'object' &&
        attemptSides(level).every((side) => validValue(row[side], level.mode)),
    )
  )
}

export function evaluateAttempt(level, attempt, stage = completionStage(level)) {
  const goal = validStage(level, stage) ? level.standards[stage] : null
  if (!goal || !matchesSnapshot(level, attempt?.snapshot))
    return { valid: false, passed: false, messages: ['标准版本不匹配，保留历史但不计入当前进度。'] }
  if (!validRows(level, attempt.rows))
    return {
      valid: false,
      passed: false,
      messages: ['请填写每组的完整成绩，使用非负整数；单侧动作需填写左右两侧。'],
    }
  const messages = []
  if (attempt.qualityConfirmed !== true) messages.push('尚未确认动作质量。')
  const unit = level.mode === 'time' ? '秒' : '次'
  for (let i = 0; i < goal.sets; i++) {
    if (!attempt.rows[i]) {
      messages.push(`缺少第 ${i + 1} 组成绩，需完成 ${formatGoal(level, stage)}。`)
      continue
    }
    for (const side of attemptSides(level)) {
      const actual = attempt.rows[i][side]
      if (actual < goal.value)
        messages.push(
          `第 ${i + 1} 组${level.unilateral ? sideLabels[side] : ''}还差 ${goal.value - actual} ${unit}。`,
        )
    }
  }
  return { valid: true, passed: messages.length === 0, messages }
}

export function createAttempt(level, stage, rows, qualityConfirmed, note = '', source = null) {
  if (!validStage(level, stage)) throw Error('请选择有效的挑战目标')
  const normalized = Array.isArray(rows)
    ? rows.map((row) =>
        Object.fromEntries(
          attemptSides(level).map((side) => {
            const value = row?.[side]
            // Empty strings, null and booleans must never turn into a valid zero.
            const number =
              typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : value
            return [side, number]
          }),
        ),
      )
    : rows
  if (!validRows(level, normalized))
    throw Error('请完整填写 1–3 组成绩（次数 0–9999，秒数 0–7200，均为整数）')
  return {
    id:
      globalThis.crypto?.randomUUID?.() ||
      `cc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    levelId: level.id,
    stage,
    recordedAt: new Date().toISOString(),
    rows: normalized,
    qualityConfirmed: qualityConfirmed === true,
    note: String(note).trim().slice(0, 500),
    snapshot: snapshotLevel(level),
    ...(source?.type && source?.recordId
      ? { source: { type: String(source.type), recordId: String(source.recordId) } }
      : {}),
  }
}

function normalizeAttempt(raw) {
  if (!raw || typeof raw !== 'object') return null
  const level = byId.get(raw.levelId)
  if (
    !level ||
    typeof raw.id !== 'string' ||
    !raw.id ||
    typeof raw.recordedAt !== 'string' ||
    !Number.isFinite(Date.parse(raw.recordedAt)) ||
    !validStage(level, raw.stage) ||
    typeof raw.qualityConfirmed !== 'boolean' ||
    !validRows(level, raw.rows) ||
    !raw.snapshot ||
    typeof raw.snapshot.version !== 'string'
  )
    return null
  // Known versions must match their published targets. Future versions remain
  // visible as history but cannot grant progress against the current catalog.
  if (raw.snapshot.version === level.version && !matchesSnapshot(level, raw.snapshot)) return null
  return {
    id: raw.id,
    levelId: level.id,
    stage: raw.stage,
    recordedAt: raw.recordedAt,
    rows: raw.rows.map((row) =>
      Object.fromEntries(attemptSides(level).map((side) => [side, row[side]])),
    ),
    qualityConfirmed: raw.qualityConfirmed,
    note: typeof raw.note === 'string' ? raw.note.slice(0, 500) : '',
    snapshot: structuredClone(raw.snapshot),
    ...(raw.source?.type && raw.source?.recordId
      ? { source: { type: String(raw.source.type), recordId: String(raw.source.recordId) } }
      : {}),
  }
}

export function normalizeChallenges(value, { strict = false } = {}) {
  if (value === undefined) return challengeDefaults()
  if (!value || value.version !== 1 || !Array.isArray(value.attempts)) {
    if (strict) throw Error('挑战备份结构或版本不正确，未导入任何数据')
    return challengeDefaults()
  }
  const ids = new Set()
  const attempts = []
  for (const raw of value.attempts) {
    const attempt = normalizeAttempt(raw)
    if (!attempt || ids.has(attempt.id)) {
      if (strict) throw Error('挑战备份包含无效或重复成绩，未导入任何数据')
      continue
    }
    ids.add(attempt.id)
    attempts.push(attempt)
  }
  return { version: 1, attempts }
}

export function getRouteProgress(route, attempts = []) {
  let unlocked = true
  return route.levels.map((level) => {
    const history = attempts.filter((attempt) => attempt.levelId === level.id)
    const achieved = Object.fromEntries(
      Object.keys(level.standards).map((stage) => [
        stage,
        unlocked && history.some((attempt) => evaluateAttempt(level, attempt, stage).passed),
      ]),
    )
    const completed = achieved[completionStage(level)]
    const completedAt = completed
      ? history
          .filter((attempt) => evaluateAttempt(level, attempt, completionStage(level)).passed)
          .map((attempt) => attempt.recordedAt)
          .sort()[0]
      : null
    const progress = { level, unlocked, completed, achieved, completedAt }
    unlocked = completed
    return progress
  })
}

export function appendAttempt(state, attempt) {
  const normalized = normalizeChallenges(state, { strict: true })
  const valid = normalizeAttempt(attempt)
  if (!valid || normalized.attempts.some((item) => item.id === valid.id))
    throw Error('挑战成绩无效或重复')
  const level = byId.get(valid.levelId)
  // The level ID contains the route prefix, but progression is derived from
  // actual catalog order, never from user-editable completion flags.
  const route = {
    levels: challengeLevels.filter((item) => item.id.split('-')[1] === level.id.split('-')[1]),
  }
  if (
    !getRouteProgress(route, normalized.attempts).find((item) => item.level.id === level.id)
      ?.unlocked
  )
    throw Error('请先通过本路线的前置关卡')
  return { version: 1, attempts: [...normalized.attempts, valid] }
}

export function removeAttempt(state, attemptId) {
  const normalized = normalizeChallenges(state)
  return {
    ...normalized,
    attempts: normalized.attempts.filter((attempt) => attempt.id !== attemptId),
  }
}

function trainingRows(level, results) {
  const completed = results.filter((result) => result.completed === true)
  if (completed.length === 0) return null
  const rows = completed
    .sort((a, b) => Number(a.setIndex || 0) - Number(b.setIndex || 0))
    .map((result) => {
      if (level.mode === 'time') return { both: Number(result.actualSeconds) || 0 }
      if (level.unilateral) {
        if (result.actualLeft === undefined || result.actualRight === undefined) return null
        return {
          left: Number(result.actualLeft) || 0,
          right: Number(result.actualRight) || 0,
        }
      }
      return { both: Number(result.actualReps) || 0 }
    })
  if (rows.some((row) => row === null)) return null
  return rows.slice(0, 3)
}

// Converts one completed training record into a challenge candidate. Candidates
// are deliberately allowed to exist before their route is unlocked so a later
// challenge-page confirmation can reuse the historical training evidence.
export function appendTrainingEvaluation(state, record) {
  const normalized = normalizeChallenges(state)
  if (!record?.id || !Array.isArray(record.results)) return normalized
  const grouped = new Map()
  for (const result of record.results) {
    const level = byName.get(String(result.name || '').trim())
    if (!level) continue
    const stage = validStage(level, result.challengeStage)
      ? result.challengeStage
      : completionStage(level)
    const key = `${level.id}:${stage}`
    if (!grouped.has(key)) grouped.set(key, { level, stage, results: [] })
    grouped.get(key).results.push(result)
  }
  const additions = []
  for (const { level, stage, results } of grouped.values()) {
    const rows = trainingRows(level, results)
    if (
      !rows ||
      normalized.attempts.some(
        (item) =>
          item.source?.recordId === record.id && item.levelId === level.id && item.stage === stage,
      )
    )
      continue
    const attempt = createAttempt(
      level,
      stage,
      rows,
      false,
      '来自训练记录的自动判定；请在挑战页确认动作质量后计入通关。',
      { type: 'training-record', recordId: record.id },
    )
    additions.push(attempt)
  }
  return { version: 1, attempts: [...normalized.attempts, ...additions] }
}

export function confirmTrainingEvaluation(state, attemptId) {
  const normalized = normalizeChallenges(state, { strict: true })
  const candidate = normalized.attempts.find((item) => item.id === attemptId)
  if (!candidate || candidate.source?.type !== 'training-record')
    throw Error('找不到可确认的训练判定')
  const confirmed = { ...candidate, id: `${candidate.id}-confirmed`, qualityConfirmed: true }
  const withoutCandidate = removeAttempt(normalized, attemptId)
  return appendAttempt(withoutCandidate, confirmed)
}
