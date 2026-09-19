/**
 * Crea la tabla de comentarios de revisión del Learning Builder (rol Auditor).
 *
 *   npx tsx scripts/apply-learning-builder-comments.ts
 *
 * Aditivo e idempotente: una sola tabla nueva, ninguna existente se toca.
 * Imprime el estado antes y después para que se pueda comprobar.
 */
import 'dotenv/config'
import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(ROOT, '.env') })
config({ path: path.join(ROOT, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')

async function hasTable(name: string): Promise<boolean> {
  const rows: Array<{ tablename: string }> = await prisma.$queryRawUnsafe(
    'SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename = $1',
    name
  )
  return rows.length > 0
}

const before = await hasTable('LbComment')
const resourcesBefore = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
  'SELECT COUNT(*)::bigint AS count FROM "LbResource"'
)

console.log('ANTES   : tabla LbComment =', before)
console.log('          recursos en la base =', Number(resourcesBefore[0]?.count ?? 0))

const sqlPath = path.join(ROOT, 'prisma/sql/2026-09-19-learning-builder-comments.sql')
const statements = fs
  .readFileSync(sqlPath, 'utf8')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean)

console.log(`\nEjecutando ${statements.length} sentencias (IF NOT EXISTS)…`)
for (const statement of statements) {
  await prisma.$executeRawUnsafe(statement)
}

const after = await hasTable('LbComment')
const resourcesAfter = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
  'SELECT COUNT(*)::bigint AS count FROM "LbResource"'
)

console.log('\nDESPUÉS : tabla LbComment =', after)
console.log(
  '          recursos en la base =', Number(resourcesAfter[0]?.count ?? 0),
  '· intactos =', resourcesBefore[0]?.count === resourcesAfter[0]?.count
)

await prisma.$disconnect()
