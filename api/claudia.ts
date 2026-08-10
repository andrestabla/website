import { prisma } from './_lib/prisma.js'
import { getAdminSession } from './_lib/admin-auth.js'

type VercelRequest = any
type VercelResponse = any

/**
 * Puente remoto con Claudia (agente local en la Mac del profe Andrés).
 *
 * Dos identidades, ninguna intercambiable:
 *  - HUMANO  → sesión del ecosistema con 2FA y rol SUPERADMIN (encola y consulta).
 *  - EQUIPO  → token secreto CLAUDIA_DEVICE_TOKEN (toma trabajos y reporta).
 *
 * El equipo local nunca abre puertos: consulta esta cola hacia afuera.
 */

const DEVICE_ONLINE_MS = 45_000
const MAX_PROMPT = 4000

function readBody(req: VercelRequest): any {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return req.body ?? {}
}

/** Solo el superadministrador puede manejar la máquina en remoto. */
function requireOwner(req: VercelRequest, res: VercelResponse) {
  const session = getAdminSession(req)
  if (!session) {
    res.status(401).json({ ok: false, error: 'No autenticado' })
    return null
  }
  if (session.role !== 'SUPERADMIN') {
    res.status(403).json({ ok: false, error: 'Solo el propietario del equipo puede usar el control remoto' })
    return null
  }
  return session
}

/** El equipo local se identifica con un token compartido (nunca en el navegador). */
function isDevice(req: VercelRequest) {
  const expected = process.env.CLAUDIA_DEVICE_TOKEN
  if (!expected || expected.length < 24) return false
  const provided = String(req.headers?.['x-claudia-token'] ?? '')
  if (provided.length !== expected.length) return false
  // comparación en tiempo constante
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

async function deviceState() {
  const dev = await (prisma as any).claudiaDevice.findUnique({ where: { id: 'default' } }).catch(() => null)
  const online = !!dev && Date.now() - new Date(dev.lastSeen).getTime() < DEVICE_ONLINE_MS
  return { online, lastSeen: dev?.lastSeen ?? null, projects: dev?.projects ?? [] }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String(req.query?.action ?? readBody(req).action ?? '').trim()

  try {
    // ───────────────────────── lado EQUIPO (Claudia local) ─────────────────────────

    // Latido + toma del siguiente trabajo pendiente.
    if (action === 'poll') {
      if (!isDevice(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' })
      const body = readBody(req)

      await (prisma as any).claudiaDevice.upsert({
        where: { id: 'default' },
        update: { version: body.version ?? null, projects: body.projects ?? undefined },
        create: { id: 'default', version: body.version ?? null, projects: body.projects ?? [] },
      })

      const job = await (prisma as any).claudiaJob.findFirst({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      })
      if (!job) return res.status(200).json({ ok: true, job: null })

      const taken = await (prisma as any).claudiaJob.updateMany({
        where: { id: job.id, status: 'PENDING' }, // evita doble toma
        data: { status: 'TAKEN', takenAt: new Date() },
      })
      if (taken.count === 0) return res.status(200).json({ ok: true, job: null })

      return res.status(200).json({
        ok: true,
        job: { id: job.id, prompt: job.prompt, project: job.project },
      })
    }

    // Reporte del resultado de un trabajo.
    if (action === 'complete') {
      if (!isDevice(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' })
      const body = readBody(req)
      const id = String(body.id ?? '')
      if (!id) return res.status(400).json({ ok: false, error: 'id requerido' })
      await (prisma as any).claudiaJob.update({
        where: { id },
        data: {
          status: body.error ? 'ERROR' : 'DONE',
          result: String(body.result ?? body.error ?? '').slice(0, 20000),
          events: Array.isArray(body.events) ? body.events.slice(-60) : undefined,
          doneAt: new Date(),
        },
      })
      return res.status(200).json({ ok: true })
    }

    // ───────────────────────── lado HUMANO (navegador) ─────────────────────────

    if (action === 'enqueue') {
      const session = requireOwner(req, res)
      if (!session) return
      const body = readBody(req)
      const prompt = String(body.prompt ?? '').trim().slice(0, MAX_PROMPT)
      if (!prompt) return res.status(400).json({ ok: false, error: 'Mensaje vacío' })

      const state = await deviceState()
      const job = await (prisma as any).claudiaJob.create({
        data: {
          prompt,
          project: body.project ? String(body.project).slice(0, 200) : null,
          createdBy: session.username || session.userId,
        },
      })
      return res.status(200).json({ ok: true, job, deviceOnline: state.online })
    }

    if (action === 'status') {
      const session = requireOwner(req, res)
      if (!session) return
      const state = await deviceState()
      const jobs = await (prisma as any).claudiaJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: Math.min(30, Number(req.query?.limit) || 15),
      })
      return res.status(200).json({ ok: true, device: state, jobs })
    }

    if (action === 'cancel') {
      const session = requireOwner(req, res)
      if (!session) return
      const id = String(readBody(req).id ?? '')
      if (!id) return res.status(400).json({ ok: false, error: 'id requerido' })
      await (prisma as any).claudiaJob.updateMany({
        where: { id, status: { in: ['PENDING', 'TAKEN'] } },
        data: { status: 'CANCELLED', doneAt: new Date() },
      })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ ok: false, error: 'Acción desconocida' })
  } catch (error: any) {
    console.error('api/claudia error', error)
    return res.status(500).json({ ok: false, error: 'Error interno' })
  }
}
