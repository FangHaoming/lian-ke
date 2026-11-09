import { writable } from 'svelte/store'
import ConfirmDialogMessage from '../components/confirm-dialog-message.svelte'

const closedState = {
  open: false,
  title: '',
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  destructive: false,
  children: ConfirmDialogMessage,
  childrenProps: {},
}

export const confirmDialog = writable(closedState)

let resolveRequest = null

export function requestConfirm(options = {}) {
  if (resolveRequest) resolveRequest({ confirmed: false })

  return new Promise((resolve) => {
    resolveRequest = resolve
    const state = { ...closedState, ...options, open: true }
    if (state.children === ConfirmDialogMessage && options.message !== undefined) {
      state.childrenProps = { message: options.message }
    }
    confirmDialog.set(state)
  })
}

export function finishConfirm(result) {
  const resolve = resolveRequest
  resolveRequest = null
  confirmDialog.set(closedState)
  resolve?.(result)
}
