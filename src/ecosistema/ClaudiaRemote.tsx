import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Send, Loader2, CheckCircle2, XCircle, Clock, Ban, Monitor, MonitorOff, Mic, MicOff, Volume2, VolumeX, Video, VideoOff } from 'lucide-react'
import { useClaudiaAvatar } from './claudia/useClaudiaAvatar'
import { useDictation } from './claudia/useDictation'
import { useVision, type Gesture } from './claudia/useVision'

type Job = {
  id: string
  status: 'PENDING' | 'TAKEN' | 'DONE' | 'ERROR' | 'CANCELLED'
  prompt: string
  project: string | null
  result: string | null
  events: { tool?: string; label?: string; text?: string }[] | null
  createdAt: string
  doneAt: string | null
}

type Device = { online: boolean; lastSeen: string | null; projects: string[] }

const STATUS_META: Record<Job['status'], { label: string; cls: string; Icon: any }> = {
  PENDING: { label: 'En cola', cls: 'text-amber-600 bg-amber-50 border-amber-200', Icon: Clock },
  TAKEN: { label: 'Ejecutando', cls: 'text-sky-600 bg-sky-50 border-sky-200', Icon: Loader2 },
  DONE: { label: 'Lista', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200', Icon: CheckCircle2 },
  ERROR: { label: 'Falló', cls: 'text-rose-600 bg-rose-50 border-rose-200', Icon: XCircle },
  CANCELLED: { label: 'Cancelada', cls: 'text-slate-500 bg-slate-50 border-slate-200', Icon: Ban },
}

function hace(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  if (d < 60_000) return 'hace un momento'
  if (d < 3_600_000) return `hace ${Math.round(d / 60_000)} min`
  if (d < 86_400_000) return `hace ${Math.round(d / 3_600_000)} h`
  return `hace ${Math.round(d / 86_400_000)} d`
}

export function ClaudiaRemote() {
  const [device, setDevice] = useState<Device>({ online: false, lastSeen: null, projects: [] })
  const [jobs, setJobs] = useState<Job[]>([])
  const [prompt, setPrompt] = useState('')
  const [project, setProject] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const timer = useRef<number | null>(null)

  // Avatar 3D + voz (misma experiencia que la interfaz local)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const avatar = useClaudiaAvatar(stageRef)
  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const spokenRef = useRef<Set<string>>(new Set())
  const promptRef = useRef(prompt)
  promptRef.current = prompt

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/claudia?action=status')
      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.ok) {
        setError(payload?.error || 'No se pudo consultar el equipo.')
        return
      }
      setError('')
      setDevice(payload.device)
      setJobs(payload.jobs || [])
    } catch {
      setError('Error de conexión.')
    }
  }, [])

  useEffect(() => {
    void load()
    timer.current = window.setInterval(() => void load(), 4000)
    return () => { if (timer.current) window.clearInterval(timer.current) }
  }, [load])

  const submit = useCallback(async (raw: string) => {
    const text = raw.trim()
    if (!text) return
    setSending(true)
    try {
      const res = await fetch('/api/claudia?action=enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, project: project || undefined }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.ok) {
        setError(payload?.error || 'No se pudo enviar la tarea.')
      } else {
        setPrompt('')
        if (!mutedRef.current) void avatar.speak('Listo, se la mando a tu equipo.')
        void load()
      }
    } catch {
      setError('Error de conexión.')
    } finally {
      setSending(false)
    }
  }, [avatar, load, project])

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sending) void submit(prompt)
  }

  const dictation = useDictation({
    onDraft: (t) => setPrompt(t),
    onSubmit: (t) => void submit(t),
    getDraft: () => promptRef.current,
  })

  // Cámara: gestos de mano (misma correspondencia que en la Mac)
  const [camOn, setCamOn] = useState(false)
  const dictationRef = useRef(dictation)
  dictationRef.current = dictation
  const onGesture = useCallback((g: Gesture) => {
    if (g === 'Thumb_Up') { const d = promptRef.current.trim(); if (d) void submit(d) }
    else if (g === 'Thumb_Down') setPrompt('')
    else if (g === 'Open_Palm') avatar.stop()
  }, [avatar, submit])
  const vision = useVision({ onGesture, enabled: camOn })

  // Claudia narra el resultado de cada tarea apenas llega (una sola vez).
  // Al abrir la página no lee el historial: solo lo que ocurra de ahí en adelante.
  const seededRef = useRef(false)
  const speakFn = avatar.speak
  useEffect(() => {
    if (!jobs.length) return
    if (!seededRef.current) {
      seededRef.current = true
      jobs.forEach((j) => spokenRef.current.add(j.id))
      return
    }
    if (muted) return
    const finished = jobs.find(
      (j) => (j.status === 'DONE' || j.status === 'ERROR') && j.result && !spokenRef.current.has(j.id),
    )
    if (!finished?.result) return
    spokenRef.current.add(finished.id)
    void speakFn(finished.result.slice(0, 900))
  }, [jobs, muted, speakFn])

  const cancel = async (id: string) => {
    await fetch('/api/claudia?action=cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
    void load()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
        <Link to="/ecosistema" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <ArrowLeft size={18} />
        </Link>
        <div className="leading-tight">
          <div className="text-sm font-black tracking-tight">Claudia <span className="text-indigo-600">remoto</span></div>
          <div className="text-[11px] text-slate-400">Tu asistente en la Mac, desde cualquier lugar</div>
        </div>
        <div className="flex-1" />
        <div
          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold ${
            device.online ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          {device.online ? <Monitor size={14} /> : <MonitorOff size={14} />}
          {device.online ? 'Equipo en línea' : 'Equipo apagado'}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {!device.online && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800">
            La Mac no está conectada ahora mismo{device.lastSeen ? ` (última señal ${hace(device.lastSeen)})` : ''}.
            Puedes dejar la tarea en cola: se ejecutará apenas Claudia vuelva a estar en línea.
          </div>
        )}
        {error && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700">{error}</div>
        )}

        {/* Escenario de Claudia: su cara 3D, igual que en la Mac */}
        {!avatar.failed && (
          <div className="mb-5 flex flex-col items-center">
            <div className="relative">
              <div
                ref={stageRef}
                className="h-[240px] w-[240px] overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200 sm:h-[280px] sm:w-[280px]"
              />
              {!avatar.ready && (
                <div className="absolute inset-0 grid place-items-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              )}
              <button
                onClick={() => { setMuted((m) => !m); if (!muted) avatar.stop() }}
                title={muted ? 'Activar la voz' : 'Silenciar a Claudia'}
                className="absolute -right-2 bottom-2 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-indigo-600"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              {/* Mini-vista de la cámara (espejo), solo si está activa */}
              <video
                ref={vision.videoRef}
                playsInline
                muted
                className={`absolute -left-2 bottom-2 w-[72px] -scale-x-100 rounded-lg border border-slate-200 shadow-sm ${vision.running ? 'block' : 'hidden'}`}
              />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {avatar.speaking ? 'hablando…' : dictation.listening ? 'escuchando…' : vision.running ? (vision.present ? 'te veo' : 'busco tu cara…') : 'Claudia'}
              </span>
              <button
                onClick={() => setCamOn((v) => !v)}
                title={vision.error || (camOn ? 'Apagar cámara' : 'Activar cámara y gestos')}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                  camOn ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
                }`}
              >
                {camOn ? <Video size={13} /> : <VideoOff size={13} />}
                {camOn ? 'Gestos on' : 'Gestos'}
              </button>
            </div>
            {vision.error && <p className="mt-1 text-[11px] text-rose-500">{vision.error}</p>}
            {camOn && vision.running && (
              <p className="mt-1 text-[11px] text-slate-400">👍 enviar · 👎 borrar · ✋ callar</p>
            )}
          </div>
        )}

        <form onSubmit={send} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Nueva tarea</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Ej.: revisa el proyecto website y dime cómo quedó el último despliegue"
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:border-indigo-500"
          />
          {dictation.listening && (
            <p className="mt-1 text-[12px] italic text-indigo-500">
              {dictation.partial || 'Te escucho… di «adelante» para enviar.'}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {dictation.supported && (
              <button
                type="button"
                onClick={dictation.toggle}
                title={dictation.denied ? 'Permiso de micrófono denegado' : 'Dictar por voz'}
                className={`grid h-9 w-9 place-items-center rounded-full border transition ${
                  dictation.listening
                    ? 'border-rose-300 bg-rose-500 text-white shadow-[0_0_0_4px_rgba(244,63,94,.15)]'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
                }`}
              >
                {dictation.denied ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] outline-none focus:border-indigo-500"
            >
              <option value="">Mi Mac (toda la máquina)</option>
              {device.projects.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="flex-1" />
            <button
              type="submit"
              disabled={sending || !prompt.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Enviar a Claudia
            </button>
          </div>
        </form>

        <h2 className="mb-3 mt-8 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Actividad</h2>
        {jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-[13px] text-slate-400">
            Todavía no has enviado tareas remotas.
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => {
              const meta = STATUS_META[job.status] || STATUS_META.PENDING
              const running = job.status === 'TAKEN'
              return (
                <li key={job.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.cls}`}>
                      <meta.Icon size={12} className={running ? 'animate-spin' : ''} />
                      {meta.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold leading-snug">{job.prompt}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {job.project || 'Mi Mac'} · {hace(job.createdAt)}
                      </p>
                    </div>
                    {(job.status === 'PENDING' || job.status === 'TAKEN') && (
                      <button onClick={() => void cancel(job.id)} className="shrink-0 text-[11px] font-semibold text-slate-400 hover:text-rose-600">
                        Cancelar
                      </button>
                    )}
                  </div>

                  {job.events && job.events.length > 0 && (
                    <div className="mt-3 space-y-1 border-l-2 border-slate-100 pl-3">
                      {job.events.slice(-6).map((ev, i) => (
                        <div key={i} className="truncate text-[11.5px] text-slate-400">
                          <span className="font-semibold text-indigo-500">{ev.label || ev.tool}</span> {ev.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {job.result && (
                    <div className={`mt-3 rounded-xl p-3 text-[13.5px] leading-relaxed ${job.status === 'ERROR' ? 'bg-rose-50 text-rose-800' : 'bg-slate-50 text-slate-700'}`}>
                      {job.result}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}

export default ClaudiaRemote
