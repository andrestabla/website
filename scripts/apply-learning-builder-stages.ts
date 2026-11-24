/**
 * Aplica prisma/sql/2026-11-24-learning-builder-stages.sql: las etapas de
 * producción (texto plano y guion como documentos).
 *
 *   npx tsx scripts/apply-learning-builder-stages.ts
 *
 * Aditivo e idempotente: crea las tablas LbStage y LbStageDoc y no toca
 * ninguna existente, ni una fila. Imprime antes y después.
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(ROOT, '.env') })
config({ path: path.join(ROOT, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')

const tables = async () => {
  const rows: Array<{ table_name: string }> = await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_name IN ('LbStage', 'LbStageDoc')`
  )
  return rows.map((row) => row.table_name).sort()
}
const counts = async () => ({
  resources: await (prisma as any).lbResource.count(),
  comments: await (prisma as any).lbComment.count(),
})

const before = { tables: await tables(), ...(await counts()) }
console.log('ANTES   : tablas =', before.tables.join(', ') || 'ninguna', '· recursos =', before.resources, '· comentarios =', before.comments)

const sql = readFileSync(path.join(ROOT, 'prisma/sql/2026-11-24-learning-builder-stages.sql'), 'utf8')
for (const statement of sql.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n').split(';').map((s) => s.trim()).filter(Boolean)) {
  console.log('→', statement.replace(/\s+/g, ' ').slice(0, 110))
  await prisma.$executeRawUnsafe(statement)
}

const after = { tables: await tables(), ...(await counts()) }
console.log('\nDESPUÉS : tablas =', after.tables.join(', '), '· recursos =', after.resources, '· comentarios =', after.comments)
console.log('          recursos y comentarios intactos =', after.resources === before.resources && after.comments === before.comments)

await prisma.$disconnect()
