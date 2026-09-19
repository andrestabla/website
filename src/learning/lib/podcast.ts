/**
 * Learning Builder · pódcast.
 *
 * Un episodio es un guion a varias voces: una lista de intervenciones en
 * orden, cada una con su hablante y su texto. La locución se genera con
 * ElevenLabs intervención por intervención —así se puede rehacer una sola sin
 * volver a producir el episodio entero— y el audio resultante se guarda en R2.
 *
 * El guion es la fuente de verdad, no el audio: si no hay locución todavía, el
 * recurso sigue siendo visible, exportable y publicable como guion leído.
 *
 * Lo importa la UI y también el API, así que no puede depender de React.
 */
import type { LbCover } from './blocks.js'
import type { LbDirectives } from './directives.js'
import {
  coverAnchors, coverIssues, ident, newLbId, num, pick, safeUrl, sanitizeCover, str,
  type LbAnchorTarget, type LbIssue,
} from './common.js'

/** Audio ya producido de una intervención o del episodio completo. */
export type LbAudio = {
  url: string
  /** Duración en segundos, cuando se conoce. */
  seconds?: number
  /** Voz de ElevenLabs con la que se generó, para poder rehacerlo igual. */
  voiceId?: string
  generatedAt?: string
}

export type LbSpeaker = {
  id: string
  /** Cómo se le nombra en el guion y en la transcripción. */
  name: string
  /** Qué papel cumple: conduce, experta invitada, estudiante… */
  role?: string
  /** Voz de ElevenLabs asignada a este hablante. */
  voiceId?: string
  /** Indicación de interpretación para la locución. */
  style?: string
}

export const LB_PODCAST_PARTS = ['intro', 'dialogue', 'insight', 'question', 'outro'] as const
export type LbPodcastPart = (typeof LB_PODCAST_PARTS)[number]

export const LB_PODCAST_PART_LABEL: Record<LbPodcastPart, string> = {
  intro: 'Entrada',
  dialogue: 'Diálogo',
  insight: 'Idea clave',
  question: 'Pregunta al oyente',
  outro: 'Cierre',
}

export type LbPodcastCue = {
  id: string
  part: LbPodcastPart
  /** Hablante de esta intervención; vacío en cortinillas. */
  speakerId?: string
  /** Rótulo del tramo en el índice del reproductor. */
  title?: string
  /** Lo que se locuta. Es también la transcripción. */
  text: string
  /** Indicaciones de producción: no se locutan ni se publican. */
  notes?: string
  audio?: LbAudio
}

export type LbPodcastContent = {
  cover: LbCover
  speakers: LbSpeaker[]
  cues: LbPodcastCue[]
  /** Episodio montado de una pieza, cuando existe. */
  master?: LbAudio
}

// ── Saneamiento ──────────────────────────────────────────────────────────────

const MAX_SPEAKERS = 8
const MAX_CUES = 200

function sanitizeAudio(value: unknown): LbAudio | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Record<string, unknown>
  const url = safeUrl(raw.url)
  if (!url) return undefined
  const audio: LbAudio = { url }
  if (raw.seconds !== undefined) audio.seconds = num(raw.seconds, 0, 0, 36000)
  const voiceId = str(raw.voiceId, 80); if (voiceId) audio.voiceId = voiceId
  const generatedAt = str(raw.generatedAt, 40); if (generatedAt) audio.generatedAt = generatedAt
  return audio
}

function sanitizeSpeaker(value: unknown, index: number): LbSpeaker {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const speaker: LbSpeaker = {
    id: ident(raw.id, 'v'),
    name: str(raw.name, 120) || `Voz ${index + 1}`,
  }
  const role = str(raw.role, 200); if (role) speaker.role = role
  const voiceId = str(raw.voiceId, 80); if (voiceId) speaker.voiceId = voiceId
  const style = str(raw.style, 400); if (style) speaker.style = style
  return speaker
}

function sanitizeCue(value: unknown): LbPodcastCue {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const cue: LbPodcastCue = {
    id: ident(raw.id, 'c'),
    part: pick(raw.part, LB_PODCAST_PARTS, 'dialogue'),
    text: str(raw.text, 6000),
  }
  const speakerId = str(raw.speakerId, 40).replace(/[^a-zA-Z0-9_-]/g, ''); if (speakerId) cue.speakerId = speakerId
  const title = str(raw.title, 200); if (title) cue.title = title
  const notes = str(raw.notes, 2000); if (notes) cue.notes = notes
  const audio = sanitizeAudio(raw.audio); if (audio) cue.audio = audio
  return cue
}

