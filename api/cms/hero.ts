import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        const hero = await prisma.hero.findFirst()
        return res.status(200).json(hero)
    }

    if (req.method === 'PUT') {
        const { id, ...data } = req.body
        const hero = await prisma.hero.upsert({
            where: { id: id || 'current-hero' },
            update: data,
            create: { ...data, id: 'current-hero' },
        })
        return res.status(200).json(hero)
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
