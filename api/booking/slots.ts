import { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../_lib/prisma.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const now = new Date()
    const slots = await prisma.appointmentSlot.findMany({
      where: {
        startTime: {
          gt: now,
        },
        isBooked: false,
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    return res.status(200).json(slots)
  } catch (error) {
    console.error('Error fetching slots:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
