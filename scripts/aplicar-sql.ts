/**
 * Aplica un archivo de `prisma/sql` a la base.
 *
 * Los cambios de esquema de este proyecto viven como SQL aditivo e idempotente
 * en `prisma/sql/`, no como migraciones de Prisma. Hasta ahora se aplicaban con
 * `psql`, que no está en todas las máquinas del equipo; esto hace lo mismo con
 * el cliente de Postgres que el proyecto ya tiene instalado.
 *
 *   npx tsx scripts/aplicar-sql.ts prisma/sql/2026-10-16-....sql
 *
 * Va dentro de una transacción: o entra el archivo entero o no entra nada. Y
 * como el SQL del proyecto es idempotente por convención —`IF NOT EXISTS` en
 * todo—, volver a aplicarlo no rompe nada.
 */
import 'dotenv/config'
import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(RAIZ, '.env') })
config({ path: path.join(RAIZ, '.env.local'), override: true })

const archivo = process.argv[2]
if (!archivo) {
  console.error('Falta el archivo .sql')
  process.exit(1)
}

const url = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim()
if (!url) {
  console.error('No hay DATABASE_URL')
  process.exit(1)
}

const ruta = path.isAbsolute(archivo) ? archivo : path.join(RAIZ, archivo)
const sql = fs.readFileSync(ruta, 'utf8')
const pool = new Pool({ connectionString: url.match(/postgres(?:ql)?:\/\/[^'"\s]+/i)?.[0] || url })

const cliente = await pool.connect()
try {
  await cliente.query('BEGIN')
  await cliente.query(sql)
  await cliente.query('COMMIT')
  const lineas = sql.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--')).length
  console.log(`  ✓ ${path.basename(ruta)} · ${lineas} sentencias aplicadas`)
} catch (error) {
  await cliente.query('ROLLBACK')
  console.error('\n‼ no se aplicó nada:', error instanceof Error ? error.message : error, '\n')
  process.exitCode = 1
} finally {
  cliente.release()
  await pool.end()
}
