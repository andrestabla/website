import { prisma } from './_lib/prisma.js'
import { getDefaultCmsSnapshot, sanitizeCmsSnapshot } from './_lib/cms.js'
import { requireAdminSession } from './_lib/admin-auth.js'

type VercelRequest = any
type VercelResponse = any

const SNAPSHOT_ID = 'main'
const CMS_SECTIONS = ['hero', 'services', 'products', 'site', 'design', 'homePage'] as const
type CmsSection = (typeof CMS_SECTIONS)[number]

function parseJsonBody(req: VercelRequest) {
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      if (req.query?.history === '1') {
        if (!requireAdminSession(req, res)) return
        const section = typeof req.query?.section === 'string' ? req.query.section : undefined
        const limit = Math.min(Math.max(Number(req.query?.limit || 20), 1), 100)
        const where = {
          snapshotId: SNAPSHOT_ID,
          ...(section ? { section } : {}),
        }
        const [versions, audits] = await Promise.all([
          prisma.cmsSnapshotVersion.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
          } as any),
          prisma.adminAuditLog.findMany({
            where: { resource: 'cms' },
            orderBy: { createdAt: 'desc' },
            take: Math.min(limit, 30),
          } as any),
        ])
        return res.status(200).json({ ok: true, versions, audits })
      }

      const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: SNAPSHOT_ID } })
      if (!snapshot) {
        const data = getDefaultCmsSnapshot()
        await prisma.cmsSnapshot.create({ data: { id: SNAPSHOT_ID, data } })
        return res.status(200).json({ ok: true, data, source: 'default' })
      }
      return res.status(200).json({ ok: true, data: sanitizeCmsSnapshot(snapshot.data), source: 'db' })
    }

    if (req.method === 'PUT') {
      const session = requireAdminSession(req, res)
      if (!session) return
      const body = parseJsonBody(req)
      const data = sanitizeCmsSnapshot(body)
      const existing = await prisma.cmsSnapshot.findUnique({ where: { id: SNAPSHOT_ID } })
      const prevData = sanitizeCmsSnapshot(existing?.data ?? getDefaultCmsSnapshot())
      const changedSections = CMS_SECTIONS.filter((section) => {
        return JSON.stringify((prevData as any)[section]) !== JSON.stringify((data as any)[section])
      })

      if (changedSections.length > 0) {
        await prisma.$transaction([
          ...changedSections.map((section) =>
            prisma.cmsSnapshotVersion.create({
              data: {
                snapshotId: SNAPSHOT_ID,
                section,
                data: (prevData as any)[section],
                createdById: session.userId,
                createdBy: session.username,
                note: 'autosave',
              },
            } as any)
          ),
          prisma.adminAuditLog.create({
            data: {
              actorUserId: session.userId,
              actorUsername: session.username,
              actorRole: session.role,
              action: 'CMS_UPDATE',
              resource: 'cms',
              resourceId: SNAPSHOT_ID,
              metadata: {
                changedSections,
                hash: JSON.stringify(changedSections),
              },
            },
          } as any,
        ])
      }

      await prisma.cmsSnapshot.upsert({
        where: { id: SNAPSHOT_ID },
        update: { data },
        create: { id: SNAPSHOT_ID, data },
      })
      return res.status(200).json({ ok: true, changedSections, savedAt: new Date().toISOString() })
    }

    if (req.method === 'POST') {
      const session = requireAdminSession(req, res)
      if (!session) return
      const body = parseJsonBody(req)
      if (body?.action !== 'rollback') {
        return res.status(400).json({ ok: false, error: 'Unsupported action' })
      }
      const versionId = String(body?.versionId || '')
      if (!versionId) return res.status(400).json({ ok: false, error: 'versionId required' })

      const version = await prisma.cmsSnapshotVersion.findUnique({ where: { id: versionId } } as any)
      if (!version || version.snapshotId !== SNAPSHOT_ID) {
        return res.status(404).json({ ok: false, error: 'Version not found' })
      }

      const current = await prisma.cmsSnapshot.findUnique({ where: { id: SNAPSHOT_ID } })
      const currentData = sanitizeCmsSnapshot(current?.data ?? getDefaultCmsSnapshot())
      const section = version.section as CmsSection
      if (!CMS_SECTIONS.includes(section)) {
        return res.status(400).json({ ok: false, error: 'Invalid section in version' })
      }

      const rollbackTarget = sanitizeCmsSnapshot({
        ...currentData,
        [section]: version.data,
      })

      await prisma.$transaction([
        prisma.cmsSnapshotVersion.create({
          data: {
            snapshotId: SNAPSHOT_ID,
            section,
            data: (currentData as any)[section],
            createdById: session.userId,
            createdBy: session.username,
            note: `rollback-from:${versionId}`,
          },
        } as any),
        prisma.cmsSnapshot.upsert({
          where: { id: SNAPSHOT_ID },
          update: { data: rollbackTarget },
          create: { id: SNAPSHOT_ID, data: rollbackTarget },
        }),
        prisma.adminAuditLog.create({
          data: {
            actorUserId: session.userId,
            actorUsername: session.username,
            actorRole: session.role,
            action: 'CMS_ROLLBACK',
            resource: 'cms',
            resourceId: SNAPSHOT_ID,
            section,
            metadata: { versionId },
          },
        } as any,
      ])

      return res.status(200).json({ ok: true, section, rolledBackToVersionId: versionId })
    }

    res.setHeader('Allow', 'GET, PUT, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('api/cms error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
