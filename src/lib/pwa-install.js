import { writable } from 'svelte/store'

const DISMISSED_AT_KEY = 'lianke_pwa_install_dismissed_at'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000
const PROMPT_TIMEOUT = 5000

let deferredPrompt = null
let initialized = false

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  )
}

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function wasRecentlyDismissed() {
  if (typeof localStorage === 'undefined') return false
  const dismissedAt = Number(localStorage.getItem(DISMISSED_AT_KEY))
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_DURATION
}

const initialState = {
  installed: isStandalone(),
  installable: false,
  ios: isIOS(),
  dismissed: wasRecentlyDismissed(),
  installing: false,
  manualInstall: false,
  installMessage: '',
}

export const pwaInstallState = writable(initialState)

export function setupPwaInstall() {
  if (initialized || typeof window === 'undefined') return () => {}
  initialized = true

  const onBeforeInstallPrompt = (event) => {
    event.preventDefault()
    deferredPrompt = event
    pwaInstallState.update((state) => ({
      ...state,
      installable: true,
      manualInstall: false,
      installMessage: '',
    }))
  }
  const onInstalled = () => {
    deferredPrompt = null
    localStorage.removeItem(DISMISSED_AT_KEY)
    pwaInstallState.update((state) => ({
      ...state,
      installed: true,
      installable: false,
      dismissed: false,
      installing: false,
      manualInstall: false,
      installMessage: '',
    }))
  }
  const displayMode = window.matchMedia('(display-mode: standalone)')
  const onDisplayModeChange = () => {
    pwaInstallState.update((state) => ({ ...state, installed: isStandalone() }))
  }

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onInstalled)
  displayMode.addEventListener?.('change', onDisplayModeChange)

  return () => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onInstalled)
    displayMode.removeEventListener?.('change', onDisplayModeChange)
    initialized = false
  }
}

export async function requestPwaInstall() {
  if (!deferredPrompt) return false
  const installPrompt = deferredPrompt
  deferredPrompt = null
  pwaInstallState.update((state) => ({
    ...state,
    installable: false,
    installing: true,
    manualInstall: false,
    installMessage: '',
  }))

  let timeoutId
  try {
    const promptResult = installPrompt.prompt()
    const choicePromise =
      promptResult && typeof promptResult.then === 'function'
        ? promptResult
        : installPrompt.userChoice
    const choice = await Promise.race([
      choicePromise,
      new Promise((resolve) => {
        timeoutId = window.setTimeout(() => resolve({ outcome: 'unavailable' }), PROMPT_TIMEOUT)
      }),
    ])
    if (choice?.outcome === 'accepted') {
      return true
    }
    pwaInstallState.update((state) => ({
      ...state,
      manualInstall: true,
      installMessage:
        choice?.outcome === 'unavailable'
          ? '浏览器没有打开安装窗口，请改用浏览器菜单安装。'
          : '安装已取消，你仍可通过浏览器菜单重新安装。',
    }))
    return false
  } catch {
    pwaInstallState.update((state) => ({
      ...state,
      manualInstall: true,
      installMessage: '无法调用浏览器安装窗口，请改用浏览器菜单安装。',
    }))
    return false
  } finally {
    window.clearTimeout(timeoutId)
    pwaInstallState.update((state) => ({ ...state, installing: false }))
  }
}

export function dismissPwaInstall() {
  localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()))
  pwaInstallState.update((state) => ({ ...state, dismissed: true }))
}
