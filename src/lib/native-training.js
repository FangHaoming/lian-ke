import { Capacitor, registerPlugin } from '@capacitor/core'
import { challengeLevels } from './challenge-catalog.js'
import { showToast } from './toast.js'

const NativeTraining = registerPlugin('NativeTraining')
const BUNDLED_BUILD_ID = import.meta.env.VITE_BUILD_ID || 'local'

let lastPayload = ''
let updateQueue = Promise.resolve()
let nativeAssetUpdateInFlight = false
let permissionRequested = false
let nativeScreenAwake

export function nativeTrainingAvailable() {
  return Capacitor.isNativePlatform()
}

export function nativeVibrate() {
  if (!nativeTrainingAvailable()) return Promise.resolve()
  return NativeTraining.vibrate().catch((error) => {
    console.warn('Native training vibration failed', error)
  })
}

export function setNativeScreenAwake(enabled) {
  if (!nativeTrainingAvailable() || nativeScreenAwake === enabled) return Promise.resolve()
  nativeScreenAwake = enabled
  return NativeTraining.setScreenAwake({ enabled }).catch((error) => {
    nativeScreenAwake = undefined
    console.warn('Native screen-awake update failed', error)
  })
}

export async function nativeAppInfo() {
  if (!nativeTrainingAvailable()) return null
  try {
    return await NativeTraining.getAppInfo()
  } catch (error) {
    console.warn('Native app info unavailable', error)
    return null
  }
}

export async function updateNativeWebAssets() {
  if (!nativeTrainingAvailable()) return { updated: false }
  if (nativeAssetUpdateInFlight) return { updated: false, skipped: true }
  nativeAssetUpdateInFlight = true
  try {
    const workerURL = `https://fanghaoming.github.io/lian-ke/app-assets/service-worker.js?check=${Date.now()}`
    const response = await fetch(workerURL, { cache: 'no-store' })
    if (!response.ok) throw new Error(`资源清单请求失败 HTTP ${response.status}`)
    const source = await response.text()
    const version = source.match(/const VERSION = ["']([^"']+)["']/)?.[1]
    const remoteBuildId = source.match(/const BUILD_ID = ["']([^"']+)["']/)?.[1]
    const precache = source.match(/const PRECACHE_URLS = (\[[\s\S]*?\])/)?.[1]
    if (!version || !precache) throw new Error('资源清单格式无效')
    const current = await NativeTraining.getAssetVersion()
    if (current?.version === version && BUNDLED_BUILD_ID === remoteBuildId) {
      showToast(`应用资源已是最新（${version}）`, { type: 'success', duration: 2600 })
      return { updated: false, version }
    }
    showToast(`发现应用资源更新：${current?.version || '内置'} → ${version}`, {
      type: 'info',
      duration: 3500,
    })
    const paths = JSON.parse(precache)
    if (
      !Array.isArray(paths) ||
      paths.length === 0 ||
      paths.some(
        (path) =>
          typeof path !== 'string' ||
          !path.startsWith('./') ||
          path.includes('..') ||
          /[?#]/.test(path),
      )
    ) {
      throw new Error('资源清单路径无效')
    }
    for (const path of paths) {
      const relativePath = path.replace(/^\.\//, '') || 'index.html'
      await NativeTraining.downloadAsset({
        version,
        path: relativePath,
        url: `${new URL(relativePath, 'https://fanghaoming.github.io/lian-ke/app-assets/').toString()}?v=${encodeURIComponent(version)}`,
      })
    }
    await NativeTraining.activateAssetVersion({
      version,
      paths: [...new Set(paths.map((path) => path.replace(/^\.\//, '') || 'index.html'))],
      reload: true,
    })
    showToast('应用资源已下载，完全退出并重新启动后生效', {
      type: 'success',
      duration: 4500,
    })
    return { updated: true, version }
  } catch (error) {
    showToast('应用资源检查/下载失败，继续使用当前版本', { type: 'info', duration: 4500 })
    console.warn('Native web asset update failed', error)
    return { updated: false, error }
  } finally {
    nativeAssetUpdateInFlight = false
  }
}

export function openNativeExternalUrl(url) {
  if (!nativeTrainingAvailable()) return Promise.resolve(false)
  return NativeTraining.openExternalUrl({ url })
    .then(() => true)
    .catch((error) => {
      console.warn('Native external URL failed', error)
      return false
    })
}

export async function requestNativeTrainingPermission() {
  if (!nativeTrainingAvailable() || permissionRequested) return true
  permissionRequested = true
  try {
    await NativeTraining.requestPermissions()
    return true
  } catch (error) {
    permissionRequested = false
    console.warn('Native training notification permission failed', error)
    return false
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
  const isCountdown =
    ['prep', 'rest'].includes(session.phase) ||
    (session.phase === 'work' && current.mode === 'time' && current.timerMode !== 'up')
  const timerDirection = isCountdown
    ? 'down'
    : session.phase === 'work' && (current.mode === 'reps' || current.timerMode === 'up')
      ? 'up'
      : 'static'
  const challenge = challengeLevels.find((level) => level.name === current.name)
  return {
    planName: session.planName || '自由训练',
    exerciseName: current.name || '训练',
    exerciseIcon: challenge?.id || '',
    phase: session.phase,
    timerDirection,
    paused: session.paused === true,
    currentSet: currentSetNumber(session),
    totalSets: totalSetsForExercise(session),
    currentItem: session.index + 1,
    totalItems: session.queue.length,
    // Keep the display values populated while running as well. The Android
    // notification renders these values directly so OEM lock screens cannot
    // reset a platform Chronometer to 00:00 while the notification refreshes.
    remainingSeconds: Math.max(0, Math.ceil(Number(session.remaining) || 0)),
    elapsedSeconds: Math.max(0, Math.floor(Number(session.elapsed) || 0)),
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
      // A permission dialog can race the first foreground-service update. Do
      // not suppress the next retry after that update fails.
      if (lastPayload === serialized) lastPayload = ''
      console.warn('Native training display update failed', error)
    })
  return updateQueue
}
