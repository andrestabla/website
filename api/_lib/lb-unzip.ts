/**
 * Learning Builder · lectura de un ZIP, sin dependencias.
 *
 * Contrapartida de lb-zip.ts: aquel escribe paquetes SCORM, este abre los que
 * llegan. Se lee por el directorio central —el índice que el formato guarda al
 * final del archivo— y no recorriendo cabeceras desde el principio, porque es
 * lo único fiable cuando el ZIP se generó en streaming: en ese caso las
 * cabeceras locales dejan el tamaño en cero y lo publican después del dato.
 *
 * Solo se admiten los dos métodos que usa todo el mundo: almacenado (0) y
 * deflate (8). Cualquier otro se informa por su nombre en vez de devolver
 * basura silenciosamente.
 */
import zlib from 'node:zlib'

export type LbZipEntry = {
  /** Ruta dentro del paquete, con barras normales y sin barra inicial. */
  path: string
  bytes: Buffer
}

const SIG_END = 0x06054b50 // fin del directorio central
const SIG_END64_LOCATOR = 0x07064b50
const SIG_END64 = 0x06064b50
const SIG_CENTRAL = 0x02014b50

/** Un ZIP que no se puede abrir; el mensaje va dirigido a quien lo subió. */
export class LbZipError extends Error {}

function findEndOfCentralDirectory(buffer: Buffer): number {
  // El registro final mide 22 bytes más un comentario de hasta 64 KiB, así
  // que se busca hacia atrás desde el final y no más allá de ese límite.
  const floor = Math.max(0, buffer.length - 22 - 0xffff)
  for (let at = buffer.length - 22; at >= floor; at -= 1) {
    if (buffer.readUInt32LE(at) === SIG_END) return at
  }
  throw new LbZipError('El archivo no es un ZIP válido: no tiene directorio central.')
}

function decodePath(raw: Buffer, utf8Flag: boolean): string {
  // Sin el bit de UTF-8, el formato manda CP437; latin1 acierta en los
  // acentos, que es lo único que suele aparecer en nombres de archivo.
  return raw.toString(utf8Flag ? 'utf8' : 'latin1').replace(/\\/g, '/').replace(/^\/+/, '')
}

export function unzip(buffer: Buffer, options: { maxEntries?: number; maxTotalBytes?: number } = {}): LbZipEntry[] {
  const maxEntries = options.maxEntries ?? 2000
  const maxTotalBytes = options.maxTotalBytes ?? 200 * 1024 * 1024

  const endAt = findEndOfCentralDirectory(buffer)
  let count = buffer.readUInt16LE(endAt + 10)
  let centralAt = buffer.readUInt32LE(endAt + 16)

  // ZIP64: cuando el número de entradas o el desplazamiento no caben en los
  // campos de 16/32 bits, el valor real vive en el registro extendido.
  if (count === 0xffff || centralAt === 0xffffffff) {
    const locatorAt = endAt - 20
    if (locatorAt >= 0 && buffer.readUInt32LE(locatorAt) === SIG_END64_LOCATOR) {
      const end64At = Number(buffer.readBigUInt64LE(locatorAt + 8))
      if (buffer.readUInt32LE(end64At) === SIG_END64) {
        count = Number(buffer.readBigUInt64LE(end64At + 32))
        centralAt = Number(buffer.readBigUInt64LE(end64At + 48))
      }
    }
  }

  if (count > maxEntries) {
    throw new LbZipError(`El paquete trae ${count} archivos; el máximo admitido es ${maxEntries}.`)
  }

  const entries: LbZipEntry[] = []
  let total = 0
  let at = centralAt

  for (let index = 0; index < count; index += 1) {
    if (at + 46 > buffer.length || buffer.readUInt32LE(at) !== SIG_CENTRAL) {
      throw new LbZipError('El directorio central del ZIP está dañado.')
    }
    const flags = buffer.readUInt16LE(at + 8)
    const method = buffer.readUInt16LE(at + 10)
    let compressedSize = buffer.readUInt32LE(at + 20)
    const nameLength = buffer.readUInt16LE(at + 28)
    const extraLength = buffer.readUInt16LE(at + 30)
    const commentLength = buffer.readUInt16LE(at + 32)
    let localAt = buffer.readUInt32LE(at + 42)
    const path = decodePath(buffer.subarray(at + 46, at + 46 + nameLength), (flags & 0x800) !== 0)

    if (compressedSize === 0xffffffff || localAt === 0xffffffff) {
      // El campo extra 0x0001 lleva los valores de 64 bits, en orden fijo:
      // tamaño sin comprimir, comprimido, desplazamiento local.
      const extra = buffer.subarray(at + 46 + nameLength, at + 46 + nameLength + extraLength)
      let cursor = 0
      while (cursor + 4 <= extra.length) {
        const tag = extra.readUInt16LE(cursor)
        const size = extra.readUInt16LE(cursor + 2)
        if (tag === 0x0001) {
          let field = cursor + 4
          if (buffer.readUInt32LE(at + 24) === 0xffffffff) field += 8
          if (compressedSize === 0xffffffff) { compressedSize = Number(extra.readBigUInt64LE(field)); field += 8 }
          if (localAt === 0xffffffff) localAt = Number(extra.readBigUInt64LE(field))
          break
        }
        cursor += 4 + size
      }
    }

    at += 46 + nameLength + extraLength + commentLength

    // Las carpetas son entradas vacías terminadas en barra: no aportan nada.
    if (path.endsWith('/')) continue
    if (!path || path.includes('..')) continue

    if (localAt + 30 > buffer.length) throw new LbZipError(`«${path}» apunta fuera del archivo.`)
    const localNameLength = buffer.readUInt16LE(localAt + 26)
    const localExtraLength = buffer.readUInt16LE(localAt + 28)
    const dataAt = localAt + 30 + localNameLength + localExtraLength
    const raw = buffer.subarray(dataAt, dataAt + compressedSize)

    let bytes: Buffer
    if (method === 0) bytes = Buffer.from(raw)
    else if (method === 8) bytes = zlib.inflateRawSync(raw)
    else throw new LbZipError(`«${path}» usa un método de compresión no admitido (${method}).`)

    total += bytes.length
    if (total > maxTotalBytes) {
      throw new LbZipError(`El paquete descomprimido supera ${Math.round(maxTotalBytes / 1024 / 1024)} MB.`)
    }
    entries.push({ path, bytes })
  }

  return entries
}

/**
 * Quita el directorio raíz común, si el ZIP viene envuelto en uno. Un paquete
 * exportado desde una carpeta trae todo bajo «curso/», y respetar ese nivel
 * haría que la ruta de entrada no coincidiera con la del manifiesto.
 */
export function stripCommonRoot(entries: LbZipEntry[]): LbZipEntry[] {
  if (entries.length < 2) return entries
  const first = entries[0].path.split('/')[0]
  if (!first) return entries
  if (!entries.every((entry) => entry.path.startsWith(`${first}/`))) return entries
  return entries.map((entry) => ({ ...entry, path: entry.path.slice(first.length + 1) }))
}
