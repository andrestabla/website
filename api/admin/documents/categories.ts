import { requireAdminSession } from '../../_lib/admin-auth.js'
import { prisma } from '../../_lib/prisma.js'
import { filterVisibleCategories, getSessionEmail, isDocAdmin, sanitizeDocPermissionsInput } from '../../_lib/doc-permissions.js'

type VercelRequest = any
type VercelResponse = any

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'categoria'
}

function buildCategoryPath(parentPath: string | null, slug: string) {
  return parentPath ? `${parentPath}/${slug}` : `/${slug}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const session = requireAdminSession(req, res)
    if (!session) return

    if (req.method === 'GET') {
      const categories = await prisma.docCategory.findMany({
        orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      })
      const email = isDocAdmin(session) ? null : await getSessionEmail(session)
      const visible = filterVisibleCategories(session, email, categories as any)
      return res.status(200).json({ ok: true, data: visible })
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
      const { name, parentId, description, icon, color, sortOrder, permissions } = body

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ ok: false, error: 'name is required' })
      }
      // Solo admin puede definir permisos de un espacio; si no, queda abierto.
      const permData = isDocAdmin(session) && permissions !== undefined
        ? sanitizeDocPermissionsInput(permissions)
        : { roles: [], userEmails: [] }

      let level = 0
      let parentPath: string | null = null

      if (parentId) {
        const parent = await prisma.docCategory.findUnique({ where: { id: String(parentId) } })
        if (!parent) return res.status(404).json({ ok: false, error: 'Parent category not found' })
        if (parent.level >= 4) return res.status(400).json({ ok: false, error: 'Maximum 5 levels of nesting allowed' })
        level = parent.level + 1
        parentPath = parent.path
      }

      const slug = slugify(name)
      const basePath = buildCategoryPath(parentPath, slug)
      // Ensure path uniqueness by appending a suffix if needed
      let path = basePath
      let suffix = 1
      while (await prisma.docCategory.findUnique({ where: { path } })) {
        path = `${basePath}-${suffix++}`
      }

      const category = await prisma.docCategory.create({
        data: {
          name: name.trim(),
          slug,
          path,
          parentId: parentId || null,
          level,
          description: description || null,
          icon: icon || null,
          color: color || null,
          sortOrder: sortOrder ?? 0,
          permissions: permData,
        },
      })

      return res.status(201).json({ ok: true, data: category })
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
      const { id, name, description, icon, color, sortOrder, permissions, action, newParentId } = body

      if (!id) return res.status(400).json({ ok: false, error: 'id is required' })

      const existing = await prisma.docCategory.findUnique({ where: { id: String(id) } })
      if (!existing) return res.status(404).json({ ok: false, error: 'Category not found' })

      // Move category to a new parent
      if (action === 'move') {
        let newLevel = 0
        let newParentPath: string | null = null

        if (newParentId) {
          const newParent = await prisma.docCategory.findUnique({ where: { id: String(newParentId) } })
          if (!newParent) return res.status(404).json({ ok: false, error: 'New parent not found' })
          if (newParent.level >= 4) return res.status(400).json({ ok: false, error: 'Maximum 5 levels allowed' })
          // Prevent moving into own subtree
          if (newParent.path.startsWith(existing.path + '/') || newParent.path === existing.path) {
            return res.status(400).json({ ok: false, error: 'Cannot move a category into its own subtree' })
          }
          newLevel = newParent.level + 1
          newParentPath = newParent.path
        }

        const newSlug = existing.slug
        const newBasePath = buildCategoryPath(newParentPath, newSlug)
        let newPath = newBasePath
        let suffix = 1
        while (true) {
          const conflict = await prisma.docCategory.findUnique({ where: { path: newPath } })
          if (!conflict || conflict.id === existing.id) break
          newPath = `${newBasePath}-${suffix++}`
        }

        // Update all descendants' paths recursively
        const oldPathPrefix = existing.path
        const descendants = await prisma.docCategory.findMany({
          where: { path: { startsWith: oldPathPrefix + '/' } },
        })

        await prisma.$transaction([
          prisma.docCategory.update({
            where: { id: String(id) },
            data: { parentId: newParentId || null, level: newLevel, path: newPath },
          }),
          ...descendants.map(d =>
            prisma.docCategory.update({
              where: { id: d.id },
              data: {
                path: newPath + d.path.slice(oldPathPrefix.length),
                level: newLevel + (d.level - existing.level),
              },
            })
          ),
        ])

        const moved = await prisma.docCategory.findUnique({ where: { id: String(id) } })
        return res.status(200).json({ ok: true, data: moved })
      }

      const updated = await prisma.docCategory.update({
        where: { id: String(id) },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
          ...(icon !== undefined ? { icon: icon || null } : {}),
          ...(color !== undefined ? { color: color || null } : {}),
          ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
          // Solo admin puede editar permisos de un espacio.
          ...(permissions !== undefined && isDocAdmin(session)
            ? { permissions: sanitizeDocPermissionsInput(permissions) }
            : {}),
        },
      })

      return res.status(200).json({ ok: true, data: updated })
    }

    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
      const id = String(body.id || req.query?.id || '')

      if (!id) return res.status(400).json({ ok: false, error: 'id is required' })

      const hasChildren = await prisma.docCategory.findFirst({ where: { parentId: id } })
      if (hasChildren) return res.status(400).json({ ok: false, error: 'Cannot delete a category with subcategories' })

      const hasDocuments = await prisma.document.findFirst({ where: { categoryId: id } })
      if (hasDocuments) return res.status(400).json({ ok: false, error: 'Cannot delete a category with documents' })

      await prisma.docCategory.delete({ where: { id } })
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET,POST,PUT,DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('api/admin/documents/categories error', error)
    return res.status(500).json({ ok: false, error: 'Internal server error' })
  }
}
