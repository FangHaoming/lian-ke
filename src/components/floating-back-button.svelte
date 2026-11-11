<script>
  import { createEventDispatcher, onDestroy } from 'svelte'

  export let label = '返回'
  const dispatch = createEventDispatcher()
  let button
  let dragging = false
  let moved = false
  let pointerId = null
  let startX = 0
  let startY = 0
  let startLeft = 0
  let startTop = 0
  let left = null
  let top = null

  $: positionStyle =
    left == null || top == null ? '' : `left:${left}px;top:${top}px;right:auto;bottom:auto;`

  function beginDrag(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerId = event.pointerId
    startX = event.clientX
    startY = event.clientY
    const rect = button.getBoundingClientRect()
    startLeft = rect.left
    startTop = rect.top
    moved = false
    dragging = true
    button.setPointerCapture?.(pointerId)
  }

  function moveDrag(event) {
    if (!dragging || event.pointerId !== pointerId) return
    const deltaX = event.clientX - startX
    const deltaY = event.clientY - startY
    if (!moved && Math.hypot(deltaX, deltaY) < 5) return
    moved = true
    const maxLeft = Math.max(8, window.innerWidth - button.offsetWidth - 8)
    const maxTop = Math.max(8, window.innerHeight - button.offsetHeight - 8)
    left = Math.min(maxLeft, Math.max(8, startLeft + deltaX))
    top = Math.min(maxTop, Math.max(8, startTop + deltaY))
    event.preventDefault()
  }

  function endDrag(event) {
    if (!dragging || event.pointerId !== pointerId) return
    dragging = false
    button.releasePointerCapture?.(pointerId)
    pointerId = null
  }

  function activate() {
    if (!moved) dispatch('click')
    moved = false
  }

  onDestroy(() => {
    pointerId = null
  })
</script>

<button
  bind:this={button}
  type="button"
  class:dragging
  class="floating-back-button"
  style={positionStyle}
  aria-label={label}
  on:pointerdown={beginDrag}
  on:pointermove={moveDrag}
  on:pointerup={endDrag}
  on:pointercancel={endDrag}
  on:click|preventDefault={activate}
>
  <span aria-hidden="true">←</span>
  {label}
</button>

<style>
  .floating-back-button {
    position: fixed;
    right: 18px;
    bottom: calc(22px + env(safe-area-inset-bottom, 0px));
    z-index: 45;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 48px;
    padding: 0 16px;
    border: 1px solid #d2ffa7;
    border-radius: 999px;
    background: #b7f36a;
    color: #14200a;
    box-shadow: 0 10px 28px #0008;
    font-size: 13px;
    font-weight: 800;
    cursor: grab;
    touch-action: none;
    user-select: none;
    transition: background 0.15s;
  }

  .floating-back-button span {
    font-size: 17px;
  }

  .floating-back-button:hover {
    background: #d0ff9a;
  }

  .floating-back-button:focus-visible {
    outline: 3px solid #eaf8d7;
    outline-offset: 3px;
  }

  .floating-back-button.dragging {
    cursor: grabbing;
    transition: none;
  }

  @media (max-width: 600px) {
    .floating-back-button {
      right: 18px;
      bottom: calc(22px + env(safe-area-inset-bottom, 0px));
    }
  }
</style>
