import { prisma } from './prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from './integrations.js'
import { generateChatWithAI } from './ai.js'

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type Factorized = { n: number; dicts: Record<string, string[]>; data: Record<string, number[]> }

const strip = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// ── Carga y consulta de datasets (factorizados) ────────────────────────────
async function loadDataset(cache: Map<string, any>, key: string): Promise<any> {
  if (cache.has(key)) return cache.get(key)
  const row = await (prisma as any).biDataset.findUnique({ where: { key } })
  const data = row?.data ?? null
  cache.set(key, data)
  return data
}

/** Índices del diccionario cuyo texto contiene el término (sin tildes). */
function matchIdx(dict: string[], term: string): Set<number> {
  const t = strip(term)
  const out = new Set<number>()
  dict.forEach((label, i) => { if (strip(label).includes(t)) out.add(i) })
  return out
}

function buildMask(ds: Factorized, filters: Record<string, string | undefined>): Uint8Array {
  const mask = new Uint8Array(ds.n).fill(1)
  for (const [col, val] of Object.entries(filters)) {
    if (!val || !ds.dicts[col] || !ds.data[col]) continue
    const wanted = matchIdx(ds.dicts[col], val)
    const arr = ds.data[col]
    for (let i = 0; i < ds.n; i++) if (mask[i] && !wanted.has(arr[i])) mask[i] = 0
  }
  return mask
}

function countBy(ds: Factorized, col: string, mask: Uint8Array, limit: number) {
  const dict = ds.dicts[col]; const arr = ds.data[col]
  if (!dict || !arr) return []
  const tally: Record<number, number> = {}
  for (let i = 0; i < ds.n; i++) if (mask[i]) tally[arr[i]] = (tally[arr[i]] || 0) + 1
  return Object.entries(tally)
    .map(([idx, count]) => ({ valor: dict[Number(idx)], registros: count }))
    .filter((x) => x.valor && x.valor !== 'Sin dato')
    .sort((a, b) => b.registros - a.registros)
    .slice(0, limit)
}

function distinctCount(ds: Factorized, col: string, mask: Uint8Array) {
  const arr = ds.data[col]; if (!arr) return 0
  const s = new Set<number>()
  for (let i = 0; i < ds.n; i++) if (mask[i]) s.add(arr[i])
  return s.size
}

// ── Ejecutores de herramientas ─────────────────────────────────────────────
async function consultarOferta(cache: Map<string, any>, args: any) {
  const payload = await loadDataset(cache, 'insights')
  const ds: Factorized = payload?.dataset
  if (!ds) return { error: 'Dataset de oferta no disponible' }
  const mask = buildMask(ds, {
    programa: args.programa,
    institucion: args.institucion,
    area_conocimiento: args.area_conocimiento,
    departamento: args.departamento,
    sector: args.sector,
    nivel_academico: args.nivel_academico,
    modalidad: args.modalidad,
    municipio: args.municipio,
  })
  if (args.solo_vigentes) {
    const vig = matchIdx(ds.dicts.estado || [], 'Vigente')
    const arr = ds.data.estado
    for (let i = 0; i < ds.n; i++) if (mask[i] && arr && !vig.has(arr[i])) mask[i] = 0
  }
  let total = 0
  for (let i = 0; i < ds.n; i++) if (mask[i]) total++
  const limite = Math.min(Math.max(Number(args.limite) || 25, 1), 80)
  const groupCol = String(args.agrupar_por || 'institucion')
  return {
    total_registros_coincidentes: total,
    instituciones_distintas: distinctCount(ds, 'institucion', mask),
    programas_distintos: distinctCount(ds, 'programa', mask),
    departamentos_distintos: distinctCount(ds, 'departamento', mask),
    agrupado_por: groupCol,
    agrupado: countBy(ds, groupCol, mask, limite),
    nota: 'Datos reales SNIES/MEN. "registros" = programas registrados que coinciden. Un mismo título puede repetirse por sede/modalidad.',
  }
}

