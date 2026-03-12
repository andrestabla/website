import { requireAdminSession } from './_lib/admin-auth.js'
import { getDefaultCmsSnapshot, sanitizeCmsSnapshot } from './_lib/cms.js'
import { prisma } from './_lib/prisma.js'
import { translateAndCache } from './_lib/translation.js'

type VercelRequest = any
type VercelResponse = any

const SNAPSHOT_ID = 'main'
const PREWARM_LANGS = ['en', 'fr'] as const
const CMS_SECTIONS = ['hero', 'services', 'products', 'site', 'design', 'homePage', 'siteArchitecture'] as const
type CmsSection = (typeof CMS_SECTIONS)[number]

type PrewarmTask = {
  key: string
  section: CmsSection
  payload: unknown
}

function parseJsonBody(req: VercelRequest) {
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
}

function getTargetSections(input: unknown): CmsSection[] {
  if (!Array.isArray(input) || input.length === 0) {
    return ['hero', 'services', 'products', 'site', 'homePage', 'siteArchitecture']
  }
  const set = new Set<CmsSection>()
  for (const section of input) {
    if (CMS_SECTIONS.includes(section)) set.add(section)
  }
  set.delete('design')
  return set.size > 0 ? Array.from(set) : ['hero', 'services', 'products', 'site', 'homePage', 'siteArchitecture']
}

function buildTasks(snapshot: any, sections: CmsSection[]): PrewarmTask[] {
  const tasks: PrewarmTask[] = []
  const selected = new Set(sections)

  if (selected.has('hero')) {
    tasks.push({ key: 'hero', section: 'hero', payload: snapshot.hero })
  }
  if (selected.has('services')) {
    tasks.push({ key: 'services', section: 'services', payload: snapshot.services })
  }
  if (selected.has('products')) {
    tasks.push({ key: 'products', section: 'products', payload: snapshot.products })
  }
  if (selected.has('site')) {
    tasks.push({
      key: 'site-fallback',
      section: 'site',
      payload: {
        name: snapshot?.site?.name || '',
        description: snapshot?.site?.description || '',
        contactAddress: snapshot?.site?.contactAddress || '',
      },
    })
  }
  if (selected.has('homePage')) {
    tasks.push({ key: 'homePage', section: 'homePage', payload: snapshot.homePage })
  }
  if (selected.has('siteArchitecture')) {
    const pages = Array.isArray(snapshot?.siteArchitecture?.pages) ? snapshot.siteArchitecture.pages : []
    for (const page of pages) {
      if (!page || typeof page !== 'object') continue
      const id = String((page as any).id || '')
      if (!id) continue
      tasks.push({
        key: `site-page:${id}`,
        section: 'siteArchitecture',
        payload: page,
      })
    }
  }

  return tasks
}

async function runWithConcurrency<T>(items: T[], limit: number, run: (item: T) => Promise<void>) {
  if (items.length === 0) return
  const safeLimit = Math.max(1, Math.min(limit, items.length))
  let cursor = 0
  const workers = Array.from({ length: safeLimit }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      await run(items[index])
    }
  })
  await Promise.all(workers)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    const session = requireAdminSession(req, res)
    if (!session) return

    const body = parseJsonBody(req)
    const sections = getTargetSections(body?.changedSections)

    const snapshotRow = await prisma.cmsSnapshot.findUnique({ where: { id: SNAPSHOT_ID } })
    const snapshot = sanitizeCmsSnapshot(snapshotRow?.data ?? getDefaultCmsSnapshot())
    const tasks = buildTasks(snapshot as any, sections)
    if (tasks.length === 0) {
      return res.status(200).json({ ok: true, data: { sections, tasks: 0, byLang: {} } })
    }

    const stats: Record<string, { requested: number; cached: number; generated: number; failed: number }> = {}
    PREWARM_LANGS.forEach((lang) => {
      stats[lang] = { requested: tasks.length, cached: 0, generated: 0, failed: 0 }
    })

    await runWithConcurrency(PREWARM_LANGS.flatMap((lang) => tasks.map((task) => ({ lang, task }))), 3, async ({ lang, task }) => {
      try {
        const result = await translateAndCache({
          targetLang: lang,
          payload: task.payload,
          mode: 'object',
        })
        if (result.cached) stats[lang].cached += 1
        else stats[lang].generated += 1
      } catch (error) {
        console.error(`cms-prewarm failed for ${lang}/${task.key}`, error)
        stats[lang].failed += 1
      }
    })

    await prisma.adminAuditLog.create({
      data: {
        actorUserId: session.userId,
        actorUsername: session.username,
        actorRole: session.role,
        action: 'CMS_TRANSLATION_PREWARM',
        resource: 'cms',
        resourceId: SNAPSHOT_ID,
        metadata: {
          sections,
          taskCount: tasks.length,
          byLang: stats,
        },
      },
    } as any)

    return res.status(200).json({
      ok: true,
      data: {
        sections,
        tasks: tasks.length,
        byLang: stats,
      },
    })
  } catch (error) {
    console.error('api/cms-prewarm error', error)
    return res.status(500).json({ ok: false, error: 'Prewarm failed' })
  }
}
