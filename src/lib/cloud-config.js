const CONFIG_KEY = 'lianke_supabase_config'
const SESSION_KEY = 'lianke_supabase_session'
const SYNC_SELECTION_KEY = 'lianke_sync_selection'

export const defaultSyncSelection = {
  exerciseNames: true,
  plans: true,
  records: true,
  weights: true,
  sleep: true,
  sounds: true,
  challenges: true,
}
export function loadSyncSelection() {
  try {
    return { ...defaultSyncSelection, ...JSON.parse(localStorage.getItem(SYNC_SELECTION_KEY)) }
  } catch {
    return { ...defaultSyncSelection }
  }
}
export function saveSyncSelection(selection) {
  localStorage.setItem(SYNC_SELECTION_KEY, JSON.stringify(selection))
}
export function cloudConfig() {
  const fallback = {
    url: import.meta.env?.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
  }
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY)) || fallback
  } catch {
    return fallback
  }
}
export function saveCloudConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}
export function cloudSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}
export function signOut() {
  localStorage.removeItem(SESSION_KEY)
}
export function saveSessionValue(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}
