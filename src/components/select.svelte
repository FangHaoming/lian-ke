<script>
  import { createEventDispatcher, onMount } from 'svelte'

  export let options = []
  export let value = ''
  export let label = '选择'
  export let placeholder = '请选择'

  const dispatch = createEventDispatcher()
  let root
  let trigger
  let menu
  let open = false
  $: selected = options.find((option) => option.value === value)

  onMount(() => {
    const closeOutside = (event) => {
      if (root && !root.contains(event.target)) open = false
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  })

  function focusOption(index) {
    requestAnimationFrame(() => menu?.querySelectorAll('button')[index]?.focus())
  }

  function select(option) {
    value = option.value
    open = false
    dispatch('change', { value })
    trigger.focus()
  }

  function handleTriggerKeydown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      open = true
      focusOption(
        event.key === 'ArrowUp'
          ? options.length - 1
          : Math.max(
              0,
              options.findIndex((option) => option.value === value),
            ),
      )
    } else if (event.key === 'Escape') open = false
  }

  function handleOptionKeydown(event, index) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      focusOption((index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      focusOption(event.key === 'Home' ? 0 : options.length - 1)
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      open = false
      if (event.key === 'Escape') {
        event.preventDefault()
        trigger.focus()
      }
    }
  }
</script>

<div class:open class="unified-select" bind:this={root}>
  <button
    type="button"
    class="unified-trigger"
    aria-label={`${label}，当前：${selected?.label || '未选择'}`}
    aria-haspopup="listbox"
    aria-expanded={open}
    bind:this={trigger}
    on:click={() => (open = !open)}
    on:keydown={handleTriggerKeydown}
  >
    {selected?.label || placeholder}
  </button>
  {#if open}
    <div class="unified-menu" role="listbox" aria-label={label} bind:this={menu}>
      {#each options as option, index (option.value)}
        <button
          type="button"
          role="option"
          aria-selected={option.value === value}
          class:selected={option.value === value}
          class="unified-option"
          on:click={() => select(option)}
          on:keydown={(event) => handleOptionKeydown(event, index)}
        >
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
