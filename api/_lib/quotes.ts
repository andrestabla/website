/**
 * Cotizador — lógica compartida.
 *
 * Reglas de la casa:
 *  - Las cifras salen SIEMPRE del catálogo (QuoteCatalogItem). La IA redacta
 *    narrativa y elige módulos, pero nunca inventa un precio.
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
  weeks?: number
  deliverables?: number
  on: boolean
  detail?: unknown
}

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

  const coreTotal = core.reduce((sum, i) => sum + (Number(i.price) || 0), 0)
  const modulesTotal = active.reduce((sum, i) => sum + (Number(i.price) || 0), 0)
  const subtotal = coreTotal + modulesTotal

  const discountPct = tierFor(scale, active.length).pct
  const discount = Math.round((modulesTotal * discountPct) / 100)
  const total = subtotal - discount

  const coreWeeks = core.reduce((sum, i) => sum + (Number(i.weeks) || 0), 0)
  const moduleWeeks = active.reduce((sum, i) => sum + (Number(i.weeks) || 0), 0)
  // Los módulos se construyen en bloques paralelos, no en serie: el plazo crece
  // con la raíz del esfuerzo acumulado, con un piso por el núcleo y la puesta en
  // marcha (que se hacen sí o sí, haya uno o catorce módulos).
  const weeks = Math.max(minWeeks, Math.round(coreWeeks + Math.sqrt(Math.max(0, moduleWeeks)) * 1.6))

  const deliverables =
    core.reduce((sum, i) => sum + (Number(i.deliverables) || 0), 0) +
    active.reduce((sum, i) => sum + (Number(i.deliverables) || 0), 0)

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

/** Deja los ítems en forma canónica y descarta lo que no venga del catálogo. */
export function normalizeItems(raw: unknown, catalogByCode: Map<string, any>): QuoteItem[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const items: QuoteItem[] = []
  for (const entry of raw) {
    const code = asString((entry as any)?.code, 40)
    if (!code || seen.has(code)) continue
    const source = catalogByCode.get(code)
    if (!source) continue // el precio debe existir en el catálogo
    seen.add(code)
    items.push({
      code,
      name: asString((entry as any)?.name, 160) || source.name,
      summary: asString((entry as any)?.summary, 900) || source.summary,
      category: source.category,
      kind: source.kind === 'CORE' ? 'CORE' : 'MODULE',
      price: asInt(source.price), // ← precio del catálogo, no del cliente
      weeks: Number(source.weeks) || 0,
      deliverables: asInt(source.deliverables),
      on: source.kind === 'CORE' ? true : (entry as any)?.on !== false,
      detail: source.detail ?? null,
    })
  }
  return items
}

export async function loadCatalog() {
  const rows = await (prisma as any).quoteCatalogItem.findMany({
    where: { active: true },
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
    weeks: Number(r.weeks) || 0,
    deliverables: r.deliverables,
    on: r.kind === 'CORE' ? true : r.defaultOn !== false,
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
