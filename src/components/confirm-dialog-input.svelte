<script>
  export let input
</script>

<label class="field confirm-dialog-field">
  {input.label}
  <input
    type={input.type || 'text'}
    autocomplete={input.autocomplete || 'off'}
    placeholder={input.placeholder || ''}
    value={input.value || ''}
    on:input={(event) => input.onInput?.(event.currentTarget.value)}
    disabled={input.disabled}
  />
</label>
{#if input.error}<p class="confirm-dialog-error">{input.error}</p>{/if}
