/**
 * Aplica prisma/sql/2026-10-21-learning-builder-deliveries.sql y siembra la V1.
 *
 *   npx tsx scripts/apply-learning-builder-deliveries.ts
 *
 * Todo paquete subido hasta hoy pasa a ser la versión 1 de su recurso, sin
 * mover un solo archivo: siguen en «…/pkg/». Para cada recurso con paquete se
 * crea la ficha de su V1 (con el nombre del archivo y la fecha en que se
 * importó) y sus comentarios quedan marcados como hechos sobre la V1.
 *
 * Es idempotente: un recurso que ya tiene ficha de V1 no se toca, y solo se
 * marcan los comentarios que aún no tienen versión. Imprime antes y después.
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(ROOT, '.env') })
config({ path: path.join(ROOT, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')
const { snapshotOf } = await import('../api/_lib/lb-delivery.js')
const db = prisma as any

const sql = readFileSync(path.join(ROOT, 'prisma/sql/2026-10-21-learning-builder-deliveries.sql'), 'utf8')
const statements = sql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean)

const before = {
  files: await db.lbResourceFile.count(),
  comments: await db.lbComment.count(),
}
console.log('ANTES   : archivos de paquete =', before.files, '· comentarios =', before.comments)

for (const statement of statements) {
  console.log('→', statement.replace(/\s+/g, ' ').slice(0, 110))
  await prisma.$executeRawUnsafe(statement)
}

// Recursos con paquete: los que tienen al menos un archivo.
const withFiles: Array<{ resourceId: string }> = await db.lbResourceFile.groupBy({ by: ['resourceId'] })
let created = 0
let marked = 0
for (const { resourceId } of withFiles) {
  const resource = await db.lbResource.findUnique({
    where: { id: resourceId },
    select: { id: true, code: true, kind: true, content: true, assets: true, importMeta: true, createdAt: true, ownerId: true },
  })
  if (!resource) continue
  const exists = await db.lbDelivery.findUnique({ where: { resourceId_version: { resourceId, version: 1 } } })
  if (!exists) {
    const meta = (resource.importMeta || {}) as Record<string, any>
    const origin = ((resource.assets as any)?.origin || (resource.content as any)?.origin || {}) as Record<string, any>
    const files = await db.lbResourceFile.aggregate({ where: { resourceId, version: 1 }, _count: { _all: true }, _sum: { bytes: true } })
    const importedAt = origin.importedAt ? new Date(origin.importedAt) : null
    await db.lbDelivery.create({
      data: {
        resourceId,
        version: 1,
        fileName: String(meta.fileName || origin.fileName || 'paquete'),
        bytes: Number(meta.bytes || origin.bytes || files._sum?.bytes || 0),
        files: files._count?._all || 0,
        createdAt: importedAt && !Number.isNaN(importedAt.getTime()) ? importedAt : resource.createdAt,
        snapshot: snapshotOf(resource) as any,
      },
    })
    created += 1
  }
  const result = await db.lbComment.updateMany({ where: { resourceId, version: null }, data: { version: 1 } })
  marked += result.count
  console.log(`  ${resource.code}: ${exists ? 'ya tenía su V1' : 'V1 creada'} · ${result.count} comentario(s) marcados como V1`)
}

const after = {
  files: await db.lbResourceFile.count(),
  comments: await db.lbComment.count(),
  deliveries: await db.lbDelivery.count(),
}
console.log('\nDESPUÉS : versiones =', after.deliveries, `(${created} nuevas)`, '· comentarios marcados =', marked)
console.log('          archivos y comentarios intactos =', after.files === before.files && after.comments === before.comments)

await prisma.$disconnect()
