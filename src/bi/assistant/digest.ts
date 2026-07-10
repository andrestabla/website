/**
 * Convierte una opción de ECharts en un resumen textual compacto
 * (etiqueta: valor) para que el asistente IA interprete el bloque señalado.
 * Soporta barras (H/V), líneas (multi-serie), pie/donut/rosa, mapas coropléticos
 * y dispersión por cuadrantes.
 */
const numFmt = (n: number) =>
  Number(n).toLocaleString('es-CO', { maximumFractionDigits: 1 })

function pickCategory(axis: any): string[] | null {
  if (!axis) return null
  const a = Array.isArray(axis)
    ? axis.find((x) => x && x.type === 'category')
    : axis.type === 'category'
      ? axis
      : null
  return a && Array.isArray(a.data) ? a.data.map((d: any) => String(d)) : null
}

export function digestOption(option: any): string {
  if (!option || typeof option !== 'object') return ''
  const series = Array.isArray(option.series) ? option.series : option.series ? [option.series] : []
  if (!series.length) return ''

  const cats = pickCategory(option.xAxis) || pickCategory(option.yAxis)
  const lines: string[] = []

  for (const s of series) {
    const data = Array.isArray(s?.data) ? s.data : []
    if (!data.length) continue
    const name =
      s.name || (s.type === 'pie' ? 'Distribución' : s.type === 'map' ? 'Mapa' : s.type === 'scatter' ? 'Puntos' : 'Serie')

    const pairs: string[] = []
    data.forEach((d: any, i: number) => {
      let label: string
      let val: any
      if (d && typeof d === 'object') {
        label = d.name != null ? String(d.name) : cats ? String(cats[i] ?? i) : String(i)
        val = d.value
      } else {
        label = cats ? String(cats[i] ?? i) : String(i)
        val = d
      }
      if (val == null) return
      if (Array.isArray(val)) val = val.map((v) => (typeof v === 'number' ? numFmt(v) : v)).join(' / ')
      else if (typeof val === 'number') val = numFmt(val)
      pairs.push(`${label}: ${val}`)
    })

    if (pairs.length) {
      const capped = pairs.slice(0, 40)
      const extra = pairs.length > 40 ? ` … (+${pairs.length - 40} más)` : ''
      lines.push(`${name} — ${capped.join('; ')}${extra}`)
    }
  }

  return lines.join('\n')
}
