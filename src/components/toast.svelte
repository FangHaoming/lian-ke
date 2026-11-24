<script>
  import { onDestroy } from 'svelte'

  export let message = ''
  export let type = 'info'
  export let duration = 2800
  export let id = 0

  let visible = false
  let previousId = 0
  let timer

  $: if (id !== previousId) {
    previousId = id
    visible = Boolean(message)
    clearTimeout(timer)
    if (visible && duration > 0) timer = setTimeout(() => (visible = false), duration)
  }

  onDestroy(() => clearTimeout(timer))
</script>

{#if visible}
  <div class="toast-viewport" role="status" aria-live="polite">
    <div class:success={type === 'success'} class:error={type === 'error'} class="toast">
      <span class="toast-icon" aria-hidden="true">
        {type === 'success' ? '✓' : type === 'error' ? '!' : 'i'}
      </span>
      <span>{message}</span>
    </div>
  </div>
{/if}
