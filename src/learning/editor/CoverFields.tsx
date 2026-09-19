/**
 * Learning Builder — la portada, igual en todos los formatos.
 *
 * Un pódcast, un video, una ruta y una presentación se editan de maneras muy
 * distintas, pero todos empiezan por lo mismo: antetítulo, título, subtítulo,
 * presentación y resultados de aprendizaje. Y todos obedecen a las mismas
 * reglas del workspace, que aquí se señalan donde se escriben —«obligatoria»
 * junto al campo— y no en la pantalla de revisión, cuando ya es tarde.
 */
import { Plus, Trash2 } from 'lucide-react'
import type { LbCover } from '../lib/blocks'
import type { LbDirectives } from '../lib/directives'
import { fieldCls, textareaCls } from './ui'

export function CoverFields({
  cover,
  directives,
  onChange,
  /** Los formatos sin imagen de portada —el pódcast, la ruta— la ocultan. */
  withMedia = false,
  title = 'Portada',
}: {
  cover: LbCover
  directives: LbDirectives
  onChange: (next: LbCover) => void
  withMedia?: boolean
  title?: string
}) {
  const rules = directives.instructional.rules
  const patch = (value: Partial<LbCover>) => onChange({ ...cover, ...value })
  const outcomes = cover.outcomes || []

  return (
    <div className="max-w-2xl space-y-4">
      <h3 className="text-[15px] font-black tracking-tight">{title}</h3>

      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">Antetítulo</span>
        <input
          value={cover.kicker || ''}
          onChange={(event) => patch({ kicker: event.target.value })}
          className={fieldCls}
          placeholder="Nombre del curso, de la unidad o del episodio"
        />
      </label>

      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">Título</span>
        <input value={cover.title || ''} onChange={(event) => patch({ title: event.target.value })} className={fieldCls} />
      </label>

      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">Subtítulo</span>
        <input value={cover.subtitle || ''} onChange={(event) => patch({ subtitle: event.target.value })} className={fieldCls} />
      </label>

      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">
          Presentación {rules.requireCoverSummary && <em className="not-italic text-rose-500">· obligatoria</em>}
        </span>
        <textarea
          value={cover.summary || ''}
          onChange={(event) => patch({ summary: event.target.value })}
          rows={4}
          className={textareaCls}
        />
      </label>

      {withMedia && (
        <>
          <label className="block text-[13px]">
            <span className="mb-1 block font-semibold text-slate-600">Imagen de portada (URL)</span>
            <input
              value={cover.media?.url || ''}
              onChange={(event) => patch({ media: event.target.value ? { url: event.target.value, alt: cover.media?.alt } : undefined })}
              className={fieldCls}
              placeholder="https://…"
            />
          </label>
          {cover.media?.url && (
            <label className="block text-[13px]">
              <span className="mb-1 block font-semibold text-slate-600">
                Texto alternativo {rules.requireImageAlt && <em className="not-italic text-rose-500">· obligatorio</em>}
              </span>
              <input
                value={cover.media.alt || ''}
                onChange={(event) => patch({ media: { url: cover.media!.url, alt: event.target.value } })}
                className={fieldCls}
              />
            </label>
          )}
        </>
      )}

      <div className="text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">
          Resultados de aprendizaje {rules.requireOutcomes && <em className="not-italic text-rose-500">· obligatorios</em>}
        </span>
        <div className="space-y-2">
          {outcomes.map((outcome, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={outcome}
                onChange={(event) => patch({ outcomes: outcomes.map((row, i) => (i === index ? event.target.value : row)) })}
                className={fieldCls}
              />
              <button
                onClick={() => patch({ outcomes: outcomes.filter((_, i) => i !== index) })}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Quitar resultado"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => patch({ outcomes: [...outcomes, ''] })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-50"
          >
            <Plus size={13} /> Añadir resultado
          </button>
        </div>
      </div>
    </div>
  )
}
