import { appPath } from './config.js'
import { showToast } from './toast.js'

function showConnectionStatus(online) {
  showToast(online ? '网络已恢复' : '网络已断开，已缓存页面仍可访问', {
    type: online ? 'success' : 'info',
    duration: 4200,
  })
}

export function setupOfflineSupport() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return () => {}

  const handleOnline = () => showConnectionStatus(true)
  const handleOffline = () => showConnectionStatus(false)
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  if (!navigator.onLine) showConnectionStatus(false)

  navigator.serviceWorker
    .register(appPath('service-worker.js'), { scope: appPath('') })
    .then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        showToast('新版本已准备好，下次打开练刻时自动更新', {
          type: 'success',
          duration: 5000,
        })
      }
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        if (!worker) return
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('新版本已准备好，下次打开练刻时自动更新', {
              type: 'success',
              duration: 5000,
            })
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
  }
}
