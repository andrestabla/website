/**
 * Cotizador — vista pública de una cotización.
 *
 * Sin autenticación: se accede por el publicId no adivinable de la URL /c/:id.
 * Solo se sirven cotizaciones PUBLISHED; el dueño (con sesión) puede previsualizar
 * su borrador. Nunca se exponen datos de otros destinatarios ni del propietario.
 */
import { prisma } from '../_lib/prisma.js'
import { quoteSessionState } from '../_lib/quotes.js'

type VercelRequest = any
type VercelResponse = any

const db = () => (prisma as any).quote
const recipientDb = () => (prisma as any).quoteRecipient

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const publicId = String(req.query?.id || '').slice(0, 40)
  const recipientToken = String(req.query?.d || '').slice(0, 60)
  if (!publicId) return res.status(400).json({ ok: false, error: 'id requerido' })

  try {
    const quote = await db().findUnique({ where: { publicId } })
    if (!quote) return res.status(404).json({ ok: false, error: 'Cotización no encontrada' })

    // Borradores: solo el dueño (o un admin) los previsualiza.
    let preview = false
    if (quote.status !== 'PUBLISHED') {
      const { session, allowed } = quoteSessionState(req)
      const isOwner = !!session && (session.userId === quote.ownerId || session.role === 'SUPERADMIN' || session.role === 'ADMIN')
      if (!allowed || !isOwner) {
        return res.status(404).json({ ok: false, error: 'Cotización no disponible' })
      }
      preview = true
    }

    // El token de destinatario personaliza el saludo y ancla las métricas.
    let recipient: { id: string; name: string } | null = null
    if (recipientToken) {
      const row = await recipientDb().findUnique({ where: { token: recipientToken } })
      if (row && row.quoteId === quote.id) recipient = { id: row.id, name: row.name }
    }

    if (!preview) res.setHeader('Cache-Control', 'public, max-age=30')
    return res.status(200).json({
      ok: true,
      preview,
      recipient,
      quote: {
        publicId: quote.publicId,
        status: quote.status,
        clientName: quote.clientName,
        sector: quote.sector,
        title: quote.title,
        subtitle: quote.subtitle,
        currency: quote.currency,
        content: quote.content,
        pricing: quote.pricing,
        discountScale: quote.discountScale,
        validDays: quote.validDays,
        publishedAt: quote.publishedAt,
        updatedAt: quote.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('quotes/public error:', error)
    return res.status(500).json({ ok: false, error: 'Error interno' })
  }
}
