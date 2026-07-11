import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LayoutGrid, Loader2, Table2, BarChart3 } from 'lucide-react'
import { getPublicBoard, type PublicBoardData } from './lib/control-api'
import { DataGrid } from './grid/DataGrid'
import { GridToolbar } from './grid/GridToolbar'
import { Analitica } from './grid/Analitica'
import { BoardChat } from './grid/BoardChat'
import { applyView, emptyView, type PcView } from './lib/view'

export default function PublicBoard() {
  const { token = '' } = useParams()
  const [data, setData] = useState<PublicBoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'grid' | 'analitica'>('grid')
  const [view, setView] = useState<PcView>(emptyView)
  const filteredRows = useMemo(() => (data ? applyView(data.rows, data.columns, view) : []), [data, view])

  useEffect(() => {
    let cancelled = false
    getPublicBoard(token)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch((e) => { if (!cancelled) { setError(e?.message || 'Tablero no disponible'); setLoading(false) } })
    return () => { cancelled = true }
  }, [token])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex h-14 items-center gap-2.5 border-b border-slate-200 bg-white px-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-sky-500 text-white"><LayoutGrid size={16} /></div>
        <div className="text-sm font-black tracking-tight">PROJECT<span className="text-indigo-600">CONTROL</span></div>
        <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">Vista pública · solo lectura</span>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-6">
        {loading ? (
          <div className="grid min-h-[50vh] place-items-center"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : error || !data ? (
          <div className="grid min-h-[50vh] place-items-center text-center">
            <div>
              <div className="text-lg font-bold text-slate-700">{error || 'Tablero no disponible'}</div>
              <div className="mt-1 text-sm text-slate-400">El enlace puede haber sido desactivado por su propietario.</div>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-black tracking-tight text-slate-900">{data.title}</h1>
            {data.description && <p className="mt-0.5 text-[13px] text-slate-500">{data.description}</p>}

            <div className="mb-4 mt-4 flex items-center gap-1 border-b border-slate-200">
              {([['grid', 'Tablero', Table2], ['analitica', 'Analítica', BarChart3]] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition ${
                    tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            {tab === 'grid' ? (
              <>
                <GridToolbar
                  columns={data.columns}
                  view={view}
                  onChange={setView}
                  rightSlot={<span className="text-[12px] text-slate-400">{filteredRows.length} de {data.rows.length} filas</span>}
                />
                <DataGrid columns={data.columns} rows={filteredRows} editable={false} />
              </>
            ) : (
              <Analitica columns={data.columns} rows={data.rows} />
            )}
          </>
        )}
      </div>
      {data && <BoardChat token={token} title={data.title} />}
    </div>
  )
}
