<script>
  import { onMount } from 'svelte'
  import { cloudSession, consumeAuthCallback } from '../lib/cloud.js'
  import { appPath } from '../lib/config.js'

  let status = '正在处理邮箱授权……'
  let detail = '请稍候，正在确认你的登录状态。'
  let completed = false
  const homePath = appPath()

  onMount(async () => {
    const callbackSession = await consumeAuthCallback()
    const session = callbackSession || cloudSession()
    if (callbackSession?.access_token && callbackSession.user?.id) {
      status = '邮箱授权成功'
      detail = '你的账号已经登录，可以返回练刻继续训练。'
      completed = true
    } else if (!callbackSession && session?.access_token) {
      status = '当前登录状态有效'
      detail = '可以返回练刻继续训练。'
      completed = true
    } else {
      status = '授权链接无效或已过期'
      detail = '请回到设置页重新注册或发送验证邮件。'
    }
  })

  function returnHome() {
    window.location.assign(homePath)
  }
</script>

<main class="auth-callback-page">
  <section class="panel auth-callback-card" aria-live="polite">
    <div class="auth-callback-mark" aria-hidden="true">{completed ? '✓' : '↗'}</div>
    <span class="challenge-eyebrow">练刻 · 邮箱授权</span>
    <h1>{status}</h1>
    <p class="muted">{detail}</p>
    <button type="button" class="btn primary" on:click={returnHome}>返回练刻</button>
  </section>
</main>
