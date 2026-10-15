/**
 * Aplica prisma/sql/2026-10-14-learning-builder-public-review.sql: las columnas
 * de la revisión externa en LbResource y LbComment.
 *
 *   npx tsx scripts/apply-learning-builder-public-review.ts
 *
 * Es idempotente y solo añade: dos columnas y un índice en LbResource, cuatro
 * columnas en LbComment, y authorId pasa a admitir nulos. No toca filas.
 * Imprime el estado antes y después para que se pueda comprobar.
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(ROOT, '.env') })
config({ path: path.join(ROOT, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')

const WANTED = [
  ['LbResource', 'reviewEnabled'],
  ['LbResource', 'reviewToken'],
  ['LbComment', 'guestName'],
  ['LbComment', 'guestEmail'],
  ['LbComment', 'guestOrg'],
  ['LbComment', 'target'],
]

async function state() {
  const columns: Array<{ table_name: string; column_name: string; is_nullable: string }> = await prisma.$queryRawUnsafe(
    `SELECT table_name, column_name, is_nullable FROM information_schema.columns
      WHERE table_name IN ('LbResource', 'LbComment')`
  )
  const has = (table: string, column: string) => columns.some((row) => row.table_name === table && row.column_name === column)
  const authorNullable = columns.find((row) => row.table_name === 'LbComment' && row.column_name === 'authorId')?.is_nullable
  const resources = await (prisma as any).lbResource.count()
  const comments = await (prisma as any).lbComment.count()
  return {
    missing: WANTED.filter(([table, column]) => !has(table, column)).map(([table, column]) => `${table}.${column}`),
    authorNullable,
    resources,
    comments,
  }
}

const before = await state()
console.log('ANTES   : faltan', before.missing.length ? before.missing.join(', ') : 'ninguna', '· authorId nullable =', before.authorNullable)
console.log('          recursos =', before.resources, '· comentarios =', before.comments)

const sql = readFileSync(path.join(ROOT, 'prisma/sql/2026-10-14-learning-builder-public-review.sql'), 'utf8')
const statements = sql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean)

for (const statement of statements) {
  console.log('→', statement.replace(/\s+/g, ' '))
  await prisma.$executeRawUnsafe(statement)
}

const after = await state()
console.log('\nDESPUÉS : faltan', after.missing.length ? after.missing.join(', ') : 'ninguna', '· authorId nullable =', after.authorNullable)
console.log('          recursos =', after.resources, '· comentarios =', after.comments)
console.log('          datos intactos =', after.resources === before.resources && after.comments === before.comments)

await prisma.$disconnect()
