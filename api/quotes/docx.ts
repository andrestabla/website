/**
 * Cotizador — descarga en Word de una cotización publicada.
 *
 * El documento se arma al momento a partir del contenido vigente, de modo que
 * el .docx siempre corresponde a lo que muestra la vista online. Sin sesión:
 * se accede por el publicId no adivinable, igual que la vista pública.
 */
import { prisma } from '../_lib/prisma.js'
import { buildQuoteDocx } from '../_lib/quote-docx.js'

type VercelRequest = any
type VercelResponse = any

const baseUrl = (req: VercelRequest) => {
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'www.algoritmot.com'
  const proto = req.headers?.['x-forwarded-proto'] || 'https'
  return `${proto}://${host}`
}

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')

export const maxDuration = 60

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const publicId = String(req.query?.id || '').slice(0, 40)
  if (!publicId) return res.status(400).json({ ok: false, error: 'id requerido' })

  try {
    const quote = await (prisma as any).quote.findUnique({ where: { publicId } })
    if (!quote || quote.status !== 'PUBLISHED') {
      return res.status(404).json({ ok: false, error: 'Cotización no disponible' })
    }

    const buffer = await buildQuoteDocx(quote as any, baseUrl(req))
    const name = `${slug(quote.clientName)}-propuesta.docx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(buffer)
  } catch (error: any) {
    console.error('quotes/docx error:', error)
    return res.status(500).json({ ok: false, error: 'No se pudo generar el documento' })
  }
}
