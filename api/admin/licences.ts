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
        data: { licenceId, customer, contactEmail, siteHash, features, code, expiresAt, notes },
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
