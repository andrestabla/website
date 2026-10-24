/**
 * Learning Builder — revisión externa (/revision/:token).
 *
 * La página que recibe el cliente o el par revisor. Primero se identifica;
 * después ve la pieza tal como la verá el estudiante y, al activar «Señalar»,
 * pulsa la foto, el párrafo o el botón que quiere comentar. El comentario
 * queda clavado ahí: un pin numerado sobre la pieza y su hilo en el panel.
 *
 * La pieza vive en un marco del mismo sitio y se habla con ella por mensajes
 * (la capa está en api/_lib/lb-review.ts). Lo que aquí se decide es el flujo:
 * qué se señaló, qué se escribe, a qué hilo se responde.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import {
  Crosshair, Loader2, MessageSquare, MessageSquarePlus, CheckCircle2, CornerDownRight, Pencil, Trash2,
  X, LogOut, ShieldCheck, PanelRightClose, PanelRightOpen,
} from 'lucide-react'
import { LB_THREAD_STATES, LB_THREAD_STATE_LABEL, describeTarget, threadState, type LbReviewTarget, type LbThreadState } from '../lib/review'
import { timeAgo } from '../lib/api'

type Reviewer = { name: string; email: string; org: string }

type ReviewComment = {
  id: string
  n?: number
  parentId: string | null
  anchorLabel: string | null
  target: LbReviewTarget | null
  body: string
  status: 'OPEN' | 'RESOLVED'
  createdAt: string
  updatedAt: string
  authorName: string
  authorOrg: string
  fromTeam: boolean
  mine: boolean
  /** Versión entregada sobre la que se comentó. */
  version: number | null
}

type Info = {
  title: string
  subtitle?: string | null
  code: string
  kind: string
  status: string
  workspaceName: string
}

/** Versiones entregadas del paquete (V1, V2…); vacío si el recurso no tiene paquete. */
type Versions = { live: number; list: Array<{ version: number; notes: string | null; createdAt: string; live: boolean }> }

type Pick = { target: LbReviewTarget; anchor: string } | { target: null; anchor: '' }

async function call<T = any>(token: string, op: string, data: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch('/api/learning/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ op, token, ...data }),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok || payload.ok === false) {
    const error: any = new Error(payload.error || `Error ${res.status}`)
    error.status = res.status
    throw error
  }
  return payload as T
}

export default function PublicReview() {
  const { token = '' } = useParams()
  const [info, setInfo] = useState<Info | null>(null)
  const [versions, setVersions] = useState<Versions>({ live: 1, list: [] })
  /** Entró con su sesión de Learning Builder: no hay formulario ni «Salir». */
  const [viaSession, setViaSession] = useState(false)
  const [reviewer, setReviewer] = useState<Reviewer | null>(null)
  const [fatal, setFatal] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    call(token, 'open')
      .then((payload) => {
        if (!alive) return
        setInfo(payload.resource)
        setReviewer(payload.reviewer)
        setViaSession(!!payload.viaSession)
        setVersions({ live: payload.live || 1, list: payload.versions || [] })
      })
      .catch((e) => { if (alive) setFatal(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [token])

  useEffect(() => {
    if (info) document.title = `Revisión · ${info.title}`
  }, [info])

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-100"><Loader2 className="animate-spin text-slate-400" /></div>
  }
  if (fatal || !info) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 p-6 text-center">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8">
          <h1 className="text-[20px] font-bold text-slate-900">Revisión no disponible</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-slate-500">{fatal || 'Este enlace de revisión ya no está activo.'}</p>
        </div>
      </div>
    )
  }
  if (!reviewer) return <Identify token={token} info={info} onDone={setReviewer} />
  return <Workspace token={token} info={info} versions={versions} reviewer={reviewer} viaSession={viaSession} onLeave={() => setReviewer(null)} />
}

// ── Identificación ───────────────────────────────────────────────────────────