async function consultarEmpleabilidad(cache: Map<string, any>, args: any) {
  const payload = await loadDataset(cache, 'ole')
  const panel: Factorized = payload?.panel
  if (!panel) return { error: 'Dataset OLE no disponible' }
  const mask = buildMask(panel, {
    area_conocimiento: args.area_conocimiento,
    departamento: args.departamento,
    anio: args.anio ? String(args.anio) : undefined,
  })
  const cols = ['tasa_vinculacion_formal_estimada', 'tasa_empleabilidad_estimada', 'indice_atractivo_laboral', 'ingreso_mediano_estimado_cop', 'tiempo_estimado_primer_empleo_meses', 'graduados_estimados']
  const means: Record<string, number> = {}
  let n = 0
  for (let i = 0; i < panel.n; i++) if (mask[i]) n++
  for (const c of cols) {
    const arr = panel.data[c]; if (!arr) continue
    let s = 0
    for (let i = 0; i < panel.n; i++) if (mask[i]) s += arr[i]
    means[c] = n ? +(s / n).toFixed(c === 'ingreso_mediano_estimado_cop' || c === 'graduados_estimados' ? 0 : 3) : 0
  }
  // Top áreas por atractivo (si no se filtró por área)
  let topAreas: any[] = []
  if (!args.area_conocimiento && payload.top_areas) topAreas = payload.top_areas.slice(0, 10)
  return { registros: n, promedios: means, top_areas_por_atractivo: topAreas, nota: 'OLE/MEN · SNIES · DANE-GEIH (estimaciones agregadas 2021–2025). Tasas en fracción (0–1) salvo índices.' }
}

async function consultarRecomendaciones(cache: Map<string, any>, args: any) {
  const payload = await loadDataset(cache, 'recomendaciones')
  if (!payload) return { error: 'Dataset de recomendaciones no disponible' }
  const pick = (sectores: any[]) => sectores.slice(0, 6).map((s) => ({ sector: s.sector, score: s.score, nivel: s.nivel, programas_sugeridos: s.programas_sugeridos, justificacion: s.justificacion }))
  if (args.departamento) {
    const d = (payload.departamentos || []).find((x: any) => strip(x.departamento) === strip(args.departamento) || strip(x.departamento).includes(strip(args.departamento)))
    if (!d) return { error: 'Departamento no encontrado', disponibles: (payload.departamentos || []).map((x: any) => x.departamento).slice(0, 40) }
    return { departamento: d.departamento, region: d.region, total_vigentes: d.total_vigentes, recomendaciones: pick(d.recomendaciones || []) }
  }
  if (args.region) {
    const r = (payload.regiones || []).find((x: any) => strip(x.region) === strip(args.region) || strip(x.region).includes(strip(args.region)))
    if (!r) return { error: 'Región no encontrada', disponibles: (payload.regiones || []).map((x: any) => x.region) }
    return { region: r.region, departamentos: r.departamentos, recomendaciones: pick(r.sectores || []) }
  }
  return { resumen_por_region: (payload.regiones || []).map((r: any) => ({ region: r.region, top_sector: r.sectores?.[0]?.sector, score: r.sectores?.[0]?.score, nivel: r.sectores?.[0]?.nivel })) }
}

