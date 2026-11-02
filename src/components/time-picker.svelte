<script>
  import { onDestroy } from 'svelte'
  import { fmt, num } from '../lib/workout-model.js'
  export let value = 0
  export let label = '时间'
  export let max = 86399
  let dialog
  let minutesWheel
  let secondsWheel
  let minutes = 0
  let seconds = 0
  let scrollTimer

  $: maxMinutes = Math.floor(num(max, 0, 86399) / 60)
  $: minuteOptions = Array.from({ length: maxMinutes + 1 }, (_, index) => index)
  $: secondOptions = Array.from({ length: 60 }, (_, index) => index)

  function open() {
    const current = num(value, 0, max)
    minutes = Math.floor(current / 60)
    seconds = current % 60
    dialog.showModal()
    requestAnimationFrame(() => {
      scrollTo(minutesWheel, minutes)
      scrollTo(secondsWheel, seconds)
    })
  }
  function scrollTo(element, index) {
    element?.scrollTo({ top: index * 64, behavior: 'auto' })
  }
  function choose(kind, index) {
    setSelected(kind, index)
    scrollTo(kind === 'minutes' ? minutesWheel : secondsWheel, index)
  }
  function setSelected(kind, index) {
    if (kind === 'minutes') minutes = index
    else seconds = index
  }
  function syncScroll(kind, event) {
    clearTimeout(scrollTimer)
    const maxIndex = kind === 'minutes' ? maxMinutes : 59
    const index = Math.min(maxIndex, Math.max(0, Math.round(event.currentTarget.scrollTop / 64)))
    scrollTimer = setTimeout(() => {
      scrollTo(kind === 'minutes' ? minutesWheel : secondsWheel, index)
      setSelected(kind, index)
    }, 100)
  }
  function confirm() {
    value = Math.min(num(minutes, 0, maxMinutes) * 60 + num(seconds, 0, 59), num(max, 0, 86399))
    dialog.close()
  }
  onDestroy(() => clearTimeout(scrollTimer))
</script>

<label class="field">
  {label}
  <button type="button" class="btn ghost time-input" on:click={open}>{fmt(value)}</button>
</label>
<dialog class="time-dialog" bind:this={dialog}>
  <h3>选择时间</h3>
  <div class="time-pickers">
    <div class="wheel-wrap">
      <div class="wheel-title">分钟</div>
      <div
        class="wheel"
        bind:this={minutesWheel}
        on:scroll={(event) => syncScroll('minutes', event)}
      >
        {#each minuteOptions as option}<button
            type="button"
            class:active={minutes === option}
            class="wheel-option"
            on:click={() => choose('minutes', option)}
          >
            {String(option).padStart(2, '0')}
          </button>{/each}
      </div>
    </div>
    <div class="wheel-wrap">
      <div class="wheel-title">秒钟</div>
      <div
        class="wheel"
        bind:this={secondsWheel}
        on:scroll={(event) => syncScroll('seconds', event)}
      >
        {#each secondOptions as option}<button
            type="button"
            class:active={seconds === option}
            class="wheel-option"
            on:click={() => choose('seconds', option)}
          >
            {String(option).padStart(2, '0')}
          </button>{/each}
      </div>
    </div>
  </div>
  <div class="row between">
    <button type="button" class="btn ghost" on:click={() => dialog.close()}>取消</button>
    <button type="button" class="btn primary" on:click={confirm}>确定</button>
  </div>
</dialog>
