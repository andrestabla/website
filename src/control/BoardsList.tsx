import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileSpreadsheet, Trash2, Loader2, LayoutGrid, Users, Globe } from 'lucide-react'
import { createBoard, deleteBoard, listBoards } from './lib/control-api'
import { parseSpreadsheet } from './lib/excel'
import { newColumn, newRow, type PcBoardSummary } from './lib/types'
import { controlPath } from './lib/base'

export function BoardsList() {
  const navigate = useNavigate()
  const [boards, setBoards] = useState<PcBoardSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    listBoards()
      .then(setBoards)
      .catch((e) => setError(e?.message || 'No se pudieron cargar los tableros'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const createBlank = async () => {
    setCreating(true)
    setError('')
    try {
      const columns = [
        newColumn('text', 'Tarea'),
        (() => { const c = newColumn('select', 'Estado'); c.options = [
          { value: 'Sin iniciar', color: '#f1f5f9' },
          { value: 'En progreso', color: '#e0f2fe' },
          { value: 'Completado', color: '#dcfce7' },
        ]; return c })(),
        newColumn('text', 'Responsable'),
        newColumn('date', 'Fecha límite'),
      ]
      const rows = [newRow(columns), newRow(columns), newRow(columns)]
      const boardId = await createBoard({ title: 'Nuevo tablero', columns, rows })
      navigate(controlPath(`/${boardId}`))
    } catch (e: any) {
      setError(e?.message || 'No se pudo crear')
      setCreating(false)
    }
  }

  const onImport = async (file: File) => {
    setCreating(true)
    setError('')
    try {
      const { columns, rows } = await parseSpreadsheet(file)
      if (columns.length === 0) throw new Error('El archivo no tiene columnas legibles')
      const title = file.name.replace(/\.(xlsx?|csv|tsv)$/i, '')
      const boardId = await createBoard({ title, columns, rows })
      navigate(controlPath(`/${boardId}`))
    } catch (e: any) {
      setError(e?.message || 'No se pudo importar el archivo')
      setCreating(false)
    }
  }

  const remove = async (b: PcBoardSummary) => {
    if (!confirm(`¿Eliminar "${b.title}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteBoard(b.id)
      setBoards((prev) => prev.filter((x) => x.id !== b.id))
    } catch (e: any) {
      setError(e?.message || 'No se pudo eliminar')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Tableros</h1>
          <p className="mt-1 text-sm text-slate-500">Crea y administra tableros de seguimiento 100 % customizables.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = '' }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-60"
          >
            <FileSpreadsheet size={16} /> Importar Excel
          </button>
          <button
            onClick={createBlank}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Nuevo tablero
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</div>}

      {loading ? (
        <div className="grid min-h-[40vh] place-items-center"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : boards.length === 0 ? (
        <div className="grid min-h-[40vh] place-items-center rounded-2xl border border-dashed border-slate-300 text-center">
          <div>
            <LayoutGrid className="mx-auto mb-3 text-slate-300" size={40} />
            <div className="text-sm font-semibold text-slate-600">Aún no tienes tableros</div>
            <div className="mt-1 text-[13px] text-slate-400">Crea uno nuevo o importa un Excel para empezar.</div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <div
              key={b.id}
              className="group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md"
              onClick={() => navigate(controlPath(`/${b.id}`))}
            >
              <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white">
                  <LayoutGrid size={18} />
                </div>
                {b.role === 'owner' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(b) }}
                    className="text-slate-300 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <h3 className="mt-3 truncate text-[15px] font-bold tracking-tight text-slate-900">{b.title}</h3>
              {b.description && <p className="mt-0.5 truncate text-[12.5px] text-slate-500">{b.description}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-0.5">{b.columnsCount} col · {b.rowsCount} filas</span>
                {b.role !== 'owner' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700"><Users size={11} /> {b.role === 'EDIT' ? 'Editor' : 'Lector'}</span>
                )}
                {b.shareEnabled && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700"><Globe size={11} /> Público</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
