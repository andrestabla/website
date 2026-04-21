import { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../_lib/prisma'
import { createCalendarEvent } from '../_lib/google-calendar'

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

    // 4. (Optional) Send email confirmation via SMTP
    // This could be added here using existing email templates if available.

    return res.status(200).json({ success: true, appointment })
  } catch (error) {
    console.error('Error reserving slot:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
