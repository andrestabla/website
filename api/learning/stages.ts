/**
 * Learning Builder · las etapas 1 y 2 de un recurso: texto plano y guion.
 *
 *   POST {op: 'list'}      las dos etapas con sus versiones y sus hilos
 *   POST {op: 'ingest'}    recompone el archivo subido por trozos, lo convierte
 *                          y abre una versión nueva (V1, V2…)
 *   POST {op: 'publish'}   abre o cierra el enlace de la etapa; con rotate,
 *                          lo cambia por otro
 *   POST {op: 'delete'}    borra una versión y sus comentarios
 *   GET  ?preview=<id>&stage=GUION[&v=N]            la lectura, dentro del builder
 *   GET  ?download=<id>&stage=GUION[&v=N]           el archivo original
 *
 * Los trozos suben por /api/learning/import (op=begin, op=part), que ya existe
 * para los paquetes: un .pptx de guion pesa lo mismo que un SCORM pequeño y el
 * cuerpo de una función no llega a cinco megas.
 *
 * Lo que aquí se publica es el documento de la etapa, por su propio enlace
 * (/revision/:token). El enlace público del recurso y su revisión externa no
 * pasan por aquí: llevan siempre a la pieza final.
 */
import { denied, guard, requireModule, lbSessionState } from '../_lib/lb-auth.js'
import { shell } from '../_lib/lb-serve-package.js'
import { lbComments, loadResource, newReviewToken } from '../_lib/lb-store.js'
import { resourceFolder, uploadPartKey, workspaceBucket } from '../_lib/lb-storage.js'
import {
  LbStageError, ensureStage, ingestStageDoc, lbStageDocs, lbStages, removeStageFiles, stageCommentTally,
  stageDocAt, stagePage, stageStates,
} from '../_lib/lb-stages.js'
import { can } from '../../src/learning/lib/roles.js'
import { LB_DOC_STAGE_LABEL, isDocStage, stageAnchor } from '../../src/learning/lib/stages.js'

type VercelRequest = any
type VercelResponse = any

const MAX_PARTS = 40

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') return await read(req, res)
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }
    return await api(req, res)
  } catch (error: any) {
    console.error('api/learning/stages error', error)
    if (req.method === 'GET') return shell('Error', 'No se pudo abrir el documento.', 500, res)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}

/** La lectura o el original, para quien tiene sesión y pertenece al workspace. */
async function read(req: VercelRequest, res: VercelResponse) {
  const download = String(req.query?.download || '')
  const resourceId = String(req.query?.preview || download)
  const stage = String(req.query?.stage || '').toUpperCase()
  if (!resourceId || !isDocStage(stage)) return shell('Enlace incompleto', 'Falta el recurso o la etapa.', 400, res)

  const { session, allowed } = await lbSessionState(req)
  if (!session || !allowed) {
    return shell('Acceso restringido', 'Inicia sesión en el Ecosistema con acceso a Learning Builder.', 403, res)
  }
  const loaded = await loadResource(resourceId)
  if (!loaded) return shell('No encontrado', 'Este recurso ya no existe.', 404, res)
  const check = await guard(req, loaded.resource.workspaceId, 'resource.view', session)
  if (!check.ok) return shell('Acceso restringido', check.error, check.status, res)

  // El invitado solo ve el documento de una etapa que se haya publicado.
  if (check.role === 'GUEST') {
    const row = await lbStages().findUnique({ where: { resourceId_stage: { resourceId, stage } } })
    if (!row?.published) return shell('Todavía en construcción', 'Este documento aún no está publicado.', 403, res)
  }

  const asked = Number(req.query?.v) || null
  const doc = await stageDocAt(resourceId, stage, asked)
  if (!doc) return shell('Sin documento', `Este recurso todavía no tiene ${LB_DOC_STAGE_LABEL[stage].toLowerCase()}.`, 404, res)

  if (download) {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Location', doc.fileUrl)
    return res.status(302).end()
  }

  const live = await stageDocAt(resourceId, stage)
  const html = await stagePage({
    workspace: loaded.workspace,
    doc,
    stage,
    title: loaded.resource.title,
    live: live?.version === doc.version,
  })
  if (html === null) return shell('Documento incompleto', 'La lectura de este documento ya no está en el almacenamiento.', 404, res)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  return res.status(200).send(html)
}

