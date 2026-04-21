import { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../_lib/prisma.js'
import { requireAdminSession } from '../../_lib/admin-auth.js'
import { sendEmail } from '../../_lib/email.js'
import { generateStyledEmail } from '../../_lib/email-templates.js'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { updateCalendarEvent, deleteCalendarEvent } from '../../_lib/google-calendar.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = requireAdminSession(req, res)
  if (!admin) return

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'Missing id' })

    const appointment = await prisma.appointment.findUnique({
      where: { id: String(id) },
    })

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' })

    // 1. Free up the slot
    await prisma.appointmentSlot.updateMany({
      where: {
        startTime: appointment.startTime,
        endTime: appointment.endTime,
      },
      data: { isBooked: false },
    })

    // 2. Delete Google Calendar event if exists
    if (appointment.googleEventId) {
      await deleteCalendarEvent(appointment.googleEventId)
    }

    await prisma.appointment.delete({
      where: { id: String(id) },
    })

    return res.status(200).json({ success: true })
  }

  if (req.method === 'PATCH') {
    const { id, ...data } = req.body
    if (!id) return res.status(400).json({ error: 'Missing id' })

    const appointment = await prisma.appointment.update({
      where: { id: String(id) },
      data,
    })

    // 2. Update Google Calendar event if exists
    if (appointment.googleEventId) {
      await updateCalendarEvent({
        eventId: appointment.googleEventId,
        summary: `Cita AlgoritmoT: ${appointment.name} (${appointment.company})`,
        description: `
          Nombre: ${appointment.name}
          Email: ${appointment.email}
          Empresa: ${appointment.company}
          Cargo: ${appointment.role}
          Sector: ${appointment.industry}
          Empleados: ${appointment.employeeCount}
          Sitio Web: ${appointment.website || 'N/A'}
          
          Mensaje:
          ${appointment.message}
        `.trim(),
        startTime: new Date(appointment.startTime),
        endTime: new Date(appointment.endTime),
      })
    }

    return res.status(200).json(appointment)
  }

  if (req.method === 'POST') {
    const { id, action } = req.body
    if (!id) return res.status(400).json({ error: 'Missing id' })

    if (action === 'resend') {
      const appointment = await prisma.appointment.findUnique({
        where: { id: String(id) },
      })

      if (!appointment) return res.status(404).json({ error: 'Appointment not found' })

      const formattedDate = format(new Date(appointment.startTime), "EEEE d 'de' MMMM", { locale: es })
      const formattedTime = format(new Date(appointment.startTime), "HH:mm")

      const emailHtml = generateStyledEmail({
        title: '¡Cita Confirmada!',
        preheader: `Recordatorio: Tu cita con AlgoritmoT para el ${formattedDate} ha sido confirmada.`,
        contentHtml: `
          <h2 style="color: #0f172a; margin-top: 0;">Hola, ${appointment.name}</h2>
          <p>Este es un reenvío de la confirmación de tu cita para conversar sobre escalabilidad.</p>
          
          <div style="background-color: #f1f5f9; padding: 24px; margin: 30px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: bold;">Detalles de la cita:</p>
            <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: 900; color: #0f172a;">
              ${formattedDate} a las ${formattedTime} (hora local)
            </p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">La reunión se realizará vía Google Meet.</p>
          </div>

          <p>Si no has recibido la invitación de Google Calendar, por favor revisa tu carpeta de Spam.</p>
          
          <p style="margin-top: 30px;">Nos vemos pronto,<br><strong>El equipo de AlgoritmoT</strong></p>
        `
      })

      await sendEmail({
        to: appointment.email,
        subject: `Reenvío: Cita Confirmada: AlgoritmoT - ${formattedDate}`,
        html: emailHtml,
      })

      return res.status(200).json({ success: true })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
