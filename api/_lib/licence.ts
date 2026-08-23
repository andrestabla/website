import crypto from 'node:crypto'

/**
 * Firma y verificación de códigos de licencia del plugin Learning Analytics.
 *
 * El formato es  LA1.<payload>.<firma>  con ambas partes en base64url sin
 * relleno, firmado con Ed25519. El plugin lleva la clave pública embebida y
 * verifica en local, por lo que la activación no depende de este servicio.
 */

export type LicencePayload = {
  /** Cliente. */
  c: string
  /** Huella del sitio, o "*" para cualquiera. */
  s: string
  /** Caducidad en segundos Unix; 0 = sin caducidad. */
  e: number
  /** Funcionalidades; ["*"] concede todo. */
  f: string[]
  /** Identificador de la licencia. */
  i: string
}

const PREFIX = 'LA1.'

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

/**
 * Clave privada Ed25519 en base64 (formato libsodium: 64 bytes).
 * Se toma de LICENCE_PRIVATE_KEY. Nunca debe llegar al cliente.
 */
function privateKey(): crypto.KeyObject {
  const raw = process.env.LICENCE_PRIVATE_KEY
  if (!raw) throw new Error('LICENCE_PRIVATE_KEY no está configurada')

  const bytes = Buffer.from(raw, 'base64')
  // libsodium concatena semilla (32) + clave pública (32); Node espera la semilla.
  if (bytes.length !== 64) throw new Error('LICENCE_PRIVATE_KEY debe tener 64 bytes')
  const seed = bytes.subarray(0, 32)

  // DER de una clave privada Ed25519 (PKCS#8) con la semilla incrustada.
  const der = Buffer.concat([
    Buffer.from('302e020100300506032b657004220420', 'hex'),
    seed,
  ])

  return crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })
}

/** Clave pública derivada, para comprobar que coincide con la del plugin. */
export function publicKeyBase64(): string {
  const raw = process.env.LICENCE_PRIVATE_KEY
  if (!raw) throw new Error('LICENCE_PRIVATE_KEY no está configurada')
  return Buffer.from(raw, 'base64').subarray(32, 64).toString('base64')
}

/** Firma un payload y devuelve el código listo para entregar al cliente. */
export function signLicence(payload: LicencePayload): string {
  const json = Buffer.from(JSON.stringify(payload), 'utf8')
  const signature = crypto.sign(null, json, privateKey())
  return `${PREFIX}${b64url(json)}.${b64url(signature)}`
}

/** Extrae el payload de un código sin comprobar la firma. Solo para mostrar. */
export function decodeLicence(code: string): LicencePayload | null {
  if (!code.startsWith(PREFIX)) return null
  const parts = code.slice(PREFIX.length).split('.')
  if (parts.length !== 2) return null
  try {
    return JSON.parse(fromB64url(parts[0]).toString('utf8')) as LicencePayload
  } catch {
    return null
  }
}

/** Normaliza una cadena a un tamaño máximo, o null si viene vacía. */
export function trimmed(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const clean = value.trim().slice(0, max)
  return clean.length ? clean : null
}
