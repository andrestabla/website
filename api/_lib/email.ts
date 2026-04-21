import nodemailer from 'nodemailer'
import { prisma } from './prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations } from './integrations.js'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = sanitizeIntegrations(snapshot?.data)
  const smtp = integrations.smtp

  if (!smtp.enabled || smtp.status !== 'configured') {
    console.warn('SMTP not configured or enabled.')
    return null
  }

  const transporter = nodemailer.createTransport({
    host: smtp.config.host,
    port: parseInt(smtp.config.port),
    secure: smtp.config.port === '465',
    auth: {
      user: smtp.config.user,
      pass: smtp.config.password,
    },
  })

  try {
    const info = await transporter.sendMail({
      from: `"${smtp.config.fromName || 'AlgoritmoT'}" <${smtp.config.fromEmail}>`,
      to,
      subject,
      html,
    })
    return info.messageId
  } catch (error) {
    console.error('Error sending email:', error)
    return null
  }
}
