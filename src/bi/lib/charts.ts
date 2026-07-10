import type { EChartsCoreOption } from 'echarts'
import { topN, sortDesc, type Count } from './factorized'

export const PALETTE = [
  '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
  '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC',
]
export const COLORS = {
  axis: '#c2c8d2',
  label: '#5a6473',
  split: '#eef1f5',
  txt: '#1a1f29',
  panel: '#ffffff',
  tip: '#ffffff',
  tipLine: '#e4e7ec',
  good: '#2d9d78',
  mapMin: '#dbe7f6',
  mapMax: '#1b3a86',
  brand: '#2c5cc5',
}

export const fmt = (n: number) => Number(n).toLocaleString('es-CO')
export const f1 = (n: number) =>
  Number(n).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const axis = () => ({
  axisLine: { lineStyle: { color: COLORS.axis } },
  axisLabel: { color: COLORS.label },
  splitLine: { lineStyle: { color: COLORS.split } },
})
const tooltip = (extra: Record<string, unknown> = {}) => ({
  backgroundColor: COLORS.tip,
  borderColor: COLORS.tipLine,
  textStyle: { color: COLORS.txt },
  ...extra,
})

export function barH(data: Count[], color: string, n = 15, dec = false): EChartsCoreOption {
  const d = topN(data, n).reverse()
  return {
    grid: { left: 12, right: 56, top: 20, bottom: 10, containLabel: true },
    tooltip: tooltip({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
    xAxis: { type: 'value', ...axis() },
    yAxis: {
      type: 'category',
      data: d.map((x) => x.label),
      ...axis(),
      axisLabel: { color: COLORS.txt, fontSize: 11, width: 180, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        data: d.map((x) => x.value),
        itemStyle: { color, borderRadius: [0, 4, 4, 0] },
        barMaxWidth: 20,
        label: { show: true, position: 'right', color: COLORS.label, fontSize: 10, formatter: (p: { value: number }) => (dec ? f1(p.value) : fmt(p.value)) },
      },
    ],
  }
}

export function barV(data: Count[], color: string, n = 33): EChartsCoreOption {
  const d = topN(data, n)
  return {
    grid: { left: 12, right: 20, top: 20, bottom: 12, containLabel: true },
    tooltip: tooltip({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
    xAxis: { type: 'category', data: d.map((x) => x.label), ...axis(), axisLabel: { color: COLORS.label, fontSize: 10, interval: 0, rotate: d.length > 6 ? 32 : 0 } },
    yAxis: { type: 'value', ...axis() },
    series: [{ type: 'bar', data: d.map((x) => x.value), itemStyle: { color, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 30 }],
  }
}

export function donut(data: Count[], colorFn?: (label: string) => string): EChartsCoreOption {
  const d = sortDesc(data)
  return {
    color: d.map((x, i) => (colorFn ? colorFn(x.label) : PALETTE[i % PALETTE.length])),
    tooltip: tooltip({ trigger: 'item', formatter: (p: { name: string; value: number; percent: number }) => `${p.name}<br><b>${fmt(p.value)}</b> (${p.percent}%)` }),
    legend: { type: 'scroll', bottom: 0, textStyle: { color: COLORS.label, fontSize: 11 }, pageTextStyle: { color: COLORS.label } },
    series: [
      {
        type: 'pie',
        radius: ['46%', '70%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: COLORS.panel, borderWidth: 2 },
        label: { color: COLORS.txt, fontSize: 11, formatter: '{b}: {d}%' },
        data: d.map((x) => ({ name: x.label, value: x.value })),
      },
    ],
  }
}

export function roseConcentration(data: Count[]): EChartsCoreOption {
  const d = sortDesc(data)
  const top5 = d.slice(0, 5)
  const resto = d.slice(5).reduce((a, b) => a + b.value, 0)
  const items = top5.map((x) => ({ name: x.label, value: x.value }))
  if (resto > 0) items.push({ name: 'Resto del país', value: resto })
  return {
    color: PALETTE,
    tooltip: tooltip({ trigger: 'item', formatter: (p: { name: string; value: number; percent: number }) => `${p.name}<br><b>${fmt(p.value)}</b> (${p.percent}%)` }),
    legend: { type: 'scroll', bottom: 0, textStyle: { color: COLORS.label, fontSize: 11 } },
    series: [{ type: 'pie', roseType: 'radius', radius: ['30%', '66%'], center: ['50%', '44%'], itemStyle: { borderColor: COLORS.panel, borderWidth: 2 }, label: { color: COLORS.txt, fontSize: 11, formatter: '{b}: {d}%' }, data: items }],
  }
}

export type LineSeries = { name: string; data: (number | null)[]; color?: string; yAxisIndex?: number; area?: boolean }

export function lineChart(
  x: (string | number)[],
  series: LineSeries[],
  opts: { dualAxis?: boolean; y1Name?: string; y2Name?: string; min?: number; max?: number } = {}
): EChartsCoreOption {
  const yAxis = opts.dualAxis
    ? [
        { type: 'value', name: opts.y1Name, ...axis() },
        { type: 'value', name: opts.y2Name, position: 'right', ...axis(), splitLine: { show: false } },
      ]
    : [{ type: 'value', min: opts.min, max: opts.max, ...axis() }]
  return {
    color: series.map((s, i) => s.color || PALETTE[i % PALETTE.length]),
    grid: { left: 12, right: opts.dualAxis ? 40 : 24, top: 34, bottom: 26, containLabel: true },
    tooltip: tooltip({ trigger: 'axis' }),
    legend: { top: 0, textStyle: { color: COLORS.label, fontSize: 11 }, type: 'scroll' },
    xAxis: { type: 'category', data: x, boundaryGap: false, ...axis() },
    yAxis,
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      symbolSize: 6,
      lineStyle: { width: 3 },
      yAxisIndex: s.yAxisIndex || 0,
      areaStyle: s.area ? { opacity: 0.1 } : undefined,
      data: s.data,
    })),
  }
}

/** Barra horizontal con color por ítem (para benchmarking con resaltado). */
export function barHColored(items: { label: string; value: number; color: string }[], dec = false): EChartsCoreOption {
  const d = items.slice()
  return {
    grid: { left: 12, right: 56, top: 16, bottom: 10, containLabel: true },
    tooltip: tooltip({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
    xAxis: { type: 'value', ...axis() },
    yAxis: { type: 'category', data: d.map((x) => x.label), ...axis(), axisLabel: { color: COLORS.txt, fontSize: 11 } },
    series: [
      {
        type: 'bar',
        data: d.map((x) => ({ value: +x.value.toFixed(dec ? 1 : 0), itemStyle: { color: x.color, borderRadius: [0, 4, 4, 0] } })),
        barMaxWidth: 16,
        label: { show: true, position: 'right', color: COLORS.label, fontSize: 10, formatter: (p: { value: number }) => (dec ? f1(p.value) : fmt(p.value)) },
      },
    ],
  }
}

export type ScatterGroup = { name: string; color: string; points: { name: string; x: number; y: number; tip?: string }[] }

export function quadrantScatter(groups: ScatterGroup[], opts: { xName?: string; yName?: string; median?: number; label?: boolean } = {}): EChartsCoreOption {
  const med = opts.median ?? 50
  return {
    color: groups.map((g) => g.color),
    grid: { left: 40, right: 24, top: 14, bottom: 44, containLabel: true },
    tooltip: tooltip({ trigger: 'item', formatter: (p: { data: { name: string; tip?: string } }) => p.data.tip || p.data.name }),
    legend: groups.length > 1 ? { bottom: 0, textStyle: { color: COLORS.label, fontSize: 11 } } : undefined,
    xAxis: { type: 'value', min: 0, max: 100, name: opts.xName, nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: COLORS.label }, ...axis() },
    yAxis: { type: 'value', min: 0, max: 100, name: opts.yName, nameLocation: 'middle', nameGap: 30, nameTextStyle: { color: COLORS.label }, ...axis() },
    series: groups.map((g, gi) => ({
      name: g.name,
      type: 'scatter',
      symbolSize: 15,
      itemStyle: { color: g.color, opacity: 0.9, borderColor: COLORS.panel, borderWidth: 1 },
      label: opts.label !== false ? { show: true, formatter: (p: { data: { name: string } }) => (p.data.name.length > 22 ? p.data.name.slice(0, 20) + '…' : p.data.name), position: 'right', color: COLORS.label, fontSize: 9 } : undefined,
      data: g.points.map((pt) => ({ name: pt.name, value: [pt.x, pt.y], tip: pt.tip })),
      markLine: gi === 0 ? { silent: true, symbol: 'none', lineStyle: { color: COLORS.axis, type: 'dashed' }, label: { show: false }, data: [{ xAxis: med }, { yAxis: med }] } : undefined,
    })),
  }
}

export function choroplethDiverging(
  data: { name: string; value: number }[],
  mapName: string,
  nameProperty: string,
  isRegion: boolean,
  texts: [string, string] = ['Menor', 'Mayor']
): EChartsCoreOption {
  const M = Math.ceil(data.reduce((a, b) => Math.max(a, Math.abs(b.value)), 0) / 10) * 10 || 60
  return {
    tooltip: tooltip({ trigger: 'item', formatter: (p: { name: string; value?: number }) => `${p.name}<br><b>${p.value != null ? (p.value > 0 ? '+' : '') + f1(p.value) : 's/d'}</b>` }),
    visualMap: { min: -M, max: M, left: 8, bottom: 14, calculable: true, textStyle: { color: COLORS.label }, text: texts, inRange: { color: ['#4E79A7', COLORS.split, '#E15759'] } },
    series: [
      {
        type: 'map', map: mapName, roam: true, nameProperty,
        itemStyle: { borderColor: COLORS.panel, borderWidth: isRegion ? 0.8 : 0.6, areaColor: COLORS.split },
        emphasis: { itemStyle: { areaColor: COLORS.brand }, label: { show: false } },
        label: { show: false }, data,
      },
    ],
  }
}

export function choropleth(
  data: { name: string; value: number }[],
  mapName: string,
  nameProperty: string,
  isRegion: boolean
): EChartsCoreOption {
  const max = data.reduce((a, b) => Math.max(a, b.value), 0) || 1
  return {
    tooltip: tooltip({ trigger: 'item', formatter: (p: { name: string; value?: number }) => `${p.name}<br><b>${p.value ? fmt(p.value) : 0}</b> programas` }),
    visualMap: { type: 'continuous', min: 0, max, left: 8, bottom: 14, calculable: true, inRange: { color: [COLORS.mapMin, COLORS.mapMax] }, textStyle: { color: COLORS.label }, text: ['Mayor', 'Menor'] },
    series: [
      {
        type: 'map',
        map: mapName,
        roam: true,
        nameProperty,
        itemStyle: { borderColor: COLORS.panel, borderWidth: isRegion ? 0.8 : 0.6, areaColor: COLORS.split },
        emphasis: { itemStyle: { areaColor: COLORS.brand }, label: { show: isRegion, color: '#fff', fontSize: 10 } },
        label: { show: isRegion, color: COLORS.txt, fontSize: 9 },
        data,
      },
    ],
  }
}
