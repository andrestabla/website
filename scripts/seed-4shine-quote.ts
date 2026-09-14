/**
 * Cotización 4Shine Empresas 2026 — framework fundacional de la línea
 * corporativa y aplicación de sus frameworks al caso JSSuministros (v2.0).
 *
 * Espejo editable, página por página, de la propuesta diagramada que vive en
 *   https://www.algoritmot.com/cotizaciones/4shine-2026
 * El contenido está transcrito en scripts/data/4shine/propuesta.json: cada
 * página de allí es una página de este documento, con el mismo texto.
 * Idempotente: se vuelve a correr cuando el documento canónico cambie;
 * conserva el estado (DRAFT al crearse; se publica desde /ecosistema/cotizador).
 *
 *   npx tsx scripts/seed-4shine-quote.ts
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
config({ path: '.env' }); config({ path: '.env.local', override: true })
const { prisma } = await import('../api/_lib/prisma.js')
const { newPublicId, computeTotals, FLAT_DISCOUNT_SCALE } = await import('../api/_lib/quotes.js')

const db = prisma as any
const CLIENT = 'Carmenza Alarcón · Sistema 4Shine®'
const TITLE = '4Shine Empresas: framework fundacional y aplicación al caso JSSuministros'
const DOC_URL = 'https://www.algoritmot.com/cotizaciones/4shine-2026'

const datos = JSON.parse(readFileSync(new URL('./data/4shine/propuesta.json', import.meta.url), 'utf8')) as {
  portada: { title: string; subtitle: string; meta: Record<string, string>; tagline: string; client: string }
  pages: any[]
}

/* ══ Inversión: valor integral por los dos frentes, sin IVA discriminado ══ */
const INVERSION = 20_000_000
const WEEKS = 12

const items = [
  {
    code: '4SH-01', name: 'Frente 01 · Framework fundacional 4Shine Empresas',
    summary: 'Presentación, Dossier v1.0, Matriz de capacidades · 4 niveles y Soportes teóricos y empíricos (recibidos el 14 de septiembre); versión 1.1 con retroalimentación del cliente, frameworks propios T1–T8 y diagnóstico 4Shine-OD (OD1–OD5). Valor integral de los dos frentes.',
    category: 'Inversión', kind: 'CORE', price: INVERSION, qty: 1, unit: null,
    weeks: WEEKS, deliverables: 14, on: true, selectable: false, detail: null,
  },
  {
    code: '4SH-02', name: 'Frente 02 · Aplicación de los frameworks al caso JSSuministros',
    summary: 'Arquitectura organizacional escalable (MUL-1.1), inventario de procesos críticos con estándar mínimo y playbooks vivos (MUL-2.1, MUL-2.2) y plan de tecnología y automatización (MUL-3), presentados a la gerencia de JSSuministros. Incluido en el valor integral; sin aplicación del 4Shine-OD.',
    category: 'Inversión', kind: 'CORE', price: 0, qty: 1, unit: null,
    weeks: 0, deliverables: 4, on: true, selectable: false, detail: null,
  },
]

// Dos pagos: semana 8 ($ 12.000.000, fase fundacional recibida) y semana 12
// ($ 8.000.000, cierre total). El reparto 60 / 40 da los valores exactos.
const paymentSplit = [60, 40]
const totals = computeTotals(items as any, { scale: FLAT_DISCOUNT_SCALE, minWeeks: WEEKS, paymentSplit })
if (totals.total !== INVERSION) throw new Error(`Total inesperado: ${totals.total}`)
if (totals.weeks !== WEEKS) throw new Error(`Semanas inesperadas: ${totals.weeks}`)
if (totals.payments[0].amount !== 12_000_000 || totals.payments[1].amount !== 8_000_000) throw new Error('Plan de pagos inesperado')

/* ══ Contenido: portada + páginas del documento ══ */
const { portada, pages } = datos
const content = {
  modulesSelectable: false,
  itemsNoun: 'Frentes',
  paymentSplit,
  paymentLabels: [
    { moment: 'Semana 8 · 25 sep 2026', milestone: 'Gate B · Fase fundacional recibida: Presentación v1, Dossier v1.0, Matriz de capacidades v1 y Soportes teóricos y empíricos, entregados el 14 de septiembre. Hito cumplido.' },
    { moment: 'Semana 12 · 23 oct 2026', milestone: 'Gate C · Cierre total: versión 1.1 de los documentos, frameworks T1–T8 y 4Shine-OD diseñados, paquete IP-ready con changelog; entregables de JSSuministros presentados a su gerencia.' },
  ],
  investment: totals.total,
  cover: {
    kicker: 'Propuesta técnica y económica',
    duration: portada.meta['Duración'],
    scope: portada.meta['Alcance'],
    investment: portada.meta['Inversión'],
    tagline: portada.tagline,
  },
  labels: { coverIndex: 'PROPUESTA · 2026 · v2.0', rheadLeft: 'Propuesta · 4Shine Empresas', pageFooter: 'Algoritmo T · 4Shine Empresas' },
  pages,

  /* esquema clásico, por si se apagan las páginas */
  intro: pages.find((p) => p.id === 'presentacion')?.blocks.filter((b: any) => b.type === 'p').map((b: any) => b.text).join('\n\n') ?? '',
  diagnosis: { lede: '', fronts: [] },
  approach: '',
  scopeNote: '',
  timelineNote: '',
  assumptions: [],
  exclusions: [],
  finalNote: `Esta propuesta tiene una validez de 30 días calendario. Valores en pesos colombianos (COP), con IVA y retenciones sujetos a la jurisdicción de facturación. Versión diagramada de 13 páginas con descarga en PDF: ${DOC_URL}`,
  backQuote: 'Convertir un método que funciona en un sistema que escala más allá de quien lo creó.',
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
  clientContact: 'Carmenza Alarcón · Creadora del Sistema 4Shine®',
  sector: 'Desarrollo de liderazgo · Consultoría',
  title: TITLE,
  subtitle: portada.subtitle,
  currency: 'COP',
  content,
  pricing: { items, totals },
  discountScale: FLAT_DISCOUNT_SCALE,
  totalBase: totals.subtotal,
  totalFinal: totals.total,
  weeks: WEEKS,
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
