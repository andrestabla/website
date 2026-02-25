import { prisma } from './_lib/prisma.js'
import { requireAdminSession } from './_lib/admin-auth.js'
import {
  INTEGRATIONS_SNAPSHOT_ID,
  applyServerEnv,
  maskSecrets,
  sanitizeIntegrations,
  defaultIntegrations,
} from './_lib/integrations.js'

type VercelRequest = any
type VercelResponse = any

function isMaskedSecret(value: unknown) {
  return typeof value === 'string' && value.includes('•')
}

function preserveMaskedSecrets(next: any, prev: any) {
  if (!prev || typeof prev !== 'object') return next
  const out = JSON.parse(JSON.stringify(next))

  const pairs: Array<[string[], string[]]> = [
    [['gemini', 'config', 'apiKey'], ['gemini', 'config', 'apiKey']],
    [['openai', 'config', 'apiKey'], ['openai', 'config', 'apiKey']],
    [['smtp', 'config', 'password'], ['smtp', 'config', 'password']],
    [['r2', 'config', 'secretAccessKey'], ['r2', 'config', 'secretAccessKey']],
    [['r2', 'config', 'accessKeyId'], ['r2', 'config', 'accessKeyId']],
  ]

  for (const [targetPath, prevPath] of pairs) {
    let targetRef = out
    let prevRef = prev
    for (let i = 0; i < targetPath.length - 1; i++) {
      targetRef = targetRef?.[targetPath[i]]
      prevRef = prevRef?.[prevPath[i]]
    }
    const key = targetPath[targetPath.length - 1]
    if (isMaskedSecret(targetRef?.[key]) && typeof prevRef?.[key] === 'string') {
      targetRef[key] = prevRef[key]
    }
  }

  return out
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      if (!requireAdminSession(req, res)) return
      const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
      const raw = snapshot?.data ?? defaultIntegrations
      const effective = applyServerEnv(sanitizeIntegrations(raw))
      return res.status(200).json({
        ok: true,
        data: maskSecrets(effective),
        source: snapshot ? 'db+env' : 'env',
      })
    }

    if (req.method === 'PUT') {
      if (!requireAdminSession(req, res)) return
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const current = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
      const mergedBody = preserveMaskedSecrets(body, current?.data ?? {})
      const sanitized = sanitizeIntegrations(mergedBody)
      await prisma.cmsSnapshot.upsert({
        where: { id: INTEGRATIONS_SNAPSHOT_ID },
        update: { data: sanitized as any },
        create: { id: INTEGRATIONS_SNAPSHOT_ID, data: sanitized as any },
      })
      const effective = applyServerEnv(sanitized)
      return res.status(200).json({ ok: true, data: maskSecrets(effective) })
    }

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('api/integrations error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
