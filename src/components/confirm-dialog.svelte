<script>
  import { createEventDispatcher } from 'svelte'

  export let open = false
  export let title = '确认操作'
  export let confirmText = '确认'
  export let cancelText = '取消'
  export let destructive = false

  const dispatch = createEventDispatcher()
  let dialog

  $: if (dialog) {
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }

  function cancel() {
    open = false
    dispatch('cancel')
  }

  function confirm() {
    open = false
    dispatch('confirm')
  }
</script>

<dialog
  class="confirm-dialog"
  bind:this={dialog}
  aria-labelledby="confirm-dialog-title"
  on:cancel|preventDefault={cancel}
>
  <h2 id="confirm-dialog-title">{title}</h2>
  <slot />
  <div class="confirm-dialog-actions">
    <button type="button" class="btn ghost" on:click={cancel}>{cancelText}</button>
    <button
      type="button"
      class:primary={!destructive}
      class:red={destructive}
      class="btn"
      on:click={confirm}
    >
      {confirmText}
    </button>
  </div>
</dialog>
