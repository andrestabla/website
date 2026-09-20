/**
 * Adjunta a cada recurso su pieza final real, tal como se entregó al cliente.
 *
 *   npx tsx scripts/seed-learning-finals.ts            # informa
 *   npx tsx scripts/seed-learning-finals.ts --aplica   # sube
 *
 * Los entregables salen de las carpetas de producción en OneDrive. Los HTML y
 * los paquetes SCORM entran por `ingestPackage`, el mismo camino del builder,
 * y se sirven después byte a byte; los MP4 se suben al almacenamiento del
 * workspace y se enganchan al guion del video, que es el que les pone índice
 * y transcripción.
 *
 * Es idempotente: vuelve a subir lo mismo sobre el mismo recurso.
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
const { ingestPackage } = await import('../api/_lib/lb-import.js')
const { workspaceBucket, resourceFolder } = await import('../api/_lib/lb-storage.js')
const { createZip } = await import('../api/_lib/lb-zip.js')
const { contentTypeFor } = await import('../api/_lib/lb-mirror-html.js')
const { sanitizeFinal } = await import('../src/learning/lib/final.js')
const { sanitizeVideo } = await import('../src/learning/lib/video.js')

const apply = process.argv.includes('--aplica')
const UNISALLE = '/Users/andrestabla/Library/CloudStorage/OneDrive-ALGORITMOT/Automatizaciones/Unisalle/4. Producción/Misterio de Dios'
const UNICAFAM =
  '/Users/andrestabla/Library/CloudStorage/OneDrive-ALGORITMOT/Automatizaciones/Unicafam' +
  '/Entrega/1-Entregables/Gerencia y desarrollo del talento humano/Productos finales'

/** Un MP4 de producción pesa lo que pesa; el tope de la función no aplica aquí. */
const MAX_MEDIA_BYTES = 200 * 1024 * 1024

type Plan = {
  workspace: string
  kind: string
  /** Cómo encontrar el recurso que lo va a alojar: título Y curso, porque
   *  «Explorador» o «presentación» casan con media biblioteca. */
  match: { contains: string; course: string }
  /** Carpeta cuyo contenido se empaqueta, o archivo suelto. */
  folder?: string
  file?: string
  /** Archivos sueltos que acompañan al medio (subtítulos). */
  captions?: string
  as: 'PACKAGE' | 'MEDIA'
}

const PLAN: Plan[] = [
  // ── Unicafam · Gerencia y desarrollo del talento humano ──
  {
    workspace: 'UNICAFAM', kind: 'OVA', as: 'PACKAGE',
    match: { contains: 'Contexto organizacional', course: 'talento humano' },
    file: `${UNICAFAM}/M1/OVA-Rise-Contexto-organizacional-ambiental-talento-humano/OVA-Contexto-organizacional-GDTH-SCORM12.zip`,
  },
  {
    workspace: 'UNICAFAM', kind: 'LECTURA', as: 'PACKAGE',
    match: { contains: 'Tendencias', course: 'talento humano' },
    file: `${UNICAFAM}/M1/Lectura-Tendencias-entorno-talento-humano/Lectura-Tendencias-entorno-talento-humano-Unicafam.html`,
  },
  {
    workspace: 'UNICAFAM', kind: 'VIDEO', as: 'MEDIA',
    match: { contains: 'presentación', course: 'talento humano' },
    file: `${UNICAFAM}/Prepárate/Video-presentacion-unidad/VIDEO-presentacion-gerencia-talento-humano.mp4`,
  },
  // ── La Salle · Misterio de Dios ──
  {
    workspace: 'UNISALLE', kind: 'LECTURA', as: 'PACKAGE',
    match: { contains: 'Fundamentos', course: 'Misterio' },
    folder: `${UNISALLE}/U1/02_Lectura-Fundamentos-del-Misterio`,
  },
  {
    workspace: 'UNISALLE', kind: 'INTERACTIVE', as: 'PACKAGE',
    match: { contains: 'Explorador', course: 'Misterio' },
    folder: `${UNISALLE}/U1/04_Explorador-Antropologia`,
  },
  {
    workspace: 'UNISALLE', kind: 'VIDEO', as: 'MEDIA',
    match: { contains: 'Misterio', course: 'Misterio' },
    file: `${UNISALLE}/C01_Video-Presentacion/misterio-de-dios_C01.mp4`,
    captions: `${UNISALLE}/C01_Video-Presentacion/misterio-de-dios_C01.vtt`,
  },
]

/**
 * Empaqueta una carpeta de producción. Se dejan fuera los restos que el
 * pipeline deja al generar los PDF —perfiles de Chrome, .DS_Store, LEEME—:
 * son cientos de archivos que no forman parte del entregable.
 */
