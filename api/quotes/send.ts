/**
 * Cotizador — envío de la cotización por correo (privado, dueño o admin).
 *
 * Cada destinatario recibe su enlace propio (/c/:publicId?d=<token>): así las
 * aperturas, el tiempo de lectura y los módulos tocados quedan atados a la
 * persona. Solo se envían cotizaciones publicadas.
 */
import { prisma } from '../_lib/prisma.js'
import { sendEmail } from '../_lib/email.js'
import { quoteSessionState, formatMoney } from '../_lib/quotes.js'

type VercelRequest = any
type VercelResponse = any

export const maxDuration = 30

const quoteDb = () => (prisma as any).quote
const recipientDb = () => (prisma as any).quoteRecipient

const str = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function publicOrigin(req: VercelRequest) {
  const configured = process.env.PUBLIC_SITE_ORIGIN || ''
  if (configured) return configured.replace(/\/$/, '')
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || 'www.algoritmot.com')
  const proto = String(req.headers?.['x-forwarded-proto'] || 'https')
  return `${proto}://${host}`
}

function emailHtml(opts: {
  recipientName: string
  clientName: string
  title: string
  total: string
  weeks: number
  moduleCount: number
  url: string
  senderNote?: string
}) {
  const note = opts.senderNote
    ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#3b424b;">${opts.senderNote}</p>`
    : ''
  return `
<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f0ede6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:28px 16px;">
    <div style="background:#1a2d5a;padding:26px 30px;border-radius:8px 8px 0 0;">
      <div style="font-size:11px;letter-spacing:3px;color:#76d6ef;text-transform:uppercase;font-weight:bold;">Algoritmo T</div>
      <div style="font-size:22px;line-height:1.25;color:#ffffff;font-weight:800;margin-top:12px;">${opts.title}</div>
    </div>
    <div style="background:#fffdf9;padding:28px 30px;border:1px solid #d3cab6;border-top:0;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3b424b;">
        Hola${opts.recipientName ? ` <strong>${opts.recipientName}</strong>` : ''}:
      </p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#3b424b;">
        Preparamos para <strong>${opts.clientName}</strong> una propuesta con una particularidad:
        es un documento interactivo. Puede activar o desactivar módulos y ver la inversión,
        el plazo y el plan de pagos recalcularse al instante.
      </p>
      ${note}
      <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 22px;border:1px solid #e3ddce;">
        <tr>
          <td style="padding:12px 16px;border-right:1px solid #e3ddce;">
            <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#a87a14;">Inversión</div>
            <div style="font-size:16px;font-weight:bold;color:#1a2d5a;margin-top:4px;">${opts.total}</div>
          </td>
          <td style="padding:12px 16px;border-right:1px solid #e3ddce;">
            <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#a87a14;">Duración</div>
            <div style="font-size:16px;font-weight:bold;color:#1a2d5a;margin-top:4px;">${opts.weeks} semanas</div>
          </td>
          <td style="padding:12px 16px;">
            <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#a87a14;">Alcance</div>
            <div style="font-size:16px;font-weight:bold;color:#1a2d5a;margin-top:4px;">${opts.moduleCount} módulos</div>
          </td>
        </tr>
      </table>
      <div style="text-align:center;margin:0 0 8px;">
        <a href="${opts.url}" style="display:inline-block;background:#1a2d5a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:14px 34px;border-radius:4px;">Ver la cotización</a>
      </div>
      <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#9aa0a8;text-align:center;">
        Este enlace es personal. Si el botón no abre, copie esta dirección:<br>
        <a href="${opts.url}" style="color:#0b6f88;word-break:break-all;">${opts.url}</a>
      </p>
    </div>
    <div style="padding:18px 10px;text-align:center;font-size:11px;color:#9aa0a8;">
      Algoritmo T · Soluciones digitales con sentido humano · <a href="https://www.algoritmot.com" style="color:#0b6f88;">www.algoritmot.com</a>
    </div>
  </div>
</body>
</html>`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = quoteSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Sesión requerida' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'Sin acceso al Cotizador' })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const quoteId = str(body.quoteId, 40)
    const recipientId = str(body.recipientId, 40)
    if (!quoteId || !recipientId) return res.status(400).json({ ok: false, error: 'quoteId y recipientId son requeridos' })

    const quote = await quoteDb().findUnique({ where: { id: quoteId } })
    if (!quote) return res.status(404).json({ ok: false, error: 'Cotización no encontrada' })
    const isAdmin = session.role === 'SUPERADMIN' || session.role === 'ADMIN'
    if (quote.ownerId !== session.userId && !isAdmin) {
      return res.status(403).json({ ok: false, error: 'Esta cotización es de otro usuario' })
    }
    if (quote.status !== 'PUBLISHED') {
      return res.status(400).json({ ok: false, error: 'Publica la cotización antes de enviarla' })
    }

    const recipient = await recipientDb().findUnique({ where: { id: recipientId } })
    if (!recipient || recipient.quoteId !== quote.id) {
      return res.status(404).json({ ok: false, error: 'Destinatario no encontrado' })
    }
    if (!recipient.email) {
      return res.status(400).json({ ok: false, error: 'El destinatario necesita un correo. Edítalo y vuelve a intentar.' })
    }

    const url = `${publicOrigin(req)}/c/${quote.publicId}?d=${recipient.token}`
    const html = emailHtml({
      recipientName: recipient.name,
      clientName: quote.clientName,
      title: quote.title,
      total: `${formatMoney(quote.totalFinal, quote.currency)} ${quote.currency}`,
      weeks: quote.weeks,
      moduleCount: quote.moduleCount,
      url,
      senderNote: str(body.note, 600) || undefined,
    })

    const messageId = await sendEmail({
      to: recipient.email,
      subject: str(body.subject, 200) || `Propuesta para ${quote.clientName} · Algoritmo T`,
      html,
    })
    if (!messageId) {
      return res.status(502).json({ ok: false, error: 'El servidor de correo (SMTP) no está configurado en Integraciones' })
    }

    const updated = await recipientDb().update({ where: { id: recipient.id }, data: { sentAt: new Date() } })
    return res.status(200).json({ ok: true, recipient: updated, url })
  } catch (error: any) {
    console.error('quotes/send error:', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
