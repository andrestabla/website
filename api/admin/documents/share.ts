import nodemailer from 'nodemailer'
import { requireAdminSession } from '../../_lib/admin-auth.js'
import { prisma } from '../../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations } from '../../_lib/integrations.js'
import { canAccessDocumentCategory } from '../../_lib/doc-permissions.js'

type VercelRequest = any
type VercelResponse = any

function getBaseUrl(req: VercelRequest) {
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'localhost:3000'
  const proto = req.headers?.['x-forwarded-proto'] || 'https'
  return `${proto}://${host}`
}

function buildShareEmailHtml(opts: {
  senderName: string
  recipientName: string
  documentTitle: string
  message: string
  viewUrl: string
  pixelUrl: string
}) {
  const { senderName, recipientName, documentTitle, message, viewUrl, pixelUrl } = opts
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px">
      <tr><td style="background:#18181b;padding:24px 32px">
        <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700">Documento compartido</p>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="color:#52525b;font-size:15px;margin:0 0 16px">Hola${recipientName ? ` ${recipientName}` : ''},</p>
        <p style="color:#52525b;font-size:15px;margin:0 0 16px"><strong>${senderName}</strong> ha compartido el siguiente documento contigo:</p>
        <div style="background:#f4f4f5;border-radius:6px;padding:16px 20px;margin:0 0 20px">
          <p style="margin:0;font-size:16px;font-weight:600;color:#18181b">${documentTitle}</p>
        </div>
        ${message ? `<p style="color:#52525b;font-size:14px;margin:0 0 20px;border-left:3px solid #e4e4e7;padding-left:12px">${message}</p>` : ''}
        <table cellpadding="0" cellspacing="0"><tr><td style="background:#18181b;border-radius:6px">
          <a href="${viewUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600">Ver documento</a>
        </td></tr></table>
        <p style="color:#a1a1aa;font-size:12px;margin:24px 0 0">Este enlace es exclusivo para ti. No lo compartas.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="">
</body>
</html>`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const session = requireAdminSession(req, res)
    if (!session) return

    const id = String(req.query?.id || '')
    if (!id) return res.status(400).json({ ok: false, error: 'id is required' })

    // Guardia de acceso al espacio del documento.
    const docForAccess = await prisma.document.findUnique({ where: { id }, select: { categoryId: true } })
    if (!docForAccess) return res.status(404).json({ ok: false, error: 'Document not found' })
    if (!(await canAccessDocumentCategory(session, docForAccess.categoryId))) {
      return res.status(403).json({ ok: false, error: 'No tienes acceso a este documento' })
    }

    // GET: list shares for a document
    if (req.method === 'GET') {
      const shares = await prisma.docShare.findMany({
        where: { documentId: id },
        include: { events: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      })
      return res.status(200).json({ ok: true, data: shares })
    }

    // POST: send a share email
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
      const { recipientEmail, recipientName, subject, message, expiresAt, maxViews } = body

      if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(recipientEmail))) {
        return res.status(400).json({ ok: false, error: 'Valid recipientEmail is required' })
      }

      const document = await prisma.document.findUnique({ where: { id } })
      if (!document) return res.status(404).json({ ok: false, error: 'Document not found' })

      const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
      const integrations = sanitizeIntegrations(snapshot?.data ?? {})
      const smtp = integrations.smtp
      if (!smtp.enabled || !smtp.config.host) {
        return res.status(400).json({ ok: false, error: 'SMTP integration is not configured' })
      }

      const share = await prisma.docShare.create({
        data: {
          documentId: id,
          recipientEmail: String(recipientEmail).toLowerCase().trim(),
          recipientName: recipientName ? String(recipientName).trim() : null,
          sentBy: session.userId,
          sentByName: session.displayName,
          subject: subject ? String(subject).trim() : `Documento compartido: ${document.title}`,
          message: message ? String(message).trim() : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          maxViews: maxViews ? Number(maxViews) : null,
        },
      })

      const base = getBaseUrl(req)
      const viewUrl = `${base}/api/documents/view/${share.shareToken}`
      const pixelUrl = `${base}/api/documents/pixel/${share.shareToken}`

      const { host, port, user, password, fromName, fromEmail, encryption } = smtp.config
      const transporter = nodemailer.createTransport({
        host,
        port: Number(port) || 587,
        secure: encryption === 'ssl',
        auth: { user, pass: password },
      })

      try {
        await transporter.sendMail({
          from: `"${fromName || session.displayName}" <${fromEmail}>`,
          to: recipientName ? `"${recipientName}" <${recipientEmail}>` : recipientEmail,
          subject: share.subject || `Documento: ${document.title}`,
          html: buildShareEmailHtml({
            senderName: session.displayName,
            recipientName: String(recipientName || ''),
            documentTitle: document.title,
            message: String(message || ''),
            viewUrl,
            pixelUrl,
          }),
        })

        await prisma.docShareEvent.create({
          data: { shareId: share.id, eventType: 'EMAIL_SENT' },
        })
      } catch (emailError) {
        console.error('Email send failed:', emailError)
        await prisma.docShare.delete({ where: { id: share.id } })
        return res.status(502).json({ ok: false, error: 'Failed to send email' })
      }

      return res.status(201).json({ ok: true, data: share })
    }

    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('api/admin/documents/share error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
