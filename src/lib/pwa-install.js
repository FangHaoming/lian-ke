import { writable } from 'svelte/store'

const DISMISSED_AT_KEY = 'lianke_pwa_install_dismissed_at'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000

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
}

export const pwaInstallState = writable(initialState)

export function setupPwaInstall() {
  if (initialized || typeof window === 'undefined') return () => {}
  initialized = true

  const onBeforeInstallPrompt = (event) => {
    event.preventDefault()
    deferredPrompt = event
    pwaInstallState.update((state) => ({ ...state, installable: true }))
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
  pwaInstallState.update((state) => ({ ...state, installing: true }))
  try {
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice?.outcome === 'accepted') {
      deferredPrompt = null
      pwaInstallState.update((state) => ({ ...state, installable: false }))
      return true
    }
    return false
  } finally {
    pwaInstallState.update((state) => ({ ...state, installing: false }))
  }
}

export function dismissPwaInstall() {
  localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()))
  pwaInstallState.update((state) => ({ ...state, dismissed: true }))
}
