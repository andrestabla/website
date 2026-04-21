import { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../_lib/prisma.js'
import { requireAdminSession } from '../../_lib/admin-auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = requireAdminSession(req, res)
  if (!admin) return

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
