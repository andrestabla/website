/**
 * Añade los identificadores jerárquicos del Learning Builder.
 *
 *   npx tsx scripts/apply-learning-builder-codes.ts
 *
 * Crea el código raíz de cada workspace y el derivado de cada recurso, y solo
 * cuando no queda ninguno sin código los vuelve obligatorios y únicos. Todo el
 * relleno ocurre en SQL, así que es atómico por sentencia y no depende de que
 * el cliente de Prisma esté regenerado.
 *
 * Es idempotente: lo que ya tiene código se respeta.
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

async function count(sql: string): Promise<number> {
  const rows: Array<{ n: bigint }> = await prisma.$queryRawUnsafe(sql)
  return Number(rows[0]?.n ?? 0)
}

const workspacesBefore = await count('SELECT COUNT(*)::bigint AS n FROM "LbWorkspace"')
const resourcesBefore = await count('SELECT COUNT(*)::bigint AS n FROM "LbResource"')
console.log('ANTES   : workspaces =', workspacesBefore, '· recursos =', resourcesBefore)

const statements = fs
  .readFileSync(path.join(ROOT, 'prisma/sql/2026-09-19-learning-builder-codes.sql'), 'utf8')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean)

console.log(`\nEjecutando ${statements.length} sentencias…`)
for (const statement of statements) {
  // Las restricciones finales fallan si quedara algo sin código: se avisa claro.
  try {
    await prisma.$executeRawUnsafe(statement)
  } catch (error: any) {
    console.error(`\nFalló:\n${statement.slice(0, 140)}…\n${error?.message || error}`)
    await prisma.$disconnect()
    process.exit(1)
  }
}

const workspaces: Array<{ code: string; name: string; n: bigint }> = await prisma.$queryRawUnsafe(
  `SELECT w."code", w."name", COUNT(r."id")::bigint AS n
     FROM "LbWorkspace" w LEFT JOIN "LbResource" r ON r."workspaceId" = w."id"
    GROUP BY w."code", w."name" ORDER BY w."name"`
)
console.log('\nDESPUÉS : raíces asignadas')
for (const row of workspaces) console.log(`   ${row.code.padEnd(12)} ${row.name} · ${Number(row.n)} recurso(s)`)

const sample: Array<{ code: string }> = await prisma.$queryRawUnsafe(
  'SELECT "code" FROM "LbResource" ORDER BY "code" LIMIT 8'
)
console.log('\nEjemplos de código de recurso:', sample.map((r) => r.code).join(', '))
console.log('Sin código:', await count('SELECT COUNT(*)::bigint AS n FROM "LbResource" WHERE "code" IS NULL'))

await prisma.$disconnect()
