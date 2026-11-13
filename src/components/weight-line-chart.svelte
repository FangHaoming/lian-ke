<script>
  import { onDestroy, onMount } from 'svelte'
  import { escape } from '../lib/workout-model.js'
  import * as echarts from 'echarts/core'
  import { LineChart } from 'echarts/charts'
  import { DataZoomComponent, GridComponent, TooltipComponent } from 'echarts/components'
  import { CanvasRenderer } from 'echarts/renderers'

  echarts.use([LineChart, DataZoomComponent, GridComponent, TooltipComponent, CanvasRenderer])

  export let points = []

  let root
  let chart
  let resizeObserver
  let disposed = false
  let zoomStart = null
  let zoomEnd = null

  $: if (chart && !disposed && Array.isArray(points)) renderChart()

  function formatDate(value) {
    return new Date(value).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  function renderChart() {
    if (disposed || !chart || !Array.isArray(points)) return

    const values = points.map((point) => Number(point.kg) || 0)
    const minKg = values.length ? Math.floor(Math.min(...values) - 1) : 0
    const maxKg = values.length ? Math.ceil(Math.max(...values) + 1) : 100
    const labels = points.map((point) => point.label || formatDate(point.recordedAt))

    chart.setOption(
      {
        animation: false,
        grid: { left: 54, right: 20, top: 22, bottom: 52 },
        tooltip: {
          trigger: 'axis',
          confine: true,
          backgroundColor: '#192630',
          borderColor: '#49606c',
          borderWidth: 1,
          textStyle: { color: '#eaf2f4', fontSize: 12 },
          formatter: (items) => {
            const item = items?.[0]
            const point = points[item?.dataIndex]
            if (!item || !point) return ''
            return `<b>${item.axisValue}</b>${point.period ? ` <span style="color:#aebfc7">${escape(point.period)}</span>` : ''}<br/><span style="color:#b7f36a">●</span> 体重：<b>${Number(point.kg).toFixed(2)} kg</b>${point.note ? `<br/><span style="color:#aebfc7">${escape(point.note)}</span>` : ''}`
          },
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: labels,
          axisLine: { lineStyle: { color: '#344650' } },
          axisTick: { show: false },
          axisLabel: {
            color: '#8b9ba5',
            margin: 14,
            hideOverlap: true,
          },
        },
        yAxis: {
          type: 'value',
          min: minKg,
          max: maxKg,
          splitNumber: 2,
          axisLine: { show: true, lineStyle: { color: '#344650' } },
          axisTick: { show: false },
          axisLabel: {
            color: '#8b9ba5',
            formatter: (value) => `${Number(value).toFixed(2)} kg`,
          },
          splitLine: { lineStyle: { color: 'rgba(52,70,80,.72)', type: 'dashed' } },
        },
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: 0,
            start: zoomStart ?? 0,
            end: zoomEnd ?? 100,
            minSpan: Math.min(100, (7 / Math.max(1, points.length)) * 100),
            zoomOnMouseWheel: false,
            moveOnMouseMove: true,
            moveOnMouseWheel: true,
            preventDefaultMouseMove: true,
          },
          {
            type: 'slider',
            xAxisIndex: 0,
            bottom: 12,
            height: 12,
            start: zoomStart ?? 0,
            end: zoomEnd ?? 100,
            borderColor: '#344650',
            backgroundColor: '#101921',
            fillerColor: 'rgba(183,243,106,.2)',
            handleStyle: { color: '#b7f36a', borderColor: '#b7f36a' },
            dataBackground: {
              lineStyle: { color: '#526874' },
              areaStyle: { color: '#263842' },
            },
            textStyle: { color: '#8b9ba5' },
          },
        ],
        series: [
          {
            name: '体重',
            type: 'line',
            data: values,
            smooth: 0.12,
            symbol: 'circle',
            symbolSize: 12,
            showSymbol: true,
            lineStyle: { width: 3, color: '#b7f36a' },
            itemStyle: { color: '#b7f36a', borderColor: '#17232c', borderWidth: 3 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(183,243,106,.22)' },
                { offset: 1, color: 'rgba(183,243,106,0)' },
              ]),
            },
          },
        ],
      },
      { notMerge: true },
    )
  }

  onMount(() => {
    disposed = false
    chart = echarts.init(root, null, { renderer: 'canvas' })
    chart.on('datazoom', () => {
      const dataZoom = chart.getOption().dataZoom?.[0]
      if (dataZoom) {
        zoomStart = Number(dataZoom.start)
        zoomEnd = Number(dataZoom.end)
      }
    })
    renderChart()
    resizeObserver = new ResizeObserver(() => chart?.resize())
    resizeObserver.observe(root)
  })

  onDestroy(() => {
    disposed = true
    resizeObserver?.disconnect()
    chart?.dispose()
    chart = null
  })
</script>

<div class="weight-line-chart" bind:this={root} role="img" aria-label="体重趋势折线图"></div>

<style>
  .weight-line-chart {
    width: 100%;
    height: 300px;
    min-height: 260px;
  }
</style>
