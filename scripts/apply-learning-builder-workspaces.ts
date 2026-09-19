/**
 * Aplica el paso del Learning Builder a workspaces con equipo y roles.
 *
 *   npx tsx scripts/apply-learning-builder-workspaces.ts
 *
 * Añade el permiso LEARNING_BUILDER, crea las siete tablas del módulo y
 * elimina el primer borrador del esquema (LbClient/LbOva). Antes de tocar nada
 * cuenta sus filas y **aborta si alguna tiene datos**: perder contenido de un
 * cliente no es un riesgo que este script pueda correr por su cuenta.
 *
 * Es idempotente en lo que crea (IF NOT EXISTS) y no toca ninguna tabla ajena
 * al módulo. Imprime el estado antes y después.
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

const OLD_TABLES = ['LbClient', 'LbOva', 'LbOvaVersion', 'LbOvaSource']
const NEW_TABLES = [
  'LbWorkspace', 'LbWorkspaceMember', 'LbResource',
  'LbResourceVersion', 'LbResourceSource', 'LbResourceFile', 'LbDataSource',
]

async function tablesPresent(names: string[]): Promise<string[]> {
  const rows: Array<{ tablename: string }> = await prisma.$queryRawUnsafe(
    'SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename = ANY($1::text[])',
    names
  )
  return rows.map((row) => row.tablename).sort()
}

async function countRows(table: string): Promise<number> {
  const rows: Array<{ count: bigint }> = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::bigint AS count FROM "${table}"`)
  return Number(rows[0]?.count ?? 0)
}

async function enumHasPermission(): Promise<boolean> {
  const rows: Array<{ value: string }> = await prisma.$queryRawUnsafe(
    'SELECT unnest(enum_range(NULL::"AdminModule"))::text AS value'
  )
  return rows.map((row) => row.value).includes('LEARNING_BUILDER')
}

const oldPresent = await tablesPresent(OLD_TABLES)
const newPresent = await tablesPresent(NEW_TABLES)
const usersBefore = await prisma.adminUser.count()

console.log('ANTES   : permiso LEARNING_BUILDER =', await enumHasPermission())
console.log('          tablas del primer esquema =', oldPresent.length ? oldPresent.join(', ') : '(ninguna)')
console.log('          tablas del esquema nuevo  =', newPresent.length ? newPresent.join(', ') : '(ninguna)')
console.log('          usuarios =', usersBefore)

// Salvaguarda: no se borra nada que tenga contenido.
const occupied: string[] = []
for (const table of oldPresent) {
  const rows = await countRows(table)
  console.log(`          ${table}: ${rows} fila(s)`)
  if (rows > 0) occupied.push(`${table} (${rows})`)
}
if (occupied.length) {
  console.error(
    `\nABORTADO: estas tablas tienen datos y el script las eliminaría: ${occupied.join(', ')}.` +
    '\nMigra su contenido a mano antes de volver a ejecutarlo.'
  )
  await prisma.$disconnect()
  process.exit(1)
}

// El valor del enum va en su propia sentencia y antes que todo lo demás.
if (!(await enumHasPermission())) {
  console.log('\nAñadiendo el valor LEARNING_BUILDER al enum AdminModule…')
  await prisma.$executeRawUnsafe(`ALTER TYPE "AdminModule" ADD VALUE IF NOT EXISTS 'LEARNING_BUILDER'`)
}

const sqlPath = path.join(ROOT, 'prisma/sql/2026-09-19-learning-builder-workspaces.sql')
const statements = fs
  .readFileSync(sqlPath, 'utf8')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((statement) => statement.trim())
  .filter((statement) => statement && !/ALTER TYPE/i.test(statement))

console.log(`\nEjecutando ${statements.length} sentencias…`)
for (const statement of statements) {
  await prisma.$executeRawUnsafe(statement)
}

const oldAfter = await tablesPresent(OLD_TABLES)
const newAfter = await tablesPresent(NEW_TABLES)
const usersAfter = await prisma.adminUser.count()

console.log('\nDESPUÉS : permiso LEARNING_BUILDER =', await enumHasPermission())
console.log('          tablas del primer esquema =', oldAfter.length ? oldAfter.join(', ') : '(eliminadas)')
console.log('          tablas del esquema nuevo  =', newAfter.join(', '))
console.log('          usuarios =', usersAfter, '· resto de datos intacto =', usersAfter === usersBefore)

if (newAfter.length !== NEW_TABLES.length) {
  console.error('AVISO: faltan tablas por crear:', NEW_TABLES.filter((t) => !newAfter.includes(t)).join(', '))
}

await prisma.$disconnect()
