import { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../_lib/prisma.js'
import { createCalendarEvent } from '../_lib/google-calendar.js'
import { sendEmail } from '../_lib/email.js'
import { generateStyledEmail } from '../_lib/email-templates.js'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Desde dónde llega la cita. Sin origen es la conversación de escalabilidad de /escalar-negocio; con
 * «gestion-estrategica» es una demostración pedida desde gestionestrategica.io. El origen queda marcado al
 * inicio del mensaje para que /admin/bookings lo distinga sin cambiar la base de datos.
 */
const ORIGENES = {
  'gestion-estrategica': {
    marca: '[Gestión Estratégica · demostración]',
    evento: 'Demostración Gestión Estratégica',
    asunto: 'Demostración de Gestión Estratégica confirmada',
    intro: 'Tu demostración de Gestión Estratégica quedó confirmada. Te mostraremos la plataforma y cómo la acompañan nuestros consultores.',
    cierre: 'Nos vemos en la demostración,',
    equipo: 'El equipo de Algoritmo T · 4Shine Empresas',
  },
} as const
type Origen = keyof typeof ORIGENES
const esOrigen = (x: unknown): x is Origen => typeof x === 'string' && Object.prototype.hasOwnProperty.call(ORIGENES, x)
const escapar = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    slotId,
    name,
    email,
    company,
    role,
    industry,
    employeeCount,
    website,
    message,
    origen: origenPedido,
  } = req.body ?? {}
  const origen = esOrigen(origenPedido) ? ORIGENES[origenPedido] : null

  if (!slotId || !name || !email || !company || !role || !industry || !message) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const slot = await prisma.appointmentSlot.findUnique({
      where: { id: slotId },
    })

    if (!slot || slot.isBooked) {
      return res.status(400).json({ error: 'Slot no longer available' })
    }

    // Se aparta el horario antes de crear la cita: si dos personas eligen el mismo, solo una lo obtiene.
    const apartado = await prisma.appointmentSlot.updateMany({
      where: { id: slotId, isBooked: false },
      data: { isBooked: true },
    })
    if (apartado.count === 0) {
      return res.status(400).json({ error: 'Slot no longer available' })
    }

    // 1. Create Appointment (si falla, el horario vuelve a quedar libre)
    const appointment = await prisma.appointment.create({
      data: {
        name,
        email,
        company,
        role,
        industry,
        employeeCount,
        website,
        message: origen ? `${origen.marca} ${message}` : message,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
    }).catch(async (error) => {
      await prisma.appointmentSlot.update({ where: { id: slotId }, data: { isBooked: false } }).catch(() => undefined)
      throw error
    })

    // 3. Integrate with Google Calendar
    const googleEventId = await createCalendarEvent({
      summary: `${origen ? origen.evento : 'Cita AlgoritmoT'}: ${name} (${company})`,
      description: `
        ${origen ? `Origen: ${origen.evento} (gestionestrategica.io)\n        ` : ''}Nombre: ${name}
        Email: ${email}
        Empresa: ${company}
        Cargo: ${role}
        Sector: ${industry}
        Empleados: ${employeeCount}
        Sitio Web: ${website || 'N/A'}
        
        Mensaje:
        ${message}
      `.trim(),
      startTime: slot.startTime,
      endTime: slot.endTime,
      userEmail: email,
      userName: name,
    })

    if (googleEventId) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { googleEventId },
      })
    }

    // 4. Send email confirmation via SMTP
    const formattedDate = format(new Date(slot.startTime), "EEEE d 'de' MMMM", { locale: es })
    const formattedTime = format(new Date(slot.startTime), "HH:mm")

    const emailHtml = generateStyledEmail({
      title: origen ? '¡Demostración confirmada!' : '¡Cita Confirmada!',
      preheader: origen ? `Tu demostración de Gestión Estratégica para el ${formattedDate} ha sido confirmada.` : `Tu cita con AlgoritmoT para el ${formattedDate} ha sido confirmada.`,
      contentHtml: `
        <h2 style="color: #0f172a; margin-top: 0;">Hola, ${escapar(name)}</h2>
        <p>${origen ? origen.intro : 'Tu solicitud de cita para conversar sobre escalabilidad ha sido confirmada exitosamente.'}</p>
        
        <div style="background-color: #f1f5f9; padding: 24px; margin: 30px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: bold;">Detalles de la cita:</p>
          <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: 900; color: #0f172a;">
            ${formattedDate} a las ${formattedTime} (hora local)
          </p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">La reunión se realizará vía Google Meet.</p>
        </div>

        <p>En unos minutos deberías recibir una invitación de Google Calendar con el enlace de la reunión. Si no la ves, revisa tu carpeta de Spam.</p>
        
        <p>${origen ? 'Si quieres, ten a mano las decisiones estratégicas que hoy le preocupan a tu equipo directivo: con ellas armamos la demostración.' : 'Estamos ansiosos por conversar y ayudarte a aterrizar tu primer frente de escalabilidad.'}</p>
        
        <p style="margin-top: 30px;">${origen ? origen.cierre : 'Nos vemos pronto,'}<br><strong>${origen ? origen.equipo : 'El equipo de AlgoritmoT'}</strong></p>
      `
    })

    await sendEmail({
      to: email,
      subject: origen ? `${origen.asunto} · ${formattedDate}` : `Cita Confirmada: AlgoritmoT - ${formattedDate}`,
      html: emailHtml,
    })

    return res.status(200).json({ success: true, appointment })
  } catch (error) {
    console.error('Error reserving slot:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
