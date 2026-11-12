<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import { isChallengeExercise } from '../lib/challenge-model.js'

  export let value = ''
  export let options = []
  export let label = '动作名称'
  export let placeholder = '选择或输入动作名称'
  export let emptyMessage = '无匹配动作，可直接输入自定义名称'
  export let id = undefined
  export let deletable = false

  const dispatch = createEventDispatcher()
  let root
  let input
  let menu
  let open = false
  let showAll = true
  $: matches = options
    .filter(
      (name) => showAll || name.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()),
    )
    .sort((a, b) =>
      deletable ? Number(isChallengeExercise(a)) - Number(isChallengeExercise(b)) : 0,
    )
  onMount(() => {
    const closeOutside = (event) => {
      if (root && !root.contains(event.target)) open = false
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  })

  function select(name) {
    value = name
    open = false
    dispatch('input', value)
    dispatch('change', { value })
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') open = false
    if (event.key === 'ArrowDown' && open) {
      event.preventDefault()
      menu?.querySelector('.unified-option')?.focus()
    }
  }

  function handleOptionKeydown(event, index) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const buttons = menu?.querySelectorAll('.unified-option')
      buttons?.[
        (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
      ]?.focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      open = false
      input.focus()
    }
  }
</script>

<div
  class:open
  class="unified-select exercise-name-picker"
  bind:this={root}
  on:focusin={() => {
    open = true
    showAll = true
  }}
>
  <input
    {id}
    class="unified-input"
    aria-label={label}
    aria-haspopup="listbox"
    aria-expanded={open}
    autocomplete="off"
    {placeholder}
    bind:value
    bind:this={input}
    on:mousedown={() => {
      open = true
      showAll = true
    }}
    on:pointerdown={() => {
      open = true
      showAll = true
    }}
    on:touchstart={() => {
      open = true
      showAll = true
    }}
    on:focus={() => {
      open = true
      showAll = true
    }}
    on:click={() => {
      open = true
      showAll = true
    }}
    on:input={() => {
      open = true
      showAll = false
      dispatch('input', value)
    }}
    on:keydown={handleKeydown}
  />
  {#if open}
    <div class="unified-menu" role="listbox" aria-label={label} bind:this={menu}>
      {#each matches as name, index (name)}
        <div class="unified-name-row">
          <button
            type="button"
            role="option"
            aria-selected={value === name}
            class:selected={value === name}
            class="unified-option"
            on:click={() => select(name)}
            on:keydown={(event) => handleOptionKeydown(event, index)}
          >
            {name}
          </button>
          {#if deletable && !isChallengeExercise(name)}<button
              type="button"
              class="btn tiny red"
              aria-label={`删除已保存动作 ${name}`}
              on:click={() => {
                dispatch('delete', { name })
                showAll = true
              }}
            >
              删除
            </button>{/if}
        </div>
      {:else}<div class="exercise-name-empty">{emptyMessage}</div>{/each}
    </div>
  {/if}
</div>
