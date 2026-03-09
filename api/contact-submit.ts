import nodemailer from 'nodemailer'
import { prisma } from './_lib/prisma.js'
import { getGeoFromRequest, safeString } from './_lib/analytics.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from './_lib/integrations.js'
import { generateStyledEmail } from './_lib/email-templates.js'

type VercelRequest = any
type VercelResponse = any

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function dispatchWebhook(payload: any): Promise<{ sent: boolean; status: number | undefined }> {
  const url = process.env.CONTACT_FORM_WEBHOOK_URL
  if (!url) return { sent: false, status: undefined }
  const secret = process.env.CONTACT_FORM_WEBHOOK_SECRET || ''
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-contact-form-secret': secret } : {}),
    },
    body: JSON.stringify(payload),
  })
  return { sent: response.ok, status: response.status }
}

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
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const name = safeString(body?.name, 120) || ''
    const email = safeString(body?.email, 180) || ''
    const requirement = safeString(body?.requirement, 3000) || ''
    const context = safeString(body?.context, 40) || 'general'
    const serviceSlug = safeString(body?.serviceSlug, 120)
    const path = safeString(body?.path, 300)

    if (!name || !email || !requirement) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' })
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email' })
    }

    const geo = getGeoFromRequest(req)
    
    // Save Lead to Database for tracking
    let leadId = null
    try {
      const lead = await prisma.contactLead.create({
        data: {
          name,
          email,
          requirement,
          context,
          serviceSlug: serviceSlug || null,
          path: path || null,
          country: geo.country,
          region: geo.region,
          city: geo.city,
        }
      })
      leadId = lead.id
    } catch (dbErr) {
      console.error('Failed to save lead to DB:', dbErr)
    }

    await prisma.analyticsEvent.create({
      data: {
        visitorId: safeString(body?.visitorId, 120) || `contact_${Date.now().toString(36)}`,
        sessionId: safeString(body?.sessionId, 120) || undefined,
        eventType: 'contact_form_submit',
        path: path || undefined,
        pageTitle: 'Contact Form',
        sectionId: 'contact-form',
        country: geo.country,
        region: geo.region,
        city: geo.city,
        metadata: {
          name,
          email,
          requirement,
          context,
          serviceSlug: serviceSlug || null,
          leadId,
        },
      },
    })

    let webhook = { sent: false as boolean, status: undefined as number | undefined }
    try {
      webhook = await dispatchWebhook({
        submittedAt: new Date().toISOString(),
        name,
        email,
        requirement,
        context,
        serviceSlug: serviceSlug || null,
        path: path || null,
        geo,
        leadId,
      })
    } catch {
      webhook = { sent: false, status: undefined }
    }

    // SMTP Notification
    let emailSent = false
    try {
      const smtp = await getSmtpConfig()

      if (smtp) {
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

        // Try to fetch the site email from the main snapshot
        let siteEmail = 'andrestablarico@gmail.com' 
        try {
          const mainSnapshot = await prisma.cmsSnapshot.findUnique({ where: { id: 'main' } })
          if (mainSnapshot?.data && (mainSnapshot.data as any).site?.contactEmail) {
            siteEmail = (mainSnapshot.data as any).site.contactEmail
          }
        } catch (e) {
          console.error('Failed to fetch siteEmail from CMS:', e)
        }

        const fromName = smtp.fromName || 'Notificaciones'
        const fromMail = `${fromName} <${smtp.fromEmail}>`
        
        // 1. Admin notification email
        const adminSubject = `Nuevo lead: ${name}`
        const adminHtml = generateStyledEmail({
          title: 'Nuevo Lead de Contacto',
          preheader: `Nuevo mensaje de ${name} para AlgoritmoT`,
          contentHtml: `
            <p style="font-size: 18px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">¡Nuevo contacto recibido!</p>
            <p>Has recibido un nuevo mensaje a través del formulario del sitio web. Aquí tienes los detalles:</p>
            
            <table class="data-table">
              <tr><td class="label">Nombre</td><td>${name}</td></tr>
              <tr><td class="label">Email</td><td>${email}</td></tr>
              <tr><td class="label">Contexto</td><td>${context}</td></tr>
              ${serviceSlug ? `<tr><td class="label">Servicio</td><td>${serviceSlug}</td></tr>` : ''}
              <tr><td class="label">Ubicación</td><td>${geo.city || 'Desconocida'}, ${geo.country || ''}</td></tr>
              <tr><td class="label">Página</td><td>${path || '/'}</td></tr>
              ${leadId ? `<tr><td class="label">ID Registro</td><td>${leadId}</td></tr>` : ''}
            </table>

            <div style="margin-top: 32px; padding: 24px; background-color: #f1f5f9; border-left: 4px solid #2563eb;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: bold; margin-bottom: 8px;">Mensaje / Requerimiento</p>
              <p style="margin: 0; white-space: pre-wrap; color: #0f172a;">${requirement}</p>
            </div>
            
            <div style="margin-top: 32px; text-align: center;">
              <a href="mailto:${email}" class="button">Responder ahora</a>
            </div>
          `
        })

        try {
          const res = await transporter.sendMail({
            from: fromMail,
            to: siteEmail,
            replyTo: email,
            subject: adminSubject,
            html: adminHtml,
            text: `Nuevo lead de: ${name}\nEmail: ${email}\n\nRequerimiento:\n${requirement}`,
          })
          console.log(`Admin notification SENT to ${siteEmail}: ${res.messageId}`)
          emailSent = true
        } catch (adminErr) {
          console.error('Failed to send admin notification:', adminErr)
        }

        // 2. User confirmation email (copy)
        const userSubject = `Confirmación de solicitud - AlgoritmoT`
        const userHtml = generateStyledEmail({
          title: 'Recibimos tu solicitud',
          preheader: `Gracias por contactar con AlgoritmoT. Hemos recibido tu mensaje.`,
          contentHtml: `
            <p style="font-size: 18px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">Hola ${name.split(' ')[0]},</p>
            <p>Gracias por contactar con <span class="accent-text">AlgoritmoT</span>. Hemos recibido correctamente tu solicitud y un especialista se pondrá en contacto contigo pronto.</p>
            
            <p style="margin-top: 24px;">Adjuntamos una copia de la información que nos enviaste:</p>
            
            <table class="data-table">
              <tr><td class="label">Nombre</td><td>${name}</td></tr>
              <tr><td class="label">Email</td><td>${email}</td></tr>
              <tr><td class="label">Contexto</td><td>${context}</td></tr>
              ${serviceSlug ? `<tr><td class="label">Servicio de interés</td><td>${serviceSlug}</td></tr>` : ''}
            </table>

            <div style="margin-top: 32px; padding: 24px; background-color: #f8fafc; border: 1px dashed #e2e8f0;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: bold; margin-bottom: 8px;">Tu mensaje</p>
              <p style="margin: 0; color: #475569; font-style: italic;">"${requirement}"</p>
            </div>
            
            <p style="margin-top: 32px;">Si necesitas añadir algún detalle adicional, simplemente responde a este correo.</p>
            
            <p style="margin-top: 16px;">Atentamente,<br><strong>El equipo de AlgoritmoT</strong></p>
          `
        })

        try {
          const res = await transporter.sendMail({
            from: fromMail,
            to: email,
            subject: userSubject,
            html: userHtml,
          })
          console.log(`User confirmation sent to ${email}: ${res.messageId}`)
        } catch (userErr) {
          console.error('Failed to send user confirmation:', userErr)
        }
      }
    } catch (err) {
      console.error('SMTP transport setup failed:', err)
    }

    return res.status(200).json({ ok: true, webhook, emailSent, leadId })
  } catch (error) {
    console.error('api/contact-submit error', error)
    return res.status(500).json({ ok: false, error: 'Contact submit failed' })
  }
}
