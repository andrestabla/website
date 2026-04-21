import { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../_lib/prisma.js'
import { createCalendarEvent } from '../_lib/google-calendar.js'
import { sendEmail } from '../_lib/email.js'
import { generateStyledEmail } from '../_lib/email-templates.js'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

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
  } = req.body

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

    // 1. Create Appointment
    const appointment = await prisma.appointment.create({
      data: {
        name,
        email,
        company,
        role,
        industry,
        employeeCount,
        website,
        message,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
    })

    // 2. Mark Slot as Booked
    await prisma.appointmentSlot.update({
      where: { id: slotId },
      data: { isBooked: true },
    })

    // 3. Integrate with Google Calendar
    const googleEventId = await createCalendarEvent({
      summary: `Cita AlgoritmoT: ${name} (${company})`,
      description: `
        Nombre: ${name}
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
      title: '¡Cita Confirmada!',
      preheader: `Tu cita con AlgoritmoT para el ${formattedDate} ha sido confirmada.`,
      contentHtml: `
        <h2 style="color: #0f172a; margin-top: 0;">Hola, ${name}</h2>
        <p>Tu solicitud de cita para conversar sobre escalabilidad ha sido confirmada exitosamente.</p>
        
        <div style="background-color: #f1f5f9; padding: 24px; margin: 30px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: bold;">Detalles de la cita:</p>
          <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: 900; color: #0f172a;">
            ${formattedDate} a las ${formattedTime} (hora local)
          </p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">La reunión se realizará vía Google Meet.</p>
        </div>

        <p>En unos minutos deberías recibir una invitación de Google Calendar con el enlace de la reunión. Si no la ves, revisa tu carpeta de Spam.</p>
        
        <p>Estamos ansiosos por conversar y ayudarte a aterrizar tu primer frente de escalabilidad.</p>
        
        <p style="margin-top: 30px;">Nos vemos pronto,<br><strong>El equipo de AlgoritmoT</strong></p>
      `
    })

    await sendEmail({
      to: email,
      subject: `Cita Confirmada: AlgoritmoT - ${formattedDate}`,
      html: emailHtml,
    })

    return res.status(200).json({ success: true, appointment })
  } catch (error) {
    console.error('Error reserving slot:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
