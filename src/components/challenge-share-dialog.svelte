<script>
  import { createEventDispatcher, onMount, tick } from 'svelte'
  import { stageLabels } from '../lib/challenge-catalog.js'
  import { completionStage, formatGoal } from '../lib/challenge-model.js'
  import { appPath, baseURL } from '../lib/config.js'

  export let open = false
  export let posterData

  const dispatch = createEventDispatcher()
  let shareMode = 'overview'
  let posterCanvas
  let posterUrl = ''
  let shareStatus = ''
  let posterLogo
  let posterLogoReady = false
  let posterQr
  let posterQrReady = false

  $: if (open && posterData) {
    tick().then(() => {
      if (posterCanvas) drawPoster()
    })
  }

  onMount(() => {
    posterLogo = new Image()
    posterLogo.onload = () => {
      posterLogoReady = true
      if (open) drawPoster()
    }
    posterLogo.src = appPath('fit-log-icon.png')
    loadQrCode()
  })

  async function loadQrCode() {
    if (!posterData) return
    posterQrReady = false
    posterQr = null
    const challengeUrl = new URL('challenges', baseURL)
    if (shareMode !== 'overview') challengeUrl.searchParams.set('route', posterData.routeId)
    if (shareMode === 'level') challengeUrl.searchParams.set('level', posterData.levelId)
    try {
      const response = await fetch(
        `https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=png&data=${encodeURIComponent(challengeUrl.href)}`,
      )
      if (!response.ok) throw new Error('二维码加载失败')
      const blob = await response.blob()
      posterQr = new Image()
      posterQr.onload = () => {
        posterQrReady = true
        if (open) drawPoster()
      }
      posterQr.src = URL.createObjectURL(blob)
    } catch {
      posterQr = null
    }
  }

  function drawFittedText(context, text, x, y, maxWidth, size, color, weight = 700) {
    let fontSize = size
    context.fillStyle = color
    context.font = `${weight} ${fontSize}px system-ui, sans-serif`
    while (context.measureText(text).width > maxWidth && fontSize > 14) {
      fontSize -= 1
      context.font = `${weight} ${fontSize}px system-ui, sans-serif`
    }
    context.fillText(text, x, y)
  }

  function drawPoster() {
    if (!posterCanvas || !posterData) return
    const canvas = posterCanvas
    const context = canvas.getContext('2d')
    const width = 720
    const height = 960
    const now = new Date()
    const posterDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
    context.clearRect(0, 0, width, height)
    context.save()
    context.beginPath()
    context.roundRect(8, 8, width - 16, height - 16, 28)
    context.clip()
    const gradient = context.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#17251d')
    gradient.addColorStop(0.52, '#101a21')
    gradient.addColorStop(1, '#0b1015')
    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)

    context.fillStyle = '#b7f36a'
    context.globalAlpha = 0.14
    context.beginPath()
    context.arc(660, 105, 125, 0, Math.PI * 2)
    context.fill()
    context.globalAlpha = 1
    context.fillStyle = '#0f171e'
    context.beginPath()
    context.roundRect(52, 87, 50, 50, 14)
    context.fill()
    context.fillStyle = '#17232c'
    context.beginPath()
    context.roundRect(54, 89, 46, 46, 12)
    context.fill()
    context.strokeStyle = '#3b5361'
    context.lineWidth = 1
    context.stroke()
    if (posterLogoReady) context.drawImage(posterLogo, 60, 95, 34, 34)
    context.fillStyle = '#b7f36a'
    context.font = '800 24px system-ui, sans-serif'
    context.fillText('练刻', 116, 113)
    context.font = '700 17px system-ui, sans-serif'
    context.fillText('LIAN KE  /  CHALLENGE LOG', 116, 140)

    if (shareMode === 'level') {
      drawFittedText(
        context,
        `${posterData.routeName} · 第 ${String(posterData.level.step).padStart(2, '0')} 关`,
        56,
        215,
        604,
        26,
        '#b7f36a',
        700,
      )
      drawFittedText(context, posterData.level.name, 56, 285, 604, 52, '#eaf2f4', 800)
      context.fillStyle = '#9fb0b4'
      context.font = '400 22px system-ui, sans-serif'
      context.fillText(posterData.level.englishName, 58, 328)
      context.fillStyle = '#b7f36a'
      context.font = '700 20px system-ui, sans-serif'
      context.fillText('本关通关标准', 58, 432)
      drawFittedText(
        context,
        formatGoal(posterData.level, completionStage(posterData.level)),
        58,
        486,
        604,
        34,
        '#eaf2f4',
        800,
      )
      drawFittedText(context, posterData.level.tip, 58, 535, 604, 18, '#9fb0b4', 400)
    } else if (shareMode === 'route') {
      drawFittedText(context, '单个动作路线', 56, 215, 604, 26, '#b7f36a', 700)
      drawFittedText(context, posterData.routeName, 56, 285, 604, 52, '#eaf2f4', 800)
      context.fillStyle = '#9fb0b4'
      context.font = '400 22px system-ui, sans-serif'
      context.fillText('十式进阶 · 我的完整挑战路线', 58, 328)
      context.fillStyle = '#b7f36a'
      context.font = '800 104px system-ui, sans-serif'
      context.fillText(String(posterData.routeCount).padStart(2, '0'), 56, 438)
      context.fillStyle = '#92a5ac'
      context.font = '500 24px system-ui, sans-serif'
      context.fillText('/ 10  已通关', 230, 438)
      context.fillStyle = '#2d4039'
      context.beginPath()
      context.roundRect(58, 520, 604, 14, 7)
      context.fill()
      context.fillStyle = '#b7f36a'
      context.beginPath()
      context.roundRect(58, 520, Math.max(14, 604 * (posterData.routeCount / 10)), 14, 7)
      context.fill()
    } else {
      drawFittedText(context, '六种动作 · 挑战总览', 56, 215, 604, 48, '#eaf2f4', 800)
      context.fillStyle = '#9fb0b4'
      context.font = '400 22px system-ui, sans-serif'
      context.fillText('六条动作路线，记录每一步完成情况。', 58, 258)
      context.fillStyle = '#b7f36a'
      context.font = '800 104px system-ui, sans-serif'
      context.fillText(String(posterData.completedCount).padStart(2, '0'), 56, 438)
      context.fillStyle = '#92a5ac'
      context.font = '500 24px system-ui, sans-serif'
      context.fillText('/ 60  已通关', 230, 438)
      context.fillStyle = '#2d4039'
      context.beginPath()
      context.roundRect(58, 520, 604, 14, 7)
      context.fill()
      context.fillStyle = '#b7f36a'
      context.beginPath()
      context.roundRect(58, 520, Math.max(14, 604 * (posterData.completedCount / 60)), 14, 7)
      context.fill()
    }

    if (shareMode === 'level') {
      // Single-level content already has its own title and standard above.
    } else if (shareMode === 'route') {
      // Route content already has its progress bar above.
    } else {
      posterData.routes.forEach((routeItem, index) => {
        const column = index % 3
        const row = Math.floor(index / 3)
        const x = 58 + column * 205
        const y = 560 + row * 105
        context.fillStyle = '#18242b'
        context.beginPath()
        context.roundRect(x, y, 180, 78, 14)
        context.fill()
        context.fillStyle = '#a9c5cf'
        context.font = '500 16px system-ui, sans-serif'
        context.fillText(routeItem.name, x + 16, y + 28)
        context.fillStyle = '#f1f7f7'
        context.font = '800 28px system-ui, sans-serif'
        context.fillText(String(routeItem.count), x + 16, y + 62)
        context.fillStyle = '#788d95'
        context.font = '500 15px system-ui, sans-serif'
        context.fillText('/ 10 关', x + 54, y + 62)
      })
    }

    if (shareMode === 'level' || shareMode === 'route') {
      const stats =
        shareMode === 'level'
          ? posterData.stages.map((stageKey) => [
              stageLabels[stageKey],
              posterData.selected.achieved[stageKey] ? '✓' : '未达成',
              posterData.selected.achieved[stageKey] ? '已达成' : '',
            ])
          : [
              ['已通关', posterData.routeCount, '/ 10'],
              [
                '最终技',
                posterData.routeCount === 10 ? '✓' : '未达成',
                posterData.routeCount === 10 ? '已达成' : '',
              ],
              ['挑战记录', posterData.attempts.length, '次'],
            ]
      stats.forEach(([label, value, suffix], index) => {
        const x = 58 + index * 205
        context.fillStyle = '#18242b'
        context.beginPath()
        context.roundRect(x, 560, 180, 120, 14)
        context.fill()
        context.fillStyle = '#a9c5cf'
        context.font = '500 17px system-ui, sans-serif'
        context.fillText(label, x + 18, 592)
        context.fillStyle = value === '未达成' ? '#788d95' : '#f1f7f7'
        context.font = '800 35px system-ui, sans-serif'
        context.fillText(String(value), x + 18, 640)
        const valueWidth = context.measureText(String(value)).width
        context.fillStyle = '#788d95'
        context.font = '500 17px system-ui, sans-serif'
        context.fillText(suffix, x + 18 + valueWidth + 6, 640)
      })
    }

    if (posterQrReady) {
      const qrY = 783
      context.fillStyle = '#f4f7f1'
      context.beginPath()
      context.roundRect(535, qrY, 132, 132, 10)
      context.fill()
      context.drawImage(posterQr, 545, qrY + 10, 112, 112)
      context.fillStyle = '#82969d'
      context.font = '400 14px system-ui, sans-serif'
      context.textAlign = 'center'
      context.fillText('扫码查看挑战', 601, qrY + 155)
      context.textAlign = 'start'
    }
    context.fillStyle = '#b7f36a'
    context.font = '700 19px system-ui, sans-serif'
    context.fillText('循序渐进 · 持续变强', 58, 878)
    context.fillStyle = '#5d7078'
    context.font = '400 16px system-ui, sans-serif'
    context.fillText(`练刻 · 我的挑战记录 · ${posterDate}`, 58, 918)
    context.restore()
    context.beginPath()
    context.roundRect(8, 8, width - 16, height - 16, 28)
    context.strokeStyle = '#58745b'
    context.lineWidth = 3
    context.stroke()
    posterUrl = canvas.toDataURL('image/png')
  }

  async function selectShareMode(mode) {
    shareMode = mode
    shareStatus = ''
    loadQrCode()
    await tick()
    drawPoster()
  }

  function posterBlob() {
    return new Promise((resolve) => posterCanvas?.toBlob(resolve, 'image/png'))
  }

  function posterFileName() {
    const now = new Date()
    const pad = (value) => String(value).padStart(2, '0')
    const timestamp =
      [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('') +
      `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    return `lian-ke-challenge-${timestamp}.png`
  }

  async function sharePoster() {
    const blob = await posterBlob()
    if (!blob) {
      shareStatus = '海报还在生成，请稍后再试'
      return
    }
    const file = new File([blob], posterFileName(), { type: 'image/png' })
    let canShareFile = false
    try {
      canShareFile =
        Boolean(navigator.share) && (!navigator.canShare || navigator.canShare({ files: [file] }))
    } catch {
      canShareFile = false
    }
    if (canShareFile) {
      try {
        await navigator.share({
          title: '我的挑战进度',
          text: '我在练刻记录了自己的挑战进度',
          files: [file],
        })
        shareStatus = '已打开系统分享面板'
      } catch (error) {
        if (error?.name !== 'AbortError') shareStatus = '分享未完成，可以改为保存图片'
      }
      return
    }
    openPosterImage('分享')
  }

  function downloadPoster() {
    if (!posterUrl) {
      shareStatus = '海报还在生成，请稍后再试'
      return
    }
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      openPosterImage('保存')
      return
    }
    const link = document.createElement('a')
    link.href = posterUrl
    link.download = posterFileName()
    link.click()
  }

  function openPosterImage(action) {
    const link = document.createElement('a')
    link.href = posterUrl
    link.target = '_blank'
    link.rel = 'noopener'
    link.click()
    shareStatus = `已打开海报，请长按图片${action}到相册或通过系统菜单分享`
  }
</script>

{#if open}
  <div class="challenge-share-backdrop" role="presentation" on:click|self={() => dispatch('close')}>
    <section
      class="challenge-share-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-poster-title"
    >
      <div class="row between">
        <div>
          <span class="challenge-eyebrow">CHALLENGE POSTER</span>
          <h2 id="share-poster-title">分享我的进度</h2>
        </div>
        <button
          type="button"
          class="btn tiny ghost"
          aria-label="关闭分享海报"
          on:click={() => dispatch('close')}
        >
          关闭
        </button>
      </div>
      <div class="challenge-share-modes" role="tablist" aria-label="选择分享范围">
        <button
          type="button"
          class:active={shareMode === 'level'}
          role="tab"
          aria-selected={shareMode === 'level'}
          on:click={() => selectShareMode('level')}
        >
          单个动作
        </button>
        <button
          type="button"
          class:active={shareMode === 'route'}
          role="tab"
          aria-selected={shareMode === 'route'}
          on:click={() => selectShareMode('route')}
        >
          单个动作路线
        </button>
        <button
          type="button"
          class:active={shareMode === 'overview'}
          role="tab"
          aria-selected={shareMode === 'overview'}
          on:click={() => selectShareMode('overview')}
        >
          所有动作路线
        </button>
      </div>
      <div class="challenge-poster-preview">
        <canvas
          bind:this={posterCanvas}
          width="720"
          height="960"
          aria-label="挑战进度海报预览"
        ></canvas>
        {#if posterUrl}<img src={posterUrl} alt="我的挑战进度海报" />{/if}
      </div>
      <p class="muted small">海报会展示你的通关数、成就和当前挑战，不包含任何个人账号信息。</p>
      <div class="row challenge-share-actions">
        <button type="button" class="btn primary" on:click={sharePoster}>分享</button>
        <button type="button" class="btn ghost" on:click={downloadPoster}>保存图片</button>
      </div>
      {#if shareStatus}<p class="challenge-share-status" role="status">{shareStatus}</p>{/if}
    </section>
  </div>
{/if}

<style>
  .challenge-share-modes {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .challenge-share-modes button {
    min-width: 0;
    padding-inline: 4px;
    white-space: nowrap;
    font-size: 11px;
  }
</style>
