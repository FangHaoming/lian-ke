<script>
  import { dismissPwaInstall, pwaInstallState, requestPwaInstall } from '../lib/pwa-install.js'
  import { nativeTrainingAvailable } from '../lib/native-training.js'

  export let mode = 'prompt'

  $: visible =
    !nativeTrainingAvailable() &&
    (mode === 'settings' ||
      (!$pwaInstallState.installed &&
        !$pwaInstallState.dismissed &&
        ($pwaInstallState.installable ||
          $pwaInstallState.installing ||
          $pwaInstallState.manualInstall ||
          $pwaInstallState.ios)))

  async function install() {
    await requestPwaInstall()
  }
</script>

{#if visible}
  <section
    class:panel={mode === 'settings'}
    class:pwa-install-card={mode === 'settings'}
    class:pwa-install-prompt={mode === 'prompt'}
    aria-label="安装练刻"
  >
    <div class="pwa-install-icon" aria-hidden="true">⌂</div>
    <div class="pwa-install-copy">
      <strong>{$pwaInstallState.installed ? '练刻已安装' : '把练刻安装到桌面'}</strong>
      {#if $pwaInstallState.installed}
        <small>现在可以从桌面图标直接打开，并以独立窗口运行。</small>
      {:else if $pwaInstallState.installing}
        <small>正在请求浏览器打开安装窗口…</small>
      {:else if $pwaInstallState.installMessage}
        <small class="pwa-install-warning">{$pwaInstallState.installMessage}</small>
      {:else if $pwaInstallState.installable}
        <small>像普通 App 一样打开，训练记录和离线功能仍然可用。</small>
      {:else if $pwaInstallState.ios}
        <small>在 Safari 中点底部“分享”，再选择“添加到主屏幕”。</small>
      {:else}
        <small>使用 Chrome 或 Edge 的浏览器菜单，选择“安装练刻”或“添加到主屏幕”。</small>
      {/if}
    </div>
    {#if !$pwaInstallState.installed && $pwaInstallState.installable}
      <button
        class="btn primary pwa-install-button"
        disabled={$pwaInstallState.installing}
        on:click={install}
      >
        {$pwaInstallState.installing ? '正在安装…' : '立即安装'}
      </button>
    {/if}
    {#if mode === 'prompt'}
      <button class="pwa-install-dismiss" aria-label="暂不安装" on:click={dismissPwaInstall}>
        ×
      </button>
    {/if}
  </section>
{/if}
