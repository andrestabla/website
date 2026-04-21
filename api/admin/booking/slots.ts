import { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../_lib/prisma.js'
import { verifyToken } from '../../_lib/admin-auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await verifyToken(req)
  if (!admin) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const slots = await prisma.appointmentSlot.findMany({
      orderBy: { startTime: 'asc' },
    })
    return res.status(200).json(slots)
  }

  if (req.method === 'POST') {
    const { startTime, endTime } = req.body
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
