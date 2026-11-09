<script>
  import { onMount } from 'svelte'
  import { defaults, completedRecords } from '../lib/workout-model.js'
  import { normalizeChallenges } from '../lib/challenge-model.js'
  import initSql from '../lib/init.sql?raw'
  import { playSound } from '../lib/sound.js'
  import Select from '../components/select.svelte'
  import CheckboxGroup from '../components/checkbox-group.svelte'
  import ConfirmDialogInput from '../components/confirm-dialog-input.svelte'
  import { requestConfirm } from '../lib/confirm-dialog.js'
  import { soundOptions } from '../lib/select-options.js'
  import { showToast } from '../lib/toast.js'
  import {
    cloudConfig,
    cloudSession,
    deleteAccount,
    saveCloudConfig,
    authenticate,
    syncData,
    loadSyncSelection,
    saveSyncSelection,
  } from '../lib/cloud.js'
  export let data
  let config = cloudConfig()
  let session = cloudSession()
  let email = '',
    password = '',
    status = '',
    statusType = 'info',
    busy = false
  let deletePassword = ''
  let deletePasswordError = ''
  let databaseStatus = '尚未检测'
  let syncSelection = loadSyncSelection()
  $: if (status) {
    showToast(status, { type: statusType })
  }

  function setStatus(message, type = 'info') {
    status = message
    statusType = type
  }
  const syncOptions = [
    { value: 'exerciseNames', label: '动作' },
    { value: 'plans', label: '训练计划' },
    { value: 'records', label: '训练记录' },
    { value: 'weights', label: '体重' },
    { value: 'sounds', label: '提示音' },
  ]
  onMount(() => {
    const onAuthChange = () => (session = cloudSession())
    const onOpenDeleteAccount = () => requestDeleteAccount()
    window.addEventListener('lianke-auth-change', onAuthChange)
    window.addEventListener('open-delete-account', onOpenDeleteAccount)
    return () => {
      window.removeEventListener('lianke-auth-change', onAuthChange)
      window.removeEventListener('open-delete-account', onOpenDeleteAccount)
    }
  })
  function notifyAuthChange() {
    window.dispatchEvent(new CustomEvent('lianke-auth-change'))
  }
  async function checkDatabase() {
    databaseStatus = '正在检查数据表……'
    const tables = [
      'exercise_names',
      'plans',
      'plan_items',
      'training_records',
      'training_sets',
      'user_settings',
      'body_weights',
    ]
    const results = await Promise.all(
      tables.map(async (table) => {
        try {
          return (
            await fetch(`${config.url}/rest/v1/${table}?select=*&limit=0`, {
              headers: { apikey: config.anonKey },
            })
          ).ok
        } catch {
          return false
        }
      }),
    )
    const missing = tables.filter((_, index) => !results[index])
    databaseStatus = missing.length
      ? `缺少：${missing.join('、')}`
      : '数据库已初始化，六张表均可访问'
  }
  async function auth(action) {
    try {
      await authenticate(action, email.trim(), password)
      session = cloudSession()
      notifyAuthChange()
      setStatus(action === 'signup' ? '注册成功，请检查邮箱' : '登录成功', 'success')
    } catch (error) {
      setStatus(error.message, 'error')
    }
  }
  function requestDeleteAccount() {
    deletePassword = ''
    deletePasswordError = ''
    openDeleteAccountDialog()
  }
  function openDeleteAccountDialog() {
    requestConfirm({
      title: '注销账号',
      children: ConfirmDialogInput,
      childrenProps: {
        input: {
          label: '当前密码',
          type: 'password',
          autocomplete: 'current-password',
          placeholder: '输入当前账号密码',
          value: deletePassword,
          disabled: busy,
          onInput: (value) => (deletePassword = value),
          error: deletePasswordError,
        },
      },
      confirmText: busy ? '处理中……' : '确认注销',
      destructive: true,
    }).then(({ confirmed }) => {
      if (confirmed) confirmDeleteAccount()
    })
  }
  async function confirmDeleteAccount() {
    if (!session?.user?.email) return
    if (!deletePassword) {
      deletePasswordError = '请输入当前账号密码'
      openDeleteAccountDialog()
      return
    }
    busy = true
    deletePasswordError = ''
    setStatus('正在注销账号……')
    try {
      await authenticate('signin', session.user.email, deletePassword)
      await deleteAccount()
      session = null
      notifyAuthChange()
      email = ''
      password = ''
      deletePassword = ''
      setStatus('账号已注销', 'success')
    } catch (error) {
      deletePasswordError = `密码验证失败：${error.message}`
      openDeleteAccountDialog()
    } finally {
      busy = false
    }
  }
  async function sync(direction) {
    if (busy) return
    busy = true
    setStatus('正在同步……')
    try {
      const result = await syncData(direction, data, syncSelection)
      if (direction === 'download') {
        data = result
      }
      setStatus(syncStatus(direction, result), 'success')
    } catch (error) {
      setStatus(`同步失败：${error.message}`, 'error')
    } finally {
      busy = false
    }
  }
  function requestSync(direction) {
    const selectedOptions = syncOptions.filter((option) => syncSelection[option.value])
    if (!selectedOptions.length) {
      setStatus('请至少选择一项同步内容', 'error')
      return
    }
    requestConfirm({
      title: '确认同步',
      message:
        direction === 'upload'
          ? `将以本地数据为准，同步并覆盖当前账号的云端数据。\n同步内容：${selectedOptions.map((option) => option.label).join('、')}`
          : `将用当前账号的云端数据替换本地同步数据。\n同步内容：${selectedOptions.map((option) => option.label).join('、')}`,
      confirmText: '确认同步',
    }).then(({ confirmed }) => {
      if (confirmed) sync(direction)
    })
  }
  function updateSyncSelection(event) {
    syncSelection = Object.fromEntries(
      syncOptions.map((option) => [option.value, event.detail.includes(option.value)]),
    )
    saveSyncSelection(syncSelection)
  }
  function syncStatus(direction, result) {
    const details = []
    if (direction === 'upload') {
      if (syncSelection.plans) details.push(`${result.plans} 个计划`)
      if (syncSelection.records) details.push(`训练记录新增/更新 ${result.records} 条`)
      if (syncSelection.weights)
        details.push(`体重新增/更新 ${result.weights} 条、删除 ${result.deletedWeights} 条`)
      if (syncSelection.exerciseNames) details.push(`${result.names} 个动作`)
      if (syncSelection.sounds) details.push('提示音')
      return `本地同步到远端成功：${details.join('；')}已同步`
    }
    if (syncSelection.plans) details.push(`${result.plans.length} 个计划`)
    if (syncSelection.records) details.push(`${result.records.length} 条记录`)
    if (syncSelection.weights) details.push(`${result.weights.length} 条体重记录`)
    if (syncSelection.exerciseNames) details.push(`${result.exerciseNames.length} 个动作`)
    if (syncSelection.sounds) details.push('提示音')
    return `远端同步到本地成功：${details.join('、')}已同步`
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `练刻-训练备份-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function importData(event) {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      if (!Array.isArray(parsed.plans) || !Array.isArray(parsed.records))
        throw Error('备份文件结构不正确')
      const challenges = normalizeChallenges(parsed.challenges, { strict: true })
      if (confirm('导入将覆盖当前全部本地数据（包括挑战成绩），是否继续？')) {
        data = { ...defaults(), ...parsed, records: completedRecords(parsed.records), challenges }
        setStatus('导入成功', 'success')
      }
    } catch (error) {
      setStatus(`导入失败：${error.message}`, 'error')
    }
    event.currentTarget.value = ''
  }
  function clearLocalData() {
    const base = defaults()
    data = {
      ...base,
      plans: [],
      records: [],
      selected: null,
      exerciseNames: [],
    }
    setStatus('本地数据已清空', 'success')
  }
</script>

<header class="settings-heading">
  <h1>设置与备份</h1>
  <p class="muted">先用本地功能开始训练；需要多设备同步时，再配置云端账号。</p>
</header>

<section class="panel cloud-account-card">
  <div class="cloud-account-heading">
    <div>
      <h3>云端账号</h3>
      <p class="muted small">登录 Supabase 账号，在不同设备间同步训练数据。</p>
    </div>
    <span class="cloud-provider">Supabase</span>
  </div>

  {#if session?.user?.email}
    <div class="cloud-signed-in">
      <span class="muted small">已登录账号</span>
      <strong>{session.user.email}</strong>
    </div>
    <div class="cloud-auth-actions">
      <button
        type="button"
        class="btn cloud-sign-out"
        on:click={() => {
          window.dispatchEvent(new CustomEvent('request-sign-out'))
        }}
      >
        退出登录
      </button>
      <button
        type="button"
        class="btn red cloud-delete-account"
        disabled={busy}
        on:click={requestDeleteAccount}
      >
        注销账号
      </button>
    </div>
  {:else}
    <div class="cloud-auth-fields">
      <label class="field">
        邮箱
        <input
          type="email"
          autocomplete="email"
          placeholder="name@example.com"
          bind:value={email}
        />
      </label>
      <label class="field">
        密码
        <input
          type="password"
          autocomplete="current-password"
          placeholder="输入密码"
          bind:value={password}
        />
      </label>
    </div>

    <div class="cloud-auth-actions">
      <button type="button" class="btn primary" on:click={() => auth('signin')}>登录</button>
      <button type="button" class="btn ghost" on:click={() => auth('signup')}>注册账号</button>
    </div>
  {/if}
  {#if !session?.user?.email}<p class="settings-guidance">
      <strong>首次登录前，请先完成下方“云端登录配置”中的 4 个步骤。</strong>
      <br />
      只在当前设备使用不需要登录；登录后可以在不同设备间同步训练数据。
    </p>{/if}

  <div class="cloud-divider"></div>

  <div class="cloud-sync-heading">
    <div>
      <h3>数据同步</h3>
      <p class="muted small">选择本次需要同步的数据；选择会保存在本机。</p>
    </div>
    {#if busy}<span class="cloud-syncing">同步中</span>{/if}
  </div>
  <CheckboxGroup
    options={syncOptions}
    value={syncOptions
      .filter((option) => syncSelection[option.value])
      .map((option) => option.value)}
    legend="同步内容"
    disabled={busy}
    on:change={updateSyncSelection}
  />
  <div class="cloud-sync-actions">
    <button
      type="button"
      class="cloud-sync-button"
      disabled={busy}
      on:click={() => requestSync('upload')}
    >
      <span class="cloud-sync-icon" aria-hidden="true">↑</span>
      <span>
        <strong>本地同步到远端</strong>
        <small>以本地数据为准，覆盖当前账号的云端数据</small>
      </span>
    </button>
    <button
      type="button"
      class="cloud-sync-button"
      disabled={busy}
      on:click={() => requestSync('download')}
    >
      <span class="cloud-sync-icon" aria-hidden="true">↓</span>
      <span>
        <strong>远端同步到本地</strong>
        <small>用当前账号的云端数据替换本地同步数据</small>
      </span>
    </button>
  </div>
</section>
<details class="panel settings-advanced">
  <summary>
    <span>云端登录配置</span>
    <small>首次登录必做 · Supabase 配置与数据库初始化</small>
    <em class="settings-advanced-toggle">展开指引</em>
  </summary>
  <div class="settings-advanced-body">
    <div class="settings-setup-guide">
      <div>
        <b>1</b>
        <span>
          <strong>创建 Supabase 项目</strong>
          <small>在 Supabase 控制台新建一个项目。</small>
        </span>
      </div>
      <div>
        <b>2</b>
        <span>
          <strong>配置项目 URL 和 Key</strong>
          <small>从项目设置中复制 Project URL 和 publishable key。</small>
        </span>
      </div>
      <div>
        <b>3</b>
        <span>
          <strong>执行初始化 SQL</strong>
          <small>创建数据表、权限和账号注销函数。</small>
        </span>
      </div>
      <div>
        <b>4</b>
        <span>
          <strong>检测数据库</strong>
          <small>确认六张业务表都可以访问。</small>
        </span>
      </div>
    </div>
    <section class="settings-advanced-section">
      <h3>步骤 3、4：执行 SQL 并检测数据库</h3>
      <p class="muted small">
        首次使用或升级已有数据库时，复制初始化 SQL 到 Supabase SQL Editor
        执行；重复执行会补齐新字段。
      </p>
      <div class="row">
        <button class="btn" on:click={checkDatabase}>检测数据库</button>
        <button
          class="btn"
          on:click={async () => {
            await navigator.clipboard.writeText(initSql)
            databaseStatus = '初始化 SQL 已复制'
          }}
        >
          复制初始化 SQL
        </button>
        <a
          class="btn"
          href={`https://supabase.com/dashboard/project/${config.url.split('//')[1]?.split('.')[0] || ''}/sql/new`}
          target="_blank"
          rel="noreferrer"
        >
          打开 SQL Editor
        </a>
      </div>
      <p class="muted small">{databaseStatus}</p>
    </section>
    <section class="settings-advanced-section">
      <div class="row between settings-panel-heading">
        <h3>步骤 2：配置项目 URL 和 Key</h3>
        <a
          class="supabase-link"
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
        >
          打开 Supabase 控制台 ↗
        </a>
      </div>
      <p class="muted small settings-help">
        新手可以先在控制台创建项目，再复制下面的 Project URL 和密钥。
      </p>
      <label class="field">
        Project URL
        <input type="url" bind:value={config.url} placeholder="https://xxxx.supabase.co" />
      </label>
      <label class="field">
        publishable key（或旧版 anon public key）
        <input type="password" bind:value={config.anonKey} />
      </label>
      <button
        class="btn primary"
        style="margin-top:12px"
        on:click={() => {
          saveCloudConfig(config)
          setStatus('配置已保存', 'success')
        }}
      >
        保存配置
      </button>
    </section>
  </div>
</details>
<section class="panel">
  <h3>独立提示音</h3>
  {#each [['set', '每组训练结束'], ['rest', '休息结束'], ['finish', '全部训练完成']] as [key, label]}<div
      class="field"
      style="margin:12px 0"
    >
      <span>{label}</span>
      <Select
        {label}
        options={soundOptions}
        bind:value={data.sounds[key]}
        on:change={() => (data = data)}
      />
      <button class="btn tiny" type="button" on:click={() => playSound(data.sounds[key])}>
        试听 ▶
      </button>
    </div>{/each}
</section>
<section class="panel">
  <h3>本地数据</h3>
  <p class="muted">
    计划、记录和挑战成绩保存在当前浏览器，请定期备份。挑战成绩包含在 JSON 备份中，暂不参与云端同步。
  </p>
  <div class="row">
    <button class="btn primary" on:click={exportData}>导出 JSON 备份</button>
    <label class="btn">
      导入 JSON 备份
      <input type="file" accept="application/json,.json" hidden on:change={importData} />
    </label>
    <button
      class="btn red"
      on:click={() => {
        if (confirm('确定清空全部本地数据吗？')) clearLocalData()
      }}
    >
      清空全部数据
    </button>
  </div>
</section>
