/**
 * Cotizador — el builder conversacional.
 *
 * El consultor conversa; el modelo responde y además devuelve un *patch* con
 * los cambios que propone sobre la cotización. El servidor es quien aplica ese
 * patch: valida los códigos contra el catálogo, aplica las líneas y cifras que
 * el consultor dictó en la conversación y recalcula los totales. La IA
 * construye la cotización entera; el servidor calcula.
 *
 * La IA construye con el portafolio completo de la casa: lee en cada turno lo
 * que publica algoritmot.com (portada, línea Empresas y línea Educación, con
 * sus servicios, protocolos y método), además del catálogo y del histórico de
 * propuestas. Así una cotización de cursos habla de las fases de virtualización
 * y una de transformación, de las seis fases y los tres protocolos.
 */
import { prisma } from '../_lib/prisma.js'
import { generateJsonWithAI } from '../_lib/ai.js'
import { loadPlatformContext } from '../_lib/platform-context.js'
import {
  quoteSessionState,
  loadCatalog,
  catalogMap,
  computeTotals,
  formatMoney,
  QUOTE_TEMPLATES,
  normalizeTemplate,
  DEFAULT_DISCOUNT_SCALE,
  FLAT_DISCOUNT_SCALE,
  type QuoteItem,
  type QuoteTemplateKey,
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

/** Modelo del Cotizador: el mejor disponible para igualar la redacción de las
 *  propuestas de la casa. Sobreescribible por entorno sin tocar el resto del
 *  sitio (BI y simulador siguen con el modelo global). */
const QUOTES_MODEL = process.env.OPENAI_QUOTES_MODEL || 'gpt-5.5'

/**
 * Presupuesto de contexto documental, en caracteres. gpt-5.5 opera con 500k
 * tokens/minuto en esta organización: cabe el histórico completo. Se mantiene
 * la selección por relevancia (índice de todos + detalle de los pertinentes)
 * para que el modelo lea primero lo que importa. La plataforma (~40k
 * caracteres) va aparte y completa, siempre.
 */
const KNOWLEDGE_BUDGET = 200_000
const HISTORY_TURNS = 16

const SYSTEM_RULES = `
Eres la consultora senior de Algoritmo T y la constructora de esta cotización: la armas junto al equipo
comercial, de principio a fin. Conoces el portafolio completo de la casa tal como lo publica
algoritmot.com (bloque PLATAFORMA): la línea Empresas (las seis fases del servicio, los tres
protocolos, las soluciones empaquetadas y el método MD-IA) y la línea Educación (plataformas de
aprendizaje, virtualización de programas, auditoría con estándares Quality Matters y formación
docente). Con ese conocimiento ubicas al cliente en la línea correcta, eliges las variables de la
propuesta, enciendes los módulos y redactas cada sección.
Hablas español de Colombia, en tono profesional y aterrizado.

REGLAS DURAS
1. Tú construyes y modificas TODO lo que el consultor pida: líneas, precios, cantidades, moneda,
   plantilla, plan de pagos, títulos y cada sección del documento. Nunca respondas que algo "no se
   puede" o "falta un código": si el consultor dicta una línea o un precio, la creas o lo fijas en este
   mismo turno con "lines".
2. Cifras: por defecto salen del CATÁLOGO. Cuando el consultor dicta un precio, una cantidad o un plazo
   en la conversación, ese dato manda y lo aplicas tal cual. Jamás inventes ni deduzcas una cifra que
   nadie dictó ni está escrita en el catálogo, la plataforma o el histórico: si falta, pregúntala.
3. Toda afirmación sobre método, servicios, condiciones o antecedentes debe apoyarse en la PLATAFORMA,
   en el ÍNDICE o en el CONTEXTO documental. Las cifras públicas de la plataforma (docentes formados,
   plazos de los protocolos, reducción de tiempos de ciclo) puedes citarlas tal como aparecen ahí.
4. Pregunta de a una cosa. Si ya tienes lo necesario para redactar una sección, redáctala.
5. Quien cotiza decide las variables del precio: la cotización arranca vacía y solo enciendes o creas
   las líneas que el consultor pida o confirme. Jamás enciendas líneas "por si acaso".
6. ESTRUCTURA SEGÚN EL HISTÓRICO: antes de redactar, identifica en el índice el caso más parecido
   (mismo servicio o producto) y modela sobre él las secciones, las variables de precio, las fases
   y el plan de pagos de esta cotización. Adapta al cliente actual; nunca copies literal.
7. Si el consultor pide "completar todo el contenido", devuelve EN ESTE MISMO TURNO un patch con
   TODAS las secciones aplicables a la plantilla (guía abajo). Si el espacio no alcanza, prioriza
   carta, diagnóstico, método/fases, cronograma e hitos, y di qué falta para el siguiente turno.
8. Tu "reply" solo afirma lo que de verdad va en el patch de este turno. Si no cambiaste algo,
   di que falta, jamás que "procederás" a hacerlo.
9. CONSTRUYE CON EL PORTAFOLIO: el método, las fases, los entregables y los nombres propios salen de la
   PLATAFORMA (Captura del ADN Digital, Mapeo de Procesos con BPMN 2.x, Decisión Humano vs Tecnología,
   Ingeniería Humana, Despliegue IA, Madurez Orgánica, rúbrica Quality Matters, ProfeTabla, Maturity360…).
   Cuando el histórico trae un caso parecido, el caso manda en la estructura; la plataforma aporta el
   lenguaje y las promesas de cada servicio. Cita la plataforma con sus palabras, adaptadas al cliente.
10. LÍNEA CORRECTA: la plantilla fija el catálogo y la forma del documento. Si lo que describe el
   consultor pertenece a otra línea del portafolio (por ejemplo, está en Soluciones y el cliente quiere
   producir cursos virtuales), cámbiala con "template" en el mismo turno, apaga las líneas que sobren
   (el núcleo incluido) y crea o enciende las que correspondan.
11. El total es la suma de las líneas activas: precio unitario × cantidad. Si el consultor dice
   "4 cursos a $13.500.000 cada uno", la línea lleva price 13500000 y qty 4, y el servidor calcula
   54.000.000. Nunca escribas el total a mano en las notas si las líneas no lo respaldan.

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
  patch: { on?: string[] | null; off?: string[] | null; qty?: Array<{ code?: string; qty?: number }> | null },
  catalog: Map<string, any>
) {
  const on = new Set((patch.on ?? []).map((c) => String(c).toUpperCase()))
  const off = new Set((patch.off ?? []).map((c) => String(c).toUpperCase()))
  const qtyBy = new Map<string, number>()
  for (const entry of patch.qty ?? []) {
    const code = String(entry?.code ?? '').toUpperCase()
    const qty = Math.round(Number(entry?.qty))
    if (code && Number.isFinite(qty)) qtyBy.set(code, Math.min(999, Math.max(1, qty)))
  }
  const applied: string[] = []

  const next = items.map((item) => {
    let out = item
    const code = item.code.toUpperCase()
    if (item.kind !== 'CORE') {
      if (on.has(code) && !out.on) {
        applied.push(`+${item.code}`)
        out = { ...out, on: true }
      }
      if (off.has(code) && out.on) {
        applied.push(`−${item.code}`)
        out = { ...out, on: false }
      }
    }
    const qty = qtyBy.get(code)
    if (qty !== undefined && qty !== (out.qty ?? 1)) {
      applied.push(`${item.code}×${qty}`)
      out = { ...out, qty }
    }
    return out
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
      qty: qtyBy.get(code) ?? 1,
      unit: source.unit ?? null,
      weeks: Number(source.weeks) || 0,
      deliverables: source.deliverables,
      on: true,
      detail: source.detail ?? null,
    })
    applied.push(`+${source.code}${qtyBy.has(code) ? `×${qtyBy.get(code)}` : ''}`)
  }

  return { items: next, applied }
}

type LinePatch = {
  code?: string
  name?: string
  summary?: string
  category?: string
  unit?: string | null
  kind?: string
  price?: number
  qty?: number
  weeks?: number
  deliverables?: number
  on?: boolean
}

const asMoney = (v: unknown) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/**
 * Líneas dictadas por el consultor: crear, editar y quitar. Es el mismo poder
 * que tiene el editor de líneas del builder; la IA lo usa cuando el consultor
 * dicta un precio o un concepto que no está en el catálogo.
 */
export function applyLinesPatch(
  items: QuoteItem[],
  patch: { add?: LinePatch[] | null; update?: LinePatch[] | null; remove?: string[] | null }
) {
  const applied: string[] = []
  let next = items.map((i) => ({ ...i }))

  // ── quitar ──
  const remove = new Set((patch.remove ?? []).map((c) => String(c ?? '').toUpperCase()).filter(Boolean))
  if (remove.size) {
    const kept = next.filter((i) => !remove.has(i.code.toUpperCase()))
    // La cotización conserva al menos una línea: si el patch la vaciaría, se ignora ese retiro.
    if (kept.length) {
      for (const i of next) if (remove.has(i.code.toUpperCase())) applied.push(`×${i.code}`)
      next = kept
    }
  }

  // ── editar ──
  for (const entry of patch.update ?? []) {
    const code = String(entry?.code ?? '').toUpperCase()
    const target = next.find((i) => i.code.toUpperCase() === code)
    if (!target) continue
    const before = { ...target }
    const name = str(entry.name, 160); if (name) target.name = name
    const summary = str(entry.summary, 900); if (summary) target.summary = summary
    const category = str(entry.category, 120); if (category) target.category = category
    if (entry.unit !== undefined) target.unit = str(entry.unit, 40) || null
    const price = asMoney(entry.price); if (price !== undefined) target.price = price
    const qty = Math.round(Number(entry.qty)); if (Number.isFinite(qty) && entry.qty !== undefined) target.qty = Math.min(999, Math.max(1, qty))
    const weeks = Number(entry.weeks); if (Number.isFinite(weeks) && entry.weeks !== undefined) target.weeks = Math.max(0, weeks)
    const deliverables = Math.round(Number(entry.deliverables)); if (Number.isFinite(deliverables) && entry.deliverables !== undefined) target.deliverables = Math.max(0, deliverables)
    if (entry.kind === 'CORE' || entry.kind === 'MODULE') target.kind = entry.kind
    if (typeof entry.on === 'boolean' && target.kind !== 'CORE') target.on = entry.on
    if (target.kind === 'CORE') { target.on = true; target.selectable = false }
    const diff = (Object.keys(target) as Array<keyof QuoteItem>).filter((k) => JSON.stringify(target[k]) !== JSON.stringify(before[k]))
    if (diff.length) applied.push(`${target.code}: ${diff.join('/')}`)
  }

  // ── crear ──
  for (const entry of patch.add ?? []) {
    const name = str(entry?.name, 160)
    const price = asMoney(entry?.price)
    if (!name || price === undefined) continue
    let code = str(entry.code, 40).toUpperCase().replace(/[^A-Z0-9-]/g, '')
    if (!code || next.some((i) => i.code.toUpperCase() === code)) {
      let n = next.length + 1
      while (next.some((i) => i.code.toUpperCase() === `L${String(n).padStart(2, '0')}`)) n += 1
      code = `L${String(n).padStart(2, '0')}`
    }
    const qty = Math.round(Number(entry.qty))
    const kind: 'CORE' | 'MODULE' = entry.kind === 'CORE' ? 'CORE' : 'MODULE'
    next.push({
      code,
      name,
      summary: str(entry.summary, 900),
      category: str(entry.category, 120) || undefined,
      kind,
      price,
      qty: Number.isFinite(qty) && entry.qty !== undefined ? Math.min(999, Math.max(1, qty)) : 1,
      unit: str(entry.unit, 40) || null,
      weeks: Math.max(0, Number(entry.weeks) || 0),
      deliverables: Math.max(0, Math.round(Number(entry.deliverables)) || 0),
      on: true,
      selectable: kind !== 'CORE',
      detail: null,
    })
    applied.push(`+${code}${qty > 1 ? `×${qty}` : ''}`)
  }

  return { items: next, applied }
}

/**
 * Mezcla el contenido propuesto sobre el existente, estructura por estructura.
 * Cubre TODAS las secciones del visor. Reglas: los textos se recortan, las
 * listas se acotan, y las capturas conservan sus URL (la IA no sube imágenes:
 * solo puede reescribir pies de imagen y textos de la sección).
 */
function applyContentPatch(current: any, incoming: any) {
  if (!incoming || typeof incoming !== 'object') return { content: current, touched: [] as string[] }
  const content = structuredClone(current || {})
  const touched: string[] = []

  const box = (v: unknown, tMax = 160, bMax = 2000) => {
    if (!v || typeof v !== 'object') return null
    const title = str((v as any).title, tMax)
    const body = str((v as any).body, bMax)
    return body ? { title, body } : null
  }
  const objList = <T,>(v: unknown, map: (x: any) => T | null, max = 14): T[] | null => {
    if (!Array.isArray(v)) return null
    const out = v.slice(0, max).map(map).filter(Boolean) as T[]
    return out.length ? out : null
  }
  const weeks = (v: unknown) =>
    Array.isArray(v) ? v.map((n) => Math.round(Number(n))).filter((n) => n >= 1 && n <= 20).slice(0, 20) : []

  // ── textos sueltos de primer nivel ──
  const TEXTS: Array<[string, number]> = [
    ['intro', 4000], ['approach', 4000], ['scopeNote', 1500], ['timelineNote', 1500],
    ['investmentNote', 1200], ['paymentsNote', 1200], ['teamIntro', 800],
    ['finalNote', 800], ['backQuote', 400],
  ]
  for (const [key, max] of TEXTS) {
    const value = str(incoming[key], max)
    if (value) { content[key] = value; touched.push(key) }
  }

  // ── cajas {title, body} de primer nivel ──
  for (const key of ['coreNote', 'workRhythm'] as const) {
    const value = box(incoming[key])
    if (value) { content[key] = value; touched.push(key) }
  }

  // ── diagnóstico ──
  if (incoming.diagnosis && typeof incoming.diagnosis === 'object') {
    const lede = str(incoming.diagnosis.lede, 1200)
    const fronts = objList(incoming.diagnosis.fronts, (f) => {
      const title = str(f?.title, 160); const body = str(f?.body, 1200)
      return title && body ? { title, body, needs: str(f?.needs, 300) } : null
    }, 6)
    const note = box(incoming.diagnosis.note)
    if (lede || fronts || note) {
      content.diagnosis = {
        lede: lede || content.diagnosis?.lede || '',
        fronts: fronts ?? (content.diagnosis?.fronts ?? []),
        note: note ?? content.diagnosis?.note ?? undefined,
      }
      touched.push('diagnosis')
    }
  }

  // ── arquitectura ──
  if (incoming.architecture && typeof incoming.architecture === 'object') {
    const arch = incoming.architecture
    const next = { ...(content.architecture ?? {}) }
    let changed = false
    const lede = str(arch.lede, 1500); if (lede) { next.lede = lede; changed = true }
    const stackNote = str(arch.stackNote, 800); if (stackNote) { next.stackNote = stackNote; changed = true }
    const layers = objList(arch.layers, (l) => {
      const title = str(l?.title, 120)
      return title ? { name: str(l?.name, 60) || 'Capa', title, desc: str(l?.desc, 600) } : null
    }, 6)
    if (layers) { next.layers = layers; changed = true }
    const stack = objList(arch.stack, (r) => {
      const tech = str(r?.tech, 120)
      return tech ? { component: str(r?.component, 120), tech, what: str(r?.what, 500) } : null
    }, 10)
    if (stack) { next.stack = stack; changed = true }
    const ownership = box(arch.ownership); if (ownership) { next.ownership = ownership; changed = true }
    if (changed) { content.architecture = next; touched.push('architecture') }
  }

  // ── capturas: solo textos y pies; las URL existentes se conservan ──
  if (incoming.screens && typeof incoming.screens === 'object') {
    const next = { ...(content.screens ?? {}) }
    let changed = false
    const intro = str(incoming.screens.intro, 1000); if (intro) { next.intro = intro; changed = true }
    const note = str(incoming.screens.note, 800); if (note) { next.note = note; changed = true }
    if (Array.isArray(incoming.screens.items) && Array.isArray(next.items)) {
      next.items = next.items.map((item: any, index: number) => {
        const patchItem = incoming.screens.items[index]
        if (!patchItem || typeof patchItem !== 'object') return item
        const caption = str(patchItem.caption, 400)
        const wide = typeof patchItem.wide === 'boolean' ? patchItem.wide : item.wide
        if (caption || wide !== item.wide) changed = true
        return { ...item, caption: caption || item.caption, wide }
      })
    }
    if (changed) { content.screens = next; touched.push('screens') }
  }

  // ── cronograma ──
  if (incoming.schedule && typeof incoming.schedule === 'object') {
    const next = { ...(content.schedule ?? {}) }
    let changed = false
    const intro = str(incoming.schedule.intro, 1200); if (intro) { next.intro = intro; changed = true }
    const legend = str(incoming.schedule.legend, 300); if (legend) { next.legend = legend; changed = true }
    const groups = objList(incoming.schedule.groups, (g) => {
      const name = str(g?.name, 160)
      const rows = objList(g?.rows, (r) => {
        const label = str(r?.label, 200)
        return label ? { label, on: weeks(r?.on), hito: weeks(r?.hito) } : null
      }, 20)
      return name && rows ? { name, rows } : null
    }, 8)
    if (groups) { next.groups = groups; changed = true }
    if (changed) { content.schedule = next; touched.push('schedule') }
  }

  // ── hitos de aprobación ──
  {
    const milestones = objList(incoming.milestones, (m) => {
      const name = str(m?.name, 80); const criterion = str(m?.criterion, 600)
      return name && criterion ? { name, week: str(m?.week, 40), criterion } : null
    }, 8)
    if (milestones) { content.milestones = milestones; touched.push('milestones') }
  }

  // ── servicio ──
  if (incoming.service && typeof incoming.service === 'object') {
    const svc = incoming.service
    const next = { ...(content.service ?? {}) }
    let changed = false
    // Cifras del servicio: solo si el consultor las dictó en la conversación.
    for (const key of ['includedMonths', 'renewalPrice', 'exitPrice'] as const) {
      const n = Math.round(Number(svc[key]))
      if (Number.isFinite(n) && n >= 0 && svc[key] !== undefined) { next[key] = n; changed = true }
    }
    const levelsIntro = str(svc.levelsIntro, 600); if (levelsIntro) { next.levelsIntro = levelsIntro; changed = true }
    const note = str(svc.note, 800); if (note) { next.note = note; changed = true }
    const levels = objList(svc.levels, (l) => {
      const name = str(l?.name, 120); const desc = str(l?.desc, 600)
      return name && desc ? { name, desc } : null
    }, 6)
    if (levels) { next.levels = levels; changed = true }
    const budgetNote = box(svc.budgetNote); if (budgetNote) { next.budgetNote = budgetNote; changed = true }
    if (changed) { content.service = next; touched.push('service') }
  }

  // ── equipo ──
  {
    const team = objList(incoming.team, (m) => {
      const role = str(m?.role, 160)
      return role
        ? {
            role,
            dedication: str(m?.dedication, 160),
            functions: (strArray(m?.functions, 8) ?? []).map((f) => str(f, 200)),
          }
        : null
    }, 10)
    if (team) { content.team = team; touched.push('team') }
  }

  // ── garantías ──
  {
    const guarantees = objList(incoming.guarantees, (g) => {
      const concept = str(g?.concept, 80); const text = str(g?.text, 600)
      return concept && text ? { concept, text } : null
    }, 8)
    if (guarantees) { content.guarantees = guarantees; touched.push('guarantees') }
  }

  // ── supuestos y exclusiones ──
  for (const key of ['assumptions', 'exclusions'] as const) {
    const list = strArray(incoming[key])
    if (list?.length) { content[key] = list; touched.push(key) }
  }

  // ── plan de pagos personalizado: porcentajes + etiquetas (momento e hito) ──
  if (Array.isArray(incoming.paymentSplit)) {
    const split = incoming.paymentSplit
      .map((n: unknown) => Math.round(Number(n)))
      .filter((n: number) => Number.isFinite(n) && n > 0 && n <= 100)
      .slice(0, 8)
    const sum = split.reduce((a: number, b: number) => a + b, 0)
    if (split.length && sum === 100) {
      content.paymentSplit = split
      touched.push('paymentSplit')
      const labels = objList(incoming.paymentLabels, (l) => {
        const moment = str(l?.moment, 80); const milestone = str(l?.milestone, 300)
        return moment || milestone ? { moment, milestone } : null
      }, 8)
      if (labels && labels.length === split.length) {
        content.paymentLabels = labels
        touched.push('paymentLabels')
      }
    }
  } else if (incoming.paymentSplit === null) {
    content.paymentSplit = null
    content.paymentLabels = null
    touched.push('paymentSplit')
  }

  // ── firma ──
  if (incoming.signature && typeof incoming.signature === 'object') {
    const sig = incoming.signature
    const next = { ...(content.signature ?? {}) }
    let changed = false
    for (const key of ['name', 'role', 'email', 'phone'] as const) {
      const value = str(sig[key], 160)
      if (value) { next[key] = value; changed = true }
    }
    if (changed) { content.signature = next; touched.push('signature') }
  }

  return { content, touched }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = await quoteSessionState(req)
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

    const template = normalizeTemplate(quote.template)
    const [catalogRows, history, docs, platformContext] = await Promise.all([
      loadCatalog(template),
      msgDb().findMany({ where: { quoteId }, orderBy: { createdAt: 'desc' }, take: HISTORY_TURNS }),
      knowledgeDb().findMany({
        where: { active: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { title: true, kind: true, summary: true, content: true },
      }),
      loadPlatformContext(),
    ])

    const catalog = catalogMap(catalogRows)
    const items: QuoteItem[] = Array.isArray(quote.pricing?.items) ? quote.pricing.items : []

    // ── Contexto documental: índice completo + texto íntegro de lo relevante ──
    // Señal de relevancia: palabras del mensaje, del cliente y de los últimos
    // turnos, contrastadas con título/resumen/inicio de cada documento.
    // El mensaje actual manda; el historial reciente solo acompaña (si pesara
    // igual, el tema anterior seguiría arrastrando documentos irrelevantes).
    const currentWords = new Set(
      (message.toLowerCase().match(/[a-z0-9áéíóúñü]{3,}/gi) ?? []).map((w: string) => w.toLowerCase())
    )
    const backgroundWords = new Set(
      [quote.clientName || '', quote.sector || '', ...history.slice(0, 2).map((m: any) => m.content)]
        .join(' ')
        .toLowerCase()
        .match(/[a-z0-9áéíóúñü]{3,}/gi) ?? []
    )

    const scored = docs.map((doc: any) => {
      const titleLc = doc.title.toLowerCase()
      const summaryLc = `${doc.summary ?? ''} ${String(doc.content || '').slice(0, 1200)}`.toLowerCase()
      let score = 0
      for (const word of currentWords) {
        if (titleLc.includes(word)) score += 4 // acierto en el título del caso: señal fuerte
        else if (summaryLc.includes(word)) score += 1
      }
      for (const word of backgroundWords) if (titleLc.includes(word as string)) score += 1
      // el caso del propio cliente siempre pesa
      if (quote.clientName && titleLc.includes(quote.clientName.toLowerCase().slice(0, 12))) score += 25
      return { doc, score }
    })
    scored.sort((a: any, b: any) => b.score - a.score)

    const indexBlock = docs
      .map((d: any) => `- ${d.title} [${d.kind}]${d.summary ? ` — ${d.summary}` : ''}`)
      .join('\n')

    let used = 0
    const contextBlocks: string[] = []
    const included: string[] = []
    for (const { doc } of scored) {
      if (used >= KNOWLEDGE_BUDGET) break
      const room = KNOWLEDGE_BUDGET - used
      const slice = String(doc.content || '').slice(0, room)
      if (slice.length < 400) continue
      used += slice.length
      included.push(doc.title)
      contextBlocks.push(`### ${doc.title} [${doc.kind}]\n${slice}`)
    }

    const catalogBlock = catalogRows
      .map(
        (r: any) =>
          `- ${r.code} · ${r.name} · ${r.category} · ${r.kind === 'CORE' ? 'OBLIGATORIO' : 'opcional'} · ` +
          `${formatMoney(r.price, r.currency)}${r.unit ? ` por ${r.unit}` : ''} · ${r.deliverables} entregables · ${r.weeks} sem\n  ${r.summary}`
      )
      .join('\n')

    const activeCodes = items
      .filter((i) => i.on || i.kind === 'CORE')
      .map((i) => `${i.code}${(i.qty ?? 1) > 1 ? `×${i.qty}` : ''}`)
    const totals = computeTotals(items, { scale: quote.discountScale, minWeeks: QUOTE_TEMPLATES[template].minWeeks })

    const transcript = history
      .slice()
      .reverse()
      .map((m: any) => `${m.role === 'user' ? 'CONSULTOR' : 'TÚ'}: ${m.content}`)
      .join('\n')

    const prompt = `
${SYSTEM_RULES}

## CATÁLOGO (única fuente de cifras)
${catalogBlock}

## PLATAFORMA (lo que publica algoritmot.com: portada, /empresas, /educacion y sus páginas)
Es el portafolio vigente de la casa y la fuente del método y del lenguaje de cada servicio.
${platformContext || '(la plataforma no respondió en este turno; apóyate en el índice y el catálogo)'}

## ÍNDICE DEL HISTÓRICO DE ALGORITMO T (todos los documentos disponibles)
${indexBlock || '(sin documentos cargados todavía)'}

## CONTEXTO DOCUMENTAL EN DETALLE (los más relevantes para esta conversación)
${contextBlocks.length ? contextBlocks.join('\n\n') : '(ninguno seleccionado)'}
Si el consultor pregunta por un caso del índice que no está en detalle, dilo y pide que lo mencione
explícitamente en su siguiente mensaje para traerlo al contexto.

## GUÍA DE SECCIONES PARA ESTA PLANTILLA
${QUOTE_TEMPLATES[template].kind === 'UNIDADES'
    ? `Aplican: intro (carta), diagnosis (lede + frentes del reto del cliente + note), architecture
  (úsala como MÉTODO: lede = enfoque de trabajo; layers = fases con name "Fase 01…"; SIN stack ni
  stackNote salvo que el servicio sea tecnológico; ownership solo si aplica propiedad de entregables),
  schedule (semanas reales del proyecto), milestones, investmentNote, paymentsNote, team, workRhythm,
  assumptions, exclusions, guarantees, finalNote, backQuote y signature.
  NO aplican: screens (capturas de software), coreNote, service (renovación SaaS) salvo que el
  servicio incluya operación continua; scopeNote/timelineNote úsalos si aportan.`
    : `Aplican todas las secciones: intro, diagnosis (+note), architecture (capas + stack + ownership),
  coreNote, screens (solo textos/pies), schedule, milestones, investmentNote, paymentsNote, service
  (niveles, budgetNote, note), team, workRhythm, assumptions, exclusions, guarantees, finalNote,
  backQuote y signature.`}
ESTRUCTURA DE REFERENCIA DE ESTA LÍNEA: ${QUOTE_TEMPLATES[template].aiNotes}

## ESTADO ACTUAL DE LA COTIZACIÓN
Plantilla: ${template} — ${QUOTE_TEMPLATES[template].description}
Cliente: ${quote.clientName}${quote.sector ? ` · Sector: ${quote.sector}` : ''}
Título: ${quote.title}
Líneas activas (${totals.moduleCount}): ${activeCodes.join(', ') || 'ninguna'}
Todas las líneas de esta cotización (código · nombre · precio unitario × cantidad · estado):
${items.map((i) => `- ${i.code} · ${i.name} · ${formatMoney(i.price, quote.currency)}${i.unit ? ` por ${i.unit}` : ''} × ${i.qty ?? 1} · ${i.kind === 'CORE' ? 'núcleo' : i.on ? 'encendida' : 'apagada'}`).join('\n') || '- (sin líneas)'}
Moneda: ${quote.currency} · Vigencia: ${quote.validDays} días · Plan de pagos: ${Array.isArray(quote.content?.paymentSplit) && quote.content.paymentSplit.length ? quote.content.paymentSplit.join('/') : '30/25/25/20 estándar'}
Total calculado: ${formatMoney(totals.total, quote.currency)} · ${totals.weeks} semanas · ${totals.deliverables} entregables
Secciones ya redactadas: ${(() => {
      const c: any = quote.content || {}
      const flags: Array<[string, boolean]> = [
        ['intro', !!c.intro],
        ['diagnosis', !!(c.diagnosis?.lede || c.diagnosis?.fronts?.length)],
        ['architecture', !!(c.architecture?.lede || c.architecture?.layers?.length)],
        [`screens (${c.screens?.items?.length ?? 0} capturas)`, !!c.screens?.items?.length],
        ['schedule', !!c.schedule?.groups?.length],
        ['milestones', !!c.milestones?.length],
        ['service', !!(c.service?.levels?.length || c.service?.includedMonths)],
        ['team', !!c.team?.length],
        ['assumptions', !!c.assumptions?.length],
        ['exclusions', !!c.exclusions?.length],
        ['guarantees', !!c.guarantees?.length],
        ['backQuote', !!c.backQuote],
      ]
      return flags.filter(([, on]) => on).map(([k]) => k).join(', ') || 'ninguna'
    })()}

## CONVERSACIÓN
${transcript || '(primera intervención)'}
CONSULTOR: ${message}

## RESPONDE SOLO CON ESTE JSON
{
  "reply": "tu respuesta al consultor, 2 a 5 frases; si redactaste algo, dilo y ofrece el siguiente paso",
  "patch": {
    "clientName": "opcional", "sector": "opcional", "title": "opcional", "subtitle": "opcional",
    "template": "solo si hay que cambiar de línea: ${Object.keys(QUOTE_TEMPLATES).join(' | ')}",
    "currency": "COP | USD, solo si el consultor lo pide",
    "validDays": 45,
    "modules": { "on": ["M03"], "off": ["M12"], "qty": [{ "code": "SV01", "qty": 5 }] },
    "lines": {
      "add": [{ "code": "UTB-01", "name": "Curso virtual de especialización (3 créditos)", "summary": "qué incluye", "category": "Producción", "unit": "curso", "price": 13500000, "qty": 4, "weeks": 6, "deliverables": 5 }],
      "update": [{ "code": "SV01", "price": 12000000, "qty": 3, "name": "opcional", "unit": "opcional", "on": true }],
      "remove": ["L03"]
    },
    "content": {
      "intro": "carta, párrafos separados por \\n\\n",
      "diagnosis": { "lede": "", "fronts": [{ "title": "", "body": "", "needs": "" }], "note": { "title": "", "body": "" } },
      "architecture": {
        "lede": "", "layers": [{ "name": "Capa 01", "title": "", "desc": "" }],
        "stackNote": "", "stack": [{ "component": "", "tech": "", "what": "" }],
        "ownership": { "title": "", "body": "" }
      },
      "coreNote": { "title": "", "body": "" },
      "screens": { "intro": "", "note": "", "items": [{ "caption": "pie de la captura N (mismo orden; NUNCA cambies ni agregues imágenes)" }] },
      "scopeNote": "", "timelineNote": "",
      "schedule": {
        "intro": "", "legend": "",
        "groups": [{ "name": "Bloque", "rows": [{ "label": "Actividad o 'M03 · Nombre'", "on": [3, 4], "hito": [8] }] }]
      },
      "investmentNote": "", "paymentsNote": "",
      "paymentSplit": [50, 50], "paymentLabels": [{ "moment": "A la firma", "milestone": "" }, { "moment": "Entrega final", "milestone": "" }],
      "milestones": [{ "name": "Hito 01", "week": "Fin S2", "criterion": "" }],
      "service": {
        "includedMonths": 12, "renewalPrice": 0, "exitPrice": 0,
        "levelsIntro": "", "levels": [{ "name": "Nivel 2 · …", "desc": "" }],
        "budgetNote": { "title": "", "body": "" }, "note": ""
      },
      "teamIntro": "", "team": [{ "role": "", "dedication": "", "functions": ["una por línea"] }],
      "workRhythm": { "title": "", "body": "" },
      "assumptions": [""], "exclusions": [""],
      "guarantees": [{ "concept": "Garantía", "text": "" }],
      "finalNote": "", "backQuote": "",
      "signature": { "name": "", "role": "", "email": "", "phone": "" }
    }
  }
}
REGLAS DEL PATCH
- "modules" enciende, apaga o cambia la cantidad de líneas del CATÁLOGO por su código.
- "lines" crea, edita o quita líneas con las cifras que dictó el consultor: "add" para un concepto que no
  está en el catálogo (precio unitario + qty), "update" para cambiar precio, cantidad, nombre o unidad de
  una línea existente (incluidas las del catálogo), "remove" para retirarla del todo. Los precios van en
  unidades enteras de la moneda, sin separadores (13.500.000 → 13500000).
- Plantillas por UNIDADES: las líneas tienen precio POR UNIDAD; fija cantidades con "modules.qty"
  (p. ej. 5 cursos → {"code":"SV01","qty":5}) y apaga las líneas que no apliquen. No hay núcleo.
- "template" cambia la línea de negocio de la cotización (catálogo, escala de descuento y forma del
  documento). Úsalo cuando el cliente pertenece a otra línea; en el mismo turno deja las líneas como deben quedar.
- "paymentSplit" son porcentajes enteros que suman 100, en el orden de los pagos; "paymentLabels" va en
  paralelo (momento e hito de cada pago). null = volver al esquema estándar 30/25/25/20.
- Incluye SOLO las claves que cambian en este turno; lo demás se conserva. Sin cambios: "patch": {}.
- Las listas (fronts, layers, stack, groups, milestones, levels, team, guarantees, assumptions, exclusions)
  REEMPLAZAN la lista completa: si agregas o quitas un elemento, reenvía la lista entera ya corregida.
- En "schedule", las semanas son arreglos de enteros (1 = primera semana). Si una actividad corresponde a un
  módulo, su "label" empieza con el código ("M03 · …"): así se atenúa cuando el módulo se apaga.
- En "screens" solo editas textos y pies (mismo orden de las capturas existentes); las imágenes no se tocan.
- En "service", solo cambia cifras (includedMonths/renewalPrice/exitPrice) si el consultor las dictó explícitamente.
`.trim()

    // La organización de OpenAI limita tokens/minuto: ante un 429 se reintenta
    // una vez tras una pausa corta antes de rendirse.
    let aiResult
    try {
      aiResult = await generateJsonWithAI({ prompt, temperature: 0.5, maxTokens: 9000, model: QUOTES_MODEL })
    } catch (error: any) {
      if (/rate limit|tokens per min|TPM/i.test(String(error?.message))) {
        await new Promise((resolve) => setTimeout(resolve, 1500))
        aiResult = await generateJsonWithAI({ prompt, temperature: 0.5, maxTokens: 9000, model: QUOTES_MODEL })
      } else {
        throw error
      }
    }
    const { data, providerUsed } = aiResult

    const reply = str(data?.reply, 3000) || 'Listo.'
    const patch = data?.patch && typeof data.patch === 'object' ? data.patch : {}
    // Trazabilidad: qué claves propuso el modelo (para diagnosticar patches perdidos).
    const patchKeys = Object.keys(patch)
    const patchContentKeys = patch.content && typeof patch.content === 'object' ? Object.keys(patch.content) : []
    if (process.env.NODE_ENV !== 'production') {
      console.log('[quotes/chat] patch:', JSON.stringify(patch).slice(0, 900))
    }

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
    const currency = str(patch.currency, 3).toUpperCase()
    if ((currency === 'COP' || currency === 'USD') && currency !== quote.currency) {
      updates.currency = currency
      changes.push(`moneda ${currency}`)
    }
    if (patch.validDays !== undefined) {
      const days = Math.round(Number(patch.validDays))
      if (Number.isFinite(days) && days >= 1 && days <= 365 && days !== quote.validDays) {
        updates.validDays = days
        changes.push(`vigencia ${days} días`)
      }
    }

    // Cambio de línea de negocio: nueva plantilla, su escala de descuento y su
    // catálogo (para que "modules.on" de este mismo turno resuelva códigos nuevos).
    let effectiveTemplate: QuoteTemplateKey = template
    let effectiveCatalog = catalog
    let effectiveScale = quote.discountScale
    const requestedTemplate = str(patch.template, 40).toUpperCase()
    if (requestedTemplate && requestedTemplate in QUOTE_TEMPLATES && requestedTemplate !== template) {
      effectiveTemplate = requestedTemplate as QuoteTemplateKey
      effectiveScale = QUOTE_TEMPLATES[effectiveTemplate].kind === 'MODULAR' ? DEFAULT_DISCOUNT_SCALE : FLAT_DISCOUNT_SCALE
      effectiveCatalog = catalogMap(await loadCatalog(effectiveTemplate))
      updates.template = effectiveTemplate
      updates.discountScale = effectiveScale
      changes.push(`plantilla ${QUOTE_TEMPLATES[effectiveTemplate].short}`)
    }

    // El modelo a veces aplana el patch (schedule/team/etc. en la raíz en vez
    // de patch.content). Se aceptan ambas formas: todo lo que no sea una clave
    // de primer nivel conocida se trata como contenido.
    const TOP_LEVEL = new Set(['clientName', 'sector', 'title', 'subtitle', 'template', 'currency', 'validDays', 'modules', 'lines', 'content'])
    const flattened: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(patch)) {
      if (!TOP_LEVEL.has(key)) flattened[key] = value
    }
    const contentIncoming = {
      ...flattened,
      ...(patch.content && typeof patch.content === 'object' ? patch.content : {}),
    }
    const { content, touched } = applyContentPatch(quote.content, contentIncoming)
    if (touched.length) {
      updates.content = content
      changes.push(...touched)
    }

    let nextItems = items
    if (patch.modules && typeof patch.modules === 'object') {
      const result = applyModulePatch(nextItems, patch.modules, effectiveCatalog)
      if (result.applied.length) {
        nextItems = result.items
        changes.push(...result.applied)
      }
    }
    if (patch.lines && typeof patch.lines === 'object') {
      const result = applyLinesPatch(nextItems, patch.lines)
      if (result.applied.length) {
        nextItems = result.items
        changes.push(...result.applied)
      }
    }

    const nextTotals = computeTotals(nextItems, { scale: effectiveScale, minWeeks: QUOTE_TEMPLATES[effectiveTemplate].minWeeks })
    if (nextItems !== items || nextTotals.total !== quote.totalFinal || updates.template) {
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
          { quoteId, role: 'assistant', content: reply, meta: { providerUsed, changes, patchKeys, patchContentKeys } },
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
