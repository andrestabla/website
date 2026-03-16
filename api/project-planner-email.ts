import type { VercelRequest, VercelResponse } from '@vercel/node'
import nodemailer from 'nodemailer'
import { prisma } from './_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from './_lib/integrations.js'
import { generateStyledEmail } from './_lib/email-templates.js'
import { getGeoFromRequest, safeString } from './_lib/analytics.js'
import { formatUsd, getComplexityLabel, type MethodologyChoice } from './_lib/project-planner.js'

async function getSmtpConfig() {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data))
  if (!integrations.smtp.enabled) return null
  const cfg = integrations.smtp.config
  if (!cfg.host || !cfg.user || !cfg.password || !cfg.fromEmail) return null
  return cfg
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildProposalHtml(proposals: any) {
  const blocks: string[] = []

  if (proposals?.selfService) {
    if (proposals.selfService.eligible) {
      blocks.push(`
        <div style="margin-top:24px;padding:24px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;">
          <h3 style="margin:0 0 12px 0;color:#0f172a;font-size:18px;">Ruta 1 · Hazlo tú mismo</h3>
          <p style="margin:0 0 10px 0;color:#334155;">${escapeHtml(proposals.selfService.reason || '')}</p>
          <table style="width:100%;margin-top:12px;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Sesiones sugeridas</td><td style="padding:8px 0;color:#0f172a;font-weight:700;">${proposals.selfService.sessions}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Valor por sesión</td><td style="padding:8px 0;color:#0f172a;font-weight:700;">${formatUsd(proposals.selfService.ratePerSessionUsd)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Inversión estimada</td><td style="padding:8px 0;color:#0f172a;font-weight:700;">${formatUsd(proposals.selfService.investmentUsd)}</td></tr>
          </table>
          <p style="margin:14px 0 0 0;color:#475569;line-height:1.6;">${escapeHtml(proposals.selfService.note || '')}</p>
        </div>
      `)
    } else {
      blocks.push(`
        <div style="margin-top:24px;padding:24px;background:#fff7ed;border:1px solid #fdba74;border-radius:16px;">
          <h3 style="margin:0 0 12px 0;color:#0f172a;font-size:18px;">Ruta 1 · Hazlo tú mismo</h3>
          <p style="margin:0;color:#334155;line-height:1.6;">${escapeHtml(proposals.selfService.reason || '')}</p>
        </div>
      `)
    }
  }

  if (proposals?.doneForYou) {
    blocks.push(`
      <div style="margin-top:24px;padding:24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;">
        <h3 style="margin:0 0 12px 0;color:#0f172a;font-size:18px;">Ruta 2 · AlgoritmoT lo hace por ti</h3>
        <table style="width:100%;margin-top:12px;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Tiempo estimado</td><td style="padding:8px 0;color:#0f172a;font-weight:700;">${escapeHtml(proposals.doneForYou.timeline)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Inversión estimada</td><td style="padding:8px 0;color:#0f172a;font-weight:700;">${formatUsd(proposals.doneForYou.investmentUsd)}</td></tr>
        </table>
        <p style="margin:14px 0 0 0;color:#475569;line-height:1.6;">${escapeHtml(proposals.doneForYou.note || '')}</p>
      </div>
    `)
  }

  return blocks.join('')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const name = safeString(body.name, 160)
    const email = safeString(body.email, 320)?.toLowerCase()
    const industryLabel = safeString(body.industryLabel, 160)
    const needSummary = safeString(body.needSummary, 2000)
    const methodology = safeString(body.methodology, 80) as MethodologyChoice | undefined
    const complexity = safeString(body.complexity, 40)
    const complexityLabel = safeString(body.complexityLabel, 80) || (complexity ? getComplexityLabel(complexity as any) : undefined)
    const visitorId = safeString(body.visitorId, 120) || 'project-planner'
    const sessionId = safeString(body.sessionId, 120)
    const proposals = body.proposals && typeof body.proposals === 'object' ? body.proposals : null

    if (!name || !email || !needSummary || !methodology || !proposals) {
      return res.status(400).json({ error: 'Faltan datos para enviar la propuesta.' })
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
    const subject = `Tu propuesta inicial de proyecto · ${name}`

    const html = generateStyledEmail({
      title: 'Planifico mi proyecto',
      preheader: 'Ya tienes una propuesta inicial para elegir el mejor camino de ejecución.',
      contentHtml: `
        <p style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:16px;">Hola, ${escapeHtml(name)}.</p>
        <p>Ya preparamos una primera orientación para tu proyecto. Esta lectura inicial te ayuda a entender complejidad, caminos posibles y rango de inversión antes de una cotización formal.</p>
        <div style="margin-top:24px;padding:24px;background:#f8fafc;border-left:4px solid #2563eb;">
          <h3 style="margin:0 0 12px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Resumen del caso</h3>
          <p style="margin:0;color:#334155;line-height:1.7;">${escapeHtml(needSummary)}</p>
        </div>
        <table style="width:100%;margin-top:24px;border-collapse:collapse;">
          <tr><td style="padding:10px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Industria</td><td style="padding:10px 0;color:#0f172a;font-weight:700;">${escapeHtml(industryLabel || 'No informada')}</td></tr>
          <tr><td style="padding:10px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Complejidad</td><td style="padding:10px 0;color:#0f172a;font-weight:700;">${escapeHtml(complexityLabel || 'Por definir')}</td></tr>
        </table>
        ${buildProposalHtml(proposals)}
        <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#475569;line-height:1.7;">Si quieres, podemos convertir esta lectura en una cotización formal y un plan de ejecución detallado con alcance, fases e integraciones.</p>
          <a href="https://wa.me/573044544525" style="display:inline-block;margin-top:16px;background:#0f172a;color:#ffffff;padding:14px 24px;text-decoration:none;border-radius:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;font-size:12px;">Contactar a un asesor</a>
        </div>
      `,
    })

    await transporter.sendMail({
      from: fromMail,
      to: email,
      subject,
      html,
    })

    const geo = getGeoFromRequest(req)

    await prisma.contactLead.create({
      data: {
        name,
        email,
        requirement: `Planifico mi proyecto\nMetodología: ${methodology}\nComplejidad: ${complexityLabel || complexity || 'Sin definir'}\nResumen: ${needSummary}`,
        context: 'planifico-mi-proyecto',
        serviceSlug: 'planifico-mi-proyecto',
        path: '/planifico-mi-proyecto',
        country: geo.country,
        region: geo.region,
        city: geo.city,
        status: 'pending',
      },
    })

    try {
      await prisma.analyticsEvent.create({
        data: {
          visitorId,
          sessionId,
          eventType: 'project_planner_email_sent',
          path: '/planifico-mi-proyecto',
          pageTitle: 'Planifico mi proyecto',
          sectionId: 'planner-results',
          country: geo.country,
          region: geo.region,
          city: geo.city,
          metadata: {
            email,
            methodology,
            complexity,
            complexityLabel,
          },
        },
      } as any)
    } catch (analyticsError) {
      console.error('project-planner-email analytics error', analyticsError)
    }

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('project-planner-email error', error)
    return res.status(500).json({ error: 'No pudimos enviar la propuesta por correo.' })
  }
}
