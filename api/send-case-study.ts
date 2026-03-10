import type { VercelRequest, VercelResponse } from '@vercel/node'
import nodemailer from 'nodemailer'
import { prisma } from './_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from './_lib/integrations.js'
import { generateStyledEmail } from './_lib/email-templates.js'

async function getSmtpConfig() {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data))
  if (!integrations.smtp.enabled) return null
  const cfg = integrations.smtp.config
  if (!cfg.host || !cfg.user || !cfg.password || !cfg.fromEmail) return null
  return cfg
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, caseStudy, industry, processName } = req.body

    if (!email || !caseStudy) {
      return res.status(400).json({ error: 'Email and case study data are required' })
    }

    const smtp = await getSmtpConfig()
    if (!smtp) {
      return res.status(503).json({ error: 'Servicio de correo no configurado' })
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

    const fromName = smtp.fromName || 'Algoritmo T'
    const fromMail = `${fromName} <${smtp.fromEmail}>`
    
    const subject = `Tu Propuesta de Transformación Digital: ${caseStudy.title}`
    
    const html = generateStyledEmail({
      title: caseStudy.title,
      preheader: `Propuesta personalizada para ${industry} - ${processName}`,
      contentHtml: `
        <p style="font-size: 18px; font-weight: bold; color: #0f172a; margin-bottom: 16px;">Hola,</p>
        <p>Aquí tienes la propuesta de arquitectura y transformación digital generada específicamente para tu caso en el sector <strong>${industry}</strong> para el proceso de <strong>${processName}</strong>.</p>
        
        <div style="margin-top: 32px; padding: 24px; background-color: #f8fafc; border-left: 4px solid #10b981;">
          <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px;">${caseStudy.title}</h2>
          <p style="color: #475569; line-height: 1.6;">${caseStudy.challenge}</p>
        </div>

        <div style="margin-top: 24px; padding: 24px; background-color: #f1f5f9; border-radius: 12px;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b;">Nuestra Solución Sugerida</h3>
          <p style="color: #0f172a; line-height: 1.6;">${caseStudy.solution}</p>
        </div>

        <div style="margin-top: 24px; padding: 24px; background-color: #064e3b; border-radius: 12px; color: #ecfdf5;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #34d399;">Impacto Proyectado</h3>
          <p style="margin: 0; font-size: 18px; font-weight: 500;">${caseStudy.results}</p>
        </div>

        ${caseStudy.tangibleProducts ? `
          <div style="margin-top: 32px;">
            <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 16px;">Productos Tangibles a Entregar</h3>
            <ul style="padding-left: 20px; color: #475569;">
              ${caseStudy.tangibleProducts.map((p: string) => `<li style="margin-bottom: 8px;">${p}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div style="margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; pt-32;">
          <p style="color: #64748b; font-size: 14px;">¿Quieres profundizar en esta arquitectura con un consultor senior?</p>
          <a href="https://wa.me/573044544525" style="display: inline-block; background-color: #0f172a; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">Agendar Consulta Técnica</a>
        </div>
      `
    })

    await transporter.sendMail({
      from: fromMail,
      to: email,
      subject: subject,
      html: html,
    })

    return res.status(200).json({ success: true, message: 'Email enviado correctamente' })
  } catch (error: any) {
    console.error('Email sending error:', error)
    return res.status(500).json({ error: 'Error al enviar el correo' })
  }
}
