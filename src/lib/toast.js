import { writable } from 'svelte/store'

const initialState = {
  message: '',
  type: 'info',
  duration: 2800,
  id: 0,
}

export const toast = writable(initialState)

let nextId = 0

export function showToast(message, options = {}) {
  if (!message) return
  toast.set({
    ...initialState,
    ...options,
    message,
    id: ++nextId,
  })
}

export function clearToast() {
  toast.set(initialState)
}
