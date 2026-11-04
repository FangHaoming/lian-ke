<script>
  import { onMount } from 'svelte'
  import { mk, uid, num } from '../lib/workout-model.js'
  import { flatten } from '../lib/data.js'
  import TimePicker from '../components/time-picker.svelte'
  import Select from '../components/select.svelte'
  import { trainingModes } from '../lib/select-options.js'
  import ExerciseNameSelect from '../components/exercise-name-select.svelte'
  export let data
  let editing = null
  let draggingIndex = -1
  let dragOverIndex = -1
  let touchDragTimer
  let touchDragPointer = null
  let editorHistoryEntry = false
  $: names = data.exerciseNames || []

  onMount(() => {
    const handlePopState = () => {
      if (editing) {
        editing = null
        editorHistoryEntry = false
      }
    }
    window.addEventListener('popstate', handlePopState)
    const handleSelectionChange = () => {
      if (touchDragPointer) clearPlanSelection()
    }
    const handleContextMenu = (event) => {
      if (editing && event.target.closest?.('.plan-exercise')) {
        event.preventDefault()
        clearPlanSelection()
      }
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('contextmenu', handleContextMenu)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('selectionchange', handleSelectionChange)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  })

  function enterEditor(value) {
    editing = value
    history.pushState({ ...history.state, planEditor: true }, '', window.location.href)
    editorHistoryEntry = true
  }
  function leaveEditor() {
    const shouldGoBack = editorHistoryEntry
    editing = null
    editorHistoryEntry = false
    if (shouldGoBack) history.back()
  }
  function save() {
    if (
      !editing.name.trim() ||
      !editing.items.length ||
      editing.items.some((item) => !item.name.trim())
    )
      return alert('请填写计划名称和动作')
    editing.items = editing.items.map((item) => ({
      ...item,
      sets: num(item.sets, 1, 30),
      reps: num(item.reps),
      duration: num(item.duration, 1, 7200),
      rest: num(item.rest, 0, 3600),
      weight: num(item.weight),
    }))
    const index = data.plans.findIndex((plan) => plan.id === editing.id)
    data.plans =
      index < 0
        ? [...data.plans, editing]
        : data.plans.map((plan) => (plan.id === editing.id ? editing : plan))
    data.exerciseNames = [...new Set([...names, ...editing.items.map((item) => item.name)])]
    data.selected = editing.id
    data = data
    leaveEditor()
  }
  function remove(id) {
    if (!confirm('确定删除此训练计划？历史记录仍会保留。')) return
    data.plans = data.plans.filter((plan) => plan.id !== id)
    data.selected = data.plans[0]?.id || null
    data = data
  }
  function removeName(name) {
    data.exerciseNames = names.filter((item) => item !== name)
    data = data
  }
  function scrollEditor(position) {
    window.scrollTo({
      top: position === 'top' ? 0 : document.documentElement.scrollHeight,
      behavior: 'smooth',
    })
  }
  function moveItem(from, to) {
    if (from < 0 || to < 0 || from === to) return
    const items = [...editing.items]
    items.splice(to, 0, items.splice(from, 1)[0])
    editing = { ...editing, items }
  }
  function setItemOrder(id, event) {
    const from = editing.items.findIndex((item) => item.id === id)
    const to = Math.min(editing.items.length - 1, Math.max(0, Number(event.currentTarget.value) - 1))
    if (Number.isFinite(to)) moveItem(from, to)
  }
  function startTouchDrag(event, index) {
    if (event.pointerType !== 'touch') return
    if (event.target.closest('input, select, textarea, button, a')) return
    event.preventDefault()
    event.currentTarget.draggable = false
    event.currentTarget.setPointerCapture(event.pointerId)
    clearPlanSelection()
    touchDragPointer = {
      id: event.pointerId,
      index,
      x: event.clientX,
      y: event.clientY,
      lastY: event.clientY,
      active: false,
      cancelled: false,
      target: event.currentTarget,
    }
    clearTimeout(touchDragTimer)
    touchDragTimer = setTimeout(() => {
      if (!touchDragPointer || touchDragPointer.cancelled) return
      touchDragPointer.active = true
      clearPlanSelection()
      draggingIndex = touchDragPointer.index
      if (navigator.vibrate) navigator.vibrate(25)
    }, 350)
  }
  function moveTouchDrag(event) {
    if (!touchDragPointer || event.pointerId !== touchDragPointer.id) return
    clearPlanSelection()
    const dx = event.clientX - touchDragPointer.x
    const dy = event.clientY - touchDragPointer.y
    const scrollDelta = event.clientY - touchDragPointer.lastY
    touchDragPointer.lastY = event.clientY
    if (!touchDragPointer.active && !touchDragPointer.cancelled && Math.hypot(dx, dy) > 10) {
      clearTimeout(touchDragTimer)
      touchDragPointer.cancelled = true
    }
    if (touchDragPointer.cancelled) {
      event.preventDefault()
      window.scrollBy(0, -scrollDelta)
      return
    }
    if (!touchDragPointer.active) return
    event.preventDefault()
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.exercise[data-plan-index]')
    const index = target ? Number(target.dataset.planIndex) : -1
    dragOverIndex = index
  }
  function endTouchDrag(event) {
    if (!touchDragPointer || event.pointerId !== touchDragPointer.id) return
    clearTimeout(touchDragTimer)
    if (touchDragPointer.active && dragOverIndex >= 0) moveItem(touchDragPointer.index, dragOverIndex)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    event.currentTarget.draggable = true
    touchDragPointer = null
    draggingIndex = -1
    dragOverIndex = -1
  }
  function preventPlanTextSelection(event) {
    if (event.target.closest('input, textarea')) return
    event.preventDefault()
  }
  function clearPlanSelection() {
    const selection = window.getSelection?.()
    if (selection?.rangeCount) selection.removeAllRanges()
  }
</script>

{#if editing}
  <div class="row between">
    <h1>编辑训练计划</h1>
    <button class="btn ghost" on:click={leaveEditor}>返回</button>
  </div>
  <section class="panel">
    <label class="field">
      计划名称
      <input bind:value={editing.name} />
    </label>
    <h3 style="margin-top:20px">动作列表（按顺序训练）</h3>
    {#each editing.items as item, i (item.id)}
      <div
        class="exercise"
        class:plan-exercise={true}
        class:dragging={draggingIndex === i}
        class:drag-over={dragOverIndex === i && draggingIndex !== i}
        data-plan-index={i}
        role="listitem"
        draggable="true"
        on:pointerdown={(event) => {
          if (event.pointerType === 'touch') event.currentTarget.draggable = false
        }}
        on:pointerup={(event) => {
          if (event.pointerType === 'touch') event.currentTarget.draggable = true
        }}
        on:contextmenu|preventDefault
        on:dragstart={(event) => {
          draggingIndex = i
          dragOverIndex = -1
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', String(i))
        }}
        on:dragover={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          if (draggingIndex !== i) dragOverIndex = i
        }}
        on:dragleave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) dragOverIndex = -1
        }}
        on:drop={(event) => {
          event.preventDefault()
          const from = Number(event.dataTransfer.getData('text/plain'))
          if (from !== i && from >= 0) moveItem(from, i)
          draggingIndex = -1
          dragOverIndex = -1
        }}
        on:dragend={() => {
          draggingIndex = -1
          dragOverIndex = -1
        }}
      >
        <div class="row between">
            <div class="row plan-title"><span class="plan-drag-handle" aria-hidden="true">⠿</span><input class="plan-order-input" type="number" min="1" max={editing.items.length} value={i + 1} aria-label="动作序号" on:change={(event) => setItemOrder(item.id, event)} /><b>{item.name}</b></div>
          <button
            class="btn tiny red"
            on:click={() =>
              (editing = { ...editing, items: editing.items.filter((_, index) => index !== i) })}
          >
            删除
          </button>
        </div>
        <div class="exercise-fields">
          <div class="field">
            <span>动作名称</span>
            <ExerciseNameSelect
              options={names}
              bind:value={item.name}
              deletable
              on:delete={(event) => removeName(event.detail.name)}
            />
          </div>
          <div class="field">
            <span>训练类型</span>
            <Select label="训练类型" options={trainingModes} bind:value={item.mode} />
          </div>
          <label class="field">
            组数
            <input type="number" min="1" bind:value={item.sets} />
          </label>
          {#if item.mode === 'reps'}<label class="field">
              目标次数
              <input type="number" min="0" bind:value={item.reps} />
            </label>{:else}<TimePicker
              label="训练时长（分:秒）"
              max={7200}
              bind:value={item.duration}
            />{/if}
          <label class="field">
            负重 kg
            <input type="number" min="0" step="0.5" bind:value={item.weight} />
          </label>
          <TimePicker label="组后休息（分:秒）" max={3600} bind:value={item.rest} />
        </div>
      </div>
    {/each}
    <div class="row">
      <button
        class="btn"
        on:click={() => (editing = { ...editing, items: [...editing.items, mk(names[0] || '')] })}
      >
        + 添加动作
      </button>
      <button class="btn primary" on:click={save}>保存计划</button>
    </div>
  </section>
  <div class="editor-quick-nav" hidden={editing.items.length <= 3} aria-label="编辑器快速导航">
    <button type="button" aria-label="滚动到顶部" on:click={() => scrollEditor('top')}>↑</button>
    <button type="button" aria-label="滚动到底部" on:click={() => scrollEditor('bottom')}>↓</button>
  </div>
{:else}
  <div class="row between">
    <div>
      <h1>训练计划</h1>
      <p class="muted">可以创建练腿日、上肢日等多种训练组合。</p>
    </div>
    <button
      class="btn primary"
      on:click={() => enterEditor({ id: uid(), name: '新训练计划', items: [mk(names[0] || '')] })}
    >
      + 新建计划
    </button>
  </div>
  {#each data.plans as plan (plan.id)}<section class="panel">
      <div class="row between">
        <div>
          <h2>{plan.name}</h2>
          <span class="muted small">{plan.items.length} 个动作 · {flatten(plan).length} 组</span>
        </div>
        <div class="row">
          <button class="btn tiny" on:click={() => enterEditor(structuredClone(plan))}>编辑</button>
          <button
            class="btn tiny"
            on:click={() => {
              const copy = structuredClone(plan)
              copy.id = uid()
              copy.name += '（副本）'
              copy.items.forEach((item) => (item.id = uid()))
              data.plans = [...data.plans, copy]
              data = data
            }}
          >
            复制
          </button>
          <button class="btn tiny red" on:click={() => remove(plan.id)}>删除</button>
        </div>
      </div>
      {#each plan.items as item}<div class="setline">
          <span>{item.name}</span>
          <span class="muted small">
            {item.sets}组 · {item.mode === 'reps' ? item.reps + '次' : item.duration + '秒'} · {item.weight}kg
          </span>
        </div>{/each}
    </section>{:else}<div class="panel empty">还没有训练计划</div>{/each}
{/if}
