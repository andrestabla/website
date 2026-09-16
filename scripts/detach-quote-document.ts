/**
 * Quita el documento externo (content.documentUrl) de una cotización para que
 * vuelva a la lógica del builder: la vista pública muestra sus páginas y la
 * inversión sale de sus líneas. Deja una versión restaurable antes del cambio.
 *
 *   npx tsx scripts/detach-quote-document.ts <quoteId>
 *
 * Idempotente: si la cotización no tiene documento externo, no toca nada.
 */
import { config } from 'dotenv'
config({ path: '.env' }); config({ path: '.env.local', override: true })
const { prisma } = await import('../api/_lib/prisma.js')

const db = prisma as any
const quoteId = process.argv[2]
if (!quoteId) throw new Error('Uso: npx tsx scripts/detach-quote-document.ts <quoteId>')

const quote = await db.quote.findUnique({ where: { id: quoteId } })
if (!quote) throw new Error(`No existe la cotización ${quoteId}`)
const content = { ...(quote.content ?? {}) }
const pages = Array.isArray(content.pages) ? content.pages.length : 0
const items = Array.isArray(quote.pricing?.items) ? quote.pricing.items.length : 0
console.log(`ANTES   : ${quote.clientName} · /c/${quote.publicId} · documentUrl = ${content.documentUrl ?? '(ninguno)'} · páginas = ${pages} · líneas = ${items} · totalFinal = ${quote.totalFinal}`)

if (content.documentUrl === undefined) {
  console.log('\nNada que hacer: ya sigue la lógica del builder.')
} else {
  await db.quoteVersion.create({
    data: { quoteId: quote.id, reason: 'EDITOR', label: 'Antes de quitar el documento externo', title: quote.title, content: quote.content ?? {}, pricing: quote.pricing ?? {}, createdBy: null },
  })
  delete content.documentUrl
  await db.quote.update({ where: { id: quote.id }, data: { content } })
  console.log('\nDocumento externo retirado; versión guardada para volver atrás.')
}

const after = await db.quote.findUnique({ where: { id: quoteId } })
console.log(`DESPUÉS : documentUrl = ${after.content?.documentUrl ?? '(ninguno)'} · páginas = ${Array.isArray(after.content?.pages) ? after.content.pages.length : 0} · líneas = ${items} · totalFinal = ${after.totalFinal}`)
await prisma.$disconnect()
