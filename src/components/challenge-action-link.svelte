<script>
  import { challengeRoutes } from '../lib/challenge-catalog.js'
  import { appPath } from '../lib/config.js'

  export let name = ''

  $: target = challengeRoutes
    .flatMap((route) => route.levels.map((level) => ({ level })))
    .find((entry) => entry.level.name === name.trim())
  $: href = target ? appPath(`source?page=${encodeURIComponent(target.level.sourcePage)}`) : ''
</script>

{#if target}
  <a
    class="btn tiny ghost challenge-view-link"
    {href}
    target="_blank"
    rel="noreferrer"
    aria-label={`查看挑战动作 ${target.level.name}`}
  >
    查看动作 ↗
  </a>
{/if}