async function api(req: VercelRequest, res: VercelResponse) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  const op = String(body.op || '')
  const resourceId = String(body.resourceId || '')
  if (!resourceId) return res.status(400).json({ ok: false, error: 'Falta el recurso' })

  const gate = await requireModule(req)
  if (!gate.ok) return denied(res, gate)
  const loaded = await loadResource(resourceId)
  if (!loaded) return res.status(404).json({ ok: false, error: 'Recurso no encontrado' })
  const { resource, workspace } = loaded

  const capability = op === 'list' ? 'resource.view' : op === 'publish' ? 'resource.share' : 'resource.edit'
  const check = await guard(req, resource.workspaceId, capability as any, gate.session)
  if (!check.ok) return denied(res, check)

  const respond = async () => {
    const states = await stageStates(resourceId, { withToken: can(check.role, 'resource.share') })
    const tally = await stageCommentTally(resourceId)
    return res.status(200).json({
      ok: true,
      // El invitado no ve lo que aún no se publicó: ni el documento ni que existe.
      stages: states.map((state) => (check.role === 'GUEST' && !state.published ? { ...state, docs: [] } : state)),
      comments: tally,
    })
  }

  if (op === 'list') return respond()

  const stage = String(body.stage || '').toUpperCase()
  if (!isDocStage(stage)) return res.status(400).json({ ok: false, error: 'Etapa desconocida' })

  if (op === 'publish') {
    if (resource.status === 'ARCHIVED') {
      return res.status(400).json({ ok: false, error: 'Un recurso archivado no se publica' })
    }
    const published = body.published === true
    if (published && !(await stageDocAt(resourceId, stage))) {
      return res.status(400).json({ ok: false, error: 'Sube el documento antes de publicarlo' })
    }
    const row = await ensureStage(resourceId, stage)
    await lbStages().update({
      where: { id: row.id },
      data: {
        published,
        publishedAt: published ? row.publishedAt || new Date() : row.publishedAt,
        // Rotar el enlace deja sin efecto el anterior y las identificaciones hechas con él.
        ...(body.rotate === true ? { reviewToken: newReviewToken() } : {}),
      },
    })
    return respond()
  }

  if (op === 'delete') {
    const version = Number(body.version)
    const doc = Number.isInteger(version) ? await stageDocAt(resourceId, stage, version) : null
    if (!doc) return res.status(404).json({ ok: false, error: 'Esa versión no existe' })
    const bucket = await workspaceBucket(workspace)
    await removeStageFiles(bucket, [doc])
    await lbStageDocs().delete({ where: { id: doc.id } })
    // Sus comentarios hablaban de un documento que ya no está.
    await lbComments().deleteMany({ where: { resourceId, anchor: stageAnchor(stage), version } })
    // Sin documento no queda nada que publicar.
    if (!(await stageDocAt(resourceId, stage))) {
      await lbStages().updateMany({ where: { resourceId, stage }, data: { published: false } })
    }
    return respond()
  }

  if (op !== 'ingest') return res.status(400).json({ ok: false, error: `Operación desconocida: ${op}` })

  const uploadId = String(body.uploadId || '').replace(/[^a-f0-9-]/gi, '')
  const parts = Number(body.parts || 0)
  const fileName = String(body.fileName || 'documento.docx').slice(0, 300)
  if (!uploadId || !Number.isInteger(parts) || parts < 1 || parts > MAX_PARTS) {
    return res.status(400).json({ ok: false, error: 'La subida no está completa' })
  }

  const bucket = await workspaceBucket(workspace)
  const folder = resourceFolder(workspace.code, resource.code)
  const chunks: Buffer[] = []
  for (let index = 0; index < parts; index += 1) chunks.push(await bucket.get(uploadPartKey(folder, uploadId, index)))
  void bucket.remove(Array.from({ length: parts }, (_, index) => uploadPartKey(folder, uploadId, index))).catch(() => undefined)

  try {
    await ingestStageDoc({
      resource,
      workspace,
      bucket,
      stage,
      data: Buffer.concat(chunks),
      fileName,
      userId: check.session.userId,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
    })
  } catch (error) {
    if (error instanceof LbStageError) return res.status(400).json({ ok: false, error: error.message })
    throw error
  }
  return respond()
}
