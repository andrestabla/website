/**
 * Importa una pieza real y la deja editable en el Learning Builder.
 *
 *   npx tsx scripts/seed-learning-import.ts
 *
 * Toma la propuesta gráfica de Educación y Neurociencia —un HTML de 118 KB con
 * sus imágenes, tal como se le entregó a La Salle— la empaqueta en un ZIP y la
 * mete por el mismo camino que usa el builder: `ingestPackage`. No hay una
 * versión de prueba de la importación; lo que se ejercita aquí es lo que se
 * ejecuta en producción.
 *
 * Es idempotente: vuelve a importar el mismo paquete sobre el mismo recurso.
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
const { workspaceBucket } = await import('../api/_lib/lb-storage.js')
const { createZip } = await import('../api/_lib/lb-zip.js')
const { resourceCodeFor, takenResourceCodes } = await import('../api/_lib/lb-codes.js')
const { sanitizeDirectives } = await import('../src/learning/lib/directives.js')
const { validateResourceContent, contentStats } = await import('../src/learning/lib/content.js')

const FUENTE =
  '/Users/andrestabla/Library/CloudStorage/OneDrive-ALGORITMOT/Automatizaciones/Unisalle' +
  '/2. Propuesta/Educación y Neurociencia/Gráfica'

const TITULO = 'Propuesta gráfica · Educación y Neurociencia'

// ── El paquete, tal como saldría de la carpeta del cliente ──────────────────

if (!fs.existsSync(path.join(FUENTE, '02_Propuesta-grafica.html'))) {
  console.error(`No encuentro la propuesta en ${FUENTE}`)
  process.exit(1)
}

const entries: Array<{ path: string; data: Buffer }> = [
  { path: 'index.html', data: fs.readFileSync(path.join(FUENTE, '02_Propuesta-grafica.html')) },
]
for (const name of fs.readdirSync(path.join(FUENTE, 'assets'))) {
  if (name.startsWith('.')) continue
  entries.push({ path: `assets/${name}`, data: fs.readFileSync(path.join(FUENTE, 'assets', name)) })
}
const archive = createZip(entries)
console.log(`Paquete armado: ${entries.length} archivos · ${(archive.length / 1024).toFixed(0)} KB`)

// ── El recurso que lo va a alojar ───────────────────────────────────────────

const workspace = await store.lbWorkspaces().findUnique({ where: { code: 'UNISALLE' } })
if (!workspace) {
  console.error('No existe el workspace UNISALLE.')
  await prisma.$disconnect()
  process.exit(1)
}

const owner = await (prisma as any).adminUser.findFirst({
  where: { role: 'SUPERADMIN' },
  select: { id: true },
})

let resource = await store.lbResources().findFirst({ where: { workspaceId: workspace.id, kind: 'IMPORT' } })
if (!resource) {
  resource = await store.lbResources().create({
    data: {
      publicId: store.newPublicId(),
      code: resourceCodeFor(workspace.code, 'IMPORT', await takenResourceCodes(store.lbResources(), workspace.id)),
      workspaceId: workspace.id,
      ownerId: owner?.id || '',
      kind: 'IMPORT',
      title: TITULO,
      course: 'Educación y Neurociencia',
      subtitle: 'Entregable original, servido tal cual y editable texto a texto',
      tags: ['propuesta', 'gráfica', 'importado'],
      content: {},
    },
  })
  console.log(`Recurso creado: ${resource.code}`)
} else {
  console.log(`Recurso existente: ${resource.code}`)
}

// ── La importación, por el camino de verdad ─────────────────────────────────

const bucket = await workspaceBucket(workspace)
console.log(`Almacenamiento: R2 ${bucket.source === 'own' ? 'del workspace' : 'de la plataforma'}`)

const result = await ingestPackage({
  archive,
  fileName: '02_Propuesta-grafica.zip',
  resource,
  workspace,
  bucket,
  userId: owner?.id,
})

// Se publica dentro del workspace, no hacia fuera: el enlace público es una
// decisión del cliente y se activa desde la pestaña Entrega.
await store.lbResources().update({
  where: { id: resource.id },
  data: { status: 'PUBLISHED', publishedAt: resource.publishedAt || new Date() },
})

const directives = sanitizeDirectives(workspace.directives)
const issues = validateResourceContent('IMPORT', result.content, directives)

console.log(`\n${resource.code} · ${TITULO}`)
console.log(`   origen: ${result.kind} · ${result.files} archivo(s) · ${(result.bytes / 1024).toFixed(0)} KB`)
console.log(`   entrada: ${result.content.entry}`)
console.log(`   páginas: ${result.content.pages.map((page) => page.title).join(' · ')}`)
console.log(`   estadísticas: ${JSON.stringify(contentStats('IMPORT', result.content))}`)
console.log(`   revisión: ${issues.filter((i) => i.level === 'error').length} error(es), ${issues.filter((i) => i.level === 'warning').length} advertencia(s)`)

const files = await store.lbFiles().findMany({ where: { resourceId: resource.id }, orderBy: { path: 'asc' } })
for (const file of files) console.log(`   · ${file.path.padEnd(34)} ${String(file.bytes).padStart(8)} B  ${file.contentType}`)
console.log(`\n   enlace público: /ova/${resource.publicId}`)

await prisma.$disconnect()
