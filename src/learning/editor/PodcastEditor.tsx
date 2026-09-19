/**
 * Learning Builder — editor del pódcast.
 *
 * Un episodio se escribe como se escucha: en columna, intervención tras
 * intervención, con el hablante a la izquierda. Por eso no hay panel de
 * propiedades ni formulario por campos — el guion ES la pantalla, y se teclea
 * seguido igual que se leería en voz alta.
 *
 * La locución se genera intervención por intervención y desde la propia
 * intervención, no desde un botón global: así se rehace la frase que salió
 * mal sin volver a pagar el episodio entero, y se ve al momento cuál tiene
 * audio y cuál no.
 */
import { useState } from 'react'
import {
  AlertTriangle, ChevronDown, ChevronUp, Copy, Loader2, MessageSquare, Mic, Plus, Trash2, Users, Volume2,
} from 'lucide-react'
import type { LbIssue } from '../lib/blocks'
import type { LbDirectives } from '../lib/directives'
import {
  LB_PODCAST_PARTS, LB_PODCAST_PART_LABEL, podcastSeconds,
  type LbPodcastContent, type LbPodcastCue, type LbSpeaker,
} from '../lib/podcast'
import { clock, newLbId } from '../lib/common'
import { learningApi, type VoiceRow } from '../lib/api'
import { CoverFields } from './CoverFields'
import { addCls, eyebrowCls, fieldCls, move, textareaCls } from './ui'

