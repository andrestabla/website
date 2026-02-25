import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        const config = await prisma.siteConfig.findFirst()
        return res.status(200).json(config)
    }

    if (req.method === 'PUT') {
        const { id, ...data } = req.body
        const config = await prisma.siteConfig.upsert({
            where: { id: id || 'site-config' },
            update: data,
            create: { ...data, id: 'site-config' },
        })
        return res.status(200).json(config)
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
