import { emitPcUnauthorized } from './session'
import type { PcBoard, PcBoardSummary, PcColumn, PcRow } from './types'

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload?.ok) {
    if (res.status === 401) emitPcUnauthorized()
    throw new Error(payload?.error || 'Error de red')
  }
  return payload as T
}

export async function listBoards(): Promise<PcBoardSummary[]> {
  const p = await req<{ boards: PcBoardSummary[] }>('/api/pc/boards')
  return p.boards || []
}

export async function createBoard(input: { title: string; description?: string; columns?: PcColumn[]; rows?: PcRow[] }): Promise<string> {
  const p = await req<{ id: string }>('/api/pc/boards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return p.id
}

export async function duplicateBoard(id: string): Promise<string> {
  const p = await req<{ id: string }>('/api/pc/boards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ duplicateOf: id }),
  })
  return p.id
}

export async function getBoard(id: string): Promise<PcBoard> {
  const p = await req<{ board: PcBoard }>(`/api/pc/board?id=${encodeURIComponent(id)}`)
  return p.board
}

export async function saveBoard(
  id: string,
  patch: Partial<Pick<PcBoard, 'title' | 'description' | 'columns' | 'rows'>>
): Promise<void> {
  await req(`/api/pc/board?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

export async function deleteBoard(id: string): Promise<void> {
  await req(`/api/pc/board?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// ── Compartir ───────────────────────────────────────────────────────────────
export type Collaborator = { userId: string; role: 'VIEW' | 'EDIT'; username: string; displayName: string; email: string }

export async function setPublicShare(boardId: string, enabled: boolean): Promise<{ shareEnabled: boolean; shareToken: string | null }> {
  return req(`/api/pc/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardId, op: enabled ? 'public-on' : 'public-off' }),
  })
}

export async function listCollaborators(boardId: string): Promise<Collaborator[]> {
  const p = await req<{ collaborators: Collaborator[] }>(`/api/pc/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardId, op: 'list' }),
  })
  return p.collaborators || []
}

export async function addCollaborator(boardId: string, identifier: string, role: 'VIEW' | 'EDIT'): Promise<Collaborator[]> {
  const p = await req<{ collaborators: Collaborator[] }>(`/api/pc/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardId, op: 'add-user', identifier, role }),
  })
  return p.collaborators || []
}

export async function setCollaboratorRole(boardId: string, userId: string, role: 'VIEW' | 'EDIT'): Promise<Collaborator[]> {
  const p = await req<{ collaborators: Collaborator[] }>(`/api/pc/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardId, op: 'set-role', userId, role }),
  })
  return p.collaborators || []
}

export async function removeCollaborator(boardId: string, userId: string): Promise<Collaborator[]> {
  const p = await req<{ collaborators: Collaborator[] }>(`/api/pc/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardId, op: 'remove-user', userId }),
  })
  return p.collaborators || []
}

// ── Vista pública ────────────────────────────────────────────────────────────
export type PublicBoardData = { title: string; description: string; columns: PcColumn[]; rows: PcRow[]; updatedAt: string }

export async function getPublicBoard(token: string): Promise<PublicBoardData> {
  const p = await req<{ board: PublicBoardData }>(`/api/pc/public?token=${encodeURIComponent(token)}`)
  return p.board
}
