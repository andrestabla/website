/**
 * Cotizador — correo al destinatario (privado, dueño o admin).
 *
 * Cada destinatario recibe su enlace propio (/c/:publicId?d=<token>): así las
 * aperturas, el tiempo de lectura y los módulos tocados quedan atados a la
 * persona. Solo se envían cotizaciones publicadas.
 *
 * El mensaje se arma desde la cotización (portada, sustantivo de las piezas,
 * si el cliente puede mover líneas) y el consultor lo revisa y edita antes de
 * enviarlo: la plantilla vive en content.email.
 *
 * op: preview (HTML y campos, sin enviar) | save (guarda la plantilla) | send
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

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** Párrafos separados por línea en blanco; saltos simples se respetan. */
const paras = (text: string) =>
  String(text || '')
    .split(/\n{2,}/)
    .filter((t) => t.trim())
    .map((t) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3b424b;">${esc(t.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('')

export type EmailTemplate = {
  subject: string
  greeting: string
  intro: string
  note: string
  stats: Array<{ label: string; value: string }>
  showStats: boolean
  button: string
  closing: string
}

/** Plantilla por defecto, coherente con la portada y con lo que el cliente puede mover. */
export function defaultTemplate(quote: any): EmailTemplate {
  const c = quote.content || {}
  const cover = c.cover || {}
  const noun = String(c.itemsNoun || 'Módulos')
  const selectable = c.modulesSelectable !== false && Array.isArray(quote.pricing?.items) && quote.pricing.items.some((i: any) => i.kind !== 'CORE' && i.selectable !== false)
  const total = cover.investment || `${formatMoney(quote.totalFinal, quote.currency)}${quote.currency === 'USD' ? '' : ` ${quote.currency}`}`
  const duration = cover.duration || `${quote.weeks} semanas`
  const scope = cover.scope || `${quote.moduleCount} ${noun.toLowerCase()}`
  return {
    subject: `Propuesta para ${quote.clientName} · Algoritmo T`,
    greeting: 'Hola {nombre}:',
    intro: selectable
      ? `Preparamos para ${quote.clientName} una propuesta con una particularidad: es un documento interactivo. Puede activar o desactivar ${noun.toLowerCase()} y ver la inversión, el plazo y el plan de pagos recalcularse al instante.`
      : `Preparamos para ${quote.clientName} la propuesta «${quote.title}». Se lee en línea, con el detalle del alcance, el cronograma y la inversión, y se puede descargar en PDF.`,
    note: '',
    stats: [
      { label: 'Inversión', value: total },
      { label: 'Duración', value: duration },
      { label: 'Alcance', value: scope },
    ],
    showStats: true,
    button: 'Ver la cotización',
    closing: 'Este enlace es personal. Si el botón no abre, copie esta dirección:',
  }
}

/** Mezcla lo guardado o lo editado sobre la plantilla por defecto. */
export function mergeTemplate(base: EmailTemplate, raw: any): EmailTemplate {
  if (!raw || typeof raw !== 'object') return base
  const out: EmailTemplate = { ...base }
  for (const key of ['subject', 'greeting', 'intro', 'note', 'button', 'closing'] as const) {
    if (typeof raw[key] === 'string') out[key] = raw[key].trim().slice(0, key === 'intro' || key === 'note' ? 3000 : 300)
  }
  if (typeof raw.showStats === 'boolean') out.showStats = raw.showStats
  if (Array.isArray(raw.stats)) {
    const stats = raw.stats
      .slice(0, 4)
      .map((st: any) => ({ label: str(st?.label, 40), value: str(st?.value, 120) }))
      .filter((st: any) => st.label || st.value)
    if (stats.length) out.stats = stats
  }
  return out
}

function emailHtml(opts: { tpl: EmailTemplate; recipientName: string; title: string; url: string }) {
  const { tpl } = opts
  const greeting = tpl.greeting.replace('{nombre}', opts.recipientName ? `<strong>${esc(opts.recipientName)}</strong>` : '').replace(/\s+:/, ':')
  const stats = tpl.showStats && tpl.stats.length
    ? `<table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 22px;border:1px solid #e3ddce;"><tr>${tpl.stats
        .map((st, i) => `<td style="padding:12px 16px;${i < tpl.stats.length - 1 ? 'border-right:1px solid #e3ddce;' : ''}">
            <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#a87a14;">${esc(st.label)}</div>
            <div style="font-size:16px;font-weight:bold;color:#1a2d5a;margin-top:4px;">${esc(st.value)}</div>
          </td>`)
        .join('')}</tr></table>`
    : ''
  return `
<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f0ede6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:28px 16px;">
    <div style="background:#1a2d5a;padding:26px 30px;border-radius:8px 8px 0 0;">
      <div style="font-size:11px;letter-spacing:3px;color:#76d6ef;text-transform:uppercase;font-weight:bold;">Algoritmo T</div>
      <div style="font-size:22px;line-height:1.25;color:#ffffff;font-weight:800;margin-top:12px;">${esc(opts.title)}</div>
    </div>
    <div style="background:#fffdf9;padding:28px 30px;border:1px solid #d3cab6;border-top:0;">
      ${greeting ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3b424b;">${greeting}</p>` : ''}
      ${paras(tpl.intro)}
      ${paras(tpl.note)}
      ${stats}
      <div style="text-align:center;margin:0 0 8px;">
        <a href="${esc(opts.url)}" style="display:inline-block;background:#1a2d5a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:14px 34px;border-radius:4px;">${esc(tpl.button || 'Ver la cotización')}</a>
      </div>
      <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#9aa0a8;text-align:center;">
        ${esc(tpl.closing)}<br>
        <a href="${esc(opts.url)}" style="color:#0b6f88;word-break:break-all;">${esc(opts.url)}</a>
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
  const { session, allowed } = await quoteSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Sesión requerida' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'Sin acceso al Cotizador' })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const op = str(body.op, 20) || 'send'
    const quoteId = str(body.quoteId, 40)
    const recipientId = str(body.recipientId, 40)
    if (!quoteId) return res.status(400).json({ ok: false, error: 'quoteId requerido' })

    const quote = await quoteDb().findUnique({ where: { id: quoteId } })
    if (!quote) return res.status(404).json({ ok: false, error: 'Cotización no encontrada' })
    const isAdmin = session.role === 'SUPERADMIN' || session.role === 'ADMIN'
    if (quote.ownerId !== session.userId && !isAdmin) {
      return res.status(403).json({ ok: false, error: 'Esta cotización es de otro usuario' })
    }

    // Plantilla vigente: por defecto ← guardada en content.email ← editada en esta petición.
    const base = defaultTemplate(quote)
    const saved = mergeTemplate(base, quote.content?.email)
    const tpl = mergeTemplate(saved, body.template)

    if (op === 'preview') {
      const sample = recipientId ? await recipientDb().findUnique({ where: { id: recipientId } }) : null
      const url = `${publicOrigin(req)}/c/${quote.publicId}${sample?.token ? `?d=${sample.token}` : ''}`
      const html = emailHtml({ tpl, recipientName: sample?.name || str(body.recipientName, 120) || 'Nombre del destinatario', title: quote.title, url })
      return res.status(200).json({ ok: true, template: tpl, defaults: base, html, published: quote.status === 'PUBLISHED' })
    }

    if (op === 'save') {
      const updated = await quoteDb().update({ where: { id: quote.id }, data: { content: { ...(quote.content as object), email: tpl } } })
      return res.status(200).json({ ok: true, template: tpl, quote: updated })
    }

    if (!recipientId) return res.status(400).json({ ok: false, error: 'recipientId requerido' })
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
    // nota puntual de este envío (compatibilidad con el campo anterior)
    const sendTpl = str(body.note, 600) ? { ...tpl, note: [tpl.note, str(body.note, 600)].filter(Boolean).join('\n\n') } : tpl
    const html = emailHtml({ tpl: sendTpl, recipientName: recipient.name, title: quote.title, url })

    const messageId = await sendEmail({
      to: recipient.email,
      subject: sendTpl.subject || `Propuesta para ${quote.clientName} · Algoritmo T`,
      html,
    })
    if (!messageId) {
      return res.status(502).json({ ok: false, error: 'El servidor de correo (SMTP) no está configurado en Integraciones' })
    }

    const updated = await recipientDb().update({ where: { id: recipient.id }, data: { sentAt: new Date() } })
    // lo que se envió queda como plantilla de la cotización
    if (body.template && typeof body.template === 'object') {
      await quoteDb().update({ where: { id: quote.id }, data: { content: { ...(quote.content as object), email: tpl } } }).catch(() => undefined)
    }
    return res.status(200).json({ ok: true, recipient: updated, url })
  } catch (error: any) {
    console.error('quotes/send error:', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
