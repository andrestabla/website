/**
 * Cotizador — lógica compartida.
 *
 * Reglas de la casa:
 *  - El catálogo (QuoteCatalogItem) fija los valores por defecto. Quien edita la
 *    cotización puede ajustarlos línea por línea; la IA redacta narrativa y
 *    elige módulos, pero nunca inventa un precio (toma los del catálogo).
 *  - El total se recalcula en el servidor a partir de los ítems activos; lo que
 *    llegue del cliente en `total` se ignora.
 *  - La escala de descuento premia el alcance: la arquitectura, los accesos y el
 *    ciclo de pruebas se construyen una sola vez y los comparten los módulos.
 */

import crypto from 'node:crypto'
import { prisma } from './prisma.js'
import { getAdminSession } from './admin-auth.js'

type VercelRequest = any

// ── Acceso al módulo ─────────────────────────────────────────────────────────

/** SUPERADMIN/ADMIN o usuario con permiso de módulo COTIZADOR. */
export function quoteSessionState(req: VercelRequest) {
  const session = getAdminSession(req)
  const allowed =
    !!session &&
    (session.role === 'SUPERADMIN' ||
      session.role === 'ADMIN' ||
      (session.permissions && (session.permissions as Record<string, boolean>).COTIZADOR === true))
  return { session, allowed }
}

// ── Identificadores públicos ─────────────────────────────────────────────────

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789' // sin l/o/0/1: se dictan por teléfono

