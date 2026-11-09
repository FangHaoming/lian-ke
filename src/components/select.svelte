<script>
  import { createEventDispatcher, onMount } from 'svelte'

  export let options = []
  export let value = ''
  export let label = '选择'
  export let placeholder = '请选择'
  export let searchable = false

  const dispatch = createEventDispatcher()
  let root
  let trigger
  let menu
  let searchInput
  let open = false
  let query = ''
  $: selected = options.find((option) => option.value === value)
  $: filteredOptions = searchable
    ? options.filter((option) =>
        option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      )
    : options

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
    query = ''
    dispatch('change', { value })
    trigger.focus()
  }

  function openMenu() {
    open = true
    if (searchable) requestAnimationFrame(() => searchInput?.focus())
  }

  function handleTriggerKeydown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu()
      focusOption(
        event.key === 'ArrowUp'
          ? filteredOptions.length - 1
          : Math.max(
              0,
              filteredOptions.findIndex((option) => option.value === value),
            ),
      )
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openMenu()
    } else if (event.key === 'Escape') open = false
  }

  function handleOptionKeydown(event, index) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      focusOption(
        (index + (event.key === 'ArrowDown' ? 1 : -1) + filteredOptions.length) %
          filteredOptions.length,
      )
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
    on:click={() => (open ? (open = false) : openMenu())}
    on:keydown={handleTriggerKeydown}
  >
    {selected?.label || placeholder}
  </button>
  {#if open}
    <div class="unified-menu" role="listbox" aria-label={label} bind:this={menu}>
      {#if searchable}<div class="unified-search-wrap">
          <input
            class="unified-input"
            type="search"
            placeholder="输入关键词筛选"
            aria-label={`筛选${label}`}
            autocomplete="off"
            bind:value={query}
            bind:this={searchInput}
            on:keydown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                focusOption(0)
              } else if (event.key === 'Escape') {
                event.preventDefault()
                open = false
                trigger.focus()
              }
            }}
          />
        </div>{/if}
      {#each filteredOptions as option, index (option.value)}
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
      {:else}<div class="exercise-name-empty">没有匹配的挑战关卡</div>{/each}
    </div>
  {/if}
</div>
