import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        const services = await prisma.service.findMany()
        return res.status(200).json(services)
    }

    if (req.method === 'POST') {
        const service = await prisma.service.create({ data: req.body })
        return res.status(201).json(service)
    }

    if (req.method === 'PUT') {
        const { id, ...data } = req.body
        const service = await prisma.service.update({
            where: { id },
            data,
        })
        return res.status(200).json(service)
    }

    if (req.method === 'DELETE') {
        const { id } = req.query
        await prisma.service.delete({ where: { id: String(id) } })
        return res.status(204).end()
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
