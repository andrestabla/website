// Conectores nativos para leer datos de plataformas hermanas por su API pública
// (sin scraping). Con allowlist de hosts para evitar SSRF.

const ALLOWED_HOST_SUFFIXES = ['misproyectos.com.co', 'algoritmot.com']

type Parsed =
  | { kind: 'misproyectos'; origin: string; token: string }
  | { kind: 'algoritmot-board'; origin: string; token: string }

function hostAllowed(host: string): boolean {
  const h = host.toLowerCase()
  return ALLOWED_HOST_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`))
}

/** Identifica un enlace soportado y extrae su token. */
export function parseConnectorUrl(raw: string): Parsed | null {
  let u: URL
  try {
    u = new URL(String(raw).trim())
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  if (!hostAllowed(u.hostname)) return null
  const origin = `${u.protocol}//${u.host}`

  // Mis Proyectos: /public/board/<token>
  let m = u.pathname.match(/\/public\/board\/([^/?#]+)/i)
  if (m && /misproyectos\.com\.co$/i.test(u.hostname.replace(/^www\./, ''))) {
    return { kind: 'misproyectos', origin, token: decodeURIComponent(m[1]) }
  }
  // Este sistema: /board/<token>
  m = u.pathname.match(/\/board\/([^/?#]+)/i)
  if (m) return { kind: 'algoritmot-board', origin, token: decodeURIComponent(m[1]) }
  return null
}

async function fetchJson(url: string, ms = 12000): Promise<any> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const text = (await res.text()).slice(0, 2_000_000) // cap ~2MB
    return JSON.parse(text)
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export type ConnectorSummary = {
  provider: string
  name: string
  totalTasks: number
  avgProgress: number // 0-100
  doneProgress: number // 0-100 (tareas en estado final 'done')
  byStatus: { name: string; count: number; pct: number }[]
  text: string // resumen compacto para la IA
}

// Replica el cálculo de progreso por tarea de Mis Proyectos (getStatusInfo).
function taskProgress(statuses: any[], status: string): number {
  if (!Array.isArray(statuses) || statuses.length === 0) return status === 'done' ? 100 : 0
  const idx = statuses.findIndex((c: any) => c.id === status)
  if (idx === -1) return status === 'done' ? 100 : 0
  const col = statuses[idx]
  if (typeof col.percentage === 'number') return col.percentage
  if (statuses.length <= 1) return 100
  return Math.round((idx / (statuses.length - 1)) * 100)
}

function summarizeMisproyectos(json: any): ConnectorSummary | null {
  if (!json?.dashboard) return null
  const statuses: any[] = json.dashboard?.settings?.statuses || []
  const tasks: any[] = Array.isArray(json.tasks) ? json.tasks : []
  const total = tasks.length
  const avgProgress = total
    ? Math.round(tasks.reduce((a, t) => a + taskProgress(statuses, t.status), 0) / total)
    : 0
  const doneProgress = total ? Math.round((tasks.filter((t) => t.status === 'done').length / total) * 100) : 0

  const nameById = new Map<string, string>(statuses.map((s: any) => [s.id, s.name]))
  const counts = new Map<string, number>()
  for (const t of tasks) counts.set(t.status, (counts.get(t.status) || 0) + 1)
  const byStatus = statuses.map((s: any) => {
    const count = counts.get(s.id) || 0
    return { name: s.name, count, pct: total ? Math.round((count / total) * 100) : 0 }
  })
  // estados presentes que no están en settings
  for (const [id, count] of counts) {
    if (!nameById.has(id)) byStatus.push({ name: id, count, pct: total ? Math.round((count / total) * 100) : 0 })
  }

  const text =
    `Tablero "Mis Proyectos": ${json.dashboard?.name || ''}. Tareas: ${total}. ` +
    `Avance promedio (según etapa del pipeline): ${avgProgress}%. ` +
    `Completadas (estado final): ${doneProgress}%. ` +
    `Distribución por estado: ${byStatus.map((s) => `${s.name}=${s.count} (${s.pct}%)`).join(', ')}.`

  return { provider: 'misproyectos', name: json.dashboard?.name || '', totalTasks: total, avgProgress, doneProgress, byStatus, text }
}

function summarizeAlgoritmotBoard(json: any): ConnectorSummary | null {
  const b = json?.board
  if (!b) return null
  const cols: any[] = b.columns || []
  const rows: any[] = b.rows || []
  const text =
    `Tablero "${b.title || ''}" (este sistema). Filas: ${rows.length}. ` +
    `Columnas: ${cols.map((c: any) => c.name).join(', ')}.`
  return { provider: 'algoritmot', name: b.title || '', totalTasks: rows.length, avgProgress: 0, doneProgress: 0, byStatus: [], text }
}

/** Lee un enlace soportado y devuelve un resumen estructurado, o null. */
export async function fetchConnectorSummary(rawUrl: string): Promise<ConnectorSummary | null> {
  const parsed = parseConnectorUrl(rawUrl)
  if (!parsed) return null
  if (parsed.kind === 'misproyectos') {
    const json = await fetchJson(`${parsed.origin}/api/public/board/${encodeURIComponent(parsed.token)}`)
    return json ? summarizeMisproyectos(json) : null
  }
  if (parsed.kind === 'algoritmot-board') {
    const json = await fetchJson(`${parsed.origin}/api/pc/public?token=${encodeURIComponent(parsed.token)}`)
    return json ? summarizeAlgoritmotBoard(json) : null
  }
  return null
}
