/**
 * Crea las tablas de Project Control (si no existen) y siembra el tablero base
 * "Tablero seguimiento Unicafam" a partir del Excel adjunto.
 *
 * - No toca tablas existentes: usa CREATE TABLE IF NOT EXISTS.
 * - Añade el valor 'PROJECT_CONTROL' al enum AdminModule (si aplica).
 * - Lee el .xlsx local, infiere tipos de columna y opciones de dropdown desde
 *   la hoja "Datos de entrada", y hace upsert del tablero con un id fijo.
 *
 * Ejecutar:  npx tsx scripts/seed-control-boards.ts
 * (lee DATABASE_URL desde el entorno o desde .env)
 */
import fs from 'node:fs'
import crypto from 'node:crypto'
import { Pool } from 'pg'
import * as XLSX from 'xlsx'

const XLSX_PATH = process.env.PC_SEED_XLSX || 'Tablero seguimiento Unicafam.xlsx'
const BOARD_ID = 'seed_unicafam'

function readDatabaseUrl(): string {
  let url = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim()
  if (!url && fs.existsSync('.env')) {
    const line = fs.readFileSync('.env', 'utf8').split('\n').find((l) => l.trim().startsWith('DATABASE_URL='))
    if (line) url = line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
  }
  const m = url.match(/postgres(?:ql)?:\/\/[^'"\s]+/i)
  return m ? m[0] : url
}

function rid(prefix: string) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`
}

function excelSerialToISO(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0) return null
  const ms = Math.round((serial - 25569) * 86400 * 1000)
  const d = new Date(ms)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

type ColType = 'text' | 'longtext' | 'number' | 'date' | 'select' | 'url' | 'checkbox'
type Column = { id: string; name: string; type: ColType; options?: { value: string; color?: string }[] }

// Definición del tablero: tipo por columna + índice de la hoja "Datos de entrada"
// que alimenta las opciones del dropdown (o null si no aplica).
const SCHEMA: { name: string; type: ColType; datosIdx: number | null }[] = [
  { name: 'Programa', type: 'select', datosIdx: 0 },
  { name: 'Unidad de aprendizaje', type: 'select', datosIdx: 1 },
  { name: 'Nivel', type: 'select', datosIdx: 2 },
  { name: 'Número de créditos', type: 'number', datosIdx: null },
  { name: 'Módulos/Cortes', type: 'number', datosIdx: null },
  { name: 'Profesor experto', type: 'select', datosIdx: 5 },
  { name: 'Diseñador Instruccional', type: 'select', datosIdx: 6 },
  { name: 'Diseñador gráfico', type: 'select', datosIdx: 7 },
  { name: 'Montaje LMS', type: 'select', datosIdx: 8 },
  { name: 'Fecha de inicio', type: 'date', datosIdx: null },
  { name: 'Fecha final', type: 'date', datosIdx: null },
  { name: 'No. De contrato', type: 'select', datosIdx: 9 },
  { name: 'Estado de avance', type: 'select', datosIdx: null },
  { name: 'Tablero seguimiento', type: 'url', datosIdx: null },
  { name: 'Observaciones | Trazabilidad', type: 'longtext', datosIdx: null },
]

const ESTADO_OPTIONS = [
  { value: 'Sin iniciar', color: '#f1f5f9' },
  { value: 'En diseño', color: '#e0f2fe' },
  { value: 'En montaje', color: '#fef9c3' },
  { value: 'En revisión', color: '#ffedd5' },
  { value: 'Completado', color: '#dcfce7' },
]
const PALETTE = ['#e0e7ff', '#dcfce7', '#fef9c3', '#fee2e2', '#ffedd5', '#e0f2fe', '#f3e8ff', '#f1f5f9']

async function main() {
  const databaseUrl = readDatabaseUrl()
  if (!databaseUrl) throw new Error('DATABASE_URL no configurado')
  if (!fs.existsSync(XLSX_PATH)) throw new Error(`No se encontró el Excel: ${XLSX_PATH}`)

  const pool = new Pool({ connectionString: databaseUrl })
  const q = (text: string, params?: any[]) => pool.query(text, params)

  // 1) Enum del permiso (ignora si no es un enum nativo)
  try {
    await q(`ALTER TYPE "AdminModule" ADD VALUE IF NOT EXISTS 'PROJECT_CONTROL'`)
    console.log('· Enum AdminModule: PROJECT_CONTROL asegurado')
  } catch (e: any) {
    console.log('· Enum AdminModule no modificado:', e?.message || e)
  }

  // 2) Tablas (no destructivo)
  await q(`
    CREATE TABLE IF NOT EXISTS "PcBoard" (
      "id" TEXT PRIMARY KEY,
      "ownerId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "columns" JSONB NOT NULL DEFAULT '[]',
      "rows" JSONB NOT NULL DEFAULT '[]',
      "shareToken" TEXT UNIQUE,
      "shareEnabled" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  await q(`CREATE INDEX IF NOT EXISTS "PcBoard_ownerId_updatedAt_idx" ON "PcBoard"("ownerId","updatedAt" DESC)`)
  await q(`
    CREATE TABLE IF NOT EXISTS "PcBoardShare" (
      "id" TEXT PRIMARY KEY,
      "boardId" TEXT NOT NULL REFERENCES "PcBoard"("id") ON DELETE CASCADE,
      "userId" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'VIEW',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("boardId","userId")
    )`)
  await q(`CREATE INDEX IF NOT EXISTS "PcBoardShare_userId_idx" ON "PcBoardShare"("userId")`)
  console.log('· Tablas PcBoard / PcBoardShare aseguradas')

  // 3) Dueño = admin primario (o primer SUPERADMIN)
  const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase()
  const owner =
    (await q(`SELECT id FROM "AdminUser" WHERE lower(username) = $1 LIMIT 1`, [adminUsername])).rows[0] ||
    (await q(`SELECT id FROM "AdminUser" WHERE role = 'SUPERADMIN' ORDER BY "createdAt" ASC LIMIT 1`)).rows[0]
  if (!owner) throw new Error('No se encontró un usuario administrador para asignar como dueño')
  const ownerId = owner.id
  console.log('· Dueño del tablero:', ownerId)

  // 4) Parsear Excel
  const wb = XLSX.read(fs.readFileSync(XLSX_PATH), { type: 'buffer' })
  const tablero = XLSX.utils.sheet_to_json<any[]>(wb.Sheets['Tablero'], { header: 1, defval: '', raw: true })
  const datos = XLSX.utils.sheet_to_json<any[]>(wb.Sheets['Datos de entrada'], { header: 1, defval: '', raw: true })

  const dataRows = tablero.slice(1).filter((r) => (r as any[]).some((c) => c !== '' && c != null))

  const uniq = (arr: any[]) => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const v of arr) {
      const s = String(v ?? '').trim()
      if (s && !seen.has(s)) { seen.add(s); out.push(s) }
    }
    return out
  }

  const columns: Column[] = SCHEMA.map((def, i) => {
    const col: Column = { id: rid('c'), name: def.name, type: def.type }
    if (def.type === 'select') {
      if (def.name === 'Estado de avance') {
        col.options = ESTADO_OPTIONS
      } else {
        const fromDatos = def.datosIdx != null ? datos.map((r) => (r as any[])[def.datosIdx as number]) : []
        const fromRows = dataRows.map((r) => (r as any[])[i])
        col.options = uniq([...fromDatos, ...fromRows]).map((value, k) => ({ value, color: PALETTE[k % PALETTE.length] }))
      }
    }
    return col
  })

  const rows = dataRows.map((r) => {
    const cells: Record<string, any> = {}
    columns.forEach((col, i) => {
      let v: any = (r as any[])[i]
      if (v === '' || v == null) { cells[col.id] = col.type === 'checkbox' ? false : null; return }
      if (col.type === 'number') cells[col.id] = typeof v === 'number' ? v : Number(v) || null
      else if (col.type === 'date') cells[col.id] = typeof v === 'number' ? excelSerialToISO(v) : String(v)
      else cells[col.id] = String(v)
    })
    return { id: rid('r'), cells }
  })

  // 5) Upsert del tablero
  await q(
    `INSERT INTO "PcBoard" ("id","ownerId","title","description","columns","rows","updatedAt")
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb, CURRENT_TIMESTAMP)
     ON CONFLICT ("id") DO UPDATE SET
       "title" = EXCLUDED."title",
       "description" = EXCLUDED."description",
       "columns" = EXCLUDED."columns",
       "rows" = EXCLUDED."rows",
       "updatedAt" = CURRENT_TIMESTAMP`,
    [
      BOARD_ID,
      ownerId,
      'Tablero seguimiento Unicafam',
      'Seguimiento de virtualización de programas — Unicafam.',
      JSON.stringify(columns),
      JSON.stringify(rows),
    ]
  )
  console.log(`· Tablero "${BOARD_ID}" sembrado: ${columns.length} columnas, ${rows.length} filas`)

  await pool.end()
  console.log('✔ Listo')
}

main().catch((e) => {
  console.error('✖ Error:', e)
  process.exit(1)
})
