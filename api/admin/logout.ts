import { clearAdminSessionCookie } from '../_lib/admin-auth.js'

type VercelRequest = any
type VercelResponse = any

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  clearAdminSessionCookie(res)
  return res.status(200).json({ ok: true })
}

