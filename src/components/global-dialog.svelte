<script>
  import ConfirmDialog from './confirm-dialog.svelte'
  import { confirmDialog, finishConfirm } from '../lib/confirm-dialog.js'
</script>

<ConfirmDialog
  open={$confirmDialog.open}
  title={$confirmDialog.title}
  confirmText={$confirmDialog.confirmText}
  cancelText={$confirmDialog.cancelText}
  destructive={$confirmDialog.destructive}
  on:confirm={() => finishConfirm({ confirmed: true })}
  on:cancel={() => finishConfirm({ confirmed: false })}
>
  {#if $confirmDialog.children}
    <svelte:component this={$confirmDialog.children} {...$confirmDialog.childrenProps} />
  {/if}
</ConfirmDialog>
