import { useState } from 'react'
import { X, Sparkles, List, Type as TypeIcon, Link2 } from 'lucide-react'
import type { PcBehaviorRender, PcColumn } from '../lib/types'

type Mode = 'select' | 'text' | 'formula'

export function BehaviorDialog({
  col,
  columns,
  onSave,
  onClose,
}: {
  col: PcColumn
  columns: PcColumn[]
  onSave: (col: PcColumn) => void
  onClose: () => void
}) {
  const initialMode: Mode = col.behavior?.mode === 'formula' ? 'formula' : col.type === 'select' ? 'select' : 'text'
  const [mode, setMode] = useState<Mode>(initialMode)
  const [prompt, setPrompt] = useState(col.behavior?.prompt || '')
  const [render, setRender] = useState<PcBehaviorRender>(col.behavior?.render || 'progress')
  const [sourceColumnId, setSourceColumnId] = useState(col.behavior?.sourceColumnId || '')

  const linkCols = columns.filter((c) => c.id !== col.id && (c.type === 'url' || c.type === 'text'))

  const save = () => {
    if (mode === 'select') {
      onSave({ ...col, type: 'select', behavior: undefined, options: col.options || [], optionFields: col.optionFields || [] })
    } else if (mode === 'text') {
      onSave({ ...col, type: 'text', behavior: undefined })
    } else {
      const type = render === 'text' ? 'text' : 'number'
      onSave({
        ...col,
        type,
        behavior: { mode: 'formula', prompt: prompt.trim(), render, ...(sourceColumnId ? { sourceColumnId } : {}) },
      })
    }
    onClose()
  }

  const OptionBtn = ({ m, icon: Icon, label, desc }: { m: Mode; icon: any; label: string; desc: string }) => (
    <button
      onClick={() => setMode(m)}
      className={`flex-1 rounded-xl border p-3 text-left transition ${mode === m ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300' : 'border-slate-200 hover:border-slate-300'}`}
    >
      <Icon size={18} className={mode === m ? 'text-indigo-600' : 'text-slate-500'} />
      <div className="mt-1.5 text-[13px] font-bold text-slate-800">{label}</div>
      <div className="text-[11.5px] leading-snug text-slate-500">{desc}</div>
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-black tracking-tight text-slate-900">Configurar comportamiento</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <p className="mb-4 text-[13px] text-slate-500">Columna <b>{col.name}</b>. Define cómo se comportan sus valores.</p>

        <div className="flex gap-2">
          <OptionBtn m="select" icon={List} label="Selección" desc="Lista de opciones (dropdown)." />
          <OptionBtn m="text" icon={TypeIcon} label="Texto libre" desc="Escritura manual." />
          <OptionBtn m="formula" icon={Sparkles} label="Fórmula (IA)" desc="La IA calcula el valor." />
        </div>

        {mode === 'formula' && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Describe la fórmula (en prosa)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="Ej.: Es el porcentaje de avance (0 a 100). Su valor depende de leer el enlace de la columna 'Tablero seguimiento': abre el tablero, revisa los datos y calcula el avance según la etapa del pipeline."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Mostrar como</label>
                <select value={render} onChange={(e) => setRender(e.target.value as PcBehaviorRender)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px]">
                  <option value="progress">Barra de progreso (0–100)</option>
                  <option value="number">Número</option>
                  <option value="text">Texto</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Enlace a leer (opcional)</label>
                <select value={sourceColumnId} onChange={(e) => setSourceColumnId(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px]">
                  <option value="">Detección automática</option>
                  {linkCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-[12px] text-indigo-700">
              <Link2 size={15} className="mt-0.5 shrink-0" />
              <span>
                Integración nativa: si el enlace apunta a <b>Mis Proyectos</b> (o a un tablero público de este sistema), la IA
                lee sus datos reales por API (avance por etapa del pipeline) y aplica tu fórmula. El valor se recalcula a demanda.
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] font-semibold text-slate-500 hover:text-slate-800">Cancelar</button>
          <button onClick={save} className="rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700">Guardar</button>
        </div>
      </div>
    </div>
  )
}
