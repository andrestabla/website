/**
 * Learning Builder · los documentos de las etapas 1 y 2 de un recurso.
 *
 * El texto plano y el guion llegan como Word o PowerPoint. De cada versión se
 * guardan dos cosas en el almacenamiento del workspace: el original, que
 * siempre se puede descargar, y su lectura en HTML (lb-office.ts), que es lo
 * que se publica y sobre lo que se comenta.
 *
 * Cada etapa tiene su propio enlace de revisión, distinto del público y del
 * de revisión del recurso: esos dos llevan siempre a la pieza final, y quien
 * recibe el enlace de un guion no tiene por qué llegar desde él al recurso
 * producido.
 *
 * La versión vigente de una etapa es la de número más alto. Las anteriores se
 * conservan con sus comentarios, igual que las versiones entregadas del paquete.
 */
import { prisma } from './prisma.js'
import { OFFICE_CSS, officeToHtml } from './lb-office.js'
import { lbComments, newReviewToken, usersByIds } from './lb-store.js'
import { readStored, resourceFolder, type LbBucket } from './lb-storage.js'
import {
  LB_DOC_STAGES, LB_DOC_STAGE_FORMATS, LB_DOC_STAGE_LABEL, stageAnchor, stageFormatOf,
  type LbDocStage, type LbStageDocRow, type LbStageState,
} from '../../src/learning/lib/stages.js'

export const lbStages = () => (prisma as any).lbStage
export const lbStageDocs = () => (prisma as any).lbStageDoc

/** Un documento que no se puede abrir: el mensaje va dirigido a quien lo subió. */
export class LbStageError extends Error {}

const MAX_DOC_BYTES = 40 * 1024 * 1024

function stageFolder(folder: string, stage: LbDocStage, version: number): string {
  return `${folder}/etapas/${stage.toLowerCase()}/v${version}`
}

/** Nombre de archivo que cabe en una URL sin sorpresas, con su extensión. */
function safeFileName(name: string, format: string): string {
  const base = name.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
  return `${base || 'documento'}.${format}`
}

const CONTENT_TYPE: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

/** La ficha de la etapa; se crea, con su enlace, la primera vez que hace falta. */
export async function ensureStage(resourceId: string, stage: LbDocStage) {
  const found = await lbStages().findUnique({ where: { resourceId_stage: { resourceId, stage } } })
  if (found) return found
  return lbStages().create({ data: { resourceId, stage, reviewToken: newReviewToken() } })
}

/** Convierte y guarda una versión nueva del documento de una etapa. */
export async function ingestStageDoc(options: {
  resource: { id: string; code: string }
  workspace: { code: string }
  bucket: LbBucket
  stage: LbDocStage
  data: Buffer
  fileName: string
  userId?: string
  notes?: string
}) {
  const { resource, workspace, bucket, stage, data } = options
  const fileName = options.fileName.normalize('NFC').slice(0, 300)
  const format = stageFormatOf(fileName)
  if (!LB_DOC_STAGE_FORMATS[stage].includes(format)) {
    const allowed = LB_DOC_STAGE_FORMATS[stage].map((value) => `.${value}`).join(' o ')
    throw new LbStageError(`«${fileName}» no es un formato admitido para ${LB_DOC_STAGE_LABEL[stage].toLowerCase()}: sube un ${allowed}.`)
  }
  if (data.length > MAX_DOC_BYTES) {
    throw new LbStageError(`El documento pesa ${(data.length / 1024 / 1024).toFixed(1)} MB; el máximo es ${MAX_DOC_BYTES / 1024 / 1024} MB.`)
  }

  const last = await lbStageDocs().findFirst({ where: { resourceId: resource.id, stage }, orderBy: { version: 'desc' }, select: { version: true } })
  const version = (last?.version || 0) + 1
  const folder = stageFolder(resourceFolder(workspace.code, resource.code), stage, version)
  const keys: string[] = []

  let rendered
  try {
    rendered = await officeToHtml({
      data,
      format: format as 'docx' | 'pptx',
      putImage: async (image) => {
        const stored = await bucket.put(`${folder}/img/${image.name}`, image.bytes, image.contentType)
        keys.push(stored.key)
        return stored.url
      },
    })
  } catch (error: any) {
    await bucket.remove(keys).catch(() => undefined)
    throw new LbStageError(`No se pudo leer «${fileName}»: ${error?.message || 'el archivo está dañado o no es del formato que dice su extensión'}`)
  }

  const original = await bucket.put(`${folder}/original/${safeFileName(fileName, format)}`, data, CONTENT_TYPE[format])
  const html = await bucket.put(`${folder}/lectura.html`, Buffer.from(rendered.html, 'utf8'), 'text/html; charset=utf-8')
  keys.push(original.key, html.key)

  await ensureStage(resource.id, stage)
  const doc = await lbStageDocs().create({
    data: {
      resourceId: resource.id,
      stage,
      version,
      fileName,
      format,
      bytes: data.length,
      fileUrl: original.url,
      htmlUrl: html.url,
      units: rendered.units,
      images: rendered.images,
      keys,
      warnings: rendered.warnings,
      notes: options.notes?.trim().slice(0, 1000) || null,
      createdById: options.userId || null,
    },
  })
  return doc
}

