/**
 * Carga en el Cotizador la propuesta UPC 2026 como cotización-documento:
 * la pieza diagramada vive en /cotizaciones/upc-2026/ y esta cotización le
 * da URL pública /c/:id con métricas, destinatarios, estados y edición.
 * Idempotente: si ya existe la cotización-documento de la UPC, la actualiza.
 *
 *   npx tsx scripts/seed-upc-document-quote.ts
 */
import { config } from 'dotenv'
config({ path: '.env' }); config({ path: '.env.local', override: true })
const { prisma } = await import('../api/_lib/prisma.js')
const { newPublicId, FLAT_DISCOUNT_SCALE } = await import('../api/_lib/quotes.js')

const db = prisma as any

const DOCUMENT_URL = '/cotizaciones/upc-2026/Propuesta-UPC-2026.html'
const TOTAL = 760_200_000

const content = {
  documentUrl: DOCUMENT_URL,
  modulesSelectable: false,
  intro: '',
  diagnosis: { lede: '', fronts: [] },
  approach: '',
  scopeNote: '',
  timelineNote: '',
  assumptions: [],
  exclusions: [],
  service: { includedMonths: 18, renewalPrice: 80_000_000, exitPrice: 0 },
  signature: {
    name: 'Ana Milena Díaz Granados',
    role: 'Directora de Relacionamiento · Algoritmo T',
    email: 'anadiazgrandos@algoritmot.com',
    phone: '+57 300 659 0161',
  },
}

const admin = await db.adminUser.findFirst({ where: { username: 'admin' }, select: { id: true } })
if (!admin) throw new Error('No existe el usuario admin')

const data = {
  ownerId: admin.id,
  status: 'PUBLISHED',
  template: 'SOLUCIONES',
  clientName: 'Universidad Popular del Cesar',
  clientContact: 'Vicerrectoría Académica',
  sector: 'Educación superior pública',
  title: 'Plataforma de Gestión de la Transformación Digital con Enfoque Territorial',
  subtitle: 'Diagnóstico, hoja de ruta e implementación — cada fase de la consultoría entrega su salida en un módulo de la plataforma. 6 meses de ejecución + 18 meses de licencia.',
  currency: 'COP',
  content,
  pricing: { items: [], totals: null },
  discountScale: FLAT_DISCOUNT_SCALE,
  totalBase: TOTAL,
  totalFinal: TOTAL,
  weeks: 26,
  moduleCount: 0,
  validDays: 30,
}

const existing = await db.quote.findFirst({
  where: { clientName: 'Universidad Popular del Cesar', content: { path: ['documentUrl'], not: 'null' } },
  select: { id: true, publicId: true, publishedAt: true },
})

if (existing) {
  await db.quote.update({ where: { id: existing.id }, data })
  console.log(`Actualizada: /c/${existing.publicId}`)
} else {
  const quote = await db.quote.create({
    data: { ...data, publicId: newPublicId(), publishedAt: new Date() },
  })
  console.log(`Creada: /c/${quote.publicId}`)
}
await db.$disconnect()
