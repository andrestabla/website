/**
 * Cotizador — el builder conversacional.
 *
 * El consultor conversa; el modelo responde y además devuelve un *patch* con
 * los cambios que propone sobre la cotización. El servidor es quien aplica ese
 * patch: valida los códigos contra el catálogo, ignora cualquier cifra que venga
 * del modelo y recalcula los totales. La IA redacta; el catálogo cotiza.
 */
import { prisma } from '../_lib/prisma.js'
import { generateJsonWithAI } from '../_lib/ai.js'
import {
  quoteSessionState,
  loadCatalog,
  catalogMap,
  computeTotals,
  formatMoney,
  type QuoteItem,
} from '../_lib/quotes.js'

type VercelRequest = any
type VercelResponse = any

export const maxDuration = 60

const quoteDb = () => (prisma as any).quote
const msgDb = () => (prisma as any).quoteMessage
const knowledgeDb = () => (prisma as any).quoteKnowledgeDoc

const str = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const strArray = (v: unknown, max = 12) =>
  Array.isArray(v) ? v.map((x) => str(x, 400)).filter(Boolean).slice(0, max) : null

/** Presupuesto de contexto documental, en caracteres (~30k tokens: holgado en gpt-4o).
 *  Debe alcanzar para los casos históricos completos más los documentos de metodología. */
const KNOWLEDGE_BUDGET = 260_000
const HISTORY_TURNS = 16

const SYSTEM_RULES = `
Eres la consultora senior de Algoritmo T que construye cotizaciones junto a su equipo comercial.
Hablas español de Colombia, en tono profesional y aterrizado.

REGLAS DURAS
1. Nunca inventes precios, plazos ni descuentos. Los montos salen del CATÁLOGO y el servidor los recalcula.
   Si necesitas mover el precio, di que hay que ajustar el catálogo; no lo cambies tú.
2. Solo puedes encender o apagar módulos usando los CÓDIGOS exactos del catálogo.
3. Toda afirmación sobre metodología, condiciones o antecedentes debe apoyarse en el CONTEXTO documental.
   Si el contexto no alcanza, dilo y pregunta; no rellenes con supuestos.
4. Pregunta de a una cosa. Si ya tienes lo necesario para redactar una sección, redáctala.

ESTILO (la casa es estricta con esto)
- Prohibido: "compuerta", "en la era digital", "desbloquear el potencial", "robusto", "sin fisuras",
  "de vanguardia", "punta a punta", "en tiempo real", "solución integral", "sinergia", "escalable",
  "optimizar", "eficiente", "eficaz", "efectiva", "potenciar", "impulsar", "clave", "en aras de",
  "de manera/forma + adjetivo", "se busca", "está en proceso de".
- Nada de negaciones estructurales del tipo "no es X, sino Y" ni de frases que arrancan con "no".
  Afirma lo que la cosa es.
- Escribe con sustantivos concretos del negocio del cliente, no con categorías abstractas.
  Mal: "gestionar entregas de manera eficiente". Bien: "saber en qué bodega está cada caja
  y qué pedido va tarde".
- Cada frase debe decir algo que solo aplique a ESTE cliente. Si una frase serviría para cualquier
  empresa, bórrala y escribe otra.
- Nada de rayas decorativas ni emojis. Frases cortas. Verbos concretos.
- Los hitos se llaman "hitos", nunca "compuertas" ni "gates".
`.trim()

/** Aplica los cambios de módulos que propuso el modelo, contra el catálogo real. */
function applyModulePatch(
  items: QuoteItem[],
  patch: { on?: string[] | null; off?: string[] | null },
  catalog: Map<string, any>
) {
  const on = new Set((patch.on ?? []).map((c) => c.toUpperCase()))
  const off = new Set((patch.off ?? []).map((c) => c.toUpperCase()))
  const applied: string[] = []

  const next = items.map((item) => {
    if (item.kind === 'CORE') return item // el núcleo no se apaga
    const code = item.code.toUpperCase()
    if (on.has(code) && !item.on) {
      applied.push(`+${item.code}`)
      return { ...item, on: true }
    }
    if (off.has(code) && item.on) {
      applied.push(`−${item.code}`)
      return { ...item, on: false }
    }
    return item
  })

  // Códigos que el modelo pidió encender y no están en la cotización: los añade desde el catálogo.
  for (const code of on) {
    if (next.some((i) => i.code.toUpperCase() === code)) continue
    const source = catalog.get(code)
    if (!source) continue
    next.push({
      code: source.code,
      name: source.name,
      summary: source.summary,
      category: source.category,
      kind: source.kind === 'CORE' ? 'CORE' : 'MODULE',
      price: source.price,
      weeks: Number(source.weeks) || 0,
      deliverables: source.deliverables,
      on: true,
      detail: source.detail ?? null,
    })
    applied.push(`+${source.code}`)
  }

  return { items: next, applied }
}

