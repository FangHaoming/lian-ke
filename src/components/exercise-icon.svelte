<script>
  export let kind = 'pushup'
  export let size = 32
</script>

<svg
  class="exercise-icon"
  width={size}
  height={size}
  viewBox="0 0 32 32"
  fill="none"
  aria-hidden="true"
  focusable="false"
>
  {#if kind === 'pushup'}
    <circle cx="26.2" cy="8.5" r="2.8" />
    <path
      class="pose-bold"
      d="M23.3 11 15.5 15.8 7.8 17.7M15.5 15.8l4.2 8M8 17.7 4.2 24M2.8 24h7M18.3 23.8h6"
    />
  {:else if kind === 'squat'}
    <circle transform="translate(-4 0)" cx="20" cy="5.5" r="2.6" />
    <path
      transform="translate(-4 0)"
      class="pose-bold"
      d="M20 8.5v5.8M20 10.8l-5.6 2.8M20 10.8l5.6 2.8M20 14.3l-7 5.3-3 5.4M20 14.3l7 5.3 3 5.4M8.2 25h5.2M26.6 25h5.2"
    />
  {:else if kind === 'pullup'}
    <circle cx="16" cy="12.2" r="2.5" />
    <path
      d="M4 7.2h24M8 7.2v3M24 7.2v3M13.8 14l-3.6-6.2M18.2 14l3.6-6.2M16 14.5v6.5M16 21l-5.3 3.7M16 21l5.3 3.7M10.7 24.7l-3.5 1.4M21.3 24.7l3.5 1.4"
    />
  {:else if kind === 'legraise'}
    <circle cx="9" cy="12" r="2.4" />
    <path
      d="M11.2 14.1 15.3 19l6.3-1.1M15.3 19l-5.7 5.2M21.6 17.9l4.6-6.8M8 25.2h7M22.5 10.4l2.2-2.8"
    />
  {:else if kind === 'bridge'}
    <circle cx="6.1" cy="20.3" r="2.3" />
    <path
      d="M8.3 19.6c4.2-8 9.7-10.1 15.5-4.7M8.3 19.6l-2.1 6M23.8 14.9l3.1 8M3.2 25.6h5M24.5 23h5"
    />
  {:else if kind === 'handstand'}
    <circle cx="16" cy="20.5" r="2.4" />
    <path
      d="M16 18v-7.2M16 13.5l-5 10.5M16 13.5l5 10.5M16 10.8l-4.4-6.2M16 10.8l4.4-6.2M8.2 25h5.1M18.7 25h5.1"
    />
  {/if}
</svg>

<style>
  .exercise-icon {
    display: block;
    overflow: visible;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .exercise-icon .pose-bold {
    stroke-width: 2.8;
  }
</style>