export function sanitizePodcast(value: unknown): LbPodcastContent {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const speakers = (Array.isArray(raw.speakers) ? (raw.speakers as unknown[]).slice(0, MAX_SPEAKERS) : []).map(
    sanitizeSpeaker
  )
  const cues = (Array.isArray(raw.cues) ? (raw.cues as unknown[]).slice(0, MAX_CUES) : []).map(sanitizeCue)
  const content: LbPodcastContent = { cover: sanitizeCover(raw.cover), speakers, cues }
  const master = sanitizeAudio(raw.master); if (master) content.master = master
  return content
}

export function scaffoldPodcast(title: string): LbPodcastContent {
  const host = newLbId('v')
  const guest = newLbId('v')
  return {
    cover: { title, summary: '', outcomes: [] },
    speakers: [
      { id: host, name: 'Conducción', role: 'Presenta el tema y guía la conversación.' },
      { id: guest, name: 'Voz experta', role: 'Aporta el criterio disciplinar.' },
    ],
    cues: [
      { id: newLbId('c'), part: 'intro', speakerId: host, title: 'Entrada', text: '' },
      { id: newLbId('c'), part: 'dialogue', speakerId: guest, text: '' },
      { id: newLbId('c'), part: 'outro', speakerId: host, title: 'Cierre', text: '' },
    ],
  }
}

// ── Validación ───────────────────────────────────────────────────────────────

export function validatePodcast(content: LbPodcastContent, directives: LbDirectives): LbIssue[] {
  const rules = directives.instructional.rules
  const issues: LbIssue[] = coverIssues(content.cover, rules)
  const known = new Set(content.speakers.map((speaker) => speaker.id))

  if (!content.cues.length) {
    issues.push({ level: 'error', message: 'El episodio no tiene ninguna intervención.' })
  }
  if (!content.speakers.length) {
    issues.push({ level: 'error', message: 'El episodio no tiene voces declaradas.' })
  }

  const spoken = content.cues.filter((cue) => cue.text.trim())
  if (spoken.length && spoken.length < content.cues.length) {
    issues.push({
      level: 'warning',
      message: `${content.cues.length - spoken.length} intervención(es) están vacías y no se locutarán.`,
    })
  }

  for (const cue of content.cues) {
    if (cue.speakerId && !known.has(cue.speakerId)) {
      issues.push({
        level: 'error', blockId: cue.id,
        message: 'Una intervención está asignada a una voz que ya no existe.',
      })
    }
    if (cue.text.length > rules.maxParagraphChars * 2) {
      issues.push({
        level: 'warning', blockId: cue.id,
        message: `Una intervención de ${cue.text.length} caracteres se hará larga al oído: pártela en dos.`,
      })
    }
  }

  const withAudio = content.cues.filter((cue) => cue.audio?.url).length
  if (!content.master?.url && withAudio < spoken.length) {
    issues.push({
      level: 'warning',
      message: `Faltan ${spoken.length - withAudio} locución(es): el episodio se publicará como guion leído.`,
    })
  }

  return issues
}

// ── Utilidades ───────────────────────────────────────────────────────────────

/** Duración estimada del episodio, en segundos. */
export function podcastSeconds(content: LbPodcastContent): number {
  if (content.master?.seconds) return content.master.seconds
  const known = content.cues.reduce((total, cue) => total + (cue.audio?.seconds || 0), 0)
  if (known) return known
  // Sin audio, se estima por el guion: unas 150 palabras por minuto.
  const words = content.cues.reduce((total, cue) => total + cue.text.split(/\s+/).filter(Boolean).length, 0)
  return Math.round((words / 150) * 60)
}

export function speakerOf(content: LbPodcastContent, cue: LbPodcastCue): LbSpeaker | undefined {
  return content.speakers.find((speaker) => speaker.id === cue.speakerId)
}

export function podcastAnchorTargets(content: LbPodcastContent): LbAnchorTarget[] {
  const targets = coverAnchors(content.cover)
  content.cues.forEach((cue, index) => {
    const speaker = speakerOf(content, cue)
    targets.push({
      anchor: `block:${cue.id}`,
      kind: 'block',
      label: `${index + 1}. ${cue.title || LB_PODCAST_PART_LABEL[cue.part]}${speaker ? ` · ${speaker.name}` : ''}`,
      preview: cue.text.slice(0, 120),
      depth: 1,
    })
  })
  return targets
}
