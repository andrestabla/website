import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Share2, Check, Loader2, AlertCircle, Copy, Download, Table2, Database, BarChart3, Sparkles } from 'lucide-react'
import { computeCell, duplicateBoard, getBoard, saveBoard } from './lib/control-api'
import { controlPath } from './lib/base'
import { newColumn, newRow, type PcBoard, type PcCellValue, type PcColumn } from './lib/types'
import { exportBoardToExcel } from './lib/export'
import { applyView, emptyView, type PcView } from './lib/view'
import { DataGrid } from './grid/DataGrid'
import { GridToolbar } from './grid/GridToolbar'
import { DatosEntrada } from './grid/DatosEntrada'
import { Analitica } from './grid/Analitica'
import { ShareDialog } from './grid/ShareDialog'
import { BehaviorDialog } from './grid/BehaviorDialog'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type Tab = 'grid' | 'datos' | 'analitica'

export function BoardEditor() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState<PcBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [shareOpen, setShareOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('grid')
  const [view, setView] = useState<PcView>(emptyView)
  const [duplicating, setDuplicating] = useState(false)
  const [behaviorColId, setBehaviorColId] = useState<string | null>(null)
  const [computing, setComputing] = useState<Set<string>>(new Set())
  const [computeMsg, setComputeMsg] = useState('')

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<Partial<Pick<PcBoard, 'title' | 'description' | 'columns' | 'rows'>>>({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getBoard(id)
      .then((b) => { if (!cancelled) { setBoard(b); setLoading(false) } })
      .catch((e) => { if (!cancelled) { setError(e?.message || 'No se pudo cargar'); setLoading(false) } })
    return () => { cancelled = true }
  }, [id])

  const editable = board?.access === 'owner' || board?.access === 'EDIT'

  const scheduleSave = useCallback((patch: Partial<Pick<PcBoard, 'title' | 'description' | 'columns' | 'rows'>>) => {
    pending.current = { ...pending.current, ...patch }
    setSaveState('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const toSave = pending.current
      pending.current = {}
      try {
        await saveBoard(id, toSave)
        setSaveState('saved')
        setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 1500)
      } catch {
        setSaveState('error')
      }
    }, 700)
  }, [id])

  const update = useCallback((patch: Partial<PcBoard>, save = true) => {
    setBoard((prev) => (prev ? { ...prev, ...patch } : prev))
    if (save) {
      const savable: any = {}
      if ('title' in patch) savable.title = patch.title
      if ('description' in patch) savable.description = patch.description
      if ('columns' in patch) savable.columns = patch.columns
      if ('rows' in patch) savable.rows = patch.rows
      scheduleSave(savable)
    }
  }, [scheduleSave])

  const filteredRows = useMemo(() => (board ? applyView(board.rows, board.columns, view) : []), [board, view])

  if (loading) return <Centered><Loader2 className="animate-spin text-slate-400" /></Centered>
  if (error || !board) return <Centered><div className="text-sm text-rose-600">{error || 'Tablero no encontrado'}</div></Centered>

  // ── Operaciones sobre columnas / filas ──
  const setColumns = (columns: PcColumn[]) => update({ columns })
  const onColumnChange = (col: PcColumn) => setColumns(board.columns.map((c) => (c.id === col.id ? col : c)))
  const onColumnMove = (colId: string, dir: -1 | 1) => {
    const i = board.columns.findIndex((c) => c.id === colId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= board.columns.length) return
    const cols = [...board.columns]
    ;[cols[i], cols[j]] = [cols[j], cols[i]]
    setColumns(cols)
  }
  const onColumnDelete = (colId: string) => {
    const columns = board.columns.filter((c) => c.id !== colId)
    const rows = board.rows.map((r) => {
      const cells = { ...r.cells }
      delete cells[colId]
      return { ...r, cells }
    })
    update({ columns, rows })
  }
  const onAddColumn = () => {
    const col = newColumn('text', `Columna ${board.columns.length + 1}`)
    const rows = board.rows.map((r) => ({ ...r, cells: { ...r.cells, [col.id]: null } }))
    update({ columns: [...board.columns, col], rows })
  }
  const onAddCategory = () => {
    const n = board.columns.filter((c) => c.type === 'select').length + 1
    const col = newColumn('select', `Categoría ${n}`)
    const rows = board.rows.map((r) => ({ ...r, cells: { ...r.cells, [col.id]: null } }))
    update({ columns: [...board.columns, col], rows })
    setTab('datos')
  }
  // Reemplazo masivo de columnas (import de Datos de entrada): garantiza que cada
  // fila tenga celda para las columnas nuevas.
  const onColumnsChange = (columns: PcColumn[]) => {
    const known = new Set(board.columns.map((c) => c.id))
    const added = columns.filter((c) => !known.has(c.id))
    const rows = added.length
      ? board.rows.map((r) => {
          const cells = { ...r.cells }
          for (const c of added) if (!(c.id in cells)) cells[c.id] = null
          return { ...r, cells }
        })
      : board.rows
    update({ columns, rows })
  }
  const onAddRow = () => update({ rows: [...board.rows, newRow(board.columns)] })
  const onDeleteRow = (rowId: string) => update({ rows: board.rows.filter((r) => r.id !== rowId) })
  const onCellChange = (rowId: string, colId: string, value: PcCellValue) =>
    update({ rows: board.rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r)) })

  // ── Columnas fórmula (IA) ──
  const setComputingKey = (key: string, on: boolean) =>
    setComputing((prev) => { const n = new Set(prev); if (on) n.add(key); else n.delete(key); return n })

  const recalcCell = async (rowId: string, colId: string) => {
    const key = `${rowId}:${colId}`
    setComputingKey(key, true)
    setComputeMsg('')
    try {
      const r = await computeCell(board.id, colId, rowId)
      onCellChange(rowId, colId, r.value)
      if (r.note) setComputeMsg(r.source ? `${r.source.name || 'Fuente'}: ${r.note}` : r.note)
    } catch (e: any) {
      setComputeMsg(e?.message || 'No se pudo calcular con IA')
    } finally {
      setComputingKey(key, false)
    }
  }

  const recalcColumn = async (colId: string) => {
    setComputeMsg('')
    const results: Record<string, PcCellValue> = {}
    for (const r of board.rows) {
      const key = `${r.id}:${colId}`
      setComputingKey(key, true)
      try {
        const res = await computeCell(board.id, colId, r.id)
        results[r.id] = res.value
      } catch (e: any) {
        setComputeMsg(e?.message || 'Error al recalcular la columna')
      } finally {
        setComputingKey(key, false)
      }
    }
    update({ rows: board.rows.map((r) => (r.id in results ? { ...r, cells: { ...r.cells, [colId]: results[r.id] } } : r)) })
  }

  const onDuplicate = async () => {
    setDuplicating(true)
    try {
      const newId = await duplicateBoard(board.id)
      navigate(controlPath(`/${newId}`))
    } catch (e: any) {
      setError(e?.message || 'No se pudo duplicar')
      setDuplicating(false)
    }
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'grid', label: 'Tablero', icon: Table2 },
    { key: 'datos', label: 'Datos de entrada', icon: Database },
    { key: 'analitica', label: 'Analítica', icon: BarChart3 },
  ]

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6">
      <div className="mb-3 flex items-center gap-3">
        <button onClick={() => navigate(controlPath())} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
          <ArrowLeft size={17} />
        </button>
        <div className="min-w-0 flex-1">
          {editable ? (
            <input
              value={board.title}
              onChange={(e) => update({ title: e.target.value })}
              className="w-full truncate border-0 bg-transparent text-xl font-black tracking-tight text-slate-900 outline-none focus:bg-slate-50 focus:px-1"
            />
          ) : (
            <h1 className="truncate text-xl font-black tracking-tight text-slate-900">{board.title}</h1>
          )}
          {editable ? (
            <input
              value={board.description}
              placeholder="Añade una descripción…"
              onChange={(e) => update({ description: e.target.value })}
              className="w-full truncate border-0 bg-transparent text-[13px] text-slate-500 outline-none focus:bg-slate-50 focus:px-1"
            />
          ) : board.description ? (
            <p className="truncate text-[13px] text-slate-500">{board.description}</p>
          ) : null}
        </div>
        <SaveBadge state={saveState} readOnly={!editable} />
        <button
          onClick={() => exportBoardToExcel(board)}
          title="Exportar a Excel"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
        >
          <Download size={15} /> Excel
        </button>
        <button
          onClick={onDuplicate}
          disabled={duplicating}
          title="Duplicar tablero"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-60"
        >
          {duplicating ? <Loader2 size={15} className="animate-spin" /> : <Copy size={15} />} Duplicar
        </button>
        {board.isOwner && (
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700"
          >
            <Share2 size={15} /> Compartir
          </button>
        )}
      </div>

      {/* Pestañas */}
      <div className="mb-4 flex items-center gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition ${
              tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'grid' && (
        <>
          <GridToolbar
            columns={board.columns}
            view={view}
            onChange={setView}
            rightSlot={<span className="text-[12px] text-slate-400">{filteredRows.length} de {board.rows.length} filas</span>}
          />
          {computeMsg && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12.5px] text-indigo-700">
              <Sparkles size={14} className="mt-0.5 shrink-0" />
              <span className="flex-1">{computeMsg}</span>
              <button onClick={() => setComputeMsg('')} className="text-indigo-300 hover:text-indigo-600">×</button>
            </div>
          )}
          <DataGrid
            columns={board.columns}
            rows={filteredRows}
            editable={!!editable}
            onCellChange={onCellChange}
            onColumnChange={onColumnChange}
            onColumnMove={onColumnMove}
            onColumnDelete={onColumnDelete}
            onConfigureBehavior={(colId) => setBehaviorColId(colId)}
            onRecalcColumn={recalcColumn}
            onAddColumn={onAddColumn}
            onAddRow={onAddRow}
            onDeleteRow={onDeleteRow}
            onRecalcCell={recalcCell}
            computing={computing}
          />
        </>
      )}

      {tab === 'datos' && (
        <DatosEntrada
          columns={board.columns}
          editable={!!editable}
          onColumnChange={onColumnChange}
          onColumnsChange={onColumnsChange}
          onAddCategory={onAddCategory}
        />
      )}

      {tab === 'analitica' && <Analitica columns={board.columns} rows={board.rows} />}

      {behaviorColId && (() => {
        const col = board.columns.find((c) => c.id === behaviorColId)
        return col ? (
          <BehaviorDialog
            col={col}
            columns={board.columns}
            onSave={onColumnChange}
            onClose={() => setBehaviorColId(null)}
          />
        ) : null
      })()}

      {shareOpen && (
        <ShareDialog
          boardId={board.id}
          initialEnabled={board.shareEnabled}
          initialToken={board.shareToken}
          onClose={() => setShareOpen(false)}
          onPublicChange={(enabled, token) => update({ shareEnabled: enabled, shareToken: token }, false)}
        />
      )}
    </div>
  )
}

function SaveBadge({ state, readOnly }: { state: SaveState; readOnly: boolean }) {
  if (readOnly) return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">Solo lectura</span>
  if (state === 'saving') return <span className="inline-flex items-center gap-1 text-[12px] text-slate-400"><Loader2 size={13} className="animate-spin" /> Guardando…</span>
  if (state === 'saved') return <span className="inline-flex items-center gap-1 text-[12px] text-emerald-600"><Check size={13} /> Guardado</span>
  if (state === 'error') return <span className="inline-flex items-center gap-1 text-[12px] text-rose-600"><AlertCircle size={13} /> Error al guardar</span>
  return null
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[60vh] place-items-center">{children}</div>
}
