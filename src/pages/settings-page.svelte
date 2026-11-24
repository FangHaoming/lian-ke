<script>
  import { onMount } from 'svelte'
  import { defaults, completedRecords } from '../lib/workout-model.js'
  import { normalizeChallenges } from '../lib/challenge-model.js'
  import { requestPersistentStorage } from '../lib/data.js'
  import initSql from '../lib/init.sql?raw'
  import { playSound } from '../lib/sound.js'
  import Select from '../components/select.svelte'
  import ToggleSwitch from '../components/toggle-switch.svelte'
  import CheckboxGroup from '../components/checkbox-group.svelte'
  import ConfirmDialogInput from '../components/confirm-dialog-input.svelte'
  import PwaInstall from '../components/pwa-install.svelte'
  import { requestConfirm } from '../lib/confirm-dialog.js'
  import { soundOptions } from '../lib/select-options.js'
  import { showToast } from '../lib/toast.js'
  import {
    cloudConfig,
    cloudSession,
    deleteAccount,
    deleteRemoteData,
    saveCloudConfig,
    authenticate,
    syncData,
    loadSyncBaseline,
    saveSyncBaseline,
    pendingSyncCounts,
    loadSyncSelection,
    saveSyncSelection,
    connectSupabase,
    disconnectSupabase,
    supabaseManagementSession,
    listSupabaseProjects,
    getSupabaseProjectPublishableKey,
    initializeSupabaseProject,
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
  let managementSession = supabaseManagementSession()
  let managementProjects = []
  let selectedProjectRef = ''
  const PROJECTS_KEY = 'lianke_supabase_projects'
  const SELECTED_PROJECT_KEY = 'lianke_supabase_selected_project'
  let syncSelection = loadSyncSelection()
  let syncBaseline = loadSyncBaseline()
  $: if (status) {
    showToast(status, { type: statusType })
  }

  function setStatus(message, type = 'info') {
    status = message
    statusType = type
  }
  function deletePasswordMessage(error) {
    const message = String(error?.message || '').toLowerCase()
    if (message.includes('invalid login credentials') || message.includes('invalid password'))
      return '当前密码不正确，请重新输入。'
    if (message.includes('email not confirmed')) return '账号邮箱尚未验证，请先完成邮箱验证。'
    return '密码验证失败，请检查密码后重试。'
  }
  const syncOptions = [
    { value: 'exerciseNames', label: '动作' },
    { value: 'plans', label: '训练计划' },
    { value: 'records', label: '训练记录' },
    { value: 'weights', label: '体重' },
    { value: 'sleep', label: '睡眠' },
    { value: 'sounds', label: '提示音' },
    { value: 'challenges', label: '挑战成绩' },
  ]
  $: syncPreview = buildSyncPreview(data, syncSelection, syncBaseline)
  $: allSyncSelected =
    syncOptions.length > 0 && syncOptions.every((option) => syncSelection[option.value])

  function buildSyncPreview(currentData, selection, baseline) {
    const counts = pendingSyncCounts(currentData, baseline)
    return syncOptions
      .filter((option) => selection[option.value])
      .map((option) => ({ ...option, count: counts[option.value] }))
  }
  onMount(() => {
    const onAuthChange = () => (session = cloudSession())
    const onOpenDeleteAccount = () => requestDeleteAccount()
    window.addEventListener('lianke-auth-change', onAuthChange)
    window.addEventListener('open-delete-account', onOpenDeleteAccount)
    if (managementSession) {
      loadManagedProjects({ autoInitialize: true })
    } else {
      try {
        managementProjects = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]')
        selectedProjectRef =
          localStorage.getItem(SELECTED_PROJECT_KEY) || managementProjects[0]?.ref || ''
      } catch {
        managementProjects = []
      }
    }
    return () => {
      window.removeEventListener('lianke-auth-change', onAuthChange)
      window.removeEventListener('open-delete-account', onOpenDeleteAccount)
    }
  })
  function notifyAuthChange() {
    window.dispatchEvent(new CustomEvent('lianke-auth-change'))
  }
  async function connectManagedSupabase() {
    try {
      await connectSupabase()
    } catch (error) {
      setStatus(error.message, 'error')
    }
  }
  async function loadManagedProjects({ autoInitialize = false } = {}) {
    try {
      managementProjects = await listSupabaseProjects()
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(managementProjects))
      selectedProjectRef =
        localStorage.getItem(SELECTED_PROJECT_KEY) || managementProjects[0]?.ref || ''
      localStorage.setItem(SELECTED_PROJECT_KEY, selectedProjectRef)
      if (autoInitialize && managementProjects.length > 0) await initializeManagedProject()
    } catch (error) {
      setStatus(error.message, 'error')
    }
  }
  async function initializeManagedProject() {
    if (!selectedProjectRef) return
    busy = true
    try {
      localStorage.setItem(SELECTED_PROJECT_KEY, selectedProjectRef)
      await initializeSupabaseProject(selectedProjectRef, initSql)
      const project = managementProjects.find((item) => item.ref === selectedProjectRef)
      if (project?.ref) {
        const anonKey = await getSupabaseProjectPublishableKey(project.ref)
        config = { ...config, url: `https://${project.ref}.supabase.co`, anonKey }
        saveCloudConfig(config)
      }
      setStatus('Supabase 数据库已初始化', 'success')
    } catch (error) {
      setStatus(error.message, 'error')
    } finally {
      busy = false
    }
  }
  function disconnectManagedSupabase() {
    disconnectSupabase()
    managementSession = null
    managementProjects = []
    selectedProjectRef = ''
    localStorage.removeItem(PROJECTS_KEY)
    localStorage.removeItem(SELECTED_PROJECT_KEY)
    setStatus('已断开 Supabase 管理授权')
  }
  async function auth(action) {
    try {
      await authenticate(action, email.trim(), password)
      session = cloudSession()
      notifyAuthChange()
      if (action === 'signup') {
        setStatus('注册成功，请检查邮箱', 'success')
        return
      }
      await requestPersistentStorage()
      setStatus('登录成功', 'success')
    } catch (error) {
      setStatus(error.message, 'error')
    }
  }
  function requestDeleteAccount() {
    deletePassword = ''
    deletePasswordError = ''
    openDeleteAccountDialog()
  }
  function requestDeleteRemoteData() {
    if (!session?.user?.email || busy) return
    const selectedOptions = syncOptions.filter((option) => syncSelection[option.value])
    if (!selectedOptions.length) {
      setStatus('请至少选择一项要删除的远端数据', 'error')
      return
    }
    deletePassword = ''
    deletePasswordError = ''
    openDeleteRemoteDataDialog(selectedOptions)
  }
  function openDeleteRemoteDataDialog(selectedOptions) {
    requestConfirm({
      title: '删除远端数据',
      children: ConfirmDialogInput,
      childrenProps: {
        message: `本次将删除：${selectedOptions.map((option) => option.label).join('、')}。\n未选中的数据和当前设备的本地数据不会受影响。此操作不可撤销。`,
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
      confirmText: busy ? '验证中……' : deletePasswordError ? '重新验证' : '确认删除远端数据',
      destructive: true,
    }).then(({ confirmed }) => {
      if (confirmed) confirmDeleteRemoteData(selectedOptions)
    })
  }
  async function confirmDeleteRemoteData(selectedOptions) {
    if (!session?.user?.email || busy) return
    if (!deletePassword) {
      deletePasswordError = '请输入当前账号密码'
      openDeleteRemoteDataDialog(selectedOptions)
      return
    }
    busy = true
    deletePasswordError = ''
    setStatus('正在验证密码……')
    try {
      await authenticate('signin', session.user.email, deletePassword)
    } catch (error) {
      deletePasswordError = deletePasswordMessage(error)
      deletePassword = ''
      busy = false
      openDeleteRemoteDataDialog(selectedOptions)
      return
    }
    setStatus('正在删除远端数据……')
    try {
      await deleteRemoteData(
        Object.fromEntries(selectedOptions.map((option) => [option.value, true])),
      )
      setStatus('当前账号的远端数据已删除，本地数据未改变', 'success')
    } catch (error) {
      setStatus(`删除远端数据失败：${error.message}`, 'error')
    } finally {
      busy = false
      deletePassword = ''
    }
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
      confirmText: busy ? '处理中……' : deletePasswordError ? '重新验证' : '确认注销',
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
      deletePasswordError = deletePasswordMessage(error)
      deletePassword = ''
      busy = false
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
      if (direction === 'download' || direction === 'upload') {
        saveSyncBaseline(direction === 'download' ? result : data, syncSelection)
        syncBaseline = loadSyncBaseline()
      }
      await requestPersistentStorage()
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
          ? `将把本地新增或变更的数据合并到当前账号的云端。\n同步内容：${selectedOptions.map((option) => option.label).join('、')}`
          : `将把当前账号云端新增或变更的数据合并到本地。\n同步内容：${selectedOptions.map((option) => option.label).join('、')}`,
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
  function toggleAllSyncSelection() {
    updateSyncSelection({
      detail: allSyncSelected ? [] : syncOptions.map((option) => option.value),
    })
  }
  function syncStatus(direction, result) {
    const details = []
    if (direction === 'upload') {
      if (syncSelection.plans) details.push(`${result.plans} 个计划`)
      if (syncSelection.records) details.push(`训练记录新增/更新 ${result.records} 条`)
      if (syncSelection.weights) details.push(`体重新增/更新 ${result.weights} 条`)
      if (syncSelection.sleep) details.push(`睡眠新增/更新 ${result.sleep} 条`)
      if (syncSelection.exerciseNames) details.push(`${result.names} 个动作`)
      if (syncSelection.sounds) details.push('提示音')
      if (syncSelection.challenges) details.push(`挑战成绩新增/更新 ${result.challenges} 条`)
      return `本地同步到远端成功：${details.join('；')}已同步`
    }
    if (syncSelection.plans) details.push(`${result.plans.length} 个计划`)
    if (syncSelection.records) details.push(`${result.records.length} 条记录`)
    if (syncSelection.weights) details.push(`${result.weights.length} 条体重记录（合并后）`)
    if (syncSelection.sleep) details.push(`${result.sleepRecords.length} 条睡眠记录`)
    if (syncSelection.exerciseNames) details.push(`${result.exerciseNames.length} 个动作`)
    if (syncSelection.sounds) details.push('提示音')
    if (syncSelection.challenges) details.push(`${result.challenges.attempts.length} 条挑战成绩`)
    return `远端增量合并到本地成功：${details.join('、')}`
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

<PwaInstall mode="settings" />

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
      <p class="muted small">选择本次需要同步或删除的数据；选择会保存在本机。</p>
    </div>
    {#if busy}<span class="cloud-syncing">同步中</span>{/if}
  </div>
  <CheckboxGroup
    options={syncOptions}
    value={syncOptions
      .filter((option) => syncSelection[option.value])
      .map((option) => option.value)}
    legend="同步内容"
    actionChecked={allSyncSelected}
    disabled={busy}
    on:change={updateSyncSelection}
    on:action={toggleAllSyncSelection}
  />
  {#if syncPreview.length}
    <div class="cloud-sync-preview" aria-live="polite">
      <div class="cloud-sync-preview-heading">
        <strong>本地待同步数据</strong>
        <small>
          {syncBaseline ? '与上次远端同步后的数据对比' : '尚无远端基线，暂按本地数据统计'}
        </small>
      </div>
      <div class="cloud-sync-preview-list">
        {#each syncPreview as item}
          <span>
            <b>{item.count}</b>
            条{item.label}
          </span>
        {/each}
      </div>
    </div>
  {/if}
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
        <small>仅合并本地新增或变更的数据</small>
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
        <small>仅合并云端新增或变更的数据</small>
      </span>
    </button>
  </div>
  <div class="cloud-remote-danger-zone">
    <button
      type="button"
      class="btn red cloud-delete-remote"
      disabled={busy}
      on:click={requestDeleteRemoteData}
    >
      删除远端数据
    </button>
    <small>仅删除当前登录账号的云端数据，不影响本地数据和账号。</small>
  </div>
</section>
<section class="panel settings-advanced-body">
  <section class="settings-advanced-section supabase-managed-setup">
    <div class="row between settings-panel-heading">
      <h3>一键连接 Supabase</h3>
      {#if managementSession}
        <button class="btn tiny" type="button" on:click={disconnectManagedSupabase}>
          断开授权
        </button>
      {/if}
    </div>
    <p class="muted small">
      授权后可直接选择自己的 Supabase 项目并自动执行初始化 SQL，不需要手动复制 URL 或打开 SQL
      Editor。
    </p>
    {#if !managementSession}
      <button class="btn primary" type="button" on:click={connectManagedSupabase}>
        连接 Supabase
      </button>
    {:else}
      <div class="row supabase-project-actions">
        <button class="btn" type="button" disabled={busy} on:click={() => loadManagedProjects()}>
          刷新项目
        </button>
        {#if managementProjects.length}
          <label class="supabase-project-picker">
            <span>项目</span>
            <select
              bind:value={selectedProjectRef}
              aria-label="选择 Supabase 项目"
              on:change={() => localStorage.setItem(SELECTED_PROJECT_KEY, selectedProjectRef)}
            >
              {#each managementProjects as project}
                <option value={project.ref}>{project.name || project.ref}</option>
              {/each}
            </select>
          </label>
          <button
            class="btn primary"
            type="button"
            disabled={busy}
            on:click={initializeManagedProject}
          >
            重新初始化数据库
          </button>
        {/if}
      </div>
    {/if}
  </section>
</section>
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
  <ToggleSwitch
    label="倒数结束震动"
    description="倒计时归零时，与提示音同时触发设备震动。"
    separated
    bind:checked={data.sounds.vibrate}
    on:change={() => (data = data)}
  />
</section>
<section class="panel">
  <h3>本地数据</h3>
  <p class="muted">
    计划、记录、体重、睡眠和挑战成绩保存在当前浏览器，也可通过“导出 JSON 备份”保存。建议定期备份。
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
