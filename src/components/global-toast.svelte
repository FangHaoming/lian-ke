<script>
  import Toast from './toast.svelte'
  import { toast } from '../lib/toast.js'
</script>

{#if $toast.message}
  {#key $toast.id}
    <Toast message={$toast.message} type={$toast.type} duration={$toast.duration} />
  {/key}
{/if}
