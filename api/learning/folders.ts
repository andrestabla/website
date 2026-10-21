/**
 * Learning Builder · carpetas de la biblioteca.
 *
 * Cada workspace ordena sus recursos en carpetas que se anidan sin límite. Las
 * gobierna el gestor ('folder.manage'): crear, renombrar, mover una carpeta
 * dentro de otra, borrarla y mover recursos entre ellas.
 *
 * Borrar una carpeta nunca borra recursos: lo que tenía dentro —recursos y
 * subcarpetas— sube a la carpeta madre. Así un clic equivocado no se lleva por
 * delante el trabajo de nadie.
 */
import { denied, guard, requireModule } from '../_lib/lb-auth.js'
import { prisma } from '../_lib/prisma.js'
import { lbFolders } from '../_lib/lb-store.js'

type VercelRequest = any
type VercelResponse = any

const MAX_NAME = 120

/**
 * Cambia de carpeta sin tocar `updatedAt`: mover un recurso no es editarlo, y
 * la biblioteca ordena y fecha por la última edición.
 */
async function refile(where: { ids?: string[]; fromFolder?: string }, workspaceId: string, folderId: string | null) {
  if (where.ids) {
    return prisma.$executeRawUnsafe(
      'UPDATE "LbResource" SET "folderId" = $1 WHERE "id" = ANY($2::text[]) AND "workspaceId" = $3',
      folderId, where.ids, workspaceId
    )
  }
  return prisma.$executeRawUnsafe(
    'UPDATE "LbResource" SET "folderId" = $1 WHERE "folderId" = $2 AND "workspaceId" = $3',
    folderId, where.fromFolder, workspaceId
  )
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

/** ¿Hay ya una hermana con ese nombre? Dos carpetas iguales en un mismo sitio confunden. */
async function nameTaken(workspaceId: string, parentId: string | null, name: string, exceptId?: string) {
  const siblings = await lbFolders().findMany({ where: { workspaceId, parentId }, select: { id: true, name: true } })
  const wanted = name.toLocaleLowerCase('es')
  return siblings.some((row: any) => row.id !== exceptId && String(row.name).toLocaleLowerCase('es') === wanted)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  const op = String(body.op || '')
  const workspaceId = text(body.workspaceId, 40)

  try {
    const gate = await requireModule(req)
    if (!gate.ok) return denied(res, gate)
    const check = await guard(req, workspaceId, 'folder.manage', gate.session)
    if (!check.ok) return denied(res, check)

    /** Una carpeta de ESTE workspace, o null para la raíz. Lanza si no existe. */
    const folderIn = async (raw: unknown): Promise<any | null> => {
      const id = text(raw, 40)
      if (!id) return null
      const folder = await lbFolders().findUnique({ where: { id } })
      if (!folder || folder.workspaceId !== workspaceId) throw Object.assign(new Error('Esa carpeta ya no existe'), { status: 404 })
      return folder
    }

    if (op === 'create') {
      const name = text(body.name, MAX_NAME)
      if (!name) return res.status(400).json({ ok: false, error: 'Escribe el nombre de la carpeta' })
      const parent = await folderIn(body.parentId)
      if (await nameTaken(workspaceId, parent?.id ?? null, name)) {
        return res.status(400).json({ ok: false, error: `Ya hay una carpeta «${name}» en ese lugar` })
      }
      const folder = await lbFolders().create({ data: { workspaceId, parentId: parent?.id ?? null, name } })
      return res.status(200).json({ ok: true, folder: { id: folder.id, parentId: folder.parentId, name: folder.name } })
    }

    if (op === 'rename') {
      const folder = await folderIn(body.folderId)
      if (!folder) return res.status(400).json({ ok: false, error: 'Falta la carpeta' })
      const name = text(body.name, MAX_NAME)
      if (!name) return res.status(400).json({ ok: false, error: 'El nombre no puede quedar vacío' })
      if (await nameTaken(workspaceId, folder.parentId, name, folder.id)) {
        return res.status(400).json({ ok: false, error: `Ya hay una carpeta «${name}» en ese lugar` })
      }
      await lbFolders().update({ where: { id: folder.id }, data: { name } })
      return res.status(200).json({ ok: true })
    }

    if (op === 'move') {
      const folder = await folderIn(body.folderId)
      if (!folder) return res.status(400).json({ ok: false, error: 'Falta la carpeta' })
      const target = await folderIn(body.parentId)

      // No se puede meter una carpeta dentro de sí misma ni de una de sus hijas.
      const all = await lbFolders().findMany({ where: { workspaceId }, select: { id: true, parentId: true } })
      const parentOf = new Map<string, string | null>(all.map((row: any) => [row.id, row.parentId]))
      for (let at: string | null = target?.id ?? null; at; at = parentOf.get(at) ?? null) {
        if (at === folder.id) {
          return res.status(400).json({ ok: false, error: 'Una carpeta no puede ir dentro de sí misma' })
        }
      }
      if (await nameTaken(workspaceId, target?.id ?? null, folder.name, folder.id)) {
        return res.status(400).json({ ok: false, error: `Ya hay una carpeta «${folder.name}» en el destino` })
      }
      await lbFolders().update({ where: { id: folder.id }, data: { parentId: target?.id ?? null } })
      return res.status(200).json({ ok: true })
    }

    if (op === 'delete') {
      const folder = await folderIn(body.folderId)
      if (!folder) return res.status(400).json({ ok: false, error: 'Falta la carpeta' })
      // Lo de dentro sube un nivel antes de borrar: nada se pierde.
      await refile({ fromFolder: folder.id }, workspaceId, folder.parentId)
      const children = await lbFolders().findMany({ where: { parentId: folder.id }, select: { id: true, name: true } })
      for (const child of children) {
        // Si en el destino ya hay una carpeta con el mismo nombre, se distingue.
        const clash = await nameTaken(workspaceId, folder.parentId, child.name, child.id)
        await lbFolders().update({
          where: { id: child.id },
          data: { parentId: folder.parentId, ...(clash ? { name: `${child.name} (${folder.name})`.slice(0, MAX_NAME) } : {}) },
        })
      }
      await lbFolders().delete({ where: { id: folder.id } })
      return res.status(200).json({ ok: true })
    }

    if (op === 'move-resources') {
      const target = await folderIn(body.folderId)
      const ids = Array.isArray(body.resourceIds)
        ? [...new Set(body.resourceIds.map((id: unknown) => text(id, 40)).filter(Boolean))].slice(0, 400)
        : []
      if (!ids.length) return res.status(400).json({ ok: false, error: 'No hay recursos que mover' })
      // Solo se mueven recursos de este workspace, aunque lleguen otros ids.
      const moved = await refile({ ids: ids as string[] }, workspaceId, target?.id ?? null)
      return res.status(200).json({ ok: true, moved })
    }

    return res.status(400).json({ ok: false, error: `Operación desconocida: ${op}` })
  } catch (error: any) {
    if (error?.status) return res.status(error.status).json({ ok: false, error: error.message })
    console.error('api/learning/folders error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
