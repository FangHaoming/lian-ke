<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import * as echarts from 'echarts/core'
  import { LineChart } from 'echarts/charts'
  import {
    DataZoomComponent,
    GridComponent,
    TitleComponent,
    TooltipComponent,
  } from 'echarts/components'
  import { CanvasRenderer } from 'echarts/renderers'

  echarts.use([
    LineChart,
    DataZoomComponent,
    GridComponent,
    TitleComponent,
    TooltipComponent,
    CanvasRenderer,
  ])

  export let points = []
  export let metrics = ['sets', 'minutes']

  let root
  let chart
  let resizeObserver
  let zoomStart = null
  let zoomEnd = null
  let chartRoot
  const dispatch = createEventDispatcher()

  $: labels = points.map((point) => point.key.slice(5))
  $: initialStart = points.length > 7 ? 100 - (7 / points.length) * 100 : 0
  $: if (chart && points && metrics) renderChart()

  function renderChart() {
    const series = metrics.map((metric) => {
      const isSets = metric === 'sets'
      return {
        name: isSets ? '组数' : '分钟',
        type: 'line',
        data: points.map((point) => ({
          value: Number(point[metric]) || 0,
          details: point.details || [],
        })),
        smooth: 0.25,
        symbol: 'circle',
        symbolSize: 8,
        showSymbol: true,
        lineStyle: { width: 3, color: isSets ? '#b7f36a' : '#67b7d5' },
        itemStyle: {
          color: isSets ? '#b7f36a' : '#67b7d5',
          borderColor: '#17232c',
          borderWidth: 2,
        },
        areaStyle: { color: isSets ? 'rgba(183,243,106,.10)' : 'rgba(103,183,213,.08)' },
      }
    })
    const maxValue = Math.max(
      1,
      ...series.flatMap((item) => item.data.map((value) => Number(value.value) || 0)),
    )
    chart.setOption(
      {
        animation: false,
        grid: { left: 48, right: 20, top: 22, bottom: 58 },
        tooltip: {
          trigger: 'axis',
          confine: true,
          backgroundColor: '#192630',
          borderColor: '#49606c',
          borderWidth: 1,
          textStyle: { color: '#eaf2f4', fontSize: 12 },
          formatter: (items) => {
            if (!items?.length) return ''
            const details = items[0].data?.details || []
            const detailHtml = details.length
              ? '<div style="margin-top:8px;padding-top:7px;border-top:1px solid #49606c">' +
                details
                  .map(
                    (detail) =>
                      '<div style="margin-top:4px"><b>' +
                      detail.planName +
                      '</b><br/><span style="color:#aebfc7">' +
                      detail.exercises.join('、') +
                      ' · ' +
                      detail.sets +
                      ' 组 · ' +
                      detail.minutes +
                      ' 分钟</span></div>',
                  )
                  .join('') +
                '</div>'
              : '<div style="margin-top:8px;color:#aebfc7">当天没有匹配的训练记录</div>'
            return (
              '<div><b>' +
              items[0].axisValue +
              '</b></div>' +
              items
                .map(
                  (item) =>
                    '<div><span style="color:' +
                    item.color +
                    '">●</span> ' +
                    item.seriesName +
                    ': <b>' +
                    item.value +
                    '</b></div>',
                )
                .join('') +
              detailHtml
            )
          },
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: labels,
          axisLine: { lineStyle: { color: '#344650' } },
          axisTick: { show: false },
          axisLabel: { color: '#8b9ba5', margin: 12 },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: maxValue,
          name: metrics.length === 1 && metrics[0] === 'minutes' ? '分钟' : '组',
          nameTextStyle: { color: '#8b9ba5', padding: [0, 0, 0, 8] },
          splitNumber: 2,
          axisLine: { show: true, lineStyle: { color: '#344650' } },
          axisTick: { show: false },
          axisLabel: { color: '#8b9ba5', precision: 0 },
          splitLine: { lineStyle: { color: 'rgba(52,70,80,.72)' } },
        },
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: 0,
            start: zoomStart ?? initialStart,
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
            start: zoomStart ?? initialStart,
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
        series,
      },
      { notMerge: true },
    )
  }

  onMount(() => {
    chart = echarts.init(root, null, { renderer: 'canvas' })
    chart.on('datazoom', () => {
      const dataZoom = chart.getOption().dataZoom?.[0]
      if (dataZoom) {
        zoomStart = Number(dataZoom.start)
        zoomEnd = Number(dataZoom.end)
      }
    })
    chartRoot = chart.getZr()
    chartRoot.on('click', (event) => {
      const plotTop = 22
      const plotBottom = root.clientHeight - 58
      const x = event.zrX ?? event.offsetX
      const y = event.zrY ?? event.offsetY
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        y < plotTop ||
        y > plotBottom ||
        !points.length
      )
        return
      const pixelValue = chart.convertFromPixel({ xAxisIndex: 0 }, [x, y])
      const convertedIndex = Number(pixelValue?.[0])
      const index = Number.isFinite(convertedIndex)
        ? Math.max(0, Math.min(points.length - 1, Math.round(convertedIndex)))
        : Math.max(
            0,
            Math.min(
              points.length - 1,
              Math.round((x / Math.max(1, root.clientWidth)) * (points.length - 1)),
            ),
          )
      if (points[index]) {
        chart.dispatchAction({ type: 'hideTip' })
        dispatch('select', points[index])
      }
    })
    renderChart()
    resizeObserver = new ResizeObserver(() => chart?.resize())
    resizeObserver.observe(root)
  })

  onDestroy(() => {
    resizeObserver?.disconnect()
    chartRoot?.off('click')
    chart?.dispose()
  })
</script>

<div
  class="daily-line-chart"
  bind:this={root}
  role="img"
  aria-label="按天训练趋势折线图"
></div>

<style>
  .daily-line-chart {
    width: 100%;
    height: 300px;
    min-height: 270px;
    touch-action: none;
  }
</style>
