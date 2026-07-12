import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Share2, Check, Loader2, Copy, Download, Table2, Database, BarChart3, Sparkles, Save, Pin } from 'lucide-react'
import { computeCell, duplicateBoard, getBoard, saveBoard } from './lib/control-api'
import { controlPath } from './lib/base'
import { newColumn, newRow, type PcAnalyticsConfig, type PcBoard, type PcCellValue, type PcColumn } from './lib/types'
import { exportBoardToExcel } from './lib/export'
import { applyView, emptyView, type PcView } from './lib/view'
import { DataGrid } from './grid/DataGrid'
import { CardsView } from './grid/CardsView'
import { RecordPanel } from './grid/RecordPanel'
import { GridToolbar } from './grid/GridToolbar'
import { DatosEntrada } from './grid/DatosEntrada'
import { Analitica } from './grid/Analitica'
import { ShareDialog } from './grid/ShareDialog'
import { BehaviorDialog } from './grid/BehaviorDialog'
import { BoardChat } from './grid/BoardChat'
import { ConfirmModal } from './grid/ConfirmModal'

type Tab = 'grid' | 'datos' | 'analitica'

export function BoardEditor() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState<PcBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('grid')
  const [view, setView] = useState<PcView>(emptyView)
  const [gridMode, setGridMode] = useState<'table' | 'cards'>('table')
  const [openRecordId, setOpenRecordId] = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const [behaviorColId, setBehaviorColId] = useState<string | null>(null)
  const [computing, setComputing] = useState<Set<string>>(new Set())
  const [computeMsg, setComputeMsg] = useState('')
  const [analyticsConfig, setAnalyticsConfig] = useState<PcAnalyticsConfig | null>(null)
  const [pinFlash, setPinFlash] = useState(false)
  const [pinning, setPinning] = useState(false)

  // Guardado explícito
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const [modal, setModal] = useState<null | 'save' | 'leave' | { kind: 'delete'; label: string; run: () => void }>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getBoard(id)
      .then((b) => { if (!cancelled) { setBoard(b); setDirty(false); setLoading(false) } })
      .catch((e) => { if (!cancelled) { setError(e?.message || 'No se pudo cargar'); setLoading(false) } })
    return () => { cancelled = true }
  }, [id])

  const editable = board?.access === 'owner' || board?.access === 'EDIT'

  // Cada cambio marca el tablero como "sin guardar" (no persiste hasta pulsar Guardar).
  const update = useCallback((patch: Partial<PcBoard>, markDirty = true) => {
    setBoard((prev) => (prev ? { ...prev, ...patch } : prev))
    if (markDirty) { setDirty(true); setSaveErr('') }
  }, [])

  const saveNow = async () => {
    if (!board) return
    setSaving(true)
    setSaveErr('')
    try {
      await saveBoard(board.id, { title: board.title, description: board.description, columns: board.columns, rows: board.rows, publicView: board.publicView })
      setDirty(false)
      setModal(null)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2200)
    } catch (e: any) {
      setSaveErr(e?.message || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  // Aviso del navegador al cerrar/recargar con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const goBack = () => { if (dirty) setModal('leave'); else navigate(controlPath()) }

  const filteredRows = useMemo(() => (board ? applyView(board.rows, board.columns, view) : []), [board, view])

  // Fija la vista pública por defecto y la persiste de inmediato (independiente
  // del guardado de contenido, igual que el toggle de compartir).
  const pinPublicView = async () => {
    if (!board) return
    const pvTab: 'grid' | 'analitica' = tab === 'analitica' ? 'analitica' : 'grid'
    const pv = {
      tab: pvTab,
      gridView: pvTab === 'grid' ? view : board.publicView?.gridView,
      gridMode: pvTab === 'grid' ? gridMode : board.publicView?.gridMode,
      analytics: analyticsConfig || board.publicView?.analytics,
    }
    setPinning(true)
    setSaveErr('')
    try {
      await saveBoard(board.id, { publicView: pv })
      update({ publicView: pv }, false) // refleja localmente sin marcar "sin guardar"
      setPinFlash(true)
      setTimeout(() => setPinFlash(false), 2600)
    } catch (e: any) {
      setSaveErr(e?.message || 'No se pudo fijar la vista pública')
    } finally {
      setPinning(false)
    }
  }

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
  const requestDelete = (label: string, run: () => void) => setModal({ kind: 'delete', label, run })
  const onColumnDelete = (colId: string) => {
    const name = board.columns.find((c) => c.id === colId)?.name || 'columna'
    requestDelete(`la columna "${name}" y todos sus datos`, () => {
      const columns = board.columns.filter((c) => c.id !== colId)
      const rows = board.rows.map((r) => {
        const cells = { ...r.cells }
        delete cells[colId]
        return { ...r, cells }
      })
      update({ columns, rows })
    })
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
  const onDeleteRow = (rowId: string) =>
    requestDelete('esta fila', () => update({ rows: board.rows.filter((r) => r.id !== rowId) }))
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
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-5 sm:py-6">
      <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button onClick={goBack} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
            <ArrowLeft size={17} />
          </button>
          <div className="min-w-0 flex-1">
            {editable ? (
              <input
                value={board.title}
                onChange={(e) => update({ title: e.target.value })}
                className="w-full truncate border-0 bg-transparent text-lg font-black tracking-tight text-slate-900 outline-none focus:bg-slate-50 focus:px-1 sm:text-xl"
              />
            ) : (
              <h1 className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-xl">{board.title}</h1>
            )}
            {editable ? (
              <input
                value={board.description}
                placeholder="Añade una descripción…"
                onChange={(e) => update({ description: e.target.value })}
                className="hidden w-full truncate border-0 bg-transparent text-[13px] text-slate-500 outline-none focus:bg-slate-50 focus:px-1 sm:block"
              />
            ) : board.description ? (
              <p className="hidden truncate text-[13px] text-slate-500 sm:block">{board.description}</p>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
          {editable ? (
            <>
              {!dirty && (
                <span className={`hidden text-[12px] sm:inline-flex sm:items-center sm:gap-1 ${savedFlash ? 'font-semibold text-emerald-600' : 'text-slate-400'}`}>
                  {savedFlash ? <><Check size={14} /> Guardado</> : 'Sin cambios'}
                </span>
              )}
              <button
                onClick={() => dirty && setModal('save')}
                disabled={!dirty || saving}
                title={dirty ? 'Guardar cambios' : 'No hay cambios por guardar'}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold transition sm:px-3.5 ${
                  dirty ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm' : 'cursor-default border border-slate-200 bg-white text-slate-400'
                }`}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                <span>{dirty ? 'Guardar' : 'Guardado'}</span>
                {dirty && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-white/90" />}
              </button>
            </>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">Solo lectura</span>
          )}
          <button
            onClick={() => exportBoardToExcel(board)}
            title="Exportar a Excel"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
          >
            <Download size={15} /> <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={onDuplicate}
            disabled={duplicating}
            title="Duplicar tablero"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-60"
          >
            {duplicating ? <Loader2 size={15} className="animate-spin" /> : <Copy size={15} />} <span className="hidden sm:inline">Duplicar</span>
          </button>
          {board.isOwner && (
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700 sm:px-3.5"
            >
              <Share2 size={15} /> <span className="hidden sm:inline">Compartir</span>
            </button>
          )}
        </div>
      </div>

      {/* Pestañas */}
      <div className="mb-4 flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto border-b border-slate-200 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-semibold transition sm:px-3.5 ${
                tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
        {board.isOwner && tab !== 'datos' && (
          <div className="flex shrink-0 items-center gap-2 pb-1.5">
            {pinFlash && <span className="hidden items-center gap-1 text-[12px] font-semibold text-emerald-600 sm:inline-flex"><Check size={13} /> Vista pública fijada</span>}
            <button
              onClick={pinPublicView}
              disabled={pinning}
              title="Fijar esta vista como la que verán por defecto en el enlace público (se aplica al instante)"
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold transition disabled:opacity-60 sm:px-3 ${
                board.publicView?.tab === (tab === 'analitica' ? 'analitica' : 'grid')
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              {pinning ? <Loader2 size={14} className="animate-spin" /> : <Pin size={14} />} <span className="hidden sm:inline">Fijar vista pública</span><span className="sm:hidden">Fijar</span>
            </button>
          </div>
        )}
      </div>

      {tab === 'grid' && (
        <>
          <GridToolbar
            columns={board.columns}
            view={view}
            onChange={setView}
            viewMode={gridMode}
            onViewModeChange={setGridMode}
            rightSlot={<span className="hidden text-[12px] text-slate-400 sm:inline">{filteredRows.length} de {board.rows.length} filas</span>}
          />
          {computeMsg && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12.5px] text-indigo-700">
              <Sparkles size={14} className="mt-0.5 shrink-0" />
              <span className="flex-1">{computeMsg}</span>
              <button onClick={() => setComputeMsg('')} className="text-indigo-300 hover:text-indigo-600">×</button>
            </div>
          )}
          {gridMode === 'cards' ? (
            <CardsView
              columns={board.columns}
              rows={filteredRows}
              editable={!!editable}
              onCellChange={onCellChange}
              onAddRow={onAddRow}
              onDeleteRow={onDeleteRow}
              onRecalcCell={recalcCell}
              onOpenRecord={setOpenRecordId}
              computing={computing}
            />
          ) : (
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
          )}
        </>
      )}

      {tab === 'datos' && (
        <DatosEntrada
          columns={board.columns}
          editable={!!editable}
          onColumnChange={onColumnChange}
          onColumnsChange={onColumnsChange}
          onAddCategory={onAddCategory}
          onConfirmDelete={requestDelete}
        />
      )}

      {tab === 'analitica' && (
        <Analitica
          columns={board.columns}
          rows={board.rows}
          initialConfig={board.publicView?.analytics}
          onConfigChange={setAnalyticsConfig}
        />
      )}

      {openRecordId && (() => {
        const idx = board.rows.findIndex((r) => r.id === openRecordId)
        return idx >= 0 ? (
          <RecordPanel
            columns={board.columns}
            row={board.rows[idx]}
            index={idx}
            editable={!!editable}
            onCellChange={onCellChange}
            onRecalcCell={recalcCell}
            computing={computing}
            onClose={() => setOpenRecordId(null)}
          />
        ) : null
      })()}

      <BoardChat boardId={board.id} title={board.title} />

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

      {modal === 'save' && (
        <ConfirmModal
          title="Guardar cambios"
          message="Se aplicarán los cambios del tablero (columnas, filas y datos de entrada). Esta acción actualiza el tablero para todos."
          confirmLabel="Guardar"
          loading={saving}
          error={saveErr}
          onConfirm={saveNow}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'leave' && (
        <ConfirmModal
          title="Salir sin guardar"
          message="Tienes cambios sin guardar. Si sales ahora, se perderán."
          variant="danger"
          confirmLabel="Salir sin guardar"
          onConfirm={() => navigate(controlPath())}
          onClose={() => setModal(null)}
        />
      )}
      {modal && typeof modal === 'object' && modal.kind === 'delete' && (
        <ConfirmModal
          title={`¿Eliminar ${modal.label}?`}
          message="El cambio quedará pendiente; se aplicará definitivamente al pulsar «Guardar cambios»."
          variant="danger"
          confirmLabel="Eliminar"
          onConfirm={() => { modal.run(); setModal(null) }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[60vh] place-items-center">{children}</div>
}
