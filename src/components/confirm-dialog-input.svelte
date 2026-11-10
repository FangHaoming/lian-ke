<script>
  export let input
  export let message = ''
</script>

{#if message}<p>{message}</p>{/if}
<label class="field confirm-dialog-field">
  {input.label}
  <input
    type={input.type || 'text'}
    autocomplete={input.type === 'password' ? 'new-password' : input.autocomplete || 'off'}
    data-1p-ignore={input.type === 'password' ? 'true' : undefined}
    data-bwignore={input.type === 'password' ? 'true' : undefined}
    data-lpignore={input.type === 'password' ? 'true' : undefined}
    placeholder={input.placeholder || ''}
    value={input.value || ''}
    on:input={(event) => input.onInput?.(event.currentTarget.value)}
    disabled={input.disabled}
  />
</label>
{#if input.error}<p class="confirm-dialog-error">{input.error}</p>{/if}