function packFolder(folder: string): { archive: Buffer; files: number } {
  const entries: Array<{ path: string; data: Buffer }> = []
  const walk = (dir: string, prefix = '') => {
    for (const name of fs.readdirSync(dir).sort()) {
      if (name === '.DS_Store' || name === '_chrome' || name === 'LEEME.md' || name.startsWith('.')) continue
      const full = path.join(dir, name)
      const rel = prefix ? `${prefix}/${name}` : name
      if (fs.statSync(full).isDirectory()) walk(full, rel)
      else entries.push({ path: rel, data: fs.readFileSync(full) })
    }
  }
  walk(folder)
  return { archive: createZip(entries), files: entries.length }
}

/**
 * Un archivo suelto. Un ZIP ya ES el paquete y se pasa tal cual —volver a
 * comprimirlo dejaría el SCORM dentro de otro SCORM—; un HTML autocontenido
 * se envuelve como paquete de un solo archivo.
 */
function packFile(file: string): { archive: Buffer; files: number } {
  const data = fs.readFileSync(file)
  if (file.toLowerCase().endsWith('.zip')) return { archive: data, files: 0 }
  return { archive: createZip([{ path: 'index.html', data }]), files: 1 }
}

const owner = await (prisma as any).adminUser.findFirst({ where: { role: 'SUPERADMIN' }, select: { id: true } })

for (const step of PLAN) {
  const workspace = await store.lbWorkspaces().findUnique({ where: { code: step.workspace } })
  if (!workspace) { console.log(`${step.workspace}: no existe`); continue }

  const resource = await store.lbResources().findFirst({
    where: {
      workspaceId: workspace.id,
      kind: step.kind,
      title: { contains: step.match.contains, mode: 'insensitive' },
      course: { contains: step.match.course, mode: 'insensitive' },
    },
    orderBy: { code: 'asc' },
  })
  if (!resource) {
    console.log(`${step.workspace} ${step.kind}: no encuentro «${step.match.contains}» en ${step.match.course}`)
    continue
  }

  const source = step.folder || step.file!
  if (!fs.existsSync(source)) { console.log(`${resource.code}: no está ${source}`); continue }

  if (step.as === 'MEDIA') {
    const bytes = fs.statSync(source).size
    console.log(`${resource.code.padEnd(20)} ${step.kind.padEnd(11)} MEDIA   ${(bytes / 1024 / 1024).toFixed(1)} MB  ${path.basename(source)}`)
    if (!apply) continue

    const bucket = await workspaceBucket(workspace)
    const folder = resourceFolder(workspace.code, resource.code)
    const name = path.basename(source)
    const stored = await bucket.put(`${folder}/final/${name}`, fs.readFileSync(source), contentTypeFor(name), MAX_MEDIA_BYTES)

    let captionsUrl: string | undefined
    if (step.captions && fs.existsSync(step.captions)) {
      const vtt = path.basename(step.captions)
      captionsUrl = (await bucket.put(`${folder}/final/${vtt}`, fs.readFileSync(step.captions), 'text/vtt; charset=utf-8')).url
    }

    const final = sanitizeFinal({
      kind: 'MEDIA',
      origin: { fileName: name, importedAt: new Date().toISOString(), bytes, files: captionsUrl ? 2 : 1 },
      media: { url: stored.url, contentType: contentTypeFor(name), captionsUrl },
      entry: name, pages: [], edits: {},
    })

    // El guion del video se queda con el índice y la transcripción; lo que
    // cambia es que ahora reproduce la pieza montada de verdad.
    const content = sanitizeVideo(resource.content)
    const nextContent = { ...content, film: { url: stored.url, ...(captionsUrl ? { captionsUrl } : {}) } }

    await store.lbResources().update({
      where: { id: resource.id },
      data: { assets: final as any, content: nextContent as any },
    })
    console.log(`${''.padEnd(20)} subido${captionsUrl ? ' con subtítulos' : ''} · ${stored.url.slice(0, 78)}…`)
    continue
  }

  const packed = step.folder ? packFolder(step.folder) : packFile(step.file!)
  console.log(
    `${resource.code.padEnd(20)} ${step.kind.padEnd(11)} PACKAGE ${(packed.archive.length / 1024 / 1024).toFixed(1)} MB  ` +
    `${packed.files ? `${packed.files} archivo(s)` : 'ya empaquetado'}  ${path.basename(source)}`
  )
  if (!apply) continue

  const bucket = await workspaceBucket(workspace)
  const result = await ingestPackage({
    archive: packed.archive,
    fileName: step.folder ? `${path.basename(step.folder)}.zip` : path.basename(step.file!),
    resource,
    workspace,
    bucket,
    userId: owner?.id,
    maxFileBytes: MAX_MEDIA_BYTES,
  })
  console.log(`${''.padEnd(20)} ${result.kind} · ${result.files} archivo(s) · entrada ${result.final?.entry || result.content?.entry}`)
}

if (!apply) console.log('\nNada escrito. Usa --aplica para subirlos.')
await prisma.$disconnect()
