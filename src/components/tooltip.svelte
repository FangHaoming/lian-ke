<script>
  import { onMount } from 'svelte'

  export let text = ''
  export let label = '显示详情'

  let root
  let open = false
  let touchMode = false
  let tooltipStyle = ''

  function updatePosition(event) {
    if (!root) return
    const rect = (root.firstElementChild || root).getBoundingClientRect()
    const x = event?.clientX || rect.left + rect.width / 2
    const y = event?.clientY || rect.top + rect.height / 2
    const above = y > 76
    const top = above ? y - 12 : y + 12
    tooltipStyle =
      'left:' +
      x +
      'px;top:' +
      top +
      'px;transform:translate(-50%,' +
      (above ? '-100%' : '0') +
      ')'
  }

  function show(event) {
    open = true
    requestAnimationFrame(() => updatePosition(event))
  }

  function hide() {
    if (!touchMode) open = false
  }

  function toggle(event) {
    if (event.pointerType === 'touch' || touchMode) {
      open = !open
      if (open) requestAnimationFrame(() => updatePosition(event))
    }
  }

  function move(event) {
    if (open && !touchMode) updatePosition(event)
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      open = false
      event.currentTarget.blur()
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open = !open
      if (open) requestAnimationFrame(updatePosition)
    }
  }

  onMount(() => {
    touchMode = window.matchMedia('(hover: none)').matches
    const closeOutside = (event) => {
      if (touchMode && root && !root.contains(event.target)) open = false
    }
    const reposition = () => {
      if (open) updatePosition()
    }
    document.addEventListener('pointerdown', closeOutside)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  })
</script>

<span
  class="tooltip-root"
  bind:this={root}
  role="button"
  tabindex="0"
  aria-label={label}
  aria-describedby={open ? 'tooltip-content' : undefined}
  on:mouseenter={show}
  on:mouseleave={hide}
  on:mousemove={move}
  on:pointerdown={toggle}
  on:keydown={handleKeydown}
>
  <slot />
</span>
{#if open}
  <span id="tooltip-content" class="tooltip-content" style={tooltipStyle} role="tooltip">{text}</span>
{/if}

<style>
  .tooltip-root {
    display:contents;
  }

  .tooltip-content {
    position:fixed;
    z-index:200;
    max-width:min(280px,calc(100vw - 24px));
    padding:8px 11px;
    border:1px solid #49606c;
    border-radius:9px;
    background:#192630;
    box-shadow:0 8px 22px #0009;
    color:#eaf2f4;
    font-size:12px;
    line-height:1.4;
    white-space:nowrap;
    pointer-events:none;
  }
</style>
