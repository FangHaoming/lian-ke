<script>
  import { onMount } from 'svelte'

  export let value = []
  export let options = []
  export let label = '筛选动作'
  export let placeholder = '输入动作并多选'

  let root
  let input
  let open = false
  let query = ''
  $: normalizedQuery = query.trim().toLocaleLowerCase()
  $: matches = options.filter((name) =>
    name.toLocaleLowerCase().includes(normalizedQuery),
  )

  onMount(() => {
    const closeOutside = (event) => {
      if (root && !root.contains(event.target)) open = false
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  })

  function toggle(name) {
    value = value.includes(name)
      ? value.filter((item) => item !== name)
      : [...value, name]
  }
</script>

<div class:open class="unified-select exercise-multi-picker" bind:this={root}>
  <input
    class="unified-input"
    aria-label={label}
    aria-haspopup="listbox"
    aria-expanded={open}
    autocomplete="off"
    {placeholder}
    bind:value={query}
    bind:this={input}
    on:focus={() => (open = true)}
    on:click={() => (open = true)}
  />
  {#if value.length}<div class="exercise-multi-summary">{value.length} 个动作已选择</div>{/if}
  {#if open}
    <div class="unified-menu" role="listbox" aria-label={label} aria-multiselectable="true">
      {#each matches as name (name)}
        <button
          type="button"
          role="option"
          aria-selected={value.includes(name)}
          class:selected={value.includes(name)}
          class="unified-option exercise-multi-option"
          on:click={() => toggle(name)}
        >
          <span class="exercise-multi-check">{value.includes(name) ? '✓' : ''}</span>
          {name}
        </button>
      {:else}<div class="exercise-name-empty">无匹配动作</div>{/each}
    </div>
  {/if}
</div>
