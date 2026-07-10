import * as echarts from 'echarts'

let registered = false
const GEO_INDEX: Record<string, string> = {}

export function normDept(s: string): string {
  return (s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z ]/g, ' ')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function toGeoName(label: string): string | null {
  if (!label || label === 'Sin dato' || normDept(label) === 'NO ESPECIFICA') return null
  const n = normDept(label)
  if (n.includes('BOGOTA')) return GEO_INDEX['SANTAFE DE BOGOTA D C'] || null
  if (n.includes('SAN ANDRES')) return GEO_INDEX['ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA'] || null
  return GEO_INDEX[n] || null
}

/** Descarga y registra los mapas de Colombia (departamentos y regiones) una sola vez. */
export async function ensureMaps(): Promise<void> {
  if (registered) return
  const [dep, reg] = await Promise.all([
    fetch('/bi-geo/co_departamentos.geojson').then((r) => r.json()),
    fetch('/bi-geo/co_regiones.geojson').then((r) => r.json()),
  ])
  echarts.registerMap('CO', dep)
  echarts.registerMap('CO_REG', reg)
  for (const f of dep.features) GEO_INDEX[normDept(f.properties.NOMBRE_DPT)] = f.properties.NOMBRE_DPT
  registered = true
}
