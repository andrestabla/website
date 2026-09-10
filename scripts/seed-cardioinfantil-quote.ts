/**
 * Cotización Fundación Cardioinfantil 2026 — aplicativo de correspondencia.
 *
 * Espejo editable, página por página, de la propuesta diagramada que vive en
 *   https://www.algoritmot.com/cotizaciones/cardioinfantil-2026
 * El contenido se extrae del HTML aprobado con un script (scratchpad/extraer.mjs)
 * y queda en scripts/data/cardioinfantil/propuesta.json: cada página de allí es
 * una página de este documento, con el mismo texto. Idempotente: se vuelve a
 * correr cuando el documento canónico cambie; conserva el estado (DRAFT al
 * crearse; se publica desde /ecosistema/cotizador).
 *
 *   npx tsx scripts/seed-cardioinfantil-quote.ts
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
config({ path: '.env' }); config({ path: '.env.local', override: true })
const { prisma } = await import('../api/_lib/prisma.js')
const { newPublicId, computeTotals, FLAT_DISCOUNT_SCALE } = await import('../api/_lib/quotes.js')

const db = prisma as any
const CLIENT = 'Fundación Cardioinfantil · Instituto de Cardiología'
const TITLE = 'Aplicativo para la gestión de la correspondencia'
const DOC_URL = 'https://www.algoritmot.com/cotizaciones/cardioinfantil-2026'

const datos = JSON.parse(readFileSync(new URL('./data/cardioinfantil/propuesta.json', import.meta.url), 'utf8')) as {
  portada: { title: string; subtitle: string; meta: Record<string, string>; tagline: string; client: string }
  pages: any[]
}

/* ══ Inversión: dos rubros, IVA solo sobre la implementación ══ */
const IMPLEMENTACION = 18_250_000
const LICENCIA = 10_000_000
const IVA = Math.round(IMPLEMENTACION * 0.19) // 3.467.500

const items = [
  {
    code: 'FCI-01', name: 'Diseño e implementación',
    summary: 'Discovery, aplicativo web con sus dieciséis módulos, captura en campo con instalación en los teléfonos de los motorizados, migración del histórico, lector de código de barras, piloto y capacitación. Gravado con IVA 19 %.',
    category: 'Inversión', kind: 'CORE', price: IMPLEMENTACION, qty: 1, unit: null,
    weeks: 12, deliverables: 28, on: true, selectable: false, detail: null,
  },
  {
    code: 'FCI-02', name: 'IVA 19 % sobre el diseño y la implementación',
    summary: 'La licencia anual se factura como servicio en la nube, excluida de IVA.',
    category: 'Inversión', kind: 'CORE', price: IVA, qty: 1, unit: null,
    weeks: 0, deliverables: 0, on: true, selectable: false, detail: null,
  },
  {
    code: 'FCI-03', name: 'Licencia anual de servicio',
    summary: 'Hospedaje, base de datos, evidencias, correo y avisos, respaldo diario, monitoreo, actualizaciones de seguridad y soporte. Software como servicio, excluida de IVA. Se factura con el pago de la semana 12 y cubre los doce meses siguientes.',
    category: 'Inversión', kind: 'CORE', price: LICENCIA, qty: 1, unit: null,
    weeks: 0, deliverables: 1, on: true, selectable: false, detail: null,
  },
]

// Tres pagos: semanas 4, 8 y 12 ($ 8.687.000 · $ 6.515.250 · $ 16.515.250). El
// reparto del módulo es porcentual y entero; los valores exactos van en la
// página «Aprobaciones y plan de pagos».
const paymentSplit = [27, 21, 52]
const totals = computeTotals(items as any, { scale: FLAT_DISCOUNT_SCALE, minWeeks: 12, paymentSplit })
if (totals.total !== IMPLEMENTACION + IVA + LICENCIA) throw new Error(`Total inesperado: ${totals.total}`)

/* ══ Contenido: portada + páginas del documento ══ */
const { portada, pages } = datos
const content = {
  modulesSelectable: false,
  itemsNoun: 'Rubros',
  paymentSplit,
  paymentLabels: [
    { moment: 'Semana 4', milestone: 'Discovery aprobado · 40 % de la implementación' },
    { moment: 'Semana 8', milestone: 'Aplicativo en pruebas · 30 % de la implementación' },
    { moment: 'Semana 12', milestone: 'Salida a producción · 30 % de la implementación más la licencia anual' },
  ],
  investment: totals.total,
  cover: {
    kicker: 'Propuesta técnica y económica',
    duration: portada.meta['Duración'],
    scope: portada.meta['Alcance'],
    investment: portada.meta['Inversión'],
    tagline: portada.tagline,
  },
  labels: { coverIndex: 'PROPUESTA · 2026', rheadLeft: 'Propuesta · Fundación Cardioinfantil', pageFooter: 'Algoritmo T · Correspondencia FCI' },
  pages,

  /* esquema clásico, por si se apagan las páginas */
  intro: pages.find((p) => p.id === 'presentacion')?.blocks.filter((b: any) => b.type === 'p').map((b: any) => b.text).join('\n\n') ?? '',
  diagnosis: { lede: '', fronts: [] },
  approach: '',
  scopeNote: '',
  timelineNote: '',
  assumptions: [],
  exclusions: [],
  service: { includedMonths: 12, renewalPrice: LICENCIA, exitPrice: 5_000_000 },
  finalNote: `Esta vista refleja el documento de referencia de la propuesta, disponible en versión diagramada de 20 páginas con descarga en PDF: ${DOC_URL}`,
  backQuote: 'Quedamos atentos para dar continuidad al proceso conforme a los tiempos de la Clínica.',
  signature: {
    name: 'Ana Milena Diazgranados',
    role: 'Directora de Relacionamiento · Algoritmo T',
    email: 'anadiazgranados@algoritmot.com',
    phone: '+57 300 659 0161',
  },
}

/* ══ Aplicar ══ */
const owner =
  (await db.adminUser.findFirst({ where: { username: 'andr-s-t' }, select: { id: true } })) ??
  (await db.adminUser.findFirst({ where: { username: 'admin' }, select: { id: true } }))
if (!owner) throw new Error('No se encontró un AdminUser propietario (andr-s-t / admin)')

const data = {
  ownerId: owner.id,
  template: 'SOLUCIONES',
  clientName: CLIENT,
  clientContact: 'Jhon Alexander Zárate Vera · Coordinador de gestión documental · Dirección de Operaciones',
  sector: 'Salud',
  title: TITLE,
  subtitle: portada.subtitle,
  currency: 'COP',
  content,
  pricing: { items, totals },
  discountScale: FLAT_DISCOUNT_SCALE,
  totalBase: totals.subtotal,
  totalFinal: totals.total,
  weeks: 12,
  moduleCount: 0,
  validDays: 30,
}

const existing = await db.quote.findFirst({ where: { clientName: CLIENT, title: TITLE }, select: { id: true, publicId: true, status: true } })
const bloques = pages.reduce((n: number, p: any) => n + p.blocks.length, 0)
if (existing) {
  await db.quote.update({ where: { id: existing.id }, data })
  console.log(`Actualizada · /c/${existing.publicId} · status=${existing.status} · ${pages.length} páginas · ${bloques} bloques · total ${totals.total}`)
} else {
  const quote = await db.quote.create({ data: { publicId: newPublicId(), status: 'DRAFT', ...data } })
  console.log(`Creada (DRAFT) · /c/${quote.publicId} · ${pages.length} páginas · ${bloques} bloques · total ${totals.total} · publícala en /ecosistema/cotizador`)
}
await db.$disconnect()
