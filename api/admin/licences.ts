import { prisma } from '../_lib/prisma.js'
import { requireAdminSession } from '../_lib/admin-auth.js'
import { signLicence, decodeLicence, publicKeyBase64, trimmed, type LicencePayload } from '../_lib/licence.js'

type VercelRequest = any
type VercelResponse = any

/**
 * Administración de licencias del plugin Learning Analytics.
 *
 *   GET                 -> listado con su estado
 *   POST                -> emite una licencia y devuelve el código firmado
 *   PATCH  { id, action } -> revoca o restablece
 *
 * La clave privada solo vive aquí, en LICENCE_PRIVATE_KEY. El código firmado se
 * guarda para poder reenviárselo al cliente sin volver a firmarlo.
 */
/**
 * Consultas de IA que incluye cada plan, para toda su vigencia. No son por
 * mes: es una bolsa que se consume y que el cliente puede recargar.
 */
const CREDITOS_POR_PLAN: Record<number, number> = { 3: 20, 6: 50, 12: 100 }

/** Paquetes de recarga: consultas y precio en dólares. */
export const PAQUETES = [
  { credits: 10, usd: 10 },
  { credits: 20, usd: 18 },
  { credits: 50, usd: 40 },
  { credits: 100, usd: 80 },
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = requireAdminSession(req, res)
  if (!session) return

  try {
    if (req.method === 'GET') {
      const licences = await prisma.pluginLicence.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      })

      const now = Date.now()
      // Consumo del mes en curso, para ver de un vistazo qué licencia gasta.
      const period = new Date().toISOString().slice(0, 7)
      const usages = await prisma.pluginAiUsage.findMany({
        where: { period, licenceDbId: { in: licences.map((l) => l.id) } },
      })
      const usageBy = new Map(usages.map((u) => [u.licenceDbId, u]))
      return res.status(200).json({
        ok: true,
        publicKey: safePublicKey(),
        licences: licences.map((l) => ({
          id: l.id,
          licenceId: l.licenceId,
          customer: l.customer,
          contactEmail: l.contactEmail,
          siteHash: l.siteHash,
          features: l.features,
          code: l.code,
          issuedAt: l.issuedAt,
          expiresAt: l.expiresAt,
          revokedAt: l.revokedAt,
          notes: l.notes,
          lastCheckAt: l.lastCheckAt,
          lastVersion: l.lastVersion,
          checkCount: l.checkCount,
          aiEnabled: l.aiEnabled,
          aiCredits: l.aiCredits,
          aiUsedTotal: l.aiUsedTotal,
          aiModel: l.aiModel,
          // El consumo del mes en curso sigue interesando para ver el ritmo,
          // aunque la bolsa se cuente sobre toda la vigencia.
          aiUsedMonth: usageBy.get(l.id)?.calls ?? 0,
          aiChars: usageBy.get(l.id)?.chars ?? 0,
          status: l.revokedAt
            ? 'revoked'
            : l.expiresAt && l.expiresAt.getTime() < now
              ? 'expired'
              : 'active',
        })),
      })
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})

      const customer = trimmed(body?.customer, 160)
      if (!customer) {
        return res.status(400).json({ ok: false, error: 'El nombre del cliente es obligatorio' })
      }

      const siteHash = trimmed(body?.siteHash, 64) || '*'
      const contactEmail = trimmed(body?.contactEmail, 160)
      const notes = trimmed(body?.notes, 2000)
      const months = Number.isFinite(Number(body?.months)) ? Math.max(0, Number(body.months)) : 12
      // La IA nace apagada, pero con la bolsa que le corresponde al plan ya
      // cargada: encenderla es entonces un solo clic, sin recordar cifras.
      const creditos = CREDITOS_POR_PLAN[months] ?? 0

      const features: string[] = Array.isArray(body?.features) && body.features.length
        ? body.features.map((f: unknown) => String(f).slice(0, 40))
        : ['*']

      // Identificador correlativo y legible: LA-0001, LA-0002...
      const count = await prisma.pluginLicence.count()
      const licenceId = trimmed(body?.licenceId, 40)
        || `LA-${String(count + 1).padStart(4, '0')}`

      if (await prisma.pluginLicence.findUnique({ where: { licenceId } })) {
        return res.status(409).json({ ok: false, error: `La licencia ${licenceId} ya existe` })
      }

      const expiresAt = months > 0
        ? new Date(Date.now() + months * 30.44 * 24 * 3600 * 1000)
        : null

      const payload: LicencePayload = {
        c: customer,
        s: siteHash,
        e: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : 0,
        f: features,
        i: licenceId,
      }

      let code: string
      try {
        code = signLicence(payload)
      } catch (error) {
        return res.status(500).json({
          ok: false,
          error: 'No se pudo firmar: revise LICENCE_PRIVATE_KEY en el entorno',
        })
      }

      const licence = await prisma.pluginLicence.create({
        data: { licenceId, customer, contactEmail, siteHash, features, code, expiresAt, notes, aiCredits: creditos },
      })

      return res.status(201).json({ ok: true, licence, code })
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const id = trimmed(body?.id, 40)
      const action = trimmed(body?.action, 20)

      if (!id || !action) {
        return res.status(400).json({ ok: false, error: 'id y action son obligatorios' })
      }

      if (action === 'revoke') {
        const licence = await prisma.pluginLicence.update({
          where: { id },
          data: { revokedAt: new Date(), revokedNote: trimmed(body?.note, 500) },
        })
        return res.status(200).json({ ok: true, licence })
      }

      if (action === 'restore') {
        const licence = await prisma.pluginLicence.update({
          where: { id },
          data: { revokedAt: null, revokedNote: null },
        })
        return res.status(200).json({ ok: true, licence })
      }

      // La analítica conversacional corre con nuestra clave, así que la bolsa
      // de consultas es el freno de gasto y se fija aquí.
      if (action === 'ai') {
        const enabled = body?.aiEnabled === true
        const raw = Number(body?.aiCredits)
        const credits = Number.isFinite(raw) ? Math.min(100000, Math.max(0, Math.round(raw))) : 0
        const licence = await prisma.pluginLicence.update({
          where: { id },
          data: {
            aiEnabled: enabled,
            aiCredits: credits,
            aiModel: trimmed(body?.aiModel, 60) || null,
          },
        })
        return res.status(200).json({ ok: true, licence })
      }

      // Recarga: suma consultas a la bolsa y deja constancia de lo cobrado.
      // Sin ese rastro, el saldo de una licencia sería un número sin origen.
      if (action === 'credits') {
        const raw = Number(body?.credits)
        const credits = Number.isFinite(raw) ? Math.round(raw) : 0
        if (credits === 0) {
          return res.status(400).json({ ok: false, error: 'Indica cuántas consultas añadir' })
        }

        const paquete = PAQUETES.find((p) => p.credits === credits)
        const rawUsd = Number(body?.amountUsd)
        const amountUsd = Number.isFinite(rawUsd)
          ? Math.max(0, Math.round(rawUsd))
          : (paquete ? paquete.usd : 0)

        const [licence] = await prisma.$transaction([
          prisma.pluginLicence.update({
            where: { id },
            data: { aiCredits: { increment: credits } },
          }),
          prisma.pluginAiCredit.create({
            data: { licenceDbId: id, credits, amountUsd, note: trimmed(body?.note, 300) || null },
          }),
        ])
        return res.status(200).json({ ok: true, licence })
      }

      return res.status(400).json({ ok: false, error: 'Acción no reconocida' })
    }

    res.setHeader('Allow', 'GET, POST, PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('admin/licences', error)
    return res.status(500).json({ ok: false, error: 'Error interno' })
  }
}

/** Devuelve la clave pública, o null si el entorno no está configurado. */
function safePublicKey(): string | null {
  try {
    return publicKeyBase64()
  } catch {
    return null
  }
}

/** Se exporta para futuras pantallas que necesiten leer un código. */
export { decodeLicence }
