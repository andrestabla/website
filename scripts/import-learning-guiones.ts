/**
 * Importa el guion real de cada recurso al Learning Builder.
 *
 *   npx tsx scripts/import-learning-guiones.ts [--dry] [--workspace UNICAFAM]
 *
 * El inventario lo siembra seed-learning-workspaces.ts; esto le pone dentro el
 * contenido, convertido a bloques editables desde el .docx que ya existe en
 * OneDrive. Las imágenes incrustadas suben a R2.
 *
 * Emparejamiento, distinto en cada cliente porque nombran distinto:
 *  · Unicafam — nueve guiones con nombre predecible: mapa explícito.
 *  · La Salle — dos convenciones conviviendo (MD_RED1_VID y
 *    Guion_U1-03_Brujula-del-proyecto-profesional), así que se empareja por el
 *    título que el propio guion declara dentro, comparado con el del recurso.
 *
 * Solo escribe donde encuentra correspondencia clara y dice en voz alta lo que
 * quedó sin emparejar: es preferible un recurso vacío y señalado que uno con el
 * guion de otro.
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
const store = await import('../api/_lib/lb-store.js')
const { docxToContent } = await import('../api/_lib/lb-docx.js')
const { sanitizeDirectives } = await import('../src/learning/lib/directives.js')
const { sanitizeContent, validateOva } = await import('../src/learning/lib/blocks.js')

const DRY = process.argv.includes('--dry')
const ONLY = (() => {
  const i = process.argv.indexOf('--workspace')
  return i > -1 ? String(process.argv[i + 1] || '').toUpperCase() : ''
})()

const ONEDRIVE = '/Users/andrestabla/Library/CloudStorage/OneDrive-ALGORITMOT/Automatizaciones'
const UNICAFAM_GUIONES = path.join(
  ONEDRIVE,
  'Unicafam/Entrega/1-Entregables/Gerencia y desarrollo del talento humano/Guiones'
)
const UNISALLE_GUIONES = path.join(ONEDRIVE, 'Unisalle/3. Guiones')

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.isFile() && entry.name.endsWith('.docx') && !entry.name.startsWith('~$') ? [full] : []
  })
}

/** Normaliza para comparar títulos: sin tildes, sin puntuación, en minúsculas. */
function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parecido por palabras compartidas: 1 = idénticos, 0 = nada en común. */
function similarity(a: string, b: string): number {
  const wa = new Set(norm(a).split(' ').filter((w) => w.length > 3))
  const wb = new Set(norm(b).split(' ').filter((w) => w.length > 3))
  if (!wa.size || !wb.size) return 0
  let shared = 0
  for (const word of wa) if (wb.has(word)) shared += 1
  return shared / Math.min(wa.size, wb.size)
}

