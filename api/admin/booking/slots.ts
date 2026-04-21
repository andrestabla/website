import { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../_lib/prisma.js'
import { requireAdminSession } from '../../_lib/admin-auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = requireAdminSession(req, res)
  if (!admin) return

  if (req.method === 'GET') {
    const slots = await prisma.appointmentSlot.findMany({
      orderBy: { startTime: 'asc' },
    })
    return res.status(200).json(slots)
  }

  if (req.method === 'POST') {
    const { startTime, endTime, bulk } = req.body
    
    if (bulk) {
      const { days, time, untilDate } = bulk
      // days is array of numbers [1,2,3...] where 1=Mon, 7=Sun
      // time is string "HH:mm"
      // untilDate is string "YYYY-MM-DD"
      
      const slotsToCreate = []
      let current = new Date()
      const end = new Date(untilDate)
      
      while (current <= end) {
        // getDay() is 0=Sun, 1=Mon...
        let dayNum = current.getDay()
        if (dayNum === 0) dayNum = 7 // normalize to 1-7
        
        if (days.includes(dayNum)) {
          const slotStart = new Date(current)
          const [hours, minutes] = time.split(':')
          slotStart.setHours(parseInt(hours), parseInt(minutes), 0, 0)
          
          if (slotStart > new Date()) {
            const slotEnd = new Date(slotStart.getTime() + 30 * 60000)
            slotsToCreate.push({
              startTime: slotStart,
              endTime: slotEnd
            })
          }
        }
        current.setDate(current.getDate() + 1)
      }
      
      if (slotsToCreate.length === 0) return res.status(400).json({ error: 'No slots to create' })
      
      // Create many, skip duplicates (approximate by searching first or just letting prisma error if unique constraint exists)
      // For simplicity, we'll just create them. If we want to avoid duplicates on the same startTime:
      const existing = await prisma.appointmentSlot.findMany({
        where: {
          startTime: {
            in: slotsToCreate.map(s => s.startTime)
          }
        },
        select: { startTime: true }
      })
      
      const existingTimes = new Set(existing.map(e => e.startTime.getTime()))
      const finalSlots = slotsToCreate.filter(s => !existingTimes.has(s.startTime.getTime()))

      if (finalSlots.length > 0) {
        await prisma.appointmentSlot.createMany({
          data: finalSlots
        })
      }

      return res.status(200).json({ count: finalSlots.length })
    }

    if (!startTime || !endTime) return res.status(400).json({ error: 'Missing times' })

    const slot = await prisma.appointmentSlot.create({
      data: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
    })
    return res.status(200).json(slot)
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'Missing id' })

    await prisma.appointmentSlot.delete({
      where: { id: String(id) },
    })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
