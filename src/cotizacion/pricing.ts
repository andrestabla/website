/**
 * Espejo cliente del motor de precios (api/_lib/quotes.ts · computeTotals).
 * El visor lo usa para recalcular en vivo cuando el cliente prende o apaga
 * módulos; la cifra contractual sigue siendo la del servidor. Si cambias la
 * fórmula aquí, cámbiala también allá.
 */

export type QuoteItem = {
  code: string
  name: string
  summary?: string
  category?: string
  kind?: 'CORE' | 'MODULE'
  price: number
  qty?: number
  unit?: string | null
  weeks?: number
  deliverables?: number
  on: boolean
  /** Con selección del cliente activa: false = fijo, el cliente no lo mueve. */
  selectable?: boolean
  /** Opciones excluyentes: de las líneas con el mismo grupo solo cuenta una. */
  group?: string | null
  detail?: { entregables?: string[] } | null
}

const itemQty = (item: QuoteItem) => Math.max(1, Math.round(Number(item.qty) || 1))

export type DiscountTier = { upTo: number; pct: number }

export const DEFAULT_DISCOUNT_SCALE: DiscountTier[] = [
  { upTo: 3, pct: 0 },
  { upTo: 6, pct: 5 },
  { upTo: 9, pct: 8 },
  { upTo: 12, pct: 11 },
  { upTo: 99, pct: 15 },
]

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
 * Las líneas con el mismo `group` son opciones excluyentes: siempre queda una
 * encendida. `prefer` son los códigos que se acaban de elegir; sin ellos manda
 * la primera encendida del grupo, y si ninguna lo está, la primera del grupo.
 */
export function oneOnPerGroup<T extends QuoteItem>(items: T[], prefer: Set<string> = new Set()): T[] {
  const rank = (i: T) => (prefer.has(i.code.toUpperCase()) ? 2 : i.on ? 1 : 0)
  const chosen = new Map<string, T>()
  for (const i of items) {
    if (!i.group || i.kind === 'CORE') continue
    const current = chosen.get(i.group)
    if (!current || rank(i) > rank(current)) chosen.set(i.group, i)
  }
  if (!chosen.size) return items
  const next = items.map((i) => {
    if (!i.group || i.kind === 'CORE') return i
    const on = chosen.get(i.group) === i
    return on === i.on ? i : { ...i, on }
  })
  return next.some((i, n) => i !== items[n]) ? next : items
}

export function computeTotals(
  rawItems: QuoteItem[],
  opts: { scale?: DiscountTier[]; paymentSplit?: number[]; minWeeks?: number } = {}
): QuoteTotals {
  const scale = opts.scale?.length ? opts.scale : DEFAULT_DISCOUNT_SCALE
  const split = opts.paymentSplit?.length ? opts.paymentSplit : DEFAULT_PAYMENT_SPLIT
  const minWeeks = opts.minWeeks ?? 4
  const items = oneOnPerGroup(rawItems)

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
  const weeks = Math.max(minWeeks, Math.round(coreWeeks + Math.sqrt(Math.max(0, moduleWeeks)) * 1.6))

  const deliverables =
    core.reduce((sum, i) => sum + (Number(i.deliverables) || 0), 0) +
    active.reduce((sum, i) => sum + (Number(i.deliverables) || 0) * itemQty(i), 0)

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

export function formatMoney(amount: number, currency = 'COP') {
  const value = Math.round(Number(amount) || 0)
  const grouped = String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const sign = value < 0 ? '−' : ''
  return currency === 'USD' ? `${sign}USD ${grouped}` : `${sign}$ ${grouped}`
}
