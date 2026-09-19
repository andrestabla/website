/**
 * Learning Builder — editor de la presentación interactiva.
 *
 * Se edita sobre el lienzo, no en un formulario: la escena se ve como la verá
 * el estudiante y los puntos activos se colocan arrastrándolos encima. La
 * posición se guarda en porcentaje, así que lo que se compone aquí se mantiene
 * en cualquier pantalla.
 *
 * Doble clic sobre el lienzo crea un punto donde se hizo clic; arrastrar lo
 * mueve; el panel de la derecha edita el que esté seleccionado.
 */
import { useCallback, useRef, useState } from 'react'
import {
  ChevronDown, ChevronUp, Copy, Image as ImageIcon, MapPin, Plus, Square, Trash2, AlertTriangle, MessageSquare,
} from 'lucide-react'
import type { LbIssue } from '../lib/blocks'
import type { LbDirectives } from '../lib/directives'
import { newInteractiveId, type LbHotspot, type LbInteractiveContent, type LbScene } from '../lib/interactive'

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px] focus:border-indigo-500 focus:outline-none'
const areaCls = `${inputCls} leading-relaxed`

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const copy = [...list]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export function SceneEditor({
  content,
  directives,
  issues,
  onChange,
  commentsByAnchor,
  onOpenComments,
}: {
  content: LbInteractiveContent
  directives: LbDirectives
  issues: LbIssue[]
  onChange: (next: LbInteractiveContent) => void
  commentsByAnchor?: Map<string, { total: number; open: number }>
  onOpenComments?: (anchor: string) => void
}) {
  const [selectedScene, setSelectedScene] = useState<string>(content.scenes[0]?.id || 'cover')
  const [selectedSpot, setSelectedSpot] = useState<string>('')
  const stageRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<string>('')

  const scene = content.scenes.find((row) => row.id === selectedScene) || null
  const spot = scene?.hotspots.find((row) => row.id === selectedSpot) || null
  const accent = directives.graphic.accent

  const setScenes = (scenes: LbScene[]) => onChange({ ...content, scenes })
  const patchScene = (id: string, patch: Partial<LbScene>) =>
    setScenes(content.scenes.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  const patchSpot = (sceneId: string, spotId: string, patch: Partial<LbHotspot>) =>
    patchScene(sceneId, {
      hotspots: (content.scenes.find((s) => s.id === sceneId)?.hotspots || []).map((row) =>
        row.id === spotId ? { ...row, ...patch } : row
      ),
    })

  /** Convierte un evento del ratón en coordenadas porcentuales de la escena. */
  const toPercent = useCallback((event: { clientX: number; clientY: number }) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return { x: 50, y: 50 }
    return {
      x: Math.min(100, Math.max(0, Math.round(((event.clientX - rect.left) / rect.width) * 1000) / 10)),
      y: Math.min(100, Math.max(0, Math.round(((event.clientY - rect.top) / rect.height) * 1000) / 10)),
    }
  }, [])

  const addSpot = (at?: { x: number; y: number }) => {
    if (!scene) return
    const created: LbHotspot = {
      id: newInteractiveId('h'),
      shape: 'pin',
      x: at?.x ?? 50,
      y: at?.y ?? 50,
      label: `Punto ${scene.hotspots.length + 1}`,
      body: '',
    }
    patchScene(scene.id, { hotspots: [...scene.hotspots, created] })
    setSelectedSpot(created.id)
  }

  const addScene = () => {
    const created: LbScene = {
      id: newInteractiveId('s'),
      title: `Escena ${content.scenes.length + 1}`,
      hotspots: [],
    }
    setScenes([...content.scenes, created])
    setSelectedScene(created.id)
    setSelectedSpot('')
  }

  const issuesByScene = new Map<string, number>()
  for (const issue of issues) {
    if (issue.level !== 'error' || !issue.lessonId) continue
    issuesByScene.set(issue.lessonId, (issuesByScene.get(issue.lessonId) || 0) + 1)
  }

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)_300px]">
      {/* Escenas */}
      <aside className="border-b border-slate-200 bg-slate-50 p-3 lg:border-b-0 lg:border-r">
        <button
          onClick={() => { setSelectedScene('cover'); setSelectedSpot('') }}
          className={`mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold ${
            selectedScene === 'cover' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white'
          }`}
        >
          <ImageIcon size={14} /> Portada
        </button>
        <div className="mb-1 px-3 text-[10.5px] font-black uppercase tracking-[0.14em] text-slate-400">Escenas</div>
        {content.scenes.map((row, index) => {
          const errors = issuesByScene.get(row.id) || 0
          const comments = commentsByAnchor?.get(`lesson:${row.id}`)
          return (
            <div key={row.id} className="group flex items-center gap-1">
              <button
                onClick={() => { setSelectedScene(row.id); setSelectedSpot('') }}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] ${
                  selectedScene === row.id ? 'bg-indigo-600 font-semibold text-white' : 'text-slate-600 hover:bg-white'
                }`}
              >
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10.5px] font-bold ${
                  selectedScene === row.id ? 'bg-white/20' : 'bg-slate-200 text-slate-500'
                }`}>{index + 1}</span>
                <span className="truncate">{row.title}</span>
                {errors > 0 && <AlertTriangle size={13} className={selectedScene === row.id ? 'text-amber-200' : 'text-amber-500'} />}
                {!!comments?.total && (
                  <span
                    className={`inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold ${
                      selectedScene === row.id ? 'text-amber-200' : comments.open ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                    onClick={(e) => { e.stopPropagation(); onOpenComments?.(`lesson:${row.id}`) }}
                  >
                    <MessageSquare size={11} /> {comments.total}
                  </span>
                )}
              </button>
              <div className="flex shrink-0 opacity-0 transition group-hover:opacity-100">
                <button onClick={() => setScenes(move(content.scenes, index, index - 1))} className="grid h-6 w-5 place-items-center text-slate-400 hover:text-slate-700" aria-label="Subir"><ChevronUp size={13} /></button>
                <button onClick={() => setScenes(move(content.scenes, index, index + 1))} className="grid h-6 w-5 place-items-center text-slate-400 hover:text-slate-700" aria-label="Bajar"><ChevronDown size={13} /></button>
                <button
                  onClick={() => { const rest = content.scenes.filter((s) => s.id !== row.id); setScenes(rest); setSelectedScene(rest[0]?.id || 'cover') }}
                  className="grid h-6 w-5 place-items-center text-slate-400 hover:text-rose-600" aria-label="Eliminar"
                ><Trash2 size={12} /></button>
              </div>
            </div>
          )
        })}
        <button
          onClick={addScene}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-[12.5px] font-semibold text-slate-500 hover:bg-white"
        >
          <Plus size={13} /> Añadir escena
        </button>
      </aside>

      {/* Lienzo */}
      <div className="min-w-0 overflow-y-auto p-4 sm:p-6">
        {selectedScene === 'cover' ? (
          <CoverFields content={content} directives={directives} onChange={onChange} />
        ) : !scene ? (
          <div className="grid h-40 place-items-center text-[13px] text-slate-400">Elige una escena.</div>
        ) : (
          <>
            <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px]">
              <label className="text-[13px]">
                <span className="mb-1 block font-semibold text-slate-600">Título de la escena</span>
                <input value={scene.title} onChange={(e) => patchScene(scene.id, { title: e.target.value })} className={inputCls} />
              </label>
              <label className="text-[13px]">
                <span className="mb-1 block font-semibold text-slate-600">Fondo (URL de imagen)</span>
                <input
                  value={scene.background?.url || ''}
                  placeholder="https://…"
                  onChange={(e) =>
                    patchScene(scene.id, { background: e.target.value ? { url: e.target.value, alt: scene.background?.alt } : undefined })
                  }
                  className={inputCls}
                />
              </label>
            </div>
            {scene.background?.url && (
              <label className="mb-3 block text-[13px]">
                <span className="mb-1 block font-semibold text-slate-600">
                  Texto alternativo del fondo {directives.instructional.rules.requireImageAlt && <em className="not-italic text-rose-500">· obligatorio</em>}
                </span>
                <input
                  value={scene.background.alt || ''}
                  onChange={(e) => patchScene(scene.id, { background: { url: scene.background!.url, alt: e.target.value } })}
                  className={inputCls}
                />
              </label>
            )}
            <label className="mb-3 block text-[13px]">
              <span className="mb-1 block font-semibold text-slate-600">Texto de entrada</span>
              <textarea value={scene.intro || ''} onChange={(e) => patchScene(scene.id, { intro: e.target.value })} rows={2} className={areaCls} />
            </label>

            <p className="mb-2 text-[12px] text-slate-500">
              Doble clic sobre la escena para crear un punto donde hagas clic; arrástralo para moverlo.
            </p>

            <div
              ref={stageRef}
              onDoubleClick={(event) => addSpot(toPercent(event))}
              onPointerMove={(event) => {
                if (!dragging.current) return
                const at = toPercent(event)
                patchSpot(scene.id, dragging.current, at)
              }}
              onPointerUp={() => { dragging.current = '' }}
              onPointerLeave={() => { dragging.current = '' }}
              className="relative w-full select-none overflow-hidden rounded-xl border border-slate-300 bg-slate-800"
              style={{ aspectRatio: '16 / 9', borderRadius: directives.graphic.corners }}
            >
              {scene.background?.url ? (
                <img src={scene.background.url} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${directives.graphic.accentDark}, ${accent})` }} />
              )}

              {scene.hotspots.map((hotspot, index) => {
                const active = hotspot.id === selectedSpot
                const common = {
                  onPointerDown: (event: React.PointerEvent) => {
                    event.stopPropagation()
                    ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
                    dragging.current = hotspot.id
                    setSelectedSpot(hotspot.id)
                  },
                }
                if (hotspot.shape === 'area') {
                  return (
                    <div
                      key={hotspot.id}
                      {...common}
                      className={`absolute cursor-move border-2 border-dashed ${active ? 'border-white ring-2 ring-white/70' : 'border-white/80'}`}
                      style={{
                        left: `${hotspot.x}%`, top: `${hotspot.y}%`,
                        width: `${hotspot.w ?? 20}%`, height: `${hotspot.h ?? 15}%`,
                        background: `${accent}44`,
                      }}
                    >
                      <span className="absolute left-1 top-1 rounded px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: accent }}>
                        {hotspot.label || 'Zona'}
                      </span>
                    </div>
                  )
                }
                return (
                  <button
                    key={hotspot.id}
                    type="button"
                    {...common}
                    title={hotspot.label}
                    className={`absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-move place-items-center rounded-full text-[13px] font-black text-white ${
                      active ? 'ring-4 ring-white/80' : 'ring-4 ring-white/25'
                    }`}
                    style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%`, backgroundColor: accent }}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => addSpot()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100"
              >
                <MapPin size={13} /> Añadir punto
              </button>
              <span className="text-[12px] text-slate-400">{scene.hotspots.length} punto(s) en esta escena</span>
            </div>
          </>
        )}
      </div>

      {/* Punto seleccionado */}
      <aside className="border-t border-slate-200 bg-slate-50 p-4 lg:border-l lg:border-t-0">
        {!spot || !scene ? (
          <p className="text-[12.5px] text-slate-400">
            Selecciona un punto de la escena para editar lo que abre.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Punto activo</span>
              <div className="flex items-center gap-1">
                {!!commentsByAnchor?.get(`block:${spot.id}`)?.total && (
                  <button
                    onClick={() => onOpenComments?.(`block:${spot.id}`)}
                    className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-600 hover:underline"
                  >
                    <MessageSquare size={11} /> {commentsByAnchor.get(`block:${spot.id}`)?.total}
                  </button>
                )}
                <button
                  onClick={() => {
                    const copy = { ...structuredClone(spot), id: newInteractiveId('h'), x: Math.min(100, spot.x + 5), y: Math.min(100, spot.y + 5) }
                    patchScene(scene.id, { hotspots: [...scene.hotspots, copy] })
                    setSelectedSpot(copy.id)
                  }}
                  className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-200" aria-label="Duplicar punto"
                ><Copy size={13} /></button>
                <button
                  onClick={() => { patchScene(scene.id, { hotspots: scene.hotspots.filter((h) => h.id !== spot.id) }); setSelectedSpot('') }}
                  className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Eliminar punto"
                ><Trash2 size={13} /></button>
              </div>
            </div>

            <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
              {([['pin', 'Punto', MapPin], ['area', 'Zona', Square]] as const).map(([value, label, Icon]) => (
                <button
                  key={value}
                  onClick={() => patchSpot(scene.id, spot.id, { shape: value, ...(value === 'area' ? { w: spot.w ?? 20, h: spot.h ?? 15 } : {}) })}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[12.5px] font-semibold ${
                    spot.shape === value ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            <label className="block text-[13px]">
              <span className="mb-1 block font-semibold text-slate-600">Etiqueta</span>
              <input value={spot.label} onChange={(e) => patchSpot(scene.id, spot.id, { label: e.target.value })} className={inputCls} />
            </label>
            <label className="block text-[13px]">
              <span className="mb-1 block font-semibold text-slate-600">Qué abre</span>
              <textarea value={spot.body || ''} onChange={(e) => patchSpot(scene.id, spot.id, { body: e.target.value })} rows={6} className={areaCls} />
            </label>
            <label className="block text-[13px]">
              <span className="mb-1 block font-semibold text-slate-600">Imagen (URL)</span>
              <input
                value={spot.media?.url || ''}
                placeholder="https://…"
                onChange={(e) => patchSpot(scene.id, spot.id, { media: e.target.value ? { url: e.target.value, alt: spot.media?.alt } : undefined })}
                className={inputCls}
              />
            </label>
            {spot.media?.url && (
              <label className="block text-[13px]">
                <span className="mb-1 block font-semibold text-slate-600">Texto alternativo</span>
                <input
                  value={spot.media.alt || ''}
                  onChange={(e) => patchSpot(scene.id, spot.id, { media: { url: spot.media!.url, alt: e.target.value } })}
                  className={inputCls}
                />
              </label>
            )}

            <div className="grid grid-cols-2 gap-2 text-[12.5px]">
              <label>
                <span className="mb-1 block font-semibold text-slate-600">X · {spot.x} %</span>
                <input type="range" min={0} max={100} step={0.5} value={spot.x}
                  onChange={(e) => patchSpot(scene.id, spot.id, { x: Number(e.target.value) })} className="w-full accent-indigo-600" />
              </label>
              <label>
                <span className="mb-1 block font-semibold text-slate-600">Y · {spot.y} %</span>
                <input type="range" min={0} max={100} step={0.5} value={spot.y}
                  onChange={(e) => patchSpot(scene.id, spot.id, { y: Number(e.target.value) })} className="w-full accent-indigo-600" />
              </label>
              {spot.shape === 'area' && (
                <>
                  <label>
                    <span className="mb-1 block font-semibold text-slate-600">Ancho · {spot.w ?? 20} %</span>
                    <input type="range" min={4} max={100} value={spot.w ?? 20}
                      onChange={(e) => patchSpot(scene.id, spot.id, { w: Number(e.target.value) })} className="w-full accent-indigo-600" />
                  </label>
                  <label>
                    <span className="mb-1 block font-semibold text-slate-600">Alto · {spot.h ?? 15} %</span>
                    <input type="range" min={4} max={100} value={spot.h ?? 15}
                      onChange={(e) => patchSpot(scene.id, spot.id, { h: Number(e.target.value) })} className="w-full accent-indigo-600" />
                  </label>
                </>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

function CoverFields({
  content,
  directives,
  onChange,
}: {
  content: LbInteractiveContent
  directives: LbDirectives
  onChange: (next: LbInteractiveContent) => void
}) {
  const cover = content.cover || {}
  const patch = (value: Partial<typeof cover>) => onChange({ ...content, cover: { ...cover, ...value } })
  const outcomes = cover.outcomes || []

  return (
    <div className="max-w-2xl space-y-4">
      <h3 className="text-[15px] font-black tracking-tight">Portada</h3>
      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">Antetítulo</span>
        <input value={cover.kicker || ''} onChange={(e) => patch({ kicker: e.target.value })} className={inputCls} />
      </label>
      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">Título</span>
        <input value={cover.title || ''} onChange={(e) => patch({ title: e.target.value })} className={inputCls} />
      </label>
      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">Subtítulo</span>
        <input value={cover.subtitle || ''} onChange={(e) => patch({ subtitle: e.target.value })} className={inputCls} />
      </label>
      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">
          Presentación {directives.instructional.rules.requireCoverSummary && <em className="not-italic text-rose-500">· obligatoria</em>}
        </span>
        <textarea value={cover.summary || ''} onChange={(e) => patch({ summary: e.target.value })} rows={4} className={areaCls} />
      </label>
      <div className="text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">
          Resultados de aprendizaje {directives.instructional.rules.requireOutcomes && <em className="not-italic text-rose-500">· obligatorios</em>}
        </span>
        <div className="space-y-2">
          {outcomes.map((outcome, index) => (
            <div key={index} className="flex gap-2">
              <input value={outcome} onChange={(e) => patch({ outcomes: outcomes.map((row, i) => (i === index ? e.target.value : row)) })} className={inputCls} />
              <button
                onClick={() => patch({ outcomes: outcomes.filter((_, i) => i !== index) })}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Quitar resultado"
              ><Trash2 size={14} /></button>
            </div>
          ))}
          <button
            onClick={() => patch({ outcomes: [...outcomes, ''] })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-50"
          ><Plus size={13} /> Añadir resultado</button>
        </div>
      </div>
    </div>
  )
}
