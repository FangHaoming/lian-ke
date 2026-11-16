// Complete only after release, so the browser can finish the input sequence
// before its touch target is removed.
export function createHoldToRelease({
  onChange,
  onComplete,
  delay = 1200,
  schedule = setTimeout,
  clear = clearTimeout,
}) {
  let timer
  let active = false
  let ready = false
  function cancel() {
    clear(timer)
    active = false
    ready = false
    onChange(false, false)
  }
  return {
    start() {
      if (active) return
      active = true
      onChange(true, false)
      timer = schedule(() => {
        if (!active) return
        ready = true
        onChange(true, true)
      }, delay)
    },
    release() {
      const complete = active && ready
      cancel()
      if (complete) onComplete()
    },
    cancel,
  }
}