/** Mezcla la narrativa propuesta sobre la existente, campo por campo. */
function applyContentPatch(current: any, incoming: any) {
  if (!incoming || typeof incoming !== 'object') return { content: current, touched: [] as string[] }
  const content = { ...(current || {}) }
  const touched: string[] = []

  const setText = (key: string, max: number) => {
    const value = str(incoming[key], max)
    if (value) {
      content[key] = value
      touched.push(key)
    }
  }
  setText('intro', 4000)
  setText('approach', 4000)
  setText('scopeNote', 1500)
  setText('timelineNote', 1500)

  if (incoming.diagnosis && typeof incoming.diagnosis === 'object') {
    const lede = str(incoming.diagnosis.lede, 1200)
    const fronts = Array.isArray(incoming.diagnosis.fronts)
      ? incoming.diagnosis.fronts
          .slice(0, 6)
          .map((f: any) => ({
            title: str(f?.title, 160),
            body: str(f?.body, 1200),
            needs: str(f?.needs, 300),
          }))
          .filter((f: any) => f.title && f.body)
      : null
    if (lede || fronts?.length) {
      content.diagnosis = {
        lede: lede || content.diagnosis?.lede || '',
        fronts: fronts?.length ? fronts : (content.diagnosis?.fronts ?? []),
      }
      touched.push('diagnosis')
    }
  }

  for (const key of ['assumptions', 'exclusions'] as const) {
    const list = strArray(incoming[key])
    if (list?.length) {
      content[key] = list
      touched.push(key)
    }
  }

  return { content, touched }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = quoteSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Sesión requerida' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'Sin acceso al Cotizador' })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const quoteId = str(body.quoteId, 40)
    const message = str(body.message, 4000)
    if (!quoteId) return res.status(400).json({ ok: false, error: 'quoteId requerido' })
    if (!message) return res.status(400).json({ ok: false, error: 'Escribe algo para continuar' })

    const quote = await quoteDb().findUnique({ where: { id: quoteId } })
    if (!quote) return res.status(404).json({ ok: false, error: 'Cotización no encontrada' })
    const isAdmin = session.role === 'SUPERADMIN' || session.role === 'ADMIN'
    if (quote.ownerId !== session.userId && !isAdmin) {
      return res.status(403).json({ ok: false, error: 'Esta cotización es de otro usuario' })
    }

    const [catalogRows, history, docs] = await Promise.all([
      loadCatalog(),
      msgDb().findMany({ where: { quoteId }, orderBy: { createdAt: 'desc' }, take: HISTORY_TURNS }),
      knowledgeDb().findMany({
        where: { active: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { title: true, kind: true, content: true },
      }),
    ])

    const catalog = catalogMap(catalogRows)
    const items: QuoteItem[] = Array.isArray(quote.pricing?.items) ? quote.pricing.items : []

    // ── Contexto documental, recortado al presupuesto ──
    let used = 0
    const contextBlocks: string[] = []
    for (const doc of docs) {
      if (used >= KNOWLEDGE_BUDGET) break
      const room = KNOWLEDGE_BUDGET - used
      const slice = String(doc.content || '').slice(0, room)
      if (!slice) continue
      used += slice.length
      contextBlocks.push(`### ${doc.title} [${doc.kind}]\n${slice}`)
    }

    const catalogBlock = catalogRows
      .map(
        (r: any) =>
          `- ${r.code} · ${r.name} · ${r.category} · ${r.kind === 'CORE' ? 'OBLIGATORIO' : 'opcional'} · ` +
          `${formatMoney(r.price, r.currency)} · ${r.deliverables} entregables · ${r.weeks} sem\n  ${r.summary}`
      )
      .join('\n')

    const activeCodes = items.filter((i) => i.on || i.kind === 'CORE').map((i) => i.code)
    const totals = computeTotals(items, { scale: quote.discountScale })

    const transcript = history
      .slice()
      .reverse()
      .map((m: any) => `${m.role === 'user' ? 'CONSULTOR' : 'TÚ'}: ${m.content}`)
      .join('\n')

    const prompt = `
${SYSTEM_RULES}

## CATÁLOGO (única fuente de cifras)
${catalogBlock}

## CONTEXTO DOCUMENTAL DE ALGORITMO T
${contextBlocks.length ? contextBlocks.join('\n\n') : '(sin documentos cargados todavía)'}

## ESTADO ACTUAL DE LA COTIZACIÓN
Cliente: ${quote.clientName}${quote.sector ? ` · Sector: ${quote.sector}` : ''}
Título: ${quote.title}
Módulos activos (${totals.moduleCount}): ${activeCodes.join(', ') || 'ninguno'}
Total calculado: ${formatMoney(totals.total, quote.currency)} · ${totals.weeks} semanas · ${totals.deliverables} entregables
Secciones ya redactadas: ${Object.entries(quote.content || {})
      .filter(([, v]) => (typeof v === 'string' ? v.length > 0 : Array.isArray(v) ? v.length > 0 : false))
      .map(([k]) => k)
      .join(', ') || 'ninguna'}

## CONVERSACIÓN
${transcript || '(primera intervención)'}
CONSULTOR: ${message}

## RESPONDE SOLO CON ESTE JSON
{
  "reply": "tu respuesta al consultor, 2 a 5 frases; si redactaste algo, dilo y ofrece el siguiente paso",
  "patch": {
    "clientName": "opcional",
    "sector": "opcional",
    "title": "opcional",
    "subtitle": "opcional",
    "modules": { "on": ["M03"], "off": ["M12"] },
    "content": {
      "intro": "carta de presentación, 2 a 4 párrafos separados por \\n\\n",
      "diagnosis": {
        "lede": "entradilla del diagnóstico",
        "fronts": [{ "title": "", "body": "", "needs": "qué necesita" }]
      },
      "approach": "cómo se resuelve",
      "scopeNote": "nota de alcance",
      "timelineNote": "cómo leer el cronograma",
      "assumptions": ["supuesto 1"],
      "exclusions": ["exclusión 1"]
    }
  }
}
Incluye en "patch" SOLO las claves que de verdad cambian en este turno. Si no cambia nada, envía "patch": {}.
`.trim()

    const { data, providerUsed } = await generateJsonWithAI({ prompt, temperature: 0.5, maxTokens: 2600 })

    const reply = str(data?.reply, 3000) || 'Listo.'
    const patch = data?.patch && typeof data.patch === 'object' ? data.patch : {}

    // ── El servidor aplica el patch, no el modelo ──
    const changes: string[] = []
    const updates: Record<string, unknown> = {}

    for (const field of ['clientName', 'sector', 'title', 'subtitle'] as const) {
      const value = str(patch[field], 400)
      if (value && value !== quote[field]) {
        updates[field] = value
        changes.push(field)
      }
    }

    const { content, touched } = applyContentPatch(quote.content, patch.content)
    if (touched.length) {
      updates.content = content
      changes.push(...touched)
    }

    let nextItems = items
    if (patch.modules && typeof patch.modules === 'object') {
      const result = applyModulePatch(items, patch.modules, catalog)
      if (result.applied.length) {
        nextItems = result.items
        changes.push(...result.applied)
      }
    }

    const nextTotals = computeTotals(nextItems, { scale: quote.discountScale })
    if (nextItems !== items || nextTotals.total !== quote.totalFinal) {
      updates.pricing = { items: nextItems, totals: nextTotals }
      updates.totalBase = nextTotals.subtotal
      updates.totalFinal = nextTotals.total
      updates.weeks = nextTotals.weeks
      updates.moduleCount = nextTotals.moduleCount
    }

    const [updated] = await Promise.all([
      Object.keys(updates).length
        ? quoteDb().update({ where: { id: quoteId }, data: updates })
        : Promise.resolve(quote),
      msgDb().createMany({
        data: [
          { quoteId, role: 'user', content: message },
          { quoteId, role: 'assistant', content: reply, meta: { providerUsed, changes } },
        ],
      }),
    ])

    return res.status(200).json({
      ok: true,
      reply,
      changes,
      providerUsed,
      quote: updated,
      totals: nextTotals,
    })
  } catch (error: any) {
    console.error('quotes/chat error:', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
