import { useEffect, useId, useRef } from 'react'
import * as echarts from 'echarts'
import type { CSSProperties } from 'react'
import { useBlockDigestSink } from '../assistant/blockScope'
import { digestOption } from '../assistant/digest'

/** Wrapper mínimo de ECharts para React (init, setOption, resize, dispose). */
export function EChart({
  option,
  height = 340,
  className,
  style,
}: {
  option: echarts.EChartsCoreOption
  height?: number
  className?: string
  style?: CSSProperties
}) {
  const elRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const sink = useBlockDigestSink()
  const chartId = useId()

  // Publica el resumen de datos de esta gráfica al bloque contenedor (para el asistente IA).
  useEffect(() => {
    if (!sink) return
    sink.add(chartId, digestOption(option))
    return () => sink.remove(chartId)
  }, [sink, chartId, option])

  useEffect(() => {
    if (!elRef.current) return
    const chart = echarts.init(elRef.current)
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(elRef.current)
    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  return <div ref={elRef} className={className} style={{ width: '100%', height, ...style }} />
}
