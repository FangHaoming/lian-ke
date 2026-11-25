<script>
  import { onMount } from 'svelte'
  import {
    cloudSession,
    consumeAuthCallback,
    consumeSupabaseManagementCallback,
  } from '../lib/cloud.js'
  import { appPath } from '../lib/config.js'

  let status = '正在连接云端……'
  let detail = '请稍候，正在确认你的登录状态。'
  let completed = false
  let processing = true
  onMount(async () => {
    try {
      const callbackSearch = window.__liankeOAuthCallbackQuery || location.search
      window.__liankeOAuthCallbackQuery = ''
      const callbackParams = new URLSearchParams(callbackSearch)
      if (callbackParams.has('code') && callbackParams.get('app') === '1') {
        window.location.assign(`lianke://oauth/supabase/callback?${callbackParams.toString()}`)
        return
      }
      if (callbackParams.has('code')) {
        await consumeSupabaseManagementCallback(callbackSearch)
        status = '云端连接成功'
        detail = '已完成连接，可以返回设置页继续设置同步。'
        completed = true
        return
      }
      const callbackSession = await consumeAuthCallback()
      const session = callbackSession || cloudSession()
      if (callbackSession?.access_token && callbackSession.user?.id) {
        status = '账号验证成功'
        detail = '你的云端账号已准备就绪，可以返回设置页继续使用。'
        completed = true
      } else if (!callbackSession && session?.access_token) {
        status = '当前登录状态有效'
        detail = '可以返回设置页继续使用。'
        completed = true
      } else {
        status = '授权链接无效或已过期'
        detail = '请回到设置页重新注册或发送验证邮件。'
      }
    } catch (error) {
      status = '云端连接失败'
      detail = error.message || '请回到设置页重试。'
    } finally {
      processing = false
    }
  })

  function returnHome() {
    // GitHub Pages does not serve client-side routes such as /settings
    // directly. Return to the app entry and let the client router select the
    // settings tab from the hash instead of triggering a server-side 404.
    window.location.assign(`${appPath()}?tab=settings`)
  }
</script>

<main class="auth-callback-page">
  <section class="panel auth-callback-card" aria-live="polite">
    <div class="auth-callback-mark" aria-hidden="true">{completed ? '✓' : '↗'}</div>
    <span class="challenge-eyebrow">练刻 · 云端连接</span>
    <h1>{status}</h1>
    <p class="muted">{detail}</p>
    {#if !processing}
      <button type="button" class="btn primary" on:click={returnHome}>返回设置</button>
    {/if}
  </section>
</main>