export function PodcastEditor({
  resourceId,
  content,
  directives,
  issues,
  onChange,
  commentsByAnchor,
  onOpenComments,
}: {
  resourceId: string
  content: LbPodcastContent
  directives: LbDirectives
  issues: LbIssue[]
  onChange: (next: LbPodcastContent) => void
  commentsByAnchor?: Map<string, { total: number; open: number }>
  onOpenComments?: (anchor: string) => void
}) {
  const [tab, setTab] = useState<'guion' | 'voces' | 'portada'>('guion')
  const [voices, setVoices] = useState<VoiceRow[] | null>(null)
  const [voiceError, setVoiceError] = useState('')
  const [speaking, setSpeaking] = useState<string>('')

  const issuesByCue = new Map<string, LbIssue[]>()
  for (const issue of issues) {
    if (!issue.blockId) continue
    issuesByCue.set(issue.blockId, [...(issuesByCue.get(issue.blockId) || []), issue])
  }

  const setCues = (cues: LbPodcastCue[]) => onChange({ ...content, cues })
  const patchCue = (id: string, patch: Partial<LbPodcastCue>) =>
    setCues(content.cues.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  const setSpeakers = (speakers: LbSpeaker[]) => onChange({ ...content, speakers })

  const loadVoices = async () => {
    setVoiceError('')
    try {
      const payload = await learningApi.voice.list(resourceId)
      setVoices(payload.voices)
    } catch (error: any) {
      setVoiceError(error?.message || 'No se pudieron traer las voces')
      setVoices([])
    }
  }

  const speak = async (cue: LbPodcastCue) => {
    setSpeaking(cue.id)
    setVoiceError('')
    try {
      // El servidor devuelve el guion entero ya guardado: se adopta tal cual
      // para no quedarse con una copia que no tiene el audio nuevo.
      const payload = await learningApi.voice.speak(resourceId, cue.id)
      onChange(payload.content)
    } catch (error: any) {
      setVoiceError(error?.message || 'No se pudo generar la locución')
    } finally {
      setSpeaking('')
    }
  }

  const addCue = (after?: number) => {
    const created: LbPodcastCue = {
      id: newLbId('c'),
      part: 'dialogue',
      speakerId: content.speakers[0]?.id,
      text: '',
    }
    const cues = [...content.cues]
    cues.splice(after === undefined ? cues.length : after + 1, 0, created)
    setCues(cues)
  }

  const withAudio = content.cues.filter((cue) => cue.audio?.url).length
  const written = content.cues.filter((cue) => cue.text.trim()).length

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        {([['guion', 'Guion', Mic], ['voces', 'Voces', Users], ['portada', 'Portada', MessageSquare]] as const).map(
          ([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold ${
                tab === key ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          )
        )}
        <div className="ml-auto flex items-center gap-3 text-[12px] text-slate-500">
          <span>{clock(podcastSeconds(content))} estimados</span>
          <span>{withAudio} de {written} con locución</span>
        </div>
      </div>

      {voiceError && (
        <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-[12.5px] font-semibold text-rose-700">
          {voiceError}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {tab === 'portada' && (
          <CoverFields cover={content.cover} directives={directives} onChange={(cover) => onChange({ ...content, cover })} />
        )}

        {tab === 'voces' && (
          <SpeakersPanel
            speakers={content.speakers}
            voices={voices}
            onLoadVoices={loadVoices}
            onChange={setSpeakers}
          />
        )}

        {tab === 'guion' && (
          <div className="mx-auto max-w-3xl">
            {content.cues.map((cue, index) => (
              <CueRow
                key={cue.id}
                cue={cue}
                index={index}
                speakers={content.speakers}
                issues={issuesByCue.get(cue.id) || []}
                comments={commentsByAnchor?.get(`block:${cue.id}`)}
                onOpenComments={onOpenComments && (() => onOpenComments(`block:${cue.id}`))}
                speaking={speaking === cue.id}
                busy={!!speaking}
                onSpeak={() => speak(cue)}
                onChange={(patch) => patchCue(cue.id, patch)}
                onMove={(delta) => setCues(move(content.cues, index, index + delta))}
                onDuplicate={() => {
                  const copy: LbPodcastCue = { ...structuredClone(cue), id: newLbId('c'), audio: undefined }
                  const cues = [...content.cues]
                  cues.splice(index + 1, 0, copy)
                  setCues(cues)
                }}
                onRemove={() => setCues(content.cues.filter((row) => row.id !== cue.id))}
                onAddAfter={() => addCue(index)}
              />
            ))}
            <button onClick={() => addCue()} className={`${addCls} mt-3 w-full justify-center py-2.5`}>
              <Plus size={14} /> Añadir intervención
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function CueRow({
  cue, index, speakers, issues, comments, onOpenComments,
  speaking, busy, onSpeak, onChange, onMove, onDuplicate, onRemove, onAddAfter,
}: {
  cue: LbPodcastCue
  index: number
  speakers: LbSpeaker[]
  issues: LbIssue[]
  comments?: { total: number; open: number }
  onOpenComments?: () => void
  speaking: boolean
  busy: boolean
  onSpeak: () => void
  onChange: (patch: Partial<LbPodcastCue>) => void
  onMove: (delta: number) => void
  onDuplicate: () => void
  onRemove: () => void
  onAddAfter: () => void
}) {
  const [notesOpen, setNotesOpen] = useState(!!cue.notes)
  const hasErrors = issues.some((issue) => issue.level === 'error')
  const speaker = speakers.find((row) => row.id === cue.speakerId)
  const canSpeak = !!cue.text.trim() && !!(speaker?.voiceId || speakers.length)

  return (
    <article className={`mb-2 rounded-xl border bg-white ${hasErrors ? 'border-rose-300' : 'border-slate-200'}`}>
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-200 text-[10.5px] font-bold text-slate-500">
          {index + 1}
        </span>
        <select
          value={cue.speakerId || ''}
          onChange={(event) => onChange({ speakerId: event.target.value || undefined })}
          className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[12.5px] font-semibold text-slate-700"
        >
          <option value="">Sin voz</option>
          {speakers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
        <select
          value={cue.part}
          onChange={(event) => onChange({ part: event.target.value as LbPodcastCue['part'] })}
          className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11.5px] text-slate-600"
        >
          {LB_PODCAST_PARTS.map((part) => <option key={part} value={part}>{LB_PODCAST_PART_LABEL[part]}</option>)}
        </select>

        {cue.audio?.url && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <Volume2 size={11} /> {cue.audio.seconds ? clock(cue.audio.seconds) : 'con audio'}
          </span>
        )}

        <div className="flex-1" />

        {!!comments?.total && (
          <button
            onClick={onOpenComments}
            className={`inline-flex items-center gap-0.5 text-[11px] font-bold hover:underline ${
              comments.open ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            <MessageSquare size={11} /> {comments.total}
          </button>
        )}
        <button
          onClick={onSpeak}
          disabled={!canSpeak || busy}
          title={canSpeak ? 'Generar la locución de esta intervención' : 'Escribe el texto y asigna una voz'}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-bold text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          {speaking ? <Loader2 size={12} className="animate-spin" /> : <Mic size={12} />}
          {cue.audio?.url ? 'Rehacer' : 'Locutar'}
        </button>
        <button onClick={() => onMove(-1)} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100" aria-label="Subir"><ChevronUp size={14} /></button>
        <button onClick={() => onMove(1)} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100" aria-label="Bajar"><ChevronDown size={14} /></button>
        <button onClick={onDuplicate} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100" aria-label="Duplicar"><Copy size={14} /></button>
        <button onClick={onRemove} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Eliminar"><Trash2 size={14} /></button>
      </header>

      <div className="space-y-2 p-3">
        {issues.length > 0 && (
          <ul className="space-y-1 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            {issues.map((issue, position) => (
              <li key={position} className="flex items-start gap-1.5">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {issue.message}
              </li>
            ))}
          </ul>
        )}

        {(cue.part === 'intro' || cue.part === 'outro' || cue.part === 'insight' || cue.title) && (
          <input
            value={cue.title || ''}
            onChange={(event) => onChange({ title: event.target.value })}
            className={fieldCls}
            placeholder="Rótulo del tramo (aparece en el índice)"
          />
        )}

        <textarea
          value={cue.text}
          onChange={(event) => onChange({ text: event.target.value })}
          rows={Math.min(12, Math.max(3, Math.ceil(cue.text.length / 90)))}
          className={textareaCls}
          placeholder="Lo que se dice. Se locuta tal cual, así que escríbelo como se habla."
        />

        <div className="flex items-center gap-3 text-[11.5px] text-slate-400">
          <span>{cue.text.trim().split(/\s+/).filter(Boolean).length} palabras</span>
          <button onClick={() => setNotesOpen((value) => !value)} className="font-semibold text-slate-500 hover:text-slate-800">
            {notesOpen ? 'Ocultar' : 'Añadir'} indicación de producción
          </button>
          <div className="flex-1" />
          <button onClick={onAddAfter} className="font-semibold text-indigo-600 hover:underline">
            + Intervención debajo
          </button>
        </div>

        {notesOpen && (
          <textarea
            value={cue.notes || ''}
            onChange={(event) => onChange({ notes: event.target.value })}
            rows={2}
            className={`${textareaCls} bg-amber-50/50`}
            placeholder="Indicación para producción: no se locuta ni se publica."
          />
        )}

        {cue.audio?.url && (
          <audio controls src={cue.audio.url} className="w-full" preload="none" />
        )}
      </div>
    </article>
  )
}

function SpeakersPanel({
  speakers,
  voices,
  onLoadVoices,
  onChange,
}: {
  speakers: LbSpeaker[]
  voices: VoiceRow[] | null
  onLoadVoices: () => void
  onChange: (next: LbSpeaker[]) => void
}) {
  const patch = (id: string, value: Partial<LbSpeaker>) =>
    onChange(speakers.map((row) => (row.id === id ? { ...row, ...value } : row)))

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-[15px] font-black tracking-tight">Voces del episodio</h3>
        <div className="flex-1" />
        <button
          onClick={onLoadVoices}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100"
        >
          {voices ? 'Actualizar voces' : 'Traer voces de ElevenLabs'}
        </button>
      </div>
      <p className="text-[12.5px] text-slate-500">
        Cada hablante se locuta siempre con su voz. Las voces salen de la cuenta de ElevenLabs
        de este workspace; si la lista viene vacía, configúrala en Integraciones.
      </p>

      {speakers.map((speaker, index) => (
        <div key={speaker.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className={eyebrowCls}>Voz {index + 1}</span>
            <div className="flex-1" />
            <button
              onClick={() => onChange(speakers.filter((row) => row.id !== speaker.id))}
              className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              aria-label="Quitar voz"
            >
              <Trash2 size={13} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[13px]">
              <span className="mb-1 block font-semibold text-slate-600">Cómo se le nombra</span>
              <input value={speaker.name} onChange={(event) => patch(speaker.id, { name: event.target.value })} className={fieldCls} />
            </label>
            <label className="text-[13px]">
              <span className="mb-1 block font-semibold text-slate-600">Voz de ElevenLabs</span>
              {voices?.length ? (
                <select
                  value={speaker.voiceId || ''}
                  onChange={(event) => patch(speaker.id, { voiceId: event.target.value || undefined })}
                  className={fieldCls}
                >
                  <option value="">Sin asignar</option>
                  {voices.map((voice) => (
                    <option key={voice.voiceId} value={voice.voiceId}>{voice.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={speaker.voiceId || ''}
                  onChange={(event) => patch(speaker.id, { voiceId: event.target.value || undefined })}
                  className={fieldCls}
                  placeholder="Identificador de voz"
                />
              )}
            </label>
            <label className="text-[13px] sm:col-span-2">
              <span className="mb-1 block font-semibold text-slate-600">Qué papel cumple</span>
              <input
                value={speaker.role || ''}
                onChange={(event) => patch(speaker.id, { role: event.target.value || undefined })}
                className={fieldCls}
                placeholder="Conduce la conversación · Aporta el criterio disciplinar…"
              />
            </label>
            <label className="text-[13px] sm:col-span-2">
              <span className="mb-1 block font-semibold text-slate-600">Indicación de interpretación</span>
              <input
                value={speaker.style || ''}
                onChange={(event) => patch(speaker.id, { style: event.target.value || undefined })}
                className={fieldCls}
                placeholder="Tono cercano, ritmo pausado…"
              />
            </label>
          </div>
          {voices?.length && speaker.voiceId ? (
            <VoicePreview voice={voices.find((row) => row.voiceId === speaker.voiceId)} />
          ) : null}
        </div>
      ))}

      <button
        onClick={() => onChange([...speakers, { id: newLbId('v'), name: `Voz ${speakers.length + 1}` }])}
        className={addCls}
      >
        <Plus size={13} /> Añadir voz
      </button>
    </div>
  )
}

function VoicePreview({ voice }: { voice?: VoiceRow }) {
  if (!voice?.preview) return null
  return <audio controls src={voice.preview} preload="none" className="mt-3 h-8 w-full max-w-xs" />
}
