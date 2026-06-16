import type { VercelRequest, VercelResponse } from '@vercel/node'
import nodemailer from 'nodemailer'
import { prisma } from '../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from '../_lib/integrations.js'
import { generateStyledEmail } from '../_lib/email-templates.js'
import { getGeoFromRequest, safeString } from '../_lib/analytics.js'
import { formatUsd, formatUsdRange, getHeadcountLabel, getMaturityLabel } from '../_lib/simulator.js'

async function getSmtpConfig() {
  const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data))
  if (!integrations.smtp.enabled) return null
  const cfg = integrations.smtp.config
  if (!cfg.host || !cfg.user || !cfg.password || !cfg.fromEmail) return null
  return cfg
}

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

function buildProposalHtml(proposal: any, sector: string, orgType: string, headcount: string): string {
  const phases = Array.isArray(proposal?.phases) ? proposal.phases : []
  const totalProject = proposal?.totalProject || proposal?.total || {}
  const monthly = proposal?.monthly || {}
  const maturity = proposal?.maturity || ''
  const processes = proposal?.processes || {}
  const solutions = proposal?.solutions || {}

  const phasesHtml = phases
    .map((phase: any) => {
      const inv = phase?.investment || {}
      const interventions = Array.isArray(phase?.interventions) ? phase.interventions : []
      const products = Array.isArray(phase?.products) ? phase.products : []
      const money = phase?.recurring
        ? `${formatUsdRange(inv.min || 0, inv.max || 0)} / mes`
        : formatUsdRange(inv.min || 0, inv.max || 0)
      return `
        <div style="margin-top: 24px; padding: 24px; background-color: #f8fafc; border-left: 4px solid #2563eb;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: bold;">Fase ${phase.index} · ${escapeHtml(phase.tagline)}</div>
          <h3 style="margin: 6px 0 10px 0; font-size: 18px; color: #0f172a;">${escapeHtml(phase.name)}${phase.basis ? ` <span style="font-size: 12px; color: #64748b; font-weight: 500;">(${escapeHtml(phase.basis)})</span>` : ''}</h3>
          ${phase.whatWeDo ? `<p style="color: #475569; line-height: 1.6; margin: 0 0 8px 0;"><strong style="color:#0f172a;">Qué se hace:</strong> ${escapeHtml(phase.whatWeDo)}</p>` : ''}
          ${phase.howWeDo ? `<p style="color: #475569; line-height: 1.6; margin: 0 0 14px 0;"><strong style="color:#0f172a;">Cómo se hace:</strong> ${escapeHtml(phase.howWeDo)}</p>` : `<p style="color: #475569; line-height: 1.6; margin: 0 0 14px 0;">${escapeHtml(phase.description)}</p>`}
          <p style="margin: 0 0 14px 0; font-size: 15px; color: #0f172a;"><strong>Inversión estimada:</strong> ${escapeHtml(money)}</p>
          ${interventions.length ? `
            <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: bold; margin: 0 0 6px 0;">Intervenciones</p>
            <ul style="padding-left: 18px; color: #475569; margin: 0 0 14px 0;">
              ${interventions.map((i: string) => `<li style="margin-bottom: 4px;">${escapeHtml(i)}</li>`).join('')}
            </ul>` : ''}
          ${products.length ? `
            <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: bold; margin: 0 0 6px 0;">Productos específicos para tu organización</p>
            <ul style="padding-left: 18px; color: #475569; margin: 0;">
              ${products.map((p: string) => `<li style="margin-bottom: 4px;">${escapeHtml(p)}</li>`).join('')}
            </ul>` : ''}
          ${phase.kpi ? `<p style="margin: 14px 0 0 0; color: #2563eb; font-weight: bold;">Impacto esperado: ${escapeHtml(phase.kpi)}</p>` : ''}
        </div>`
    })
    .join('')

  return `
    <p style="font-size: 18px; font-weight: bold; color: #0f172a; margin-bottom: 16px;">${escapeHtml(proposal?.headline || 'Tu propuesta de transformación digital')}</p>
    <table class="data-table">
      <tr><td class="label">Sector</td><td>${escapeHtml(sector)}</td></tr>
      <tr><td class="label">Organización</td><td>${escapeHtml(orgType)}</td></tr>
      <tr><td class="label">Tamaño</td><td>${escapeHtml(getHeadcountLabel(headcount))}</td></tr>
      <tr><td class="label">Madurez</td><td>${escapeHtml(getMaturityLabel(maturity))}</td></tr>
      ${processes.min != null ? `<tr><td class="label">Procesos est.</td><td>${escapeHtml(`${processes.min}–${processes.max}`)}</td></tr>` : ''}
      ${solutions.min != null ? `<tr><td class="label">Soluciones est.</td><td>${escapeHtml(`${solutions.min}–${solutions.max}`)}</td></tr>` : ''}
    </table>
    ${proposal?.executiveSummary ? `<p style="color: #475569; line-height: 1.6; margin-top: 20px;">${escapeHtml(proposal.executiveSummary)}</p>` : ''}

    ${proposal?.diagnostic?.dimensions?.length ? `
      <div style="margin-top: 28px; padding: 24px; background-color: #f1f5f9; border-radius: 12px;">
        <div style="margin: 0 0 8px 0;">
          <span style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: bold;">Diagnóstico de Madurez Digital (MD-IA)</span>
          <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 999px; background-color: #fef3c7; color: #b45309; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em;">Ejemplo ilustrativo</span>
        </div>
        <p style="margin: 0 0 14px 0; padding: 10px 12px; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; color: #92400e; font-size: 12px; line-height: 1.5;">
          Estos valores son una <strong>estimación de referencia</strong> a partir del nivel de madurez que indicaste, <strong>no un diagnóstico real</strong>. El diagnóstico MD-IA real se realiza con encuestas a tu equipo, entrevistas y análisis de tus datos, comparando contra benchmarks de tu sector.
        </p>
        <p style="margin: 0 0 14px 0; color: #0f172a; font-weight: bold;">DQ ${escapeHtml(String(proposal.diagnostic.dq))} · AIQ ${escapeHtml(String(proposal.diagnostic.aiq))} <span style="color:#94a3b8; font-weight:500;">(referencial)</span></p>
        ${proposal.diagnostic.summary ? `<p style="margin: 0 0 14px 0; color: #475569; line-height: 1.6;">${escapeHtml(proposal.diagnostic.summary)}</p>` : ''}
        <table style="width:100%; border-collapse: collapse;">
          ${proposal.diagnostic.dimensions.map((d: any) => `<tr>
            <td style="padding: 6px 0; color: #475569; font-size: 14px;">${escapeHtml(d.name)}</td>
            <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: bold; font-size: 14px;">${escapeHtml(String(d.score))}/100 <span style="color:#94a3b8; font-weight:500;">(${escapeHtml(d.level)})</span></td>
          </tr>`).join('')}
        </table>
      </div>` : ''}

    <div style="margin-top: 28px; padding: 24px; background-color: #0f172a; color: #e2e8f0; text-align: center;">
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #93c5fd;">Inversión del proyecto (Fases 1–5)</div>
      <div style="font-size: 24px; font-weight: 900; color: #ffffff; margin-top: 8px;">${escapeHtml(formatUsdRange(totalProject.min || 0, totalProject.max || 0))}</div>
      ${monthly.min != null ? `<div style="font-size: 13px; color: #93c5fd; margin-top: 12px;">+ Mejora continua (Fase 6): <strong style="color:#fff;">${escapeHtml(formatUsd(monthly.min))} – ${escapeHtml(formatUsd(monthly.max))} / mes</strong></div>` : ''}
    </div>

    ${phasesHtml}

    <div style="margin-top: 36px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 28px;">
      <p style="color: #64748b; font-size: 14px;">¿Quieres profundizar esta propuesta con un consultor senior?</p>
      <a href="https://wa.me/573044544525" class="button">Agendar Consulta</a>
    </div>
    <p style="margin-top: 24px; font-size: 12px; color: #94a3b8; line-height: 1.5;">Las cifras son una estimación referencial basada en el sector, el tamaño y la madurez digital de tu organización. El diagnóstico (entrada desde ${escapeHtml(formatUsd(5000))}) precisa el alcance real, el número de procesos y las soluciones a desarrollar.</p>
  `
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { runId, proposal, name, phone, email, sector, orgType, headcount, visitorId, sessionId } = req.body || {}

    const leadName = safeString(name, 160)
    const leadPhone = safeString(phone, 60)
    const leadEmail = safeString(email, 320)?.toLowerCase()

    if (!leadName || !leadPhone || !leadEmail) {
      return res.status(400).json({ error: 'Nombre, número de contacto y correo electrónico son obligatorios' })
    }
    if (!proposal) {
      return res.status(400).json({ error: 'Falta la propuesta a enviar' })
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
      auth: { user: smtp.user, pass: smtp.password },
      tls: smtp.encryption === 'none' ? { rejectUnauthorized: false } : undefined,
    })

    const fromName = smtp.fromName || 'Algoritmo T'
    const fromMail = `${fromName} <${smtp.fromEmail}>`
    const subject = `Tu Propuesta de Transformación Digital — ${sector || 'Algoritmo T'}`

    const html = generateStyledEmail({
      title: proposal.headline || 'Propuesta de Transformación Digital',
      preheader: `Propuesta personalizada para ${sector || ''}`,
      contentHtml: buildProposalHtml(proposal, sector || '', orgType || '', headcount || ''),
    })

    await transporter.sendMail({ from: fromMail, to: leadEmail, subject, html })

    // Actualiza el registro del simulador con los datos de contacto del lead.
    try {
      if (runId) {
        await prisma.simulatorRun.update({
          where: { id: String(runId) },
          data: {
            leadName,
            leadPhone,
            leadEmail,
            status: 'sent',
            emailSentAt: new Date(),
          } as any,
        })
      }
    } catch (updateError) {
      console.error('simulator send run update failed', updateError)
    }

    try {
      const geo = getGeoFromRequest(req)
      await prisma.analyticsEvent.create({
        data: {
          visitorId: safeString(visitorId, 120) || 'simulador',
          sessionId: safeString(sessionId, 120),
          eventType: 'simulator_email_sent',
          path: '/empresas/simulador',
          pageTitle: 'Simulador de Transformación Digital',
          sectionId: 'simulador',
          country: geo.country,
          region: geo.region,
          city: geo.city,
          metadata: {
            runId: runId || null,
            name: leadName,
            phone: leadPhone,
            email: leadEmail,
            sector: safeString(sector, 160),
            orgType: safeString(orgType, 120),
            headcount: safeString(headcount, 40),
            investmentMin: proposal?.total?.min ?? null,
            investmentMax: proposal?.total?.max ?? null,
          },
        },
      } as any)
    } catch (analyticsError) {
      console.error('simulator send analytics log failed', analyticsError)
    }

    return res.status(200).json({ success: true, message: 'Propuesta enviada correctamente' })
  } catch (error: any) {
    console.error('simulator/send API Error:', error)
    return res.status(500).json({ error: 'Error al enviar el correo' })
  }
}
