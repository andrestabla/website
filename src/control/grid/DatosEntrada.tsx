import { useRef, useState } from 'react'
import { Plus, X, Database, Tag, Upload, Loader2 } from 'lucide-react'
import type { PcColumn, PcOption, PcOptionField } from '../lib/types'
import { PC_OPTION_COLORS, newOptionField } from '../lib/types'
import { importDatosEntradaFromFile } from '../lib/excel'
import { optionColor } from './DataGrid'

/**
 * Configuración de "Datos de entrada": cada categoría es una columna tipo lista
 * (select). Sus entradas alimentan los dropdowns de esa columna en el tablero, y
 * a cada entrada se le pueden asignar metadatos adicionales (definidos por
 * categoría).
 */
export function DatosEntrada({
  columns,
  editable,
  onColumnChange,
  onColumnsChange,
  onAddCategory,
}: {
  columns: PcColumn[]
  editable: boolean
  onColumnChange: (col: PcColumn) => void
  onColumnsChange: (cols: PcColumn[]) => void
  onAddCategory: () => void
}) {
  const categories = columns.filter((c) => c.type === 'select')
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState('')

  const onImport = async (file: File) => {
    setImporting(true)
    setMsg('')
    try {
      const { columns: updated, summary } = await importDatosEntradaFromFile(file, columns)
      onColumnsChange(updated)
      const parts = [
        summary.categories ? `${summary.categories} categoría(s) nueva(s)` : '',
        summary.options ? `${summary.options} entrada(s)` : '',
        summary.fields ? `${summary.fields} campo(s) de metadatos` : '',
      ].filter(Boolean)
      setMsg(parts.length ? `Importado: ${parts.join(' · ')}.` : 'No se encontraron entradas nuevas para importar.')
    } catch (e: any) {
      setMsg(e?.message || 'No se pudo importar el archivo.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Database size={16} />
          <span>
            Cada categoría corresponde a una columna tipo <b>Lista</b>. Sus entradas alimentan el dropdown de esa columna
            en el tablero.
          </span>
        </div>
        {editable && (
          <div className="flex shrink-0 items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = '' }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-60"
            >
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Importar Excel
            </button>
            <button
              onClick={onAddCategory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
            >
              <Plus size={15} /> Añadir categoría
            </button>
          </div>
        )}
      </div>

      {msg && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[13px] text-indigo-700">{msg}</div>
      )}

      {categories.length === 0 ? (
        <div className="grid min-h-[30vh] place-items-center rounded-2xl border border-dashed border-slate-300 text-center">
          <div>
            <Tag className="mx-auto mb-3 text-slate-300" size={36} />
            <div className="text-sm font-semibold text-slate-600">No hay categorías todavía</div>
            <div className="mt-1 text-[13px] text-slate-400">
              Crea una columna tipo <b>Lista</b> en el tablero, o añade una categoría aquí.
            </div>
          </div>
        </div>
      ) : (
        categories.map((col) => (
          <CategoryCard key={col.id} col={col} editable={editable} onChange={onColumnChange} />
        ))
      )}
    </div>
  )
}

function CategoryCard({
  col,
  editable,
  onChange,
}: {
  col: PcColumn
  editable: boolean
  onChange: (col: PcColumn) => void
}) {
  const fields = col.optionFields || []
  const options = col.options || []
  const [draft, setDraft] = useState('')

  const setFields = (f: PcOptionField[]) => onChange({ ...col, optionFields: f })
  const setOptions = (o: PcOption[]) => onChange({ ...col, options: o })

  const addField = () => setFields([...fields, newOptionField(`Dato ${fields.length + 1}`)])
  const renameField = (id: string, label: string) => setFields(fields.map((f) => (f.id === id ? { ...f, label } : f)))
  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id))
    setOptions(options.map((o) => {
      if (!o.meta) return o
      const meta = { ...o.meta }
      delete meta[id]
      return { ...o, meta }
    }))
  }

  const addOption = () => {
    const v = draft.trim()
    if (!v || options.some((o) => o.value === v)) { setDraft(''); return }
    setOptions([...options, { value: v, color: PC_OPTION_COLORS[options.length % PC_OPTION_COLORS.length] }])
    setDraft('')
  }
  const setOptionValue = (i: number, value: string) => setOptions(options.map((o, k) => (k === i ? { ...o, value } : o)))
  const setOptionColor = (i: number, color: string) => setOptions(options.map((o, k) => (k === i ? { ...o, color } : o)))
  const setOptionMeta = (i: number, fieldId: string, value: string) =>
    setOptions(options.map((o, k) => (k === i ? { ...o, meta: { ...(o.meta || {}), [fieldId]: value } } : o)))
  const removeOption = (i: number) => setOptions(options.filter((_, k) => k !== i))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        {editable ? (
          <input
            value={col.name}
            onChange={(e) => onChange({ ...col, name: e.target.value })}
            className="rounded-md border-0 bg-transparent text-[15px] font-black tracking-tight text-slate-900 outline-none focus:bg-slate-50 focus:px-1.5 focus:py-0.5 focus:ring-1 focus:ring-indigo-300"
          />
        ) : (
          <h3 className="text-[15px] font-black tracking-tight text-slate-900">{col.name}</h3>
        )}
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
          {options.length} entradas
        </span>
      </div>

      {/* Campos de metadatos de la categoría */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Metadatos:</span>
        {fields.map((f) => (
          <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-0.5 pl-2.5 pr-1 text-[12px] text-indigo-700">
            {editable ? (
              <input
                value={f.label}
                onChange={(e) => renameField(f.id, e.target.value)}
                className="w-24 border-0 bg-transparent text-[12px] font-medium text-indigo-700 outline-none"
              />
            ) : (
              <span className="font-medium">{f.label}</span>
            )}
            {editable && (
              <button onClick={() => removeField(f.id)} className="text-indigo-300 hover:text-rose-500"><X size={13} /></button>
            )}
          </span>
        ))}
        {fields.length === 0 && <span className="text-[12px] text-slate-400">sin metadatos</span>}
        {editable && (
          <button onClick={addField} className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[12px] text-slate-500 hover:border-indigo-400 hover:text-indigo-600">
            <Plus size={12} /> campo
          </button>
        )}
      </div>

      {/* Tabla de entradas */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="border-b border-r border-slate-200 px-3 py-2">Valor</th>
              {fields.map((f) => (
                <th key={f.id} className="border-b border-r border-slate-200 px-3 py-2">{f.label}</th>
              ))}
              {editable && <th className="border-b border-slate-200 px-2 py-2 w-10" />}
            </tr>
          </thead>
          <tbody>
            {options.map((o, i) => (
              <tr key={i} className="hover:bg-slate-50/60">
                <td className="border-b border-r border-slate-200 px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: optionColor(col, o.value) }} />
                    {editable ? (
                      <input
                        value={o.value}
                        onChange={(e) => setOptionValue(i, e.target.value)}
                        className="w-full border-0 bg-transparent font-medium text-slate-700 outline-none focus:bg-indigo-50/40"
                      />
                    ) : (
                      <span className="font-medium text-slate-700">{o.value}</span>
                    )}
                    {editable && (
                      <div className="flex items-center gap-0.5">
                        {PC_OPTION_COLORS.slice(0, 5).map((c) => (
                          <button key={c} onClick={() => setOptionColor(i, c)} title="color" className="h-3 w-3 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                {fields.map((f) => (
                  <td key={f.id} className="border-b border-r border-slate-200 px-3 py-1.5">
                    {editable ? (
                      <input
                        value={o.meta?.[f.id] ?? ''}
                        onChange={(e) => setOptionMeta(i, f.id, e.target.value)}
                        placeholder="—"
                        className="w-full border-0 bg-transparent text-slate-600 outline-none focus:bg-indigo-50/40"
                      />
                    ) : (
                      <span className="text-slate-600">{o.meta?.[f.id] || ''}</span>
                    )}
                  </td>
                ))}
                {editable && (
                  <td className="border-b border-slate-200 px-2 py-1.5 text-center">
                    <button onClick={() => removeOption(i)} className="text-slate-300 hover:text-rose-500"><X size={15} /></button>
                  </td>
                )}
              </tr>
            ))}
            {options.length === 0 && (
              <tr>
                <td colSpan={fields.length + 2} className="px-3 py-4 text-center text-[12px] text-slate-400">Sin entradas todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addOption() }}
            placeholder="Nueva entrada…"
            className="w-64 rounded-md border border-slate-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-indigo-400"
          />
          <button onClick={addOption} className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-[13px] font-semibold text-white hover:bg-indigo-700">
            <Plus size={14} /> Añadir
          </button>
        </div>
      )}
    </div>
  )
}
