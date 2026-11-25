import { appURL } from './config.js'
import { showToast } from './toast.js'
import { Capacitor } from '@capacitor/core'

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
    // Native WebView updates are intentionally staged until training ends or
    // the next app launch. Activating a waiting worker during a session would
    // fire controllerchange and reload the current screen unexpectedly.
    if (Capacitor.isNativePlatform() || !registration?.waiting || isTrainingActive()) return
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }
  const activateNativeWorkerOnStartup = (registration) => {
    if (!Capacitor.isNativePlatform() || !registration?.waiting || isTrainingActive()) return
    // A waiting worker here was installed before this app launch. Activate it
    // now so the next navigation uses the refreshed native/remote resources.
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }
  const showResourceUpdateToast = () => {
    if (Capacitor.isNativePlatform()) return
    showToast('页面内容已更新，正在应用', { type: 'success', duration: 5000 })
  }
  const handleTrainingState = () => {
    trainingActive = isTrainingActive()
    navigator.serviceWorker.controller?.postMessage({
      type: 'TRAINING_STATE',
      active: trainingActive,
    })
    if (!trainingActive) activateWaitingWorker(activeRegistration)
  }
  const handleWorkerMessage = (event) => {
    if (!Capacitor.isNativePlatform()) return
    if (event.data?.type === 'REMOTE_UPDATE_START') {
      showToast('正在下载应用资源更新…', { type: 'info', duration: 3000 })
    } else if (event.data?.type === 'REMOTE_UPDATE_READY') {
      showToast('资源更新已准备好，下次启动时应用', { type: 'success', duration: 5000 })
    } else if (event.data?.type === 'REMOTE_UPDATE_FAILED') {
      showToast('资源更新失败，继续使用当前版本', { type: 'info', duration: 4500 })
    }
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
  navigator.serviceWorker.addEventListener('message', handleWorkerMessage)
  window.addEventListener('lianke-training-state', handleTrainingState)

  if (!navigator.onLine) showConnectionStatus(false)

  navigator.serviceWorker
    .register(appURL('service-worker.js'), {
      scope: appURL(''),
      updateViaCache: 'none',
    })
    .then((registration) => {
      activeRegistration = registration
      navigator.serviceWorker.controller?.postMessage({
        type: 'RUNTIME_MODE',
        native: Capacitor.isNativePlatform(),
      })
      navigator.serviceWorker.controller?.postMessage({ type: 'TRAINING_STATE', active: trainingActive })
      if (!trainingActive) {
        navigator.serviceWorker.controller?.postMessage({ type: 'REFRESH_REMOTE' })
      }
      registration.update().catch(() => {})
      if (registration.waiting) {
        if (!isTrainingActive()) {
          if (Capacitor.isNativePlatform()) {
            activateNativeWorkerOnStartup(registration)
          } else if (navigator.serviceWorker.controller) {
            showResourceUpdateToast()
            activateWaitingWorker(registration)
          }
        }
      }
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        if (!worker) return
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            if (!isTrainingActive()) {
              showResourceUpdateToast()
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
    navigator.serviceWorker.removeEventListener('message', handleWorkerMessage)
    window.removeEventListener('lianke-training-state', handleTrainingState)
  }
}
