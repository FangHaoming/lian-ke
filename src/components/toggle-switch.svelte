<script>
  export let checked = false
  export let label = ''
  export let description = ''
  export let disabled = false
  export let separated = false
</script>

<label class="toggle-switch" class:toggle-switch-separated={separated}>
  <span class="toggle-switch-copy">
    {#if label}<strong>{label}</strong>{/if}
    {#if description}<small>{description}</small>{/if}
  </span>
  <input
    class="toggle-switch-input"
    type="checkbox"
    bind:checked
    {disabled}
    aria-label={label || undefined}
    on:change
  />
  <span class="toggle-switch-control" aria-hidden="true"></span>
</label>

<style>
  .toggle-switch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    cursor: pointer;
  }

  .toggle-switch-separated {
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid #293943;
  }

  .toggle-switch-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .toggle-switch-copy strong {
    color: #d9e7e9;
    font-size: 13px;
  }

  .toggle-switch-copy small {
    color: #8297a1;
    font-size: 11px;
    line-height: 1.5;
  }

  .toggle-switch-input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  .toggle-switch-control {
    position: relative;
    flex: 0 0 44px;
    width: 44px;
    height: 24px;
    border: 1px solid #40515b;
    border-radius: 999px;
    background: #1b2931;
    transition:
      background 0.15s,
      border-color 0.15s;
  }

  .toggle-switch-control:after {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #90a1a9;
    content: '';
    transition:
      transform 0.15s,
      background 0.15s;
  }

  .toggle-switch-input:checked + .toggle-switch-control {
    border-color: #9ad95b;
    background: #3a6330;
  }

  .toggle-switch-input:checked + .toggle-switch-control:after {
    background: #d9ffac;
    transform: translateX(20px);
  }

  .toggle-switch-input:focus-visible + .toggle-switch-control {
    outline: 2px solid #b7f36a;
    outline-offset: 3px;
  }

  .toggle-switch-input:disabled + .toggle-switch-control {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
