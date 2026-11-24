/**
 * Learning Builder · subir el documento de una etapa desde la terminal.
 *
 *   npx tsx scripts/lb-subir-etapa.ts <CÓDIGO> <TEXTO|GUION> <archivo.docx|.pptx>
 *   npx tsx scripts/lb-subir-etapa.ts <CÓDIGO> GUION guion.pptx --notas "Se atendió al experto" --aplicar
 *   npx tsx scripts/lb-subir-etapa.ts <CÓDIGO> GUION guion.docx --publicar --aplicar
 *
 * <CÓDIGO> es el del recurso en la plataforma (UNICAFAM-OVA-001) o el del
 * cliente (AF2-UT1-OVA) si es único. Hace lo mismo que el botón del builder:
 * convierte el documento, guarda el original y abre una versión nueva (V1,
 * V2…) de esa etapa. La anterior se conserva con sus comentarios.
 *
 * Sin --aplicar solo dice lo que haría: convierte en memoria y no escribe nada.
 */
import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(RAIZ, '.env') })
config({ path: path.join(RAIZ, '.env.local'), override: true })

const { prisma } = await import('../api/_lib/prisma.js')
const { officeToHtml } = await import('../api/_lib/lb-office.js')
const { ensureStage, ingestStageDoc, lbStageDocs, lbStages } = await import('../api/_lib/lb-stages.js')
const { workspaceBucket } = await import('../api/_lib/lb-storage.js')
const { isDocStage, LB_DOC_STAGE_LABEL, stageFormatOf } = await import('../src/learning/lib/stages.js')
const db = prisma as any

const argumentos = process.argv.slice(2)
const APLICAR = argumentos.includes('--aplicar')
const PUBLICAR = argumentos.includes('--publicar')
const notasEn = argumentos.indexOf('--notas')
const notas = notasEn >= 0 ? argumentos[notasEn + 1] || '' : ''
const sueltos = argumentos.filter((valor, indice) => !valor.startsWith('--') && (notasEn < 0 || indice !== notasEn + 1))
const [codigo, etapaCruda, archivo] = sueltos
const etapa = String(etapaCruda || '').toUpperCase()

async function main() {
  if (!codigo || !isDocStage(etapa) || !archivo || !fs.existsSync(archivo)) {
    console.error('\nUso: npx tsx scripts/lb-subir-etapa.ts <CÓDIGO> <TEXTO|GUION> <archivo.docx|.pptx> [--notas "…"] [--publicar] [--aplicar]\n')
    process.exit(1)
  }
  const candidatos = await db.lbResource.findMany({
    where: { deletedAt: null, OR: [{ code: codigo.toUpperCase() }, { clientCode: codigo }] },
    include: { workspace: true },
  })
  if (candidatos.length !== 1) {
    console.error(candidatos.length ? `\n‼ «${codigo}» corresponde a ${candidatos.length} recursos: usa el código de la plataforma.\n` : `\n‼ no hay ningún recurso con el código «${codigo}».\n`)
    process.exit(1)
  }
  const recurso = candidatos[0]
  const datos = fs.readFileSync(archivo)
  const nombre = path.basename(archivo).normalize('NFC')
  const ultima = await lbStageDocs().findFirst({ where: { resourceId: recurso.id, stage: etapa }, orderBy: { version: 'desc' }, select: { version: true } })
    .catch(() => { console.error('\n‼ faltan las tablas de etapas: aplica antes scripts/apply-learning-builder-stages.ts\n'); process.exit(1) })

  console.log(`\n${recurso.code}${recurso.clientCode ? ` (${recurso.clientCode})` : ''} · ${recurso.title}`)
  console.log(`${LB_DOC_STAGE_LABEL[etapa]} · «${nombre}» · ${(datos.length / 1024 / 1024).toFixed(1)} MB → V${(ultima?.version || 0) + 1}`)

  if (!APLICAR) {
    const prueba = await officeToHtml({ data: datos, format: stageFormatOf(nombre) as 'docx' | 'pptx', putImage: async () => '' })
    console.log(`Se convertiría: ${prueba.units} ${stageFormatOf(nombre) === 'pptx' ? 'pantalla(s)' : 'apartado(s)'}, ${prueba.html.length} caracteres de lectura.`)
    for (const aviso of prueba.warnings) console.log(`  aviso: ${aviso}`)
    console.log('\nNada se ha escrito. Repite con --aplicar para subirlo.\n')
    return
  }

  const doc = await ingestStageDoc({
    resource: recurso,
    workspace: recurso.workspace,
    bucket: await workspaceBucket(recurso.workspace),
    stage: etapa,
    data: datos,
    fileName: nombre,
    notes: notas,
  })
  console.log(`✓ V${doc.version} guardada · ${doc.units} unidad(es) · ${doc.images} imagen(es)`)
  for (const aviso of doc.warnings as string[]) console.log(`  aviso: ${aviso}`)

  const ficha = await ensureStage(recurso.id, etapa)
  if (PUBLICAR && !ficha.published) {
    await lbStages().update({ where: { id: ficha.id }, data: { published: true, publishedAt: ficha.publishedAt || new Date() } })
  }
  const origen = process.env.SITE_ORIGIN || 'https://www.algoritmot.com'
  console.log(`${PUBLICAR || ficha.published ? 'Publicado' : 'Sin publicar (solo el equipo)'} · ${origen}/revision/${ficha.reviewToken}\n`)
}

await main().finally(() => prisma.$disconnect())
