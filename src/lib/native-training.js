import { Capacitor, registerPlugin } from '@capacitor/core'

const NativeTraining = registerPlugin('NativeTraining')

let lastPayload = ''
let updateQueue = Promise.resolve()
let permissionRequested = false

export function nativeTrainingAvailable() {
  return Capacitor.isNativePlatform()
}

export async function requestNativeTrainingPermission() {
  if (!nativeTrainingAvailable() || permissionRequested) return
  permissionRequested = true
  try {
    await NativeTraining.requestPermissions()
  } catch (error) {
    permissionRequested = false
    console.warn('Native training notification permission failed', error)
  }
}

function currentSetNumber(session) {
  const current = session?.queue?.[session.index]
  return Number(current?.setIndex || 1)
}

function totalSetsForExercise(session) {
  const current = session?.queue?.[session.index]
  if (!current) return 0
  return Number(current.sets) || session.queue.filter((item) => item.name === current.name).length
}

function timerEndAt(session) {
  if (!session || session.paused) return 0
  if (!['prep', 'rest'].includes(session.phase)) {
    const current = session.queue?.[session.index]
    if (session.phase !== 'work' || current?.mode !== 'time' || current?.timerMode === 'up')
      return 0
  }
  return Math.round((Date.now() + Math.max(0, Number(session.remaining) || 0) * 1000) / 1000) * 1000
}

function timerStartAt(session) {
  const current = session?.queue?.[session.index]
  if (
    !session ||
    session.paused ||
    session.phase !== 'work' ||
    (current?.mode === 'time' && current?.timerMode !== 'up')
  )
    return 0
  return Math.round((Date.now() - Math.max(0, Number(session.elapsed) || 0) * 1000) / 1000) * 1000
}

export function nativeTrainingSnapshot(session) {
  if (!session) return null
  const current = session.queue?.[session.index]
  if (!current) return null
  const endAt = timerEndAt(session)
  const startAt = timerStartAt(session)
  return {
    planName: session.planName || '自由训练',
    exerciseName: current.name || '训练',
    phase: session.phase,
    paused: session.paused === true,
    currentSet: currentSetNumber(session),
    totalSets: totalSetsForExercise(session),
    currentItem: session.index + 1,
    totalItems: session.queue.length,
    remainingSeconds:
      session.paused || !endAt ? Math.max(0, Math.ceil(Number(session.remaining) || 0)) : 0,
    elapsedSeconds:
      session.paused || !startAt ? Math.max(0, Math.floor(Number(session.elapsed) || 0)) : 0,
    timerEndAt: endAt,
    timerStartAt: startAt,
  }
}

export function syncNativeTraining(session, force = false) {
  if (!nativeTrainingAvailable()) return Promise.resolve()
  const snapshot = nativeTrainingSnapshot(session)
  const serialized = JSON.stringify(snapshot)
  if (!force && serialized === lastPayload) return updateQueue
  lastPayload = serialized
  updateQueue = updateQueue
    .catch(() => {})
    .then(() => (snapshot ? NativeTraining.update(snapshot) : NativeTraining.stop()))
    .catch((error) => {
      console.warn('Native training display update failed', error)
    })
  return updateQueue
}
