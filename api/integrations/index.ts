import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        const integrations = await prisma.integration.findMany()
        // Convert array to object key/value for frontend convenience
        const state = integrations.reduce((acc: any, curr: any) => {
            acc[curr.key] = {
                enabled: curr.enabled,
                status: curr.status,
                config: curr.config
            }
            return acc
        }, {})
        return res.status(200).json(state)
    }

    if (req.method === 'POST' || req.method === 'PUT') {
        const { key, enabled, status, config } = req.body
        const integration = await prisma.integration.upsert({
            where: { key },
            update: { enabled, status, config },
            create: { key, enabled, status, config },
        })
        return res.status(200).json(integration)
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
