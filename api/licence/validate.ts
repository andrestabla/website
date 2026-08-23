import { prisma } from '../_lib/prisma.js'
import { trimmed } from '../_lib/licence.js'

type VercelRequest = any
type VercelResponse = any

/**
 * Revalidación periódica de una licencia del plugin Learning Analytics.
 *
 * Endpoint público: no autentica, porque lo llama la plataforma del cliente sin
 * credenciales. Solo revela si una licencia sigue vigente; no expone datos.
 *
 * Contrato:
 *   POST { licence, site, version } -> { status: "active" | "revoked" | "unknown" }
 *
 * Ante cualquier duda se responde "active": el plugin trata todo lo que no sea
 * "revoked" como vigente, y una respuesta errónea no debe dejar sin producto a
 * un cliente que pagó.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ status: 'unknown', error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})

    const licenceId = trimmed(body?.licence, 64)
    const siteHash = trimmed(body?.site, 64)
    const version = trimmed(body?.version, 32)

    if (!licenceId || !siteHash) {
      return res.status(400).json({ status: 'unknown', error: 'licence y site son obligatorios' })
    }

    const licence = await prisma.pluginLicence.findUnique({ where: { licenceId } })

    // Una licencia que no consta pudo emitirse fuera de este registro: se
    // responde "unknown", que el plugin no interpreta como revocación.
    if (!licence) {
      return res.status(200).json({ status: 'unknown' })
    }

    const revoked = Boolean(licence.revokedAt)
    const expired = licence.expiresAt ? licence.expiresAt.getTime() < Date.now() : false
    const outcome = revoked ? 'revoked' : 'active'

    const ip = String(
      req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || ''
    ).split(',')[0].trim().slice(0, 60)

    // Se registra la comprobación: da visibilidad de uso real y detecta un
    // mismo código revalidando desde varios sitios distintos.
    await prisma.$transaction([
      prisma.pluginLicenceCheck.create({
        data: {
          licenceDbId: licence.id,
          siteHash,
          version,
          outcome,
          ip: ip || null,
        },
      }),
      prisma.pluginLicence.update({
        where: { id: licence.id },
        data: {
          lastCheckAt: new Date(),
          lastVersion: version,
          checkCount: { increment: 1 },
        },
      }),
    ])

    return res.status(200).json({
      status: outcome,
      expired,
      expires: licence.expiresAt ? Math.floor(licence.expiresAt.getTime() / 1000) : 0,
    })
  } catch (error) {
    console.error('licence/validate', error)
    // Ante un fallo propio no se penaliza al cliente.
    return res.status(200).json({ status: 'unknown' })
  }
}
