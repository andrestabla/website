/**
 * Cotizador — transcripción de voz a texto para el chat del builder.
 * Recibe el audio grabado en el navegador (webm/ogg/mp4/wav en base64) y lo
 * transcribe con los modelos de audio de OpenAI. Privado: módulo COTIZADOR.
 */
import { prisma } from '../_lib/prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations, applyServerEnv } from '../_lib/integrations.js'
import { quoteSessionState } from '../_lib/quotes.js'

type VercelRequest = any
type VercelResponse = any

export const config = { api: { bodyParser: { sizeLimit: '25mb' } } }
export const maxDuration = 60

const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe'
const MAX_BYTES = 24 * 1024 * 1024 // tope de la API de audio de OpenAI: 25 MB

const EXT_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-m4a': 'm4a',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session, allowed } = quoteSessionState(req)
  if (!session) return res.status(401).json({ ok: false, error: 'Sesión requerida' })
  if (!allowed) return res.status(403).json({ ok: false, error: 'Sin acceso al Cotizador' })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const raw = String(body.audioBase64 || '')
    if (!raw) return res.status(400).json({ ok: false, error: 'Falta el audio' })
    const base64 = raw.includes(',') ? raw.split(',').pop()! : raw
    const buffer = Buffer.from(base64, 'base64')
    if (!buffer.length) return res.status(400).json({ ok: false, error: 'Audio vacío' })
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ ok: false, error: 'El audio supera 24 MB; graba en tramos más cortos' })
    }

    const snapshot = await (prisma as any).cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
    const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data ?? {}))
    const apiKey = integrations.openai.config.apiKey
    if (!apiKey) return res.status(502).json({ ok: false, error: 'OpenAI no está configurado' })

    const mimeType = String(body.mimeType || 'audio/webm').split(';')[0].trim().toLowerCase()
    const ext = EXT_BY_MIME[mimeType] || 'webm'

    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), `grabacion.${ext}`)
    form.append('model', TRANSCRIBE_MODEL)
    form.append('language', 'es')
    form.append(
      'prompt',
      'Dictado para una cotización de Algoritmo T. Términos frecuentes: módulo, cotización, curso virtual, syllabus, LMS, hito, entregable, cronograma, COP, USD.'
    )

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const message = payload?.error?.message || `OpenAI respondió ${response.status}`
      // el modelo nuevo puede no estar habilitado para audio: reintento con whisper
      if (/model/i.test(message) && TRANSCRIBE_MODEL !== 'whisper-1') {
        form.set('model', 'whisper-1')
        const retry = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        })
        const retryPayload = await retry.json().catch(() => null)
        if (retry.ok) {
          return res.status(200).json({ ok: true, text: String(retryPayload?.text || '').trim(), model: 'whisper-1' })
        }
      }
      return res.status(502).json({ ok: false, error: message })
    }

    return res.status(200).json({ ok: true, text: String(payload?.text || '').trim(), model: TRANSCRIBE_MODEL })
  } catch (error: any) {
    console.error('quotes/transcribe error:', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
