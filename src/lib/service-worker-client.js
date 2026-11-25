import { appURL } from './config.js'
import { showToast } from './toast.js'

function showConnectionStatus(online) {
  showToast(online ? '网络已恢复' : '网络已断开，已缓存页面仍可访问', {
    type: online ? 'success' : 'info',
    duration: 4200,
  })
}

export function setupOfflineSupport() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator))
    return () => {}

  let isReloading = false
  let hadController = Boolean(navigator.serviceWorker.controller)
  let activeRegistration
  let trainingActive = Boolean(window.__liankeTrainingActive)
  const isTrainingActive = () => Boolean(window.__liankeTrainingActive)
  const activateWaitingWorker = (registration) => {
    if (!registration?.waiting || isTrainingActive()) return
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }
  const handleTrainingState = () => {
    trainingActive = isTrainingActive()
    navigator.serviceWorker.controller?.postMessage({
      type: 'TRAINING_STATE',
      active: trainingActive,
    })
    if (!trainingActive) activateWaitingWorker(activeRegistration)
  }
  const handleOnline = () => showConnectionStatus(true)
  const handleOffline = () => showConnectionStatus(false)
  const handleControllerChange = () => {
    if (!hadController) {
      hadController = true
      return
    }
    if (isReloading) return
    isReloading = true
    window.location.reload()
  }
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
  window.addEventListener('lianke-training-state', handleTrainingState)

  if (!navigator.onLine) showConnectionStatus(false)

  navigator.serviceWorker
    .register(appURL('service-worker.js'), {
      scope: appURL(''),
      updateViaCache: 'none',
    })
    .then((registration) => {
      activeRegistration = registration
      navigator.serviceWorker.controller?.postMessage({ type: 'TRAINING_STATE', active: trainingActive })
      if (!trainingActive) {
        navigator.serviceWorker.controller?.postMessage({ type: 'REFRESH_REMOTE' })
      }
      registration.update().catch(() => {})
      if (registration.waiting && navigator.serviceWorker.controller) {
        if (!isTrainingActive()) {
          showToast('新版本已准备好，正在更新', { type: 'success', duration: 5000 })
          activateWaitingWorker(registration)
        }
      }
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        if (!worker) return
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            if (!isTrainingActive()) {
              showToast('新版本已准备好，正在更新', { type: 'success', duration: 5000 })
              activateWaitingWorker(registration)
            }
          }
        })
      })
    })
    .catch(() => {
      // 离线支持失败不应阻塞应用本身启动。
    })

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    window.removeEventListener('lianke-training-state', handleTrainingState)
  }
}
