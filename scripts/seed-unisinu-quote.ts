/**
 * Crea (o actualiza) la cotización-documento de la Universidad del Sinú:
 * la propuesta diagramada vive en /cotizaciones/unisinu-2026 y aquí se
 * registra en el Cotizador para tener URL pública /c/:id, métricas y
 * destinatarios. Queda en DRAFT: se publica desde /ecosistema/cotizador.
 */
import { config } from 'dotenv'
config({ path: '.env' }); config({ path: '.env.local', override: true })
const { prisma } = await import('../api/_lib/prisma.js')
const { newPublicId, FLAT_DISCOUNT_SCALE } = await import('../api/_lib/quotes.js')

const db = prisma as any
const DOCUMENT_URL = 'https://www.algoritmot.com/cotizaciones/unisinu-2026'
const CLIENT = 'Universidad del Sinú · Seccional Cartagena'

const owner = await db.adminUser.findFirst({ where: { username: 'andr-s-t' }, select: { id: true } })
if (!owner) throw new Error('No se encontró el AdminUser andr-s-t')

const data = {
  ownerId: owner.id,
  template: 'SOLUCIONES',
  clientName: CLIENT,
  sector: 'Educación superior',
  title: 'Diseño y desarrollo de aulas virtuales con recursos educativos digitales',
  subtitle: 'Propuesta técnica y económica · Moodle 4.5 · 12 RED por crédito · precios escalonados por volumen de créditos · autoría opcional',
  currency: 'COP',
  content: { documentUrl: DOCUMENT_URL, modulesSelectable: false },
  discountScale: FLAT_DISCOUNT_SCALE,
  pricing: { items: [], totals: null },
  totalBase: 0,
  totalFinal: 0,
  weeks: 8,
  moduleCount: 0,
}

const existing = await db.quote.findFirst({
  where: { clientName: CLIENT, content: { path: ['documentUrl'], equals: DOCUMENT_URL } },
})
if (existing) {
  await db.quote.update({ where: { id: existing.id }, data })
  console.log(`Actualizada · /c/${existing.publicId} · status=${existing.status}`)
} else {
  const quote = await db.quote.create({ data: { publicId: newPublicId(), status: 'DRAFT', ...data } })
  console.log(`Creada (DRAFT) · /c/${quote.publicId} · edítala y publícala en /ecosistema/cotizador`)
}
