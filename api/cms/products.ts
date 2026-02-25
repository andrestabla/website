import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        const products = await prisma.product.findMany()
        return res.status(200).json(products)
    }

    if (req.method === 'POST') {
        const product = await prisma.product.create({ data: req.body })
        return res.status(201).json(product)
    }

    if (req.method === 'PUT') {
        const { id, ...data } = req.body
        const product = await prisma.product.update({
            where: { id },
            data,
        })
        return res.status(200).json(product)
    }

    if (req.method === 'DELETE') {
        const { id } = req.query
        await prisma.product.delete({ where: { id: String(id) } })
        return res.status(204).end()
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
