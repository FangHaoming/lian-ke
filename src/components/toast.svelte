<script>
  import { onDestroy } from 'svelte'

  export let message = ''
  export let type = 'info'
  export let duration = 2800

  let visible = false
  let previousMessage = ''
  let timer

  $: if (message !== previousMessage) {
    previousMessage = message
    visible = Boolean(message)
    clearTimeout(timer)
    if (visible && duration > 0) timer = setTimeout(() => (visible = false), duration)
  }

  onDestroy(() => clearTimeout(timer))
</script>

{#if visible}
  <div class="toast-viewport" role="status" aria-live="polite">
    <div class:success={type === 'success'} class:error={type === 'error'} class="toast">
      <span class="toast-icon" aria-hidden="true">{type === 'success' ? '✓' : type === 'error' ? '!' : 'i'}</span>
      <span>{message}</span>
    </div>
  </div>
{/if}
