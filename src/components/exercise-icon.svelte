<script>
  import { appPath } from '../lib/config.js'

  export let kind = 'pushup'
  export let size = 32
  export let step = 0

  $: family = kind.startsWith('cc-') ? kind.split('-')[1] : kind
  $: level = Number(step) || Number(kind.match?.(/-(\d{2})$/)?.[1]) || 1
  $: src = `${appPath(`action-icons/${family}-${String(level).padStart(2, '0')}.png`)}?v=3`
</script>

<span class="exercise-icon" style={`width:${size}px;height:${size}px`}>
  <img {src} alt="" width={size} height={size} draggable="false" />
</span>

<style>
  .exercise-icon {
    display: inline-grid;
    place-items: center;
    overflow: hidden;
    flex: 0 0 auto;
  }

  .exercise-icon img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
  }
</style>
