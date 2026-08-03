/** Devuelve la demo a la configuración sugerida y borra las métricas de prueba. */
import { config } from 'dotenv'
config({ path: '.env' }); config({ path: '.env.local', override: true })
const { prisma } = await import('../api/_lib/prisma.js')
const { loadCatalog, itemsFromCatalog, computeTotals } = await import('../api/_lib/quotes.js')
const db = prisma as any

const quote = await db.quote.findUnique({ where: { publicId: 'demoedicionesu1' } })
if (!quote) throw new Error('demo no existe')

const rows = await loadCatalog()
const items = itemsFromCatalog(rows)
const totals = computeTotals(items)
const content = { ...(quote.content as any) }
content.scopeNote = 'El alcance contractual es el que quede activo en el configurador al momento de firmar.'

await db.quote.update({
  where: { id: quote.id },
  data: {
    content,
    pricing: { items, totals },
    totalBase: totals.subtotal,
    totalFinal: totals.total,
    weeks: totals.weeks,
    moduleCount: totals.moduleCount,
  },
})
await db.quoteEvent.deleteMany({ where: { quoteId: quote.id } })
await db.quoteMessage.deleteMany({ where: { quoteId: quote.id } })
await db.quoteRecipient.updateMany({ where: { quoteId: quote.id }, data: { openCount: 0, firstSeenAt: null, lastSeenAt: null, sentAt: null } })
console.log(`demo restaurada: total=${totals.total} semanas=${totals.weeks} modulos=${totals.moduleCount} · métricas y chat de prueba borrados`)
