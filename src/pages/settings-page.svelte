<script>
  import { defaults } from '../lib/workout-model.js'
  import initSql from '../lib/init.sql?raw'
  import { playSound } from '../lib/sound.js'
  import Select from '../components/select.svelte'
  import { soundOptions } from '../lib/select-options.js'
  import { cloudConfig, saveCloudConfig, authenticate, signOut, syncData } from '../lib/cloud.js'
  export let data
  let config = cloudConfig()
  let email = '',
    password = '',
    status = '',
    busy = false
  let databaseStatus = '尚未检测'
  async function checkDatabase() {
    databaseStatus = '正在检查数据表……'
    const tables = [
      'exercise_names',
      'plans',
      'plan_items',
      'training_records',
      'training_sets',
      'user_settings',
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
      status = action === 'signup' ? '注册成功，请检查邮箱' : '登录成功'
    } catch (error) {
      status = error.message
    }
  }
  async function sync(direction) {
    if (busy) return
    busy = true
    status = '正在同步……'
    try {
      const result = await syncData(direction, data)
      if (direction === 'download') {
        data = result
      }
      status =
        direction === 'upload'
          ? `本地同步到远端成功：${result.plans} 个计划、${result.records} 条记录、${result.names} 个动作、提示音已同步`
          : `远端同步到本地成功：${result.plans.length} 个计划、${result.records.length} 条记录、${result.exerciseNames.length} 个动作、提示音已同步`
    } catch (error) {
      status = `同步失败：${error.message}`
    } finally {
      busy = false
    }
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
      if (confirm('导入将覆盖当前全部计划和训练记录，是否继续？')) {
        data = { ...defaults(), ...parsed }
        status = '导入成功'
      }
    } catch (error) {
      status = `导入失败：${error.message}`
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
    status = '本地数据已清空'
  }
</script>

<header class="settings-heading">
  <h1>设置与备份</h1>
  <p class="muted">管理云端同步、提示音和本地训练数据。</p>
</header>

<section class="panel cloud-account-card">
  <div class="cloud-account-heading">
    <div>
      <h3>云端账号</h3>
      <p class="muted small">登录 Supabase 账号，在不同设备间同步训练数据。</p>
    </div>
    <span class="cloud-provider">Supabase</span>
  </div>

  <div class="cloud-auth-fields">
    <label class="field">
      邮箱
      <input type="email" autocomplete="email" placeholder="name@example.com" bind:value={email} />
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
    <button
      type="button"
      class="btn cloud-sign-out"
      on:click={() => {
        signOut()
        status = '已退出'
      }}
    >
      退出登录
    </button>
  </div>

  <div class="cloud-divider"></div>

  <div class="cloud-sync-heading">
    <div>
      <h3>完整数据同步</h3>
      <p class="muted small">提示音、动作、训练计划和训练记录都会同步。</p>
    </div>
    {#if busy}<span class="cloud-syncing">同步中</span>{/if}
  </div>
  <div class="cloud-sync-actions">
    <button type="button" class="cloud-sync-button" disabled={busy} on:click={() => sync('upload')}>
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
      on:click={() => sync('download')}
    >
      <span class="cloud-sync-icon" aria-hidden="true">↓</span>
      <span>
        <strong>远端同步到本地</strong>
        <small>用当前账号的云端数据替换本地同步数据</small>
      </span>
    </button>
  </div>
  {#if status}<p
      class:success={status.includes('成功') || status === '已退出'}
      class:error={status.includes('失败')}
      class="cloud-status"
      role="status"
    >
      {status}
    </p>{/if}
</section>
<section class="panel">
  <h3>新手数据库向导</h3>
  <p class="muted small">检测数据表；若缺少表，可复制初始化 SQL 到 Supabase SQL Editor 执行。</p>
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
<section class="panel">
  <div class="row between settings-panel-heading">
    <h3>Supabase 云端配置</h3>
    <a class="supabase-link" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
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
      status = '配置已保存'
    }}
  >
    保存配置
  </button>
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
</section>
<section class="panel">
  <h3>本地数据</h3>
  <p class="muted">计划和记录保存在当前浏览器，请定期备份。</p>
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
