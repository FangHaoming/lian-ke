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
  if (Capacitor.isNativePlatform() || !import.meta.env.PROD || !('serviceWorker' in navigator))
    return () => {}

  let isReloading = false
  let hadController = Boolean(navigator.serviceWorker.controller)
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

  if (!navigator.onLine) showConnectionStatus(false)

  navigator.serviceWorker
    .register(appURL('service-worker.js'), {
      scope: appURL(''),
      updateViaCache: 'none',
    })
    .then((registration) => {
      registration.update().catch(() => {})
      if (registration.waiting && navigator.serviceWorker.controller) {
        showToast('新版本已准备好，正在更新', {
          type: 'success',
          duration: 5000,
        })
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        if (!worker) return
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('新版本已准备好，正在更新', {
              type: 'success',
              duration: 5000,
            })
            worker.postMessage({ type: 'SKIP_WAITING' })
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
  }
}
