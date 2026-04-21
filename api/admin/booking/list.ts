import { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../_lib/prisma'
import { verifyToken } from '../../_lib/admin-auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await verifyToken(req)
  if (!admin) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: { startTime: 'desc' },
    })
    return res.status(200).json(appointments)
  } catch (error) {
    console.error('Error listing appointments:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