function randomId(length: number) {
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

/** Id de la URL pública: 14 caracteres ≈ 70 bits, no adivinable por fuerza bruta. */
export const newPublicId = () => randomId(14)

/** Token de destinatario: identifica a quién se le envió el enlace. */
export const newRecipientToken = () => randomId(20)

// ── Motor de precios ─────────────────────────────────────────────────────────

export type QuoteItem = {
  code: string
  name: string
  summary?: string
  category?: string
  kind?: 'CORE' | 'MODULE'
  price: number
  /** SERVICIO: cantidad de unidades (cursos, recursos…). PRODUCTO: siempre 1. */
  qty?: number
  unit?: string | null
  weeks?: number
  deliverables?: number
  on: boolean
  /** Con selección del cliente activa: false = fijo, el cliente no lo mueve. */
  selectable?: boolean
  detail?: unknown
}

/**
 * Plantillas de cotización: una por línea de servicio de Algoritmo T.
 * kind MODULAR = núcleo + módulos con economía de escala.
 * kind UNIDADES = líneas con precio por unidad y cantidades.
 * aiNotes: guía para la IA — casos del histórico que modelan la estructura.
 */
export const QUOTE_TEMPLATES = {
  SOLUCIONES: {
    label: 'Soluciones digitales a la medida',
    short: 'Soluciones',
    kind: 'MODULAR',
    titlePrefix: 'Una plataforma a la medida',
    description: 'Diseño, desarrollo e implementación de plataformas y automatizaciones: núcleo + módulos activables con economía de escala.',
    minWeeks: 4,
    aiNotes: 'Modela sobre el caso Ediciones de la U: núcleo, módulos por frente, capturas del prototipo, hitos 30/25/25/20 y año de servicio incluido.',
  },
  TRANSFORMACION: {
    label: 'Consultoría en transformación digital',
    short: 'Transformación',
    kind: 'UNIDADES',
    titlePrefix: 'Consultoría en transformación digital',
    description: 'Diagnóstico de madurez, mapeo de procesos, soluciones digitales y mejora continua. Precios en USD.',
    minWeeks: 3,
    aiNotes: 'Estructura por fases del método de transformación (diagnóstico → mapeo → diseño/desarrollo → mejora continua). Las cantidades son procesos, soluciones y meses de retainer.',
  },
  CURSOS: {
    label: 'Producción de cursos virtuales',
    short: 'Cursos',
    kind: 'UNIDADES',
    titlePrefix: 'Producción de cursos virtuales',
    description: 'Cursos completos en 5 fases o por fases sueltas, y recursos educativos digitales por unidad.',
    minWeeks: 2,
    aiNotes: 'Modela sobre los casos USCO/UPC (tabla por créditos: curso completo $13,0–17,4 M; precios fábrica desde 10 cursos) y La Salle para recursos. Fases: ruta, autoría, producción, montaje LMS, calidad.',
  },
  FORMACION: {
    label: 'Formación docente como servicio',
    short: 'Formación',
    kind: 'UNIDADES',
    titlePrefix: 'Programa de formación docente',
    description: 'Programas de formación docente con talleres, acompañamiento y certificación.',
    minWeeks: 3,
    aiNotes: 'Modela sobre el caso Fundación Universitaria San Martín ($17,6 M + IVA por programa).',
  },
  PROFETABLA: {
    label: 'ProfeTabla · Plataforma de formación docente',
    short: 'ProfeTabla',
    kind: 'UNIDADES',
    titlePrefix: 'Experiencias ProfeTabla',
    description: 'Experiencias de formación docente sobre la plataforma ProfeTabla, por sesiones y rango de profesores.',
    minWeeks: 2,
    aiNotes: 'Modela sobre el portafolio ProfeTabla: experiencias por tipo (Proyecto 6 sesiones, Reto 3 sesiones) con precio por rango de profesores (1–5, 6–10, 11–15).',
  },
  LMS: {
    label: 'Plataforma de aprendizaje como servicio (LMS)',
    short: 'LMS',
    kind: 'UNIDADES',
    titlePrefix: 'Plataforma de aprendizaje como servicio',
    description: 'Licencia anual del LMS Algoritmo T: usuarios ilimitados, infraestructura y soporte N1–N4.',
    minWeeks: 4,
    aiNotes: 'Modela sobre el portafolio LMS: licencia anual $160 M el primer año y $130 M desde el segundo; hasta 5 TB de almacenamiento nuevo por año; 5% de descuento por pago anticipado.',
  },
  ESTUDIO: {
    label: 'Estudio de mercado',
    short: 'Estudio',
    kind: 'UNIDADES',
    titlePrefix: 'Estudio de mercado',
    description: 'Estudios de mercado para nuevos programas académicos: demanda, oferta comparada, empleabilidad y pertinencia.',
    minWeeks: 6,
    aiNotes: 'Modela sobre el caso de Registro calificado (COP 98 M por estudio).',
  },
  PROGRAMAS: {
    label: 'Construcción de programas académicos',
    short: 'Programas',
    kind: 'UNIDADES',
    titlePrefix: 'Construcción de programa académico',
    description: 'Documento maestro, anexos, PEP y syllabus para registro calificado, con precio por nivel del programa.',
    minWeeks: 8,
    aiNotes: 'Modela sobre el caso USCO y el portafolio de creación de programas: pregrado $65 M, especialización $30 M, maestría $40 M (antes de impuestos).',
  },
} as const
export type QuoteTemplateKey = keyof typeof QUOTE_TEMPLATES

/** Acepta claves nuevas y las heredadas (PRODUCTO/SERVICIO) de las primeras cotizaciones. */
export const normalizeTemplate = (v: unknown): QuoteTemplateKey => {
  if (typeof v === 'string' && v in QUOTE_TEMPLATES) return v as QuoteTemplateKey
  if (v === 'SERVICIO') return 'CURSOS'
  return 'SOLUCIONES'
}

/** Escala plana para servicios: el precio es unitario y no hay descuento automático. */
export const FLAT_DISCOUNT_SCALE: DiscountTier[] = [{ upTo: 99, pct: 0 }]

const itemQty = (item: QuoteItem) => Math.max(1, Math.round(Number(item.qty) || 1))

export type DiscountTier = { upTo: number; pct: number }

/** Descuento por economía de escala, según cuántos módulos opcionales van activos. */
export const DEFAULT_DISCOUNT_SCALE: DiscountTier[] = [
  { upTo: 3, pct: 0 },
  { upTo: 6, pct: 5 },
  { upTo: 9, pct: 8 },
  { upTo: 12, pct: 11 },
  { upTo: 99, pct: 15 },
]

/** Plan de pagos por defecto: firma + tres hitos de aprobación. */
export const DEFAULT_PAYMENT_SPLIT = [30, 25, 25, 20]

function tierFor(scale: DiscountTier[], count: number): DiscountTier {
  for (const tier of scale) if (count <= tier.upTo) return tier
  return scale[scale.length - 1] ?? { upTo: 99, pct: 0 }
}

export type QuoteTotals = {
  core: number
  modules: number
  subtotal: number
  discountPct: number
  discount: number
  total: number
  weeks: number
  deliverables: number
  moduleCount: number
  payments: Array<{ pct: number; amount: number }>
}

/**
 * Recalcula todo a partir de los ítems. El núcleo (kind CORE) siempre suma y no
 * cuenta para la escala: el descuento premia los módulos opcionales.
 */
export function computeTotals(
  items: QuoteItem[],
  opts: { scale?: DiscountTier[]; paymentSplit?: number[]; minWeeks?: number } = {}
): QuoteTotals {
  const scale = opts.scale?.length ? opts.scale : DEFAULT_DISCOUNT_SCALE
  const split = opts.paymentSplit?.length ? opts.paymentSplit : DEFAULT_PAYMENT_SPLIT
  const minWeeks = opts.minWeeks ?? 4

  const core = items.filter((i) => i.kind === 'CORE')
  const active = items.filter((i) => i.kind !== 'CORE' && i.on)

  const coreTotal = core.reduce((sum, i) => sum + (Number(i.price) || 0) * itemQty(i), 0)
  const modulesTotal = active.reduce((sum, i) => sum + (Number(i.price) || 0) * itemQty(i), 0)
  const subtotal = coreTotal + modulesTotal

  const discountPct = tierFor(scale, active.length).pct
  const discount = Math.round((modulesTotal * discountPct) / 100)
  const total = subtotal - discount

  const coreWeeks = core.reduce((sum, i) => sum + (Number(i.weeks) || 0), 0)
  const moduleWeeks = active.reduce((sum, i) => sum + (Number(i.weeks) || 0) * itemQty(i), 0)
  // Los módulos se construyen en bloques paralelos, no en serie: el plazo crece
  // con la raíz del esfuerzo acumulado, con un piso por el núcleo y la puesta en
  // marcha (que se hacen sí o sí, haya uno o catorce módulos).
  const weeks = Math.max(minWeeks, Math.round(coreWeeks + Math.sqrt(Math.max(0, moduleWeeks)) * 1.6))

  const deliverables =
    core.reduce((sum, i) => sum + (Number(i.deliverables) || 0), 0) +
    active.reduce((sum, i) => sum + (Number(i.deliverables) || 0) * itemQty(i), 0)

  // El último pago absorbe el redondeo para que la suma cuadre con el total.
  let accumulated = 0
  const payments = split.map((pct, index) => {
    const amount = index === split.length - 1 ? total - accumulated : Math.round((total * pct) / 100)
    accumulated += amount
    return { pct, amount }
  })

  return {
    core: coreTotal,
    modules: modulesTotal,
    subtotal,
    discountPct,
    discount,
    total,
    weeks,
    deliverables,
    moduleCount: active.length,
    payments,
  }
}

// ── Normalización ────────────────────────────────────────────────────────────

const asString = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const asInt = (v: unknown) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : 0
}

