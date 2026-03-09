import nodemailer from 'nodemailer'
import { prisma } from '../_lib/prisma.js'
import { requireAdminSession } from '../_lib/admin-auth.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from '../_lib/integrations.js'

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
    
    await transporter.sendMail({
      from,
      to: smtp.fromEmail,
      subject: 'Prueba de configuración SMTP - AlgoritmoT',
      text: `Hola,\n\nEsta es una prueba de configuración exitosa para tu servidor de correo saliente en AlgoritmoT.\n\nProveedor: ${smtp.provider || 'Personalizado'}\nServidor: ${smtp.host}:${smtp.port}\nRemitente: ${from}\n\nSi has recibido este correo, la configuración es correcta.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #334155;">
          <h2 style="color: #059669;">✅ Configuración SMTP Correcta</h2>
          <p>Esta es una prueba de configuración exitosa para tu servidor de correo saliente en <strong>AlgoritmoT</strong>.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 14px;"><strong>Detalles técnicos:</strong></p>
          <ul style="font-size: 14px; list-style: none; padding: 0;">
            <li><strong>Proveedor:</strong> ${smtp.provider || 'Personalizado'}</li>
            <li><strong>Servidor:</strong> ${smtp.host}:${smtp.port}</li>
            <li><strong>Remitente:</strong> ${from}</li>
          </ul>
          <p style="font-size: 12px; color: #64748b; margin-top: 30px;">Si has recibido este correo, la configuración es correcta y puedes empezar a enviar correos transaccionales.</p>
        </div>
      `,
    })

    return res.status(200).json({ ok: true, message: 'Correo de prueba enviado correctamente' })
  } catch (error) {
    console.error('api/admin/smtp-test error', error)
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Error al enviar correo de prueba' })
  }
}
