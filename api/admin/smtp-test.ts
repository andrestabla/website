import nodemailer from 'nodemailer'
import { prisma } from '../_lib/prisma.js'
import { requireAdminSession } from '../_lib/admin-auth.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from '../_lib/integrations.js'
import { generateStyledEmail } from '../_lib/email-templates.js'

type VercelRequest = any
type VercelResponse = any

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const session = requireAdminSession(req, res)
  if (!session) return

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const customTo = typeof body.to === 'string' && body.to.includes('@') ? body.to : null
    const customSubject = typeof body.subject === 'string' ? body.subject : null

    const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
    const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data))
    
    if (!integrations.smtp.enabled) {
      return res.status(400).json({ ok: false, error: 'SMTP no está habilitado' })
    }

    const smtp = integrations.smtp.config
    if (!smtp.host || !smtp.user || !smtp.password || !smtp.fromEmail) {
      return res.status(400).json({ ok: false, error: 'Configuración SMTP incompleta' })
    }

    const secure = smtp.encryption === 'ssl' || String(smtp.port) === '465'
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port || '587'),
      secure,
      auth: {
        user: smtp.user,
        pass: smtp.password,
      },
      tls: smtp.encryption === 'none' ? { rejectUnauthorized: false } : undefined,
    })

    const fromName = smtp.fromName || 'Sistema'
    const from = `${fromName} <${smtp.fromEmail}>`
    const to = customTo || smtp.fromEmail
    
    const html = generateStyledEmail({
      title: 'Prueba de Configuración SMTP',
      preheader: 'Tu servidor de correo en AlgoritmoT está listo.',
      contentHtml: `
        <p style="font-size: 18px; font-weight: bold; color: #059669; margin-bottom: 8px;">✅ Conexión Exitosa</p>
        <p>Esta es una prueba de configuración exitosa para tu servidor de correo saliente en <span class="accent-text">AlgoritmoT</span>.</p>
        
        <table class="data-table">
          <tr><td class="label">Proveedor</td><td>${smtp.provider || 'Personalizado'}</td></tr>
          <tr><td class="label">Servidor</td><td>${smtp.host}:${smtp.port}</td></tr>
          <tr><td class="label">Remitente</td><td>${smtp.fromEmail}</td></tr>
          <tr><td class="label">Destinatario</td><td>${to}</td></tr>
        </table>

        <p style="margin-top: 32px; font-size: 12px; color: #64748b;">Si has recibido este correo, la configuración es correcta y el sistema puede enviar notificaciones automáticamente.</p>
      `
    })

    await transporter.sendMail({
      from,
      to,
      subject: customSubject || 'Prueba de configuración SMTP - AlgoritmoT',
      html,
      text: `Configuración SMTP Correcta\n\nProveedor: ${smtp.provider || 'Personalizado'}\nServidor: ${smtp.host}:${smtp.port}`,
    })

    return res.status(200).json({ ok: true, message: 'Correo de prueba enviado correctamente' })
  } catch (error) {
    console.error('api/admin/smtp-test error', error)
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Error al enviar correo de prueba' })
  }
}