/** Borra del almacenamiento lo que subieron estas versiones. */
export async function removeStageFiles(bucket: LbBucket, docs: Array<{ keys?: unknown }>): Promise<void> {
  const keys = docs.flatMap((doc) => (Array.isArray(doc.keys) ? (doc.keys as unknown[]).filter((key): key is string => typeof key === 'string') : []))
  if (keys.length) await bucket.remove(keys).catch(() => undefined)
}

/** Las dos etapas de un recurso con sus versiones, de la más reciente a la primera. */
export async function stageStates(resourceId: string, options: { withToken: boolean }): Promise<LbStageState[]> {
  const [rows, docs] = await Promise.all([
    lbStages().findMany({ where: { resourceId } }),
    lbStageDocs().findMany({ where: { resourceId }, orderBy: { version: 'desc' } }),
  ])
  const authors = await usersByIds(docs.map((doc: any) => doc.createdById).filter(Boolean))
  return LB_DOC_STAGES.map((stage) => {
    const row = rows.find((candidate: any) => candidate.stage === stage)
    const own = docs.filter((doc: any) => doc.stage === stage)
    const live = own[0]?.version || 0
    return {
      stage,
      published: !!row?.published,
      reviewToken: options.withToken ? row?.reviewToken || null : null,
      docs: own.map((doc: any): LbStageDocRow => ({
        id: doc.id,
        version: doc.version,
        fileName: doc.fileName,
        format: doc.format,
        bytes: doc.bytes,
        units: doc.units,
        images: doc.images,
        warnings: Array.isArray(doc.warnings) ? doc.warnings : [],
        notes: doc.notes,
        createdAt: doc.createdAt,
        createdByName: doc.createdById ? authors.get(doc.createdById)?.displayName || null : null,
        live: doc.version === live,
      })),
    }
  })
}

/** La versión pedida del documento de una etapa; sin número, la vigente. */
export async function stageDocAt(resourceId: string, stage: LbDocStage, asked?: number | null) {
  if (asked && asked > 0) {
    return lbStageDocs().findUnique({ where: { resourceId_stage_version: { resourceId, stage, version: asked } } })
  }
  return lbStageDocs().findFirst({ where: { resourceId, stage }, orderBy: { version: 'desc' } })
}

/** Hilos abiertos y atendidos de cada versión de una etapa. */
export async function stageCommentTally(resourceId: string): Promise<Array<{ stage: LbDocStage; version: number | null; status: string; count: number }>> {
  const rows = await lbComments().groupBy({
    by: ['anchor', 'version', 'status'],
    where: { resourceId, parentId: null, anchor: { in: LB_DOC_STAGES.map(stageAnchor) } },
    _count: { _all: true },
  })
  return (rows as any[]).map((row) => ({
    stage: String(row.anchor).slice(6) as LbDocStage,
    version: row.version ?? null,
    status: row.status,
    count: row._count?._all || 0,
  }))
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** La página que se sirve: el fragmento guardado, vestido, y lo que se le sume al final. */
export async function stagePage(options: {
  workspace: { id?: string; integrations?: unknown } | null
  doc: { htmlUrl: string; fileName: string; version: number; format: string }
  stage: LbDocStage
  title: string
  live: boolean
  extra?: string
}): Promise<string | null> {
  const response = await readStored(options.workspace, options.doc.htmlUrl)
  if (!response.ok) return null
  const fragment = await response.text()
  const label = LB_DOC_STAGE_LABEL[options.stage]
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${escapeHtml(`${label} · ${options.title}`)}</title>
<style>
html{scroll-behavior:smooth}
body{margin:0;padding:0 16px 96px;background:#f1f5f9}
.lb-etapa{max-width:1120px;margin:0 auto;padding:18px 4px 14px;font:500 12.5px/1.4 system-ui,-apple-system,sans-serif;color:#64748b;display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}
.lb-etapa b{font-weight:800;color:#0f172a}
.lb-etapa .lb-chip{padding:2px 8px;border-radius:99px;background:#e0e7ff;color:#3730a3;font-weight:700}
.lb-etapa .lb-chip.lb-ant{background:#fef3c7;color:#92400e}
${OFFICE_CSS}
</style></head>
<body>
<div class="lb-etapa"><span class="lb-chip${options.live ? '' : ' lb-ant'}">${escapeHtml(label)} · V${options.doc.version}${options.live ? '' : ' · versión anterior'}</span><b>${escapeHtml(options.title)}</b><span>${escapeHtml(options.doc.fileName)}</span></div>
${fragment}
${options.extra || ''}
</body></html>`
}
