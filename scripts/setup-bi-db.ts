/**
 * Migración quirúrgica + carga del módulo BI a Postgres.
 *
 * - Crea SOLO la tabla BiDataset (CREATE TABLE IF NOT EXISTS): no toca tablas existentes.
 * - Importa los datasets analíticos (INSERT ... ON CONFLICT DO UPDATE).
 *
 * Ejecutar:  npx tsx scripts/setup-bi-db.ts
 * (lee DATABASE_URL desde el entorno o desde .env)
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { Pool } from 'pg'

function readDatabaseUrl(): string {
  let url = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim()
  if (!url && fs.existsSync('.env')) {
    const line = fs.readFileSync('.env', 'utf8').split('\n').find((l) => l.trim().startsWith('DATABASE_URL='))
    if (line) url = line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
  }
  const m = url.match(/postgres(?:ql)?:\/\/[^'"\s]+/i)
  return m ? m[0] : url
}

const DATA_DIR = process.env.BI_DATA_DIR || '/Users/andrestabla/Documents/Estudio mercado/modulo_insights/data'
const ENTRIES = [
  { key: 'insights', file: 'dataset_web.js', title: 'Oferta educativa (SNIES)', category: 'oferta' },
  { key: 'prospectiva', file: 'prospectiva_web.js', title: 'Competencias demandadas (LATAM/Colombia)', category: 'laboral' },
  { key: 'ole', file: 'ole_web.js', title: 'Empleabilidad de graduados (OLE)', category: 'laboral' },
  { key: 'oit', file: 'oit_web.js', title: 'Reskilling y mercado laboral (OIT/DANE)', category: 'laboral' },
  { key: 'pertinencia', file: 'pertinencia_web.js', title: 'Pertinencia territorial (oferta↔demanda)', category: 'regional' },
  { key: 'puente', file: 'puente_web.js', title: 'Pertinencia por disciplina', category: 'regional' },
  { key: 'recomendaciones', file: 'recomendaciones_web.js', title: 'Recomendación de programas', category: 'regional' },
  { key: 'cohortes', file: 'cohortes_web.js', title: 'Demanda potencial por cohortes (DANE)', category: 'regional' },
]

function parsePayload(file: string): { meta: unknown; data: unknown } {
  const raw = fs.readFileSync(file, 'utf8')
  const eq = raw.indexOf('=')
  const data = JSON.parse(raw.slice(eq + 1).trim().replace(/;\s*$/, ''))
  return { meta: (data as { meta?: unknown })?.meta ?? null, data }
}

const DDL = `
CREATE TABLE IF NOT EXISTS "BiDataset" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "version" TEXT NOT NULL DEFAULT '1',
  "meta" JSONB,
  "data" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "BiDataset_category_idx" ON "BiDataset"("category");
`

async function main() {
  const url = readDatabaseUrl()
  if (!url) throw new Error('DATABASE_URL no encontrada')
  const pool = new Pool({ connectionString: url })
  await pool.query('SELECT 1')
  console.log('Conexión OK. Creando tabla BiDataset (si no existe)…')
  await pool.query(DDL)

  let ok = 0
  for (const e of ENTRIES) {
    const full = path.join(DATA_DIR, e.file)
    if (!fs.existsSync(full)) { console.warn(`  ⚠ omitido (no existe): ${e.file}`); continue }
    const { meta, data } = parsePayload(full)
    await pool.query(
      `INSERT INTO "BiDataset" ("id","key","title","category","version","meta","data","active","updatedAt","createdAt")
       VALUES ($1,$2,$3,$4,'1',$5::jsonb,$6::jsonb,true,NOW(),NOW())
       ON CONFLICT ("key") DO UPDATE SET
         "title"=EXCLUDED."title","category"=EXCLUDED."category",
         "meta"=EXCLUDED."meta","data"=EXCLUDED."data","active"=true,"updatedAt"=NOW()`,
      [crypto.randomUUID(), e.key, e.title, e.category, JSON.stringify(meta), JSON.stringify(data)]
    )
    console.log(`  ✓ ${e.key.padEnd(16)} (${e.category}) · ${(JSON.stringify(data).length / 1000).toFixed(0)} KB`)
    ok++
  }
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM "BiDataset"')
  await pool.end()
  console.log(`\nImportados ${ok}/${ENTRIES.length}. Total en BiDataset: ${rows[0].n} filas.`)
}

main().catch((err) => { console.error('Error setup BI:', err.message); process.exit(1) })