/**
 * Deja los ítems en forma canónica.
 *
 * El catálogo (QuoteCatalogItem) es el valor por defecto, no una camisa de
 * fuerza: cada cotización puede ajustar nombre, precio, unidad, esfuerzo y
 * entregables de sus propias líneas, e incluso llevar líneas que no existen en
 * el catálogo (así nacieron UPC-01…UPC-05). Lo que el editor no manda se
 * hereda del catálogo. La IA no pasa por aquí: sus cambios se aplican con
 * `applyModulePatch`, que sigue tomando las cifras del catálogo.
 */
export function normalizeItems(raw: unknown, catalogByCode: Map<string, any>): QuoteItem[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const items: QuoteItem[] = []
  for (const entry of raw) {
    const e = (entry ?? {}) as Record<string, unknown>
    const code = asString(e.code, 40).toUpperCase()
    if (!code || seen.has(code)) continue
    const source = catalogByCode.get(code) ?? catalogByCode.get(asString(e.code, 40))
    const name = asString(e.name, 160) || asString(source?.name, 160)
    if (!name) continue // una línea sin nombre no es una línea
    seen.add(code)

    // `undefined` = «no lo edité, usa el catálogo»; un valor = manda el editor.
    const pick = <T>(value: unknown, fallback: T, parse: (v: unknown) => T): T =>
      value === undefined || value === null || value === '' ? fallback : parse(value)

    const kind = pick(e.kind, source?.kind === 'CORE' ? 'CORE' : 'MODULE', (v) => (v === 'CORE' ? 'CORE' : 'MODULE'))
    const qtyRaw = Math.round(Number(e.qty))

    items.push({
      code,
      name,
      summary: asString(e.summary, 900) || asString(source?.summary, 900),
      category: asString(e.category, 120) || asString(source?.category, 120) || undefined,
      kind,
      price: Math.max(0, pick(e.price, asInt(source?.price), asInt)),
      qty: Number.isFinite(qtyRaw) ? Math.min(999, Math.max(1, qtyRaw)) : 1,
      unit: pick(e.unit, source?.unit ?? null, (v) => asString(v, 40) || null),
      weeks: Math.max(0, pick(e.weeks, Number(source?.weeks) || 0, (v) => Number(v) || 0)),
      deliverables: Math.max(0, pick(e.deliverables, asInt(source?.deliverables), asInt)),
      on: kind === 'CORE' ? true : e.on !== false,
      selectable: kind === 'CORE' ? false : e.selectable !== false,
      detail: e.detail !== undefined ? (e.detail as unknown) : (source?.detail ?? null),
    })
  }
  return items
}

export async function loadCatalog(template?: QuoteTemplateKey) {
  const rows = await (prisma as any).quoteCatalogItem.findMany({
    where: { active: true, ...(template ? { template } : {}) },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  })
  return rows as any[]
}

export function catalogMap(rows: any[]) {
  return new Map<string, any>(rows.map((r) => [r.code, r]))
}

/** Ítems de arranque para una cotización nueva: núcleo + los marcados por defecto. */
export function itemsFromCatalog(rows: any[]): QuoteItem[] {
  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    summary: r.summary,
    category: r.category,
    kind: r.kind === 'CORE' ? 'CORE' : 'MODULE',
    price: r.price,
    qty: 1,
    unit: r.unit ?? null,
    weeks: Number(r.weeks) || 0,
    deliverables: r.deliverables,
    on: r.kind === 'CORE' ? true : r.defaultOn !== false,
    selectable: r.kind !== 'CORE',
    detail: r.detail ?? null,
  }))
}

// ── Formato ──────────────────────────────────────────────────────────────────

export function formatMoney(amount: number, currency = 'COP') {
  const value = Math.round(Number(amount) || 0)
  const grouped = String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const sign = value < 0 ? '−' : ''
  return currency === 'USD' ? `${sign}USD ${grouped}` : `${sign}$ ${grouped}`
}
