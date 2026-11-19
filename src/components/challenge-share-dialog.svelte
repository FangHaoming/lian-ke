<script>
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte'
  import { stageLabels } from '../lib/challenge-catalog.js'
  import { completionStage, formatGoal } from '../lib/challenge-model.js'
  import { appPath, appURL } from '../lib/config.js'
  import { encodeShareToken } from '../lib/share-token.js'
  import { showToast } from '../lib/toast.js'

  export let open = false
  export let posterData
  export let shareOptions = []

  const dispatch = createEventDispatcher()
  let shareMode = 'level'
  let posterCanvas
  let posterUrl = ''
  let posterLogo
  let posterLogoReady = false
  let posterAction
  let posterActionReady = false
  let posterActionKey = ''
  let posterQr
  let posterQrReady = false
  let selectedRouteId = ''
  let selectedLevelId = ''
  let openMenu = ''
  let lastOpen = false
  let scrollLockStyles

  $: if (open !== lastOpen) {
    lastOpen = open
    if (open) {
      selectedRouteId = posterData?.routeId || shareOptions[0]?.id || ''
      selectedLevelId = posterData?.levelId || ''
      lockPageScroll()
    } else {
      unlockPageScroll()
    }
  }

  $: selectedRoute = shareOptions.find((item) => item.id === selectedRouteId)
  $: availableLevels = selectedRoute?.progress || []

  onDestroy(unlockPageScroll)

  function lockPageScroll() {
    if (typeof document === 'undefined' || scrollLockStyles) return
    scrollLockStyles = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      bodyTouchAction: document.body.style.touchAction,
    }
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
  }

  function unlockPageScroll() {
    if (typeof document === 'undefined' || !scrollLockStyles) return
    document.documentElement.style.overflow = scrollLockStyles.htmlOverflow
    document.body.style.overflow = scrollLockStyles.bodyOverflow
    document.body.style.touchAction = scrollLockStyles.bodyTouchAction
    scrollLockStyles = null
  }

  function handleWindowClick(event) {
    if (openMenu && !event.target?.closest?.('.challenge-share-mode-wrap')) {
      openMenu = ''
    }
  }

  function chooseRoute(routeId) {
    selectedRouteId = routeId
    const nextRoute = shareOptions.find((item) => item.id === routeId)
    const nextLevel =
      nextRoute?.progress.find((item) => item.completed)?.level || nextRoute?.progress[0]?.level
    selectedLevelId = nextLevel?.id || ''
    dispatch('select', { routeId: selectedRouteId, levelId: selectedLevelId })
    openMenu = shareMode === 'level' ? 'level' : ''
  }

  function chooseLevel(levelId) {
    selectedLevelId = levelId
    dispatch('select', { routeId: selectedRouteId, levelId: selectedLevelId })
    openMenu = ''
  }

  async function toggleModeMenu(mode) {
    if (shareMode !== mode) await selectShareMode(mode)
    openMenu = openMenu === mode ? '' : mode
  }

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
    syncPosterAction()
    loadQrCode()
  })

  $: if (posterData && shareMode) syncPosterAction()

  function syncPosterAction() {
    const actionLevel =
      shareMode === 'route' ? posterData?.latestPassedLevel || posterData?.level : posterData?.level
    if (typeof Image === 'undefined' || !posterData?.routeId || !actionLevel?.step) return
    const actionKey = `${posterData.routeId}-${actionLevel.step}`
    if (actionKey === posterActionKey) return
    posterActionKey = actionKey
    posterActionReady = false
    posterAction = new Image()
    posterAction.onload = () => {
      if (posterActionKey !== actionKey) return
      posterActionReady = true
      if (open) drawPoster()
    }
    posterAction.src = appPath(
      `action-icons/${posterData.routeId}-${String(actionLevel.step).padStart(2, '0')}.png`,
    )
  }

  async function loadQrCode() {
    if (!posterData) return
    posterQrReady = false
    posterQr = null
    const challengeUrl = new URL(await shareUrl())
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

  function drawPosterAction(context) {
    if (!posterActionReady) return
    context.drawImage(posterAction, 576, 36, 136, 136)
  }

  function drawPoster() {
    if (!posterCanvas || !posterData) return
    const canvas = posterCanvas
    const context = canvas.getContext('2d')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
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
    if (posterLogoReady) context.drawImage(posterLogo, 57, 92, 40, 40)
    context.fillStyle = '#b7f36a'
    context.font = '800 24px system-ui, sans-serif'
    context.fillText('练刻', 116, 113)
    context.font = '700 17px system-ui, sans-serif'
    context.fillText('LIAN KE  /  CHALLENGE LOG', 116, 140)

    if (shareMode === 'level') {
      drawPosterAction(context)
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
      drawPosterAction(context)
      drawFittedText(context, '单个动作路线', 56, 215, 604, 26, '#b7f36a', 700)
      drawFittedText(context, posterData.routeName, 56, 285, 604, 52, '#eaf2f4', 800)
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
        context.fillStyle = '#2d4039'
        context.beginPath()
        context.roundRect(x + 16, y + 68, 148, 6, 3)
        context.fill()
        context.fillStyle = '#b7f36a'
        context.beginPath()
        context.roundRect(x + 16, y + 68, 148 * (routeItem.count / 10), 6, 3)
        context.fill()
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
    if (mode === 'overview') openMenu = ''
    loadQrCode()
    await tick()
    drawPoster()
  }

  async function shareUrl() {
    const url = new URL(appURL('share'))
    const payload = {
      mode: shareMode,
      route: shareMode === 'overview' ? '' : posterData.routeId,
      level:
        shareMode === 'overview'
          ? ''
          : shareMode === 'route'
            ? posterData.latestPassedLevel?.id || posterData.levelId
            : posterData.levelId,
      count: shareMode === 'route' ? posterData.routeCount : 0,
      attempts:
        shareMode === 'route'
          ? posterData.attempts.filter((attempt) =>
              String(attempt.levelId).startsWith(`${posterData.routeId}-`),
            ).length
          : 0,
      completed: shareMode === 'overview' ? posterData.completedCount : 0,
      routes: shareMode === 'overview' ? posterData.routes.map((route) => route.count) : [],
      achieved:
        shareMode === 'level'
          ? Object.keys(posterData.selected?.achieved || {}).filter(
              (stage) => posterData.selected.achieved[stage],
            )
          : [],
    }
    url.searchParams.set('s', await encodeShareToken(payload))
    return url.href
  }

  async function copyShareLink() {
    const url = await shareUrl()
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const input = document.createElement('textarea')
        input.value = url
        input.setAttribute('readonly', '')
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        input.remove()
      }
      showToast('分享链接已复制，可直接发送给朋友', { type: 'success' })
    } catch {
      showToast('复制失败，请手动复制分享链接', { type: 'error' })
    }
  }

  function posterFileName() {
    const now = new Date()
    const pad = (value) => String(value).padStart(2, '0')
    const timestamp =
      [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('') +
      `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    return `lian-ke-challenge-${timestamp}.png`
  }

  function dataUrlBlob(dataUrl) {
    const [header, encoded] = dataUrl.split(',', 2)
    if (!header || !encoded) return null
    const mime = header.match(/data:(.*?);base64/)?.[1] || 'image/png'
    const binary = atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return new Blob([bytes], { type: mime })
  }

  function downloadPoster() {
    if (!posterUrl) {
      showToast('海报还在生成，请稍后再试', { type: 'info' })
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
    const blob = dataUrlBlob(posterUrl)
    const imageUrl = blob ? URL.createObjectURL(blob) : posterUrl
    const popup = window.open('', '_blank')
    if (!popup) {
      const link = document.createElement('a')
      link.href = imageUrl
      link.target = '_blank'
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
    } else {
      popup.opener = null
      popup.location.href = imageUrl
    }
    if (blob) setTimeout(() => URL.revokeObjectURL(imageUrl), 60_000)
    showToast(`已打开海报，请长按图片${action}到相册或通过系统菜单分享`, { type: 'info' })
  }
</script>

<svelte:window on:click={handleWindowClick} />

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
        <div class="challenge-share-mode-wrap">
          <button
            type="button"
            class:active={shareMode === 'level'}
            role="tab"
            aria-selected={shareMode === 'level'}
            aria-haspopup="menu"
            aria-expanded={openMenu === 'level'}
            on:click={() => toggleModeMenu('level')}
          >
            单个动作
          </button>
          {#if openMenu === 'level'}
            <div class="challenge-share-menu challenge-share-level-menu" role="menu">
              <span class="challenge-share-menu-label">选择动作</span>
              {#each shareOptions as option}
                <button
                  type="button"
                  role="menuitem"
                  class:chosen={selectedRouteId === option.id}
                  on:click={() => chooseRoute(option.id)}
                >
                  {option.name}
                  {#if selectedRouteId === option.id}<span>✓</span>{/if}
                </button>
              {/each}
              <span class="challenge-share-menu-label">选择关卡</span>
              {#each availableLevels as state}
                <button
                  type="button"
                  role="menuitem"
                  class:chosen={selectedLevelId === state.level.id}
                  on:click={() => chooseLevel(state.level.id)}
                >
                  第 {String(state.level.step).padStart(2, '0')} 关 · {state.level.name}
                  {#if selectedLevelId === state.level.id}<span>✓</span>{/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
        <div class="challenge-share-mode-wrap">
          <button
            type="button"
            class:active={shareMode === 'route'}
            role="tab"
            aria-selected={shareMode === 'route'}
            aria-haspopup="menu"
            aria-expanded={openMenu === 'route'}
            on:click={() => toggleModeMenu('route')}
          >
            单个动作路线
          </button>
          {#if openMenu === 'route'}
            <div class="challenge-share-menu" role="menu">
              <span class="challenge-share-menu-label">选择动作路线</span>
              {#each shareOptions as option}
                <button
                  type="button"
                  role="menuitem"
                  class:chosen={selectedRouteId === option.id}
                  on:click={() => chooseRoute(option.id)}
                >
                  {option.name}
                  {#if selectedRouteId === option.id}<span>✓</span>{/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
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
      <p class="muted small challenge-share-note">
        <span class="challenge-share-desktop-note">
          海报会展示你的通关数、成就和当前挑战，不包含任何个人账号信息。
        </span>
        <span class="challenge-share-mobile-note">长按图片保存到相册</span>
      </p>
      <div class="row challenge-share-actions">
        <button
          type="button"
          class="btn primary challenge-share-only-button"
          on:click={copyShareLink}
        >
          复制链接
        </button>
        <button
          type="button"
          class="btn ghost challenge-save-only-button"
          on:click={downloadPoster}
        >
          保存图片
        </button>
      </div>
    </section>
  </div>
{/if}

<style>
  :global(.challenge-share-backdrop) {
    overflow: hidden;
    overscroll-behavior: contain;
    touch-action: none;
  }

  :global(.challenge-share-dialog) {
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
  }

  .challenge-share-modes {
    position: relative;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .challenge-share-mode-wrap {
    position: relative;
    min-width: 0;
  }

  .challenge-share-mode-wrap > button {
    width: 100%;
  }

  .challenge-share-menu {
    position: absolute;
    z-index: 5;
    top: calc(100% + 8px);
    left: 0;
    width: max-content;
    min-width: 190px;
    max-width: 290px;
    max-height: min(360px, 55vh);
    overflow: auto;
    padding: 7px;
    border: 1px solid #58745b;
    border-radius: 12px;
    background: linear-gradient(145deg, #1b2b32, #162320);
    box-shadow: 0 16px 34px #000b;
  }

  .challenge-share-level-menu {
    left: 0;
    width: min(290px, calc(200% + 6px));
  }

  .challenge-share-menu-label {
    display: block;
    padding: 7px 9px 4px;
    color: #9eb5ad;
    font-size: 11px;
  }

  .challenge-share-menu button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 9px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: #dbe8e8;
    text-align: left;
    font-size: 12px;
  }

  .challenge-share-menu button:hover,
  .challenge-share-menu button.chosen {
    border-color: #698d50;
    background: #b7f36a18;
    color: #eff9e8;
  }

  .challenge-share-menu button.chosen {
    font-weight: 750;
  }

  .challenge-share-menu button span {
    color: #b7f36a;
  }

  .challenge-share-modes button {
    min-width: 0;
    padding-inline: 4px;
    white-space: nowrap;
    font-size: 11px;
  }

  .challenge-share-actions {
    justify-content: center;
  }

  @media (max-width: 600px) {
    .challenge-share-actions {
      display: grid;
      grid-template-columns: 1fr;
      width: 100%;
    }

    .challenge-share-actions .btn {
      display: block;
      width: 100%;
    }

    .challenge-share-actions .challenge-save-only-button {
      display: none;
    }
  }
</style>