function Identify({ token, info, onDone }: { token: string; info: Info; onDone: (reviewer: Reviewer) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [org, setOrg] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const payload = await call(token, 'identify', { name, email, org, consent })
      onDone(payload.reviewer)
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  const field = 'mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-[15px] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-600">Revisión · {info.workspaceName}</div>
        <h1 className="mt-2 text-[22px] font-bold leading-tight text-slate-900">{info.title}</h1>
        {info.subtitle && <p className="mt-1 text-[14px] text-slate-500">{info.subtitle}</p>}
        <p className="mt-4 text-[14px] leading-relaxed text-slate-600">
          Te invitaron a revisar este recurso. Indica quién eres para que el equipo sepa de quién es cada comentario.
        </p>

        <label className="mt-5 block text-[13px] font-semibold text-slate-700">
          Nombre completo
          <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className={field} />
        </label>
        <label className="mt-3 block text-[13px] font-semibold text-slate-700">
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={field} />
        </label>
        <label className="mt-3 block text-[13px] font-semibold text-slate-700">
          Organización o rol <span className="font-normal text-slate-400">(opcional)</span>
          <input value={org} onChange={(e) => setOrg(e.target.value)} autoComplete="organization" placeholder="p. ej. Unicafam · Docente par" className={field} />
        </label>

        <label className="mt-4 flex items-start gap-2.5 text-[12.5px] leading-snug text-slate-500">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600" />
          <span>
            Autorizo a Algoritmo T a tratar mi nombre, correo y comentarios para gestionar esta revisión, según la{' '}
            <a href="/politica-tratamiento-datos" target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 underline">
              política de tratamiento de datos
            </a>.
          </span>
        </label>

        {error && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-700">{error}</div>}

        <button
          type="submit"
          disabled={busy || !consent}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-[15px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Entrar a revisar
        </button>
      </form>
    </div>
  )
}

// ── Revisión ─────────────────────────────────────────────────────────────────

function Workspace({ token, info, versions, reviewer, viaSession, onLeave }: {
  token: string; info: Info; versions: Versions; reviewer: Reviewer; viaSession: boolean; onLeave: () => void
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  /*
   * La versión que se mira. La vigente es la que se comenta; las anteriores se
   * abren para ver qué se señaló sobre ellas y comprobar que se corrigió.
   */
  const [viewing, setViewing] = useState(versions.live)
  const isLive = viewing === versions.live
  const frameUrl = (version: number, path?: string) =>
    `/api/learning/review?token=${encodeURIComponent(token)}&frame=1${version !== versions.live ? `&v=${version}` : ''}${path ? `&path=${encodeURIComponent(path)}` : ''}`
  const [frameSrc, setFrameSrc] = useState(frameUrl(versions.live))
  const [page, setPage] = useState<string | null>(null)
  /** Lección dentro de la página, en piezas que navegan por ruta interna (Rise). */
  const [route, setRoute] = useState('')
  /** Pantalla del reproductor que se está viendo («Pantalla 9»), si lo dice. */
  const [slide, setSlide] = useState('')
  /** Aviso cuando el hilo pedido está en otra pantalla. */
  const [notice, setNotice] = useState('')
  const [pointing, setPointing] = useState(false)
  const [pick, setPick] = useState<Pick | null>(null)
  const [draft, setDraft] = useState('')
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [scope, setScope] = useState<'page' | 'all'>('all')
  /** Estado del hilo que se quiere ver; vacío = todos. */
  const [stateFilter, setStateFilter] = useState<LbThreadState | ''>('')
  /** Versión cuyos hilos se listan; 0 = todas. */
  const [listVersion, setListVersion] = useState(0)
  const [activeId, setActiveId] = useState('')
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)
  const pendingFocus = useRef<LbReviewTarget | null>(null)

  const toFrame = useCallback((message: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage({ ...message, source: 'lb-review' }, window.location.origin)
  }, [])

  const load = useCallback(async () => {
    try {
      const payload = await call<{ comments: ReviewComment[] }>(token, 'list')
      setComments(payload.comments)
    } catch (e: any) {
      if (e.status === 401) onLeave()
      else setError(e.message)
    }
  }, [token, onLeave])

  useEffect(() => { void load() }, [load])
  // Lo que escriben otros revisores y las respuestas del equipo llegan solas.
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load() }, 30_000)
    return () => clearInterval(timer)
  }, [load])

  const roots = useMemo(() => comments.filter((row) => !row.parentId), [comments])
  const repliesOf = useMemo(() => {
    const map = new Map<string, ReviewComment[]>()
    for (const row of comments) if (row.parentId) map.set(row.parentId, [...(map.get(row.parentId) || []), row])
    return map
  }, [comments])

  /** ¿Se hizo sobre la versión que se está mirando? Los anteriores a las versiones cuentan como la V1. */
  const onViewing = useCallback((row: ReviewComment) => (row.version ?? 1) === viewing || versions.list.length === 0, [viewing, versions.list.length])

  // Solo se pintan los pines de la versión que se mira: los de otra versión
  // apuntan a una pieza distinta.
  const pins = useMemo(
    () => roots.filter((row) => row.target && onViewing(row)).map((row) => ({ id: row.id, n: row.n, status: row.status, target: row.target })),
    [roots, onViewing]
  )

  const switchVersion = (version: number, path?: string) => {
    setViewing(version)
    setPointing(false)
    setPick(null)
    setPage(null)
    setFrameSrc(frameUrl(version, path))
  }

  // La pieza recibe sus pines cada vez que cambian o que carga una página.
  useEffect(() => { if (page !== null) toFrame({ type: 'pins', pins }) }, [pins, page, toFrame])
  useEffect(() => { if (page !== null) toFrame({ type: 'mode', on: pointing }) }, [pointing, page, toFrame])
  useEffect(() => { if (page !== null) toFrame({ type: 'draft', target: pick?.target || null }) }, [pick, page, toFrame])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return
      const data = event.data
      if (!data || data.source !== 'lb-review-frame') return
      if (data.type === 'route') {
        setRoute(String(data.hash || ''))
        setSlide(String(data.slide || ''))
        setNotice('')
      }
      if (data.type === 'elsewhere') {
        setNotice(`Este comentario está en la ${String(data.slide || 'otra pantalla').toLowerCase()}. Navega hasta ella en la pieza y verás su pin.`)
      }
      if (data.type === 'ready') {
        setPage(String(data.page || ''))
        setRoute(String(data.hash || ''))
        setSlide(String(data.slide || ''))
        const wanted = pendingFocus.current
        if (wanted && (wanted.page || '') === String(data.page || '')) {
          pendingFocus.current = null
          setTimeout(() => toFrame({ type: 'focus', target: wanted }), 250)
        }
      }
      if (data.type === 'pick' && data.target) {
        setPick({ target: data.target, anchor: String(data.anchor || '') })
        setPointing(false)
        setPanelOpen(true)
        setActiveId('')
      }
      if (data.type === 'open' && data.id) {
        setActiveId(String(data.id))
        setPanelOpen(true)
        document.getElementById(`hilo-${data.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
      if (data.type === 'mode-off') setPointing(false)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [toFrame])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setPointing(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /** Lleva la pieza al elemento del hilo, cambiando de página si hace falta. */
  const goTo = (row: ReviewComment) => {
    setActiveId(row.id)
    if (!row.target) return
    // Un hilo de otra versión se mira sobre esa versión.
    if (versions.list.length && (row.version ?? 1) !== viewing) {
      pendingFocus.current = row.target
      switchVersion(row.version ?? 1, row.target.page)
      return
    }
    if ((row.target.page || '') !== (page ?? '')) {
      pendingFocus.current = row.target
      setFrameSrc(frameUrl(viewing, row.target.page))
      return
    }
    toFrame({ type: 'focus', target: row.target })
  }

  const run = async (key: string, task: () => Promise<unknown>) => {
    setBusy(key); setError('')
    try { await task(); await load() } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  const send = () => run('new', async () => {
    if (!pick || !draft.trim()) return
    await call(token, 'create', { body: draft.trim(), target: pick.target, anchor: pick.anchor, version: viewing })
    setDraft(''); setPick(null)
  })

  const reply = (root: ReviewComment) => run(root.id, async () => {
    const body = (replies[root.id] || '').trim()
    if (!body) return
    await call(token, 'create', { body, parentId: root.id })
    setReplies((prev) => ({ ...prev, [root.id]: '' }))
  })

  const saveEdit = () => run(editing?.id || '', async () => {
    if (!editing?.body.trim()) return
    await call(token, 'edit', { commentId: editing.id, body: editing.body.trim() })
    setEditing(null)
  })

  const remove = (row: ReviewComment) => {
    if (!window.confirm(row.parentId ? '¿Borrar esta respuesta?' : '¿Borrar este comentario y sus respuestas?')) return
    void run(row.id, () => call(token, 'delete', { commentId: row.id }))
  }

  const leave = async () => {
    await call(token, 'leave').catch(() => undefined)
    onLeave()
  }

  const scoped = scope === 'all'
    ? roots
    : roots.filter((row) => !row.target || (
        (row.target.page || '') === (page ?? '') &&
        (!row.target.hash || row.target.hash === route) &&
        (!row.target.slide || row.target.slide === slide) &&
      onViewing(row)
      ))
  const stateOf = (row: ReviewComment) => threadState(row.status, (repliesOf.get(row.id) || []).length)
  const byVersion = listVersion ? scoped.filter((row) => (row.version ?? 1) === listVersion) : scoped
  const stateCount = (state: LbThreadState) => byVersion.filter((row) => stateOf(row) === state).length
  const visibleRoots = stateFilter ? byVersion.filter((row) => stateOf(row) === stateFilter) : byVersion
  const openCount = roots.filter((row) => row.status === 'OPEN').length

  // Se llama como función y no como componente: uno definido aquí dentro
  // sería distinto en cada render, React volvería a montar el campo al
  // teclear y el cursor saltaría.
  const renderBody = (row: ReviewComment) => (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-[12.5px] font-bold text-slate-800">{row.authorName}</span>
        {row.authorOrg && (
          <span className={`text-[11px] ${row.fromTeam ? 'font-semibold text-indigo-600' : 'text-slate-400'}`}>{row.authorOrg}</span>
        )}
        <span className="text-[11px] text-slate-400">{timeAgo(row.createdAt)}</span>
        <div className="flex-1" />
        {row.mine && editing?.id !== row.id && (
          <>
            <button onClick={() => setEditing({ id: row.id, body: row.body })} className="text-slate-300 hover:text-slate-600" aria-label="Editar">
              <Pencil size={12} />
            </button>
            <button onClick={() => remove(row)} className="text-slate-300 hover:text-rose-600" aria-label="Borrar">
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>
      {editing?.id === row.id ? (
        <div className="mt-1.5 space-y-1.5">
          <textarea
            value={editing.body}
            onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px]"
          />
          <div className="flex gap-1.5">
            <button onClick={saveEdit} disabled={busy === row.id} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[12px] font-bold text-white disabled:opacity-40">Guardar</button>
            <button onClick={() => setEditing(null)} className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:bg-slate-100">Cancelar</button>
          </div>
        </div>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-700">{row.body}</p>
      )}
    </div>
  )

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-100">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-black uppercase tracking-[0.16em] text-indigo-600">Revisión · {info.workspaceName}</div>
          <div className="truncate text-[15px] font-bold text-slate-900">{info.title}</div>
        </div>
        {versions.list.length > 0 && (
          <select
            value={viewing}
            onChange={(e) => switchVersion(Number(e.target.value))}
            aria-label="Versión que se revisa"
            className={`rounded-xl border px-3 py-2 text-[13px] font-bold ${isLive ? 'border-slate-300 text-slate-700' : 'border-amber-400 bg-amber-50 text-amber-900'}`}
          >
            {versions.list.map((row) => (
              <option key={row.version} value={row.version}>
                V{row.version}{row.live ? ' · vigente' : ` · ${new Date(row.createdAt).toLocaleDateString('es-CO')}`}
              </option>
            ))}
          </select>
        )}
        <button
          disabled={!isLive}
          title={isLive ? undefined : 'Las versiones anteriores son solo de consulta'}
          onClick={() => { setPointing((on) => !on); setPick(null) }}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13.5px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            pointing ? 'bg-amber-500 text-amber-950 shadow-inner' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <Crosshair size={15} /> {pointing ? 'Señalando… (Esc para salir)' : 'Señalar para comentar'}
        </button>
        <button
          disabled={!isLive}
          onClick={() => { setPick({ target: null, anchor: '' }); setPointing(false); setPanelOpen(true) }}
          className="hidden disabled:opacity-40 items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 sm:inline-flex"
        >
          <MessageSquarePlus size={14} /> Comentario general
        </button>
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          <span className="hidden md:inline">
            {reviewer.name}{reviewer.org ? ` · ${reviewer.org}` : ''}
          </span>
{viaSession ? (
            <span className="rounded-lg bg-indigo-50 px-2 py-1 font-semibold text-indigo-700" title="Entraste con tu sesión de Learning Builder">
              Con tu sesión
            </span>
          ) : (
                      <button onClick={leave} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold hover:bg-slate-100" title="Salir de la revisión">
            <LogOut size={13} /> Salir
          </button>
          )}
          <button onClick={() => setPanelOpen((v) => !v)} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Mostrar u ocultar comentarios">
            {panelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
        </div>
      </header>

      {!isLive && (
        <div className="shrink-0 bg-amber-100 px-4 py-1.5 text-center text-[12.5px] font-semibold text-amber-900">
          Estás viendo la V{viewing}, una versión anterior, con los comentarios que se hicieron sobre ella. Es solo de
          consulta: los comentarios nuevos van sobre la V{versions.live}.{' '}
          <button onClick={() => switchVersion(versions.live)} className="underline">Ir a la vigente</button>
        </div>
      )}
      {isLive && versions.list.length > 1 && versions.list.find((row) => row.live)?.notes && (
        <div className="shrink-0 bg-indigo-50 px-4 py-1.5 text-center text-[12.5px] text-indigo-900">
          <b>Novedades de la V{versions.live}:</b> {versions.list.find((row) => row.live)?.notes}
        </div>
      )}
      {pointing && (
        <div className="shrink-0 bg-amber-100 px-4 py-1.5 text-center text-[12.5px] font-semibold text-amber-900">
          Pasa el ratón por la pieza y haz clic sobre la foto, el texto o el botón que quieras comentar. En una imagen, el
          comentario queda en el punto exacto donde hagas clic.
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative min-h-[55vh] flex-1 lg:min-h-0">
          <iframe
            ref={frameRef}
            src={frameSrc}
            title={info.title}
            className="absolute inset-0 h-full w-full border-0 bg-white"
          />
        </div>

        {panelOpen && (
          <aside className="flex max-h-[60vh] w-full shrink-0 flex-col border-t border-slate-200 bg-white lg:max-h-none lg:w-[400px] lg:border-l lg:border-t-0">
            {pick && (
              <div className="border-b border-indigo-100 bg-indigo-50/60 p-3">
                <div className="flex items-start gap-2">
                  {pick.target ? <Crosshair size={14} className="mt-0.5 shrink-0 text-indigo-600" /> : <MessageSquare size={14} className="mt-0.5 shrink-0 text-indigo-600" />}
                  <div className="min-w-0 flex-1 text-[12.5px]">
                    <div className="font-bold text-indigo-900">{pick.target ? describeTarget(pick.target) : 'Comentario general sobre el recurso'}</div>
                    {pick.target?.section && <div className="truncate text-indigo-700/80">en «{pick.target.section}»</div>}
                  </div>
                  <button onClick={() => setPick(null)} className="text-indigo-400 hover:text-indigo-700" aria-label="Descartar"><X size={15} /></button>
                </div>
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send() }}
                  rows={4}
                  placeholder="¿Qué cambiarías aquí y por qué?"
                  className="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-[13.5px] outline-none focus:border-indigo-500"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={send}
                    disabled={busy === 'new' || !draft.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-40"
                  >
                    {busy === 'new' ? <Loader2 size={13} className="animate-spin" /> : null} Publicar comentario
                  </button>
                  <span className="text-[11px] text-slate-400">⌘/Ctrl + Enter</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 p-0.5">
                {(['all', 'page'] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setScope(value)}
                    className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${scope === value ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    {value === 'all' ? 'Todos' : slide ? `Esta pantalla (${slide.split(' ').pop()})` : 'Esta página'}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <span className="text-[11.5px] text-slate-500">{openCount} abierto(s) · {roots.length} en total</span>
            </div>

            {/* En qué punto está cada hilo, y sobre qué versión se dijo. */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-3 py-2">
              {([''] as Array<LbThreadState | ''>).concat(LB_THREAD_STATES).map((value) => (
                <button
                  key={value || 'todos'}
                  onClick={() => setStateFilter(value)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${
                    stateFilter === value
                      ? value === 'resolved' ? 'border-emerald-500 bg-emerald-500 text-white'
                        : value === 'answered' ? 'border-sky-500 bg-sky-500 text-white'
                        : value === 'unanswered' ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {value ? `${LB_THREAD_STATE_LABEL[value]} · ${stateCount(value)}` : `Todos · ${byVersion.length}`}
                </button>
              ))}
              {versions.list.length > 1 && (
                <select
                  value={listVersion}
                  onChange={(e) => setListVersion(Number(e.target.value))}
                  aria-label="Filtrar los hilos por versión"
                  className="ml-auto rounded-lg border border-slate-200 px-2 py-0.5 text-[11.5px] font-semibold text-slate-600"
                >
                  <option value={0}>Todas las versiones</option>
                  {versions.list.map((row) => <option key={row.version} value={row.version}>Sobre la V{row.version}</option>)}
                </select>
              )}
            </div>

            {notice && (
              <div className="mx-3 mt-2 flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
                <span>{notice}</span>
                <button onClick={() => setNotice('')} aria-label="Cerrar aviso"><X size={13} /></button>
              </div>
            )}
            {error && (
              <div className="mx-3 mt-2 flex items-center justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
                <span>{error}</span>
                <button onClick={() => setError('')} aria-label="Cerrar aviso"><X size={13} /></button>
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {visibleRoots.length === 0 && !pick && (stateFilter || listVersion) && (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-[13px] text-slate-400">
                  Ningún hilo coincide con el filtro.
                </div>
              )}
              {visibleRoots.length === 0 && !pick && !stateFilter && !listVersion && (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-[13px] leading-relaxed text-slate-400">
                  Aún no hay comentarios. Pulsa <b className="text-slate-600">Señalar para comentar</b> y haz clic sobre lo que quieras revisar.
                </div>
              )}
              {visibleRoots.map((root) => (
                <div
                  key={root.id}
                  id={`hilo-${root.id}`}
                  className={`rounded-xl border p-3 transition ${
                    activeId === root.id ? 'border-indigo-400 ring-2 ring-indigo-100' : root.status === 'RESOLVED' ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200'
                  }`}
                >
                  <button onClick={() => goTo(root)} className="mb-1.5 flex w-full items-start gap-2 text-left">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black ${
                        root.status === 'RESOLVED' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'
                      }`}
                    >
                      {root.n}
                    </span>
                    <span className="min-w-0 flex-1 text-[11.5px] leading-snug text-slate-500">
                      {versions.list.length > 0 && (
                        <span className={`mr-1 rounded px-1 py-px text-[10px] font-bold ${(root.version ?? 1) === versions.live ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                          V{root.version ?? 1}
                        </span>
                      )}
                      <span className="font-semibold text-slate-700">{root.target ? describeTarget(root.target) : 'Comentario general'}</span>
                      {root.target?.section && <span> · {root.target.section}</span>}
                    </span>
                    {stateOf(root) === 'resolved' ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 size={12} /> Atendido</span>
                    ) : stateOf(root) === 'answered' ? (
                      <span className="shrink-0 text-[11px] font-bold text-sky-700">Respondido</span>
                    ) : (
                      <span className="shrink-0 text-[11px] font-bold text-amber-700">Sin responder</span>
                    )}
                  </button>
                  {renderBody(root)}
                  {(repliesOf.get(root.id) || []).map((child) => (
                    <div key={child.id} className="mt-2 flex gap-2 border-l-2 border-slate-100 pl-2.5">
                      <CornerDownRight size={12} className="mt-1 shrink-0 text-slate-300" />
                      <div className="min-w-0 flex-1">{renderBody(child)}</div>
                    </div>
                  ))}
                  <div className="mt-2 flex gap-1.5">
                    <input
                      value={replies[root.id] || ''}
                      onChange={(e) => setReplies((prev) => ({ ...prev, [root.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') void reply(root) }}
                      placeholder="Responder…"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px]"
                    />
                    <button
                      onClick={() => reply(root)}
                      disabled={busy === root.id || !(replies[root.id] || '').trim()}
                      className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[12px] font-bold text-white disabled:opacity-40"
                    >
                      {busy === root.id ? <Loader2 size={12} className="animate-spin" /> : 'Enviar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
