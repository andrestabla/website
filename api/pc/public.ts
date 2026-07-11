import { prisma } from '../_lib/prisma.js'

type VercelRequest = any
type VercelResponse = any

const db = () => (prisma as any).pcBoard

/** Vista pública de solo lectura de un tablero compartido. Sin autenticación. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const token = String(req.query?.token || '').slice(0, 60)
  if (!token) return res.status(400).json({ ok: false, error: 'token requerido' })

  try {
    const board = await db().findUnique({ where: { shareToken: token } })
    if (!board || !board.shareEnabled) return res.status(404).json({ ok: false, error: 'Tablero no disponible' })
    res.setHeader('Cache-Control', 'public, max-age=30')
    return res.status(200).json({
      ok: true,
      board: {
        title: board.title,
        description: board.description || '',
        columns: board.columns || [],
        rows: board.rows || [],
        updatedAt: board.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('api/pc/public error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