async function consultarPertinencia(cache: Map<string, any>, args: any) {
  const payload = await loadDataset(cache, 'pertinencia')
  const D: any[] = payload?.departamentos || []
  if (!D.length) return { error: 'Dataset de pertinencia no disponible' }
  if (args.departamento) {
    const d = D.find((x) => strip(x.dep) === strip(args.departamento) || strip(x.dep).includes(strip(args.departamento)))
    if (!d) return { error: 'Departamento no encontrado', disponibles: D.map((x) => x.dep) }
    return { departamento: d.dep, region: d.region, cuadrante: d.quadrant, brecha_gap: d.gap, percentil_oferta: d.supply_rank, percentil_demanda: d.demand_rank, programas_vigentes: d.supply_vigentes, top_areas_oferta: d.top_areas?.slice(0, 8), top_competencias_demanda: d.top_competencias?.slice(0, 8) }
  }
  const byQuad: Record<string, number> = {}
  D.forEach((d) => { byQuad[d.quadrant] = (byQuad[d.quadrant] || 0) + 1 })
  const topGaps = D.slice().sort((a, b) => b.gap - a.gap).slice(0, 8).map((d) => ({ departamento: d.dep, brecha: d.gap, cuadrante: d.quadrant }))
  return { por_cuadrante: byQuad, mayores_brechas_demanda_sobre_oferta: topGaps }
}

async function buscarWeb(query: string) {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data))
  const tavily = integrations.tavily
  if (!tavily.enabled || !tavily.config.apiKey) return { error: 'Búsqueda web no configurada (Tavily).' }
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: tavily.config.apiKey, query: String(query).slice(0, 380), search_depth: tavily.config.searchDepth || 'advanced', max_results: tavily.config.maxResults || 5, include_answer: true }),
  })
  if (!res.ok) return { error: 'Fallo en la búsqueda web.' }
  const data = await res.json().catch(() => null)
  return { resumen: data?.answer || '', fuentes: (data?.results || []).slice(0, 8).map((r: any) => ({ titulo: r.title, url: r.url, extracto: String(r.content || '').slice(0, 800) })) }
}

