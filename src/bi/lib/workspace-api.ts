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
  if (!res.ok || !payload?.ok) throw new Error(payload?.error || 'No se pudo generar la respuesta.')
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
  if (!presignRes.ok || !presign?.ok) throw new Error(presign?.error || 'No se pudo preparar la carga.')
  const { presignedUrl, key, publicUrl } = presign.data
  const put = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!put.ok) throw new Error('No se pudo subir el archivo a R2.')
  return { key, publicUrl }
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
