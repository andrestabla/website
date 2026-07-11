import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LayoutGrid, Loader2 } from 'lucide-react'
import { getPublicBoard, type PublicBoardData } from './lib/control-api'
import { DataGrid } from './grid/DataGrid'

export default function PublicBoard() {
  const { token = '' } = useParams()
  const [data, setData] = useState<PublicBoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
            {data.description && <p className="mb-4 mt-0.5 text-[13px] text-slate-500">{data.description}</p>}
            <div className="mt-4">
              <DataGrid columns={data.columns} rows={data.rows} editable={false} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
