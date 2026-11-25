<script>
  import { challengeRoutes } from '../lib/challenge-catalog.js'
  import { appPath, isNativeRuntime } from '../lib/config.js'

  export let name = ''
  export let returnPath = appPath()

  $: target = challengeRoutes
    .flatMap((route) => route.levels.map((level) => ({ level })))
    .find((entry) => entry.level.name === name.trim())
  $: href = target
    ? isNativeRuntime()
      ? `${appPath()}#source?page=${encodeURIComponent(target.level.sourcePage)}&action=${encodeURIComponent(target.level.name)}&return=${encodeURIComponent(returnPath)}`
      : appPath(
          `source/?page=${encodeURIComponent(target.level.sourcePage)}&action=${encodeURIComponent(target.level.name)}&return=${encodeURIComponent(returnPath)}`,
        )
    : ''
</script>

{#if target}
  <a
    class="btn tiny ghost challenge-view-link"
    {href}
    aria-label={`查看挑战动作 ${target.level.name}`}
  >
    查看动作 ↗
  </a>
{/if}