/** El título que el guion declara: su primer párrafo en negrita con sustancia. */
async function guionTitle(file: string): Promise<string> {
  const mammoth: any = (await import('mammoth')).default ?? (await import('mammoth'))
  const { value: html } = await mammoth.convertToHtml({ path: file })
  const strongs = [...html.matchAll(/<p[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*<\/p>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
    .filter((t) => t.length > 8)
  // Las primeras líneas en negrita son rótulos del formato: «Etapa 3 · Guion de
  // recurso · Unidad 1 · …», «GUION DE LECTURA · UNICAFAM» o el numeral de una
  // sección. El título real es la primera que no lo es.
  const isLabel = (t: string) =>
    /^etapa\s*\d/i.test(t) || /^guion (de|del)\b/i.test(t) || /^\d{2}\s/.test(t) || /^(campo|especificación)$/i.test(t)
  return strongs.find((t) => !isLabel(t)) || strongs[0] || path.basename(file, '.docx')
}

/** Unicafam: nombre de archivo → fragmento del título del recurso. */
const UNICAFAM_MAP: Array<[RegExp, string]> = [
  [/Habilidades-directivas/i, 'Habilidades directivas'],
  [/Tendencias-entorno/i, 'Tendencias y entorno'],
  [/Plan-desarrollo/i, 'Plan de desarrollo'],
  [/Gestion-compensacion/i, 'compensación laboral'],
  [/Gestion-por-competencias/i, 'Gestión por competencias'],
  [/Gestion-del-desempeno/i, 'Gestión del desempeño'],
  [/Video-Presentacion/i, 'Video de presentación'],
  [/OVA-Rise-Contexto/i, 'Contexto organizacional'],
  [/OVA-Rise-Clima/i, 'Clima y cultura'],
]

type Job = { file: string; resource: any; why: string }

async function planFor(workspace: any): Promise<{ jobs: Job[]; orphans: string[] }> {
  const resources = await store.lbResources().findMany({ where: { workspaceId: workspace.id } })
  const jobs: Job[] = []
  const orphans: string[] = []

  if (workspace.code === 'UNICAFAM') {
    for (const file of walk(UNICAFAM_GUIONES)) {
      const base = path.basename(file)
      const rule = UNICAFAM_MAP.find(([pattern]) => pattern.test(base))
      const resource = rule && resources.find((r: any) => norm(r.title).includes(norm(rule[1])))
      if (resource) jobs.push({ file, resource, why: 'nombre de archivo' })
      else orphans.push(base)
    }
    return { jobs, orphans }
  }

  // La Salle: por el título que declara el guion, contra el del recurso.
  const taken = new Set<string>()
  for (const file of walk(UNISALLE_GUIONES)) {
    const declared = await guionTitle(file)
    let best: any = null
    let bestScore = 0
    for (const resource of resources) {
      if (taken.has(resource.id)) continue
      const score = Math.max(
        similarity(declared, resource.title),
        similarity(path.basename(file, '.docx').replace(/[-_]/g, ' '), resource.title)
      )
      if (score > bestScore) { bestScore = score; best = resource }
    }
    if (best && bestScore >= 0.6) {
      taken.add(best.id)
      jobs.push({ file, resource: best, why: `título (${Math.round(bestScore * 100)} %)` })
    } else {
      orphans.push(`${path.basename(file)}  →  «${declared.slice(0, 60)}» (mejor ${Math.round(bestScore * 100)} %)`)
    }
  }
  return { jobs, orphans }
}

const workspaces = await store.lbWorkspaces().findMany({ orderBy: { name: 'asc' } })
let totalBlocks = 0
let totalImages = 0

for (const workspace of workspaces) {
  if (ONLY && workspace.code !== ONLY) continue
  if (!['UNICAFAM', 'UNISALLE'].includes(workspace.code)) continue

  const directives = sanitizeDirectives(workspace.directives)
  const { jobs, orphans } = await planFor(workspace)
  console.log(`\n═══ ${workspace.name} · ${jobs.length} guion(es) emparejados · ${orphans.length} sin emparejar`)

  for (const job of jobs) {
    const imported = await docxToContent({
      buffer: fs.readFileSync(job.file),
      title: job.resource.title,
      directives,
      uploadFolder: `learning/${workspace.code.toLowerCase()}`,
      uploadedBy: 'importador',
      // En simulación no se suben imágenes: no tiene sentido dejarlas huérfanas.
      skipImages: DRY,
    })
    const content = sanitizeContent(imported.content, directives)
    const errors = validateOva(content, directives).filter((i: any) => i.level === 'error').length
    totalBlocks += imported.stats.blocks
    totalImages += imported.stats.images

    console.log(
      `    ${job.resource.code.padEnd(18)} ${imported.stats.lessons} pantallas · ${imported.stats.blocks} bloques` +
      `${imported.stats.images ? ` · ${imported.stats.images} img` : ''} · ${errors} error(es) de revisión · ${job.why}`
    )
    for (const warning of imported.warnings) console.log(`        ⚠ ${warning}`)

    if (!DRY) {
      // El guion anterior queda como versión, para poder volver.
      const previous = job.resource.content
      if (previous && Object.keys(previous).length) {
        await store.snapshot(job.resource.id, previous, 'import', undefined, 'Antes de importar el guion')
      }
      await store.lbResources().update({ where: { id: job.resource.id }, data: { content: content as any } })
    }
  }

  if (orphans.length) {
    console.log('    sin emparejar:')
    for (const orphan of orphans) console.log(`        · ${orphan}`)
  }
}

console.log(`\nTotal: ${totalBlocks} bloques importados · ${totalImages} imágenes a R2${DRY ? ' (SIMULACIÓN)' : ''}`)
await prisma.$disconnect()
