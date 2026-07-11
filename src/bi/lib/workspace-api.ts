import { emitBiUnauthorized } from './auth-events'

export type WsMessage = { role: 'user' | 'assistant'; content: string }
export type WsAttachment = { name: string; text?: string; url?: string; type?: string }

export async function workspaceChat(input: {
  messages: WsMessage[]
  attachments?: WsAttachment[]
  webAccess?: boolean
}): Promise<{ reply: string; providerUsed?: string }> {
  const res = await fetch('/api/bi/workspace-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: input.messages,
      attachments: (input.attachments || []).map((a) => ({ name: a.name, text: a.text })),
      webAccess: !!input.webAccess,
    }),
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload?.ok) {
    if (res.status === 401) emitBiUnauthorized()
    throw new Error(payload?.error || 'No se pudo generar la respuesta.')
  }
  return { reply: String(payload.reply || ''), providerUsed: payload.providerUsed }
}

/** Sube un archivo a R2 (presign + PUT). Devuelve la URL pública almacenada. */
export async function uploadWorkspaceFile(file: File): Promise<{ key: string; publicUrl: string }> {
  const presignRes = await fetch('/api/bi/workspace-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', size: file.size }),
  })
  const presign = await presignRes.json().catch(() => null)
  if (!presignRes.ok || !presign?.ok) {
    if (presignRes.status === 401) emitBiUnauthorized()
    throw new Error(presign?.error || 'No se pudo preparar la carga.')
  }
  const { presignedUrl, key, publicUrl } = presign.data
  const put = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!put.ok) throw new Error('No se pudo subir el archivo a R2.')
  return { key, publicUrl }
}

// ── Conversaciones persistidas en BD ───────────────────────────────────────
export type WsThread = { id: string; title: string; messages: WsMessage[] }

export async function listConversations(): Promise<WsThread[]> {
  try {
    const res = await fetch('/api/bi/conversations')
    const p = await res.json().catch(() => null)
    if (!res.ok || !p?.ok) {
      if (res.status === 401) emitBiUnauthorized()
      return []
    }
    return (p.threads || []).map((t: any) => ({ id: String(t.id), title: String(t.title || ''), messages: Array.isArray(t.messages) ? t.messages : [] }))
  } catch {
    return []
  }
}

export async function saveConversation(thread: WsThread): Promise<void> {
  try {
    await fetch('/api/bi/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thread),
    })
  } catch {
    /* offline: se reintenta en el próximo guardado */
  }
}

export async function removeConversation(id: string): Promise<void> {
  try {
    await fetch(`/api/bi/conversations?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  } catch {
    /* ignore */
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => { const s = String(r.result || ''); resolve(s.slice(s.indexOf(',') + 1)) }
    r.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    r.readAsDataURL(file)
  })
}

/** Sube el archivo a R2 y extrae su texto (PDF/Word/Excel/texto) en el servidor. */
export async function uploadAndExtract(file: File): Promise<{ text: string; url: string | null; chars: number }> {
  const dataBase64 = await fileToBase64(file)
  const res = await fetch('/api/bi/workspace-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', dataBase64 }),
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload?.ok) {
    if (res.status === 401) emitBiUnauthorized()
    throw new Error(payload?.error || 'No se pudo procesar el archivo.')
  }
  return { text: String(payload.text || ''), url: payload.url || null, chars: Number(payload.chars || 0) }
}

const TEXT_TYPES = ['text/plain', 'text/csv', 'text/markdown', 'text/tab-separated-values', 'application/json']
export function isTextFile(file: File) {
  return TEXT_TYPES.includes(file.type) || /\.(txt|csv|md|json|tsv)$/i.test(file.name)
}
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result || '').slice(0, 200000))
    r.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    r.readAsText(file)
  })
}
