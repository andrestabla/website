import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'POST') {
        const { password } = req.body

        // For now, let's allow a default admin user if none exists
        // or just check against a hardcoded value if DB is empty for initial setup
        const admin = await (prisma as any).adminUser.findFirst()

        if (admin) {
            if (password === admin.passwordHash) { // Simple check for now, should use bcrypt later
                return res.status(200).json({ token: 'session_active_' + Date.now() })
            }
        } else if (password === 'admin123') {
            // Auto-create first admin if DB is empty
            await (prisma as any).adminUser.create({
                return res.status(200).json({ token: 'session_active_' + Date.now() })
            }

        return res.status(401).json({ error: 'Protocolo de acceso denegado. Credencial inválida.' })
        }

        return res.status(405).json({ error: 'Method not allowed' })
    }
