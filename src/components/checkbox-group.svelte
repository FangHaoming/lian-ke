<script>
  import { createEventDispatcher } from 'svelte'

  export let options = []
  export let value = []
  export let legend = ''
  export let actionChecked = false
  export let disabled = false

  const dispatch = createEventDispatcher()

  function updateValue(optionValue, event) {
    value = event.currentTarget.checked
      ? [...new Set([...value, optionValue])]
      : value.filter((item) => item !== optionValue)
    dispatch('change', value)
  }
</script>

<fieldset class="checkbox-group" {disabled}>
  {#if legend || actionChecked}
    <legend>
      <span>{legend}</span>
      {#if legend}
        <input
          type="checkbox"
          class="checkbox-group-action"
          checked={actionChecked}
          aria-label="全选同步内容"
          on:change={() => dispatch('action')}
        />
      {/if}
    </legend>
  {/if}
  <div class="checkbox-group-options">
    {#each options as option}
      <label class="checkbox-group-option">
        <input
          type="checkbox"
          checked={value.includes(option.value)}
          on:change={(event) => updateValue(option.value, event)}
        />
        <span>{option.label}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .checkbox-group {
    margin: 18px 0 0;
    padding: 0;
    border: 0;
  }

  legend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 9px;
    color: #a7b8c2;
    font-size: 13px;
  }

  .checkbox-group-action {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: #b7f36a;
    cursor: pointer;
  }

  .checkbox-group-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .checkbox-group-option {
    display: flex;
    align-items: center;
    gap: 7px;
    min-height: 36px;
    padding: 7px 10px;
    border: 1px solid #344650;
    border-radius: 10px;
    background: #101921;
    color: #c8d5da;
    font-size: 13px;
    cursor: pointer;
  }

  .checkbox-group-option:has(input:checked) {
    border-color: #5b7e4d;
    background: #1b2c1b;
    color: #d5f5bc;
  }

  input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: #b7f36a;
  }

  fieldset:disabled .checkbox-group-option {
    cursor: not-allowed;
  }
</style>
