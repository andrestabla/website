/**
 * Learning Builder · locución de los pódcast con ElevenLabs.
 *
 *   op=voices  → las voces disponibles en la cuenta del workspace
 *   op=speak   → genera el audio de UNA intervención y lo guarda en R2
 *
 * Se genera intervención por intervención, y no el episodio de una vez, por
 * tres razones prácticas: corregir una frase no obliga a pagar la locución
 * entera, el editor puede mostrar el avance real, y ninguna petición se acerca
 * al límite de tiempo de la función.
 *
 * El audio se pide con marcas de tiempo por carácter, que es la única forma de
 * saber cuánto dura sin decodificar el MP3; esa duración es después la que
 * ordena el reproductor y la transcripción.
 */
import { denied, guard, requireModule } from '../_lib/lb-auth.js'
import { missingCredential, resolveCredential } from '../_lib/lb-integrations.js'
import { loadResource, lbResources, snapshot } from '../_lib/lb-store.js'
import { resourceFolder, workspaceBucket } from '../_lib/lb-storage.js'
import { familyOf } from '../../src/learning/lib/content.js'
import { sanitizePodcast, type LbPodcastContent } from '../../src/learning/lib/podcast.js'

type VercelRequest = any
type VercelResponse = any

const API = 'https://api.elevenlabs.io/v1'
const DEFAULT_MODEL = 'eleven_multilingual_v2'
/** Tope por intervención: por encima, el guion pide partirse en dos. */
const MAX_CHARS = 4000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  const op = String(body.op || '')
  const resourceId = String(body.resourceId || '')

  try {
    const gate = await requireModule(req)
    if (!gate.ok) return denied(res, gate)
    if (!resourceId) return res.status(400).json({ ok: false, error: 'Falta el recurso' })

    const loaded = await loadResource(resourceId)
    if (!loaded) return res.status(404).json({ ok: false, error: 'Recurso no encontrado' })
    const { resource, workspace } = loaded

    const check = await guard(req, resource.workspaceId, 'resource.edit', gate.session)
    if (!check.ok) return denied(res, check)

    if (familyOf(resource.kind) !== 'podcast') {
      return res.status(400).json({ ok: false, error: 'La locución solo se genera en recursos de tipo pódcast.' })
    }

    const credential = await resolveCredential(workspace, 'elevenlabs')
    if (!credential) return res.status(400).json({ ok: false, error: missingCredential('elevenlabs') })
    const apiKey = credential.values.apiKey
    const model = credential.values.model || DEFAULT_MODEL

    // ── Voces de la cuenta ──
    if (op === 'voices') {
      const response = await fetch(`${API}/voices`, { headers: { 'xi-api-key': apiKey } })
      if (!response.ok) {
        return res.status(502).json({ ok: false, error: `ElevenLabs respondió ${response.status} al listar las voces.` })
      }
      const data = (await response.json()) as any
      const voices = (Array.isArray(data?.voices) ? data.voices : []).map((voice: any) => ({
        voiceId: String(voice?.voice_id || ''),
        name: String(voice?.name || ''),
        category: String(voice?.category || ''),
        preview: String(voice?.preview_url || ''),
        labels: voice?.labels && typeof voice.labels === 'object' ? voice.labels : {},
      }))
      return res.status(200).json({ ok: true, voices, defaultVoiceId: credential.values.defaultVoiceId || '' })
    }

    if (op !== 'speak') return res.status(400).json({ ok: false, error: `Operación desconocida: ${op}` })

    // ── Locución de una intervención ──
    const cueId = String(body.cueId || '')
    const content = sanitizePodcast(resource.content) as LbPodcastContent
    const cue = content.cues.find((row) => row.id === cueId)
    if (!cue) return res.status(404).json({ ok: false, error: 'Esa intervención no está en el guion.' })

    const text = cue.text.trim()
    if (!text) return res.status(400).json({ ok: false, error: 'La intervención no tiene texto que locutar.' })
    if (text.length > MAX_CHARS) {
      return res.status(400).json({
        ok: false,
        error: `La intervención tiene ${text.length} caracteres; el máximo por locución es ${MAX_CHARS}. Pártela en dos.`,
      })
    }

    const speaker = content.speakers.find((row) => row.id === cue.speakerId)
    const voiceId = String(body.voiceId || speaker?.voiceId || credential.values.defaultVoiceId || '')
    if (!voiceId) {
      return res.status(400).json({
        ok: false,
        error: 'Esta intervención no tiene voz asignada. Elige una en la ficha del hablante.',
      })
    }

    // Las marcas por carácter son lo que permite saber la duración exacta.
    const response = await fetch(`${API}/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: model,
        // El estilo del hablante se antepone como indicación de lectura.
        ...(speaker?.style ? { previous_text: speaker.style } : {}),
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
      }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return res.status(502).json({
        ok: false,
        error: `ElevenLabs respondió ${response.status}: ${detail.slice(0, 200) || 'sin detalle'}`,
      })
    }

    const payload = (await response.json()) as any
    const audioBase64 = String(payload?.audio_base64 || '')
    if (!audioBase64) return res.status(502).json({ ok: false, error: 'ElevenLabs no devolvió audio.' })
    const buffer = Buffer.from(audioBase64, 'base64')

    const ends: number[] = Array.isArray(payload?.alignment?.character_end_times_seconds)
      ? payload.alignment.character_end_times_seconds
      : []
    const seconds = ends.length ? Math.ceil(ends[ends.length - 1]) : 0

    const bucket = await workspaceBucket(workspace)
    // La marca de tiempo en el nombre evita que la caché del navegador
    // devuelva la locución anterior tras rehacerla.
    const key = `${resourceFolder(workspace.code, resource.code)}/audio/${cue.id}-${Date.now()}.mp3`
    const stored = await bucket.put(key, buffer, 'audio/mpeg')

    const next: LbPodcastContent = {
      ...content,
      cues: content.cues.map((row) =>
        row.id === cue.id
          ? { ...row, audio: { url: stored.url, seconds, voiceId, generatedAt: new Date().toISOString() } }
          : row
      ),
    }

    await snapshot(resource.id, resource.content, 'ai', check.session.userId, `Antes de locutar «${cue.title || cue.id}»`)
    await lbResources().update({ where: { id: resource.id }, data: { content: next as any } })

    return res.status(200).json({
      ok: true,
      cueId: cue.id,
      audio: next.cues.find((row) => row.id === cue.id)?.audio,
      bytes: stored.bytes,
      storage: bucket.source,
      content: next,
    })
  } catch (error: any) {
    console.error('api/learning/voice error', error)
    return res.status(500).json({ ok: false, error: error?.message || 'Error interno' })
  }
}
