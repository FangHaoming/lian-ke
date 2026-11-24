<script>
  import { appURL } from '../lib/config.js'

  export let guide = null
  export let compact = false
  let open = false
</script>

{#if guide}
  <div class:compact class:open class="action-guide-preview" on:mouseleave={() => (open = false)}>
    <button
      class="action-guide-preview-button"
      type="button"
      aria-label={`查看${guide.action}动作示范`}
      aria-expanded={open}
      on:click={() => (open = !open)}
    >
      <span aria-hidden="true">▶</span>
      查看动作
    </button>
    <div class="action-guide-preview-popover" role="tooltip">
      <strong>{guide.title}</strong>
      <img src={appURL(guide.gif)} alt={`${guide.action}动作示范`} />
    </div>
  </div>
{/if}

<style>
  .action-guide-preview {
    position: relative;
    display: inline-flex;
    flex: 0 0 auto;
  }

  .action-guide-preview-button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 32px;
    padding: 5px 10px;
    border: 1px solid #526977;
    border-radius: 999px;
    background: #172730;
    color: #d9e8eb;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    transition:
      border-color 160ms ease,
      color 160ms ease,
      background 160ms ease;
  }

  .action-guide-preview-button:hover,
  .action-guide-preview-button:focus-visible {
    border-color: #b7f36a;
    background: #213735;
    color: #b7f36a;
    outline: none;
  }

  .action-guide-preview-popover {
    position: absolute;
    z-index: 10;
    top: calc(100% + 10px);
    right: 0;
    width: min(220px, calc(100vw - 32px));
    max-height: min(360px, calc(100dvh - 118px));
    overflow: auto;
    padding: 9px;
    border: 1px solid #526977;
    border-radius: 14px;
    background: #101a20f5;
    box-shadow: 0 14px 32px #0009;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-6px) scale(0.97);
    transform-origin: top right;
    transition:
      opacity 150ms ease,
      transform 150ms ease;
  }

  .action-guide-preview:hover .action-guide-preview-popover,
  .action-guide-preview:focus-within .action-guide-preview-popover,
  .action-guide-preview.open .action-guide-preview-popover {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0) scale(1);
  }

  .action-guide-preview-popover strong {
    display: block;
    margin-bottom: 7px;
    color: #eff8f8;
    font-size: 12px;
    line-height: 1.35;
  }

  .action-guide-preview-popover img {
    display: block;
    width: 100%;
    max-height: 180px;
    border-radius: 9px;
    object-fit: cover;
    background: #0b1116;
  }

  .action-guide-preview.compact .action-guide-preview-button {
    min-height: 28px;
    padding: 4px 8px;
    font-size: 11px;
  }
</style>
