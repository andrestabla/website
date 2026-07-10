export type AssistantMessage = { role: 'user' | 'assistant'; content: string }

export type AssistantBlock = { title?: string; hint?: string; digest?: string }

/** Consulta al asistente IA del BI (endpoint gateado por sesión + permiso BI). */
export async function askAssistant(input: {
  section: string
  block?: AssistantBlock
  messages: AssistantMessage[]
}): Promise<{ reply: string; providerUsed?: string }> {
  const res = await fetch('/api/bi/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.error || 'No se pudo obtener respuesta del asistente.')
  }
  return { reply: String(payload.reply || ''), providerUsed: payload.providerUsed }
}