const TOOLS = (webEnabled: boolean) => {
  const t: any[] = [
    {
      type: 'function',
      function: {
        name: 'consultar_oferta_educativa',
        description: 'Consulta la base real SNIES/MEN de oferta educativa de Colombia (27.005 programas, 361 IES, 33 departamentos). Filtra por programa, institución, área de conocimiento, departamento, sector (Oficial/Privado), nivel (Pregrado/Posgrado), modalidad o municipio, y agrupa para contar. Úsala para "qué universidades ofertan X", "programas más ofertados", "oferta por área/departamento", conteos de IES, etc.',
        parameters: {
          type: 'object',
          properties: {
            programa: { type: 'string', description: 'Texto a buscar en el nombre del programa (parcial), p. ej. "Administración de Empresas".' },
            institucion: { type: 'string' },
            area_conocimiento: { type: 'string' },
            departamento: { type: 'string' },
            sector: { type: 'string', description: 'Oficial o Privado' },
            nivel_academico: { type: 'string', description: 'Pregrado o Posgrado' },
            modalidad: { type: 'string' },
            municipio: { type: 'string' },
            solo_vigentes: { type: 'boolean', description: 'Solo programas con registro vigente.' },
            agrupar_por: { type: 'string', enum: ['institucion', 'departamento', 'area_conocimiento', 'programa', 'sector', 'nivel_academico', 'nivel_formacion', 'modalidad', 'municipio'] },
            limite: { type: 'integer', description: 'Máximo de filas agrupadas (por defecto 25).' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'consultar_empleabilidad',
        description: 'Indicadores de empleabilidad de graduados (OLE): vinculación formal, empleabilidad, ingreso mediano, atractivo laboral y tiempo al primer empleo, por área de conocimiento y/o departamento (2021–2025).',
        parameters: { type: 'object', properties: { area_conocimiento: { type: 'string' }, departamento: { type: 'string' }, anio: { type: 'string' } } },
      },
    },
    {
      type: 'function',
      function: {
        name: 'consultar_recomendaciones',
        description: 'Recomendación analítica de programas a ofertar por región o departamento (sectores con mayor oportunidad, score 0–100, programas sugeridos, justificación).',
        parameters: { type: 'object', properties: { region: { type: 'string' }, departamento: { type: 'string' } } },
      },
    },
    {
      type: 'function',
      function: {
        name: 'consultar_pertinencia',
        description: 'Pertinencia territorial (oferta ↔ demanda) por departamento: cuadrante, brecha, percentiles de oferta/demanda, top áreas y competencias. Sin argumentos devuelve el panorama nacional.',
        parameters: { type: 'object', properties: { departamento: { type: 'string' } } },
      },
    },
  ]
  if (webEnabled) {
    t.push({ type: 'function', function: { name: 'buscar_web', description: 'Busca en Internet (Tavily) información externa reciente. Úsala SOLO después de agotar la base de datos de la plataforma y los archivos, o para datos que no están en la plataforma.', parameters: { type: 'object', properties: { consulta: { type: 'string' } }, required: ['consulta'] } } })
  }
  return t
}

async function executeTool(cache: Map<string, any>, name: string, args: any) {
  switch (name) {
    case 'consultar_oferta_educativa': return consultarOferta(cache, args)
    case 'consultar_empleabilidad': return consultarEmpleabilidad(cache, args)
    case 'consultar_recomendaciones': return consultarRecomendaciones(cache, args)
    case 'consultar_pertinencia': return consultarPertinencia(cache, args)
    case 'buscar_web': return buscarWeb(args?.consulta || '')
    default: return { error: 'Herramienta desconocida' }
  }
}

async function getOpenAI() {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data))
  const o = integrations.openai
  if (!o.enabled || !o.config.apiKey) return null
  return { apiKey: o.config.apiKey, model: o.config.model || process.env.OPENAI_MODEL || 'gpt-4o', orgId: o.config.orgId || '' }
}

/** Ejecuta el agente con acceso a las herramientas de datos de la plataforma. */
export async function runBiAgent(input: { system: string; messages: ChatMessage[]; webAccess: boolean }): Promise<{ reply: string; toolsUsed: string[] }> {
  const openai = await getOpenAI()
  const cache = new Map<string, any>()
  const toolsUsed: string[] = []

  // Sin OpenAI configurado: respuesta grounded básica (sin herramientas).
  if (!openai) {
    const { text } = await generateChatWithAI({ system: input.system + '\n\n(Nota: sin OpenAI configurado no puedo consultar la base en vivo; responde con lo disponible e indícalo.)', messages: input.messages, provider: 'auto', temperature: 0.4, maxTokens: 1800 })
    return { reply: text, toolsUsed }
  }

  const tools = TOOLS(input.webAccess)
  const headers: Record<string, string> = { Authorization: `Bearer ${openai.apiKey}`, 'Content-Type': 'application/json' }
  if (openai.orgId) headers['OpenAI-Organization'] = openai.orgId

  const convo: any[] = [{ role: 'system', content: input.system }, ...input.messages]

  for (let round = 0; round < 5; round++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: openai.model, messages: convo, tools, tool_choice: 'auto', temperature: 0.35, max_tokens: 2200 }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(json?.error?.message || `OpenAI request failed (${res.status})`)
    const msg = json?.choices?.[0]?.message
    if (!msg) throw new Error('Respuesta vacía del modelo')
    convo.push(msg)
    const calls = msg.tool_calls || []
    if (!calls.length) return { reply: String(msg.content || '').trim(), toolsUsed }

    for (const call of calls) {
      let args: any = {}
      try { args = JSON.parse(call.function?.arguments || '{}') } catch { /* keep {} */ }
      toolsUsed.push(call.function?.name)
      let result: any
      try { result = await executeTool(cache, call.function?.name, args) } catch (e) { result = { error: (e as Error).message } }
      convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 24000) })
    }
  }
  // Se agotaron las rondas: pide cierre sin más herramientas.
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: openai.model, messages: [...convo, { role: 'user', content: 'Cierra con la mejor respuesta posible usando lo ya consultado.' }], temperature: 0.35, max_tokens: 2200 }),
  })
  const json = await res.json().catch(() => null)
  return { reply: String(json?.choices?.[0]?.message?.content || '').trim() || 'No fue posible completar la respuesta.', toolsUsed }
}
