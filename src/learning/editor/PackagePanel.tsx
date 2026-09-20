/**
 * Learning Builder — el paquete de un recurso: subirlo, verlo y corregirlo.
 *
 * No hay formulario: se edita encima de la pieza. El original se sirve en un
 * marco, con cada texto suelto convertido en editable, y lo que se escribe
 * vuelve como una edición sobre el texto número N de esa página. El archivo no
 * se toca nunca; quitar una edición devuelve la pieza a como llegó.
 *
 * El mismo panel sirve a los dos casos: una pieza importada, cuyo guion **es**
 * el paquete, y la pieza final que se le adjunta a un OVA, una lectura o una
 * presentación ya producidos. Lo único que cambia es de dónde sale el paquete
 * y a dónde vuelve, y de eso se ocupa quien lo monta.
 *
 * El marco y este panel se hablan por mensajes, y solo se atienden los que
 * vienen del propio marco: cualquier otra ventana podría mandarlos.
 *
 * La subida va por trozos porque un SCORM real pesa decenas de megas y el
 * cuerpo de una función serverless no llega a cinco. El progreso que se ve es
 * el de verdad, trozo a trozo.
 */
import { useEffect, useRef, useState } from 'react'
import { Check, ExternalLink, FileText, Loader2, RotateCcw, Trash2, Upload } from 'lucide-react'
import { packageEditCount, type LbPackage } from '../lib/final'
import { learningApi } from '../lib/api'
import { eyebrowCls, sideItemCls } from './ui'

type Incoming =
  | { source: 'lb-mirror'; type: 'ready'; slots: number }
  | { source: 'lb-mirror'; type: 'edit'; slot: string; text: string }

/** Lo que cabe subir de una vez; el endpoint aplica el mismo tope. */
export const MAX_PACKAGE_MB = 60

export function PackagePanel({
  resourceId,
  pkg,
  onChange,
  onUploaded,
  onCleared,
  emptyTitle,
  emptyHint,
  saving = 'idle',
}: {
  resourceId: string
  /** null mientras no haya paquete. */
  pkg: LbPackage | null
  /** Solo cambian las ediciones; las páginas las fija la subida. */
  onChange: (next: LbPackage) => void
  onUploaded: (payload: { content: unknown; final: unknown }) => void
  onCleared: (payload: { content: unknown; final: unknown }) => void
  emptyTitle: string
  emptyHint: string
  /** Estado de guardado del builder, para decirlo aquí y no solo arriba. */
  saving?: 'idle' | 'saving' | 'saved'
}) {
  // La entrada abre la pieza publicada, pero no siempre es editable: en un
  // Rise es su reproductor. Lo que se edita es siempre una página.
  const [page, setPage] = useState(pkg?.pages[0]?.path || '')
  const [uploading, setUploading] = useState('')
  const [error, setError] = useState('')
  const frame = useRef<HTMLIFrameElement>(null)
  const [frameKey, setFrameKey] = useState(0)

  // El paquete cambia en cada tecleo dentro del marco; el manejador tiene que
  // ver siempre el último, y no el que había cuando se registró.
  const latest = useRef(pkg)
  latest.current = pkg

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return
      const data = event.data as Incoming
      if (!data || data.source !== 'lb-mirror' || data.type !== 'edit') return
      const current = latest.current
      if (!current) return
      const forPage = { ...(current.edits[page] || {}) }
      forPage[data.slot] = data.text
      onChange({ ...current, edits: { ...current.edits, [page]: forPage } })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [page, onChange])

  useEffect(() => {
    if (pkg && !pkg.pages.some((row) => row.path === page)) setPage(pkg.pages[0]?.path || '')
  }, [pkg, page])

  const upload = async (file: File) => {
    setError('')
    setUploading('Preparando…')
    try {
      const buffer = new Uint8Array(await file.arrayBuffer())
      const begin = await learningApi.importPkg.begin(resourceId, buffer.length)
      const size = begin.maxPartBytes
      const parts = Math.ceil(buffer.length / size)
      for (let index = 0; index < parts; index += 1) {
        setUploading(`Subiendo ${index + 1} de ${parts}…`)
        await learningApi.importPkg.part(resourceId, begin.uploadId, index, toBase64(buffer.subarray(index * size, (index + 1) * size)))
      }
      setUploading('Abriendo el paquete…')
      const done = await learningApi.importPkg.ingest(resourceId, begin.uploadId, parts, file.name)
      onUploaded(done)
      setFrameKey((value) => value + 1)
    } catch (caught: any) {
      setError(caught?.message || 'No se pudo subir el paquete')
    } finally {
      setUploading('')
    }
  }

  const clearPackage = async () => {
    setError('')
    setUploading('Borrando…')
    try {
      onCleared(await learningApi.importPkg.clear(resourceId))
    } catch (caught: any) {
      setError(caught?.message || 'No se pudo borrar el paquete')
    } finally {
      setUploading('')
    }
  }

  if (!pkg) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
            <Upload size={24} />
          </div>
          <h3 className="text-[17px] font-black tracking-tight">{emptyTitle}</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">{emptyHint}</p>
          <UploadButton uploading={uploading} onPick={upload} />
          {error && <p className="mt-3 text-[12.5px] font-semibold text-rose-600">{error}</p>}
          <p className="mt-4 text-[11.5px] text-slate-400">Un SCORM, un sitio comprimido o una página HTML. Hasta {MAX_PACKAGE_MB} MB.</p>
        </div>
      </div>
    )
  }

  const pageEdits = Object.keys(pkg.edits[page] || {}).length
  const previewBase = learningApi.previewUrl(resourceId)

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50 p-3 md:border-b-0 md:border-r">
        <div className={`mb-1 px-3 ${eyebrowCls}`}>Páginas · {pkg.pages.length}</div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {pkg.pages.map((row) => {
            const count = Object.keys(pkg.edits[row.path] || {}).length
            return (
              <button key={row.id} onClick={() => setPage(row.path)} className={sideItemCls(page === row.path)} title={row.path}>
                <FileText size={13} className="shrink-0" />
                <span className="truncate">{row.title}</span>
                {row.path === pkg.entry && pkg.pages.length > 1 && (
                  <span className={`shrink-0 text-[9.5px] font-black uppercase tracking-wider ${
                    page === row.path ? 'text-white/70' : 'text-indigo-500'
                  }`}>entrada</span>
                )}
                {count > 0 && (
                  <span className={`ml-auto shrink-0 text-[11px] font-bold ${
                    page === row.path ? 'text-white/80' : 'text-emerald-600'
                  }`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-slate-500">Textos corregidos</span>
            <b className={packageEditCount(pkg) ? 'text-emerald-600' : ''}>{packageEditCount(pkg)}</b>
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
            {saving === 'saving' ? (
              <><Loader2 size={11} className="animate-spin" /> Guardando…</>
            ) : (
              <><Check size={11} className="text-emerald-500" /> Todo guardado</>
            )}
          </div>
          {packageEditCount(pkg) > 0 && (
            <button
              onClick={() => { onChange({ ...pkg, edits: {} }); setFrameKey((value) => value + 1) }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-white"
            >
              <RotateCcw size={12} /> Descartar todas las correcciones
            </button>
          )}
          <UploadButton uploading={uploading} onPick={upload} compact label="Reemplazar paquete" />
          <button
            onClick={clearPackage}
            disabled={!!uploading}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-500 hover:bg-white hover:text-rose-600 disabled:opacity-50"
          >
            <Trash2 size={12} /> Quitar el paquete
          </button>
          {error && <p className="text-[12px] font-semibold text-rose-600">{error}</p>}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 text-[12px]">
          <span className="font-mono text-slate-500">{page}</span>
          {pageEdits > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              {pageEdits} texto(s) editado(s) aquí
            </span>
          )}
          <div className="flex-1" />
          {pageEdits > 0 && (
            <button
              onClick={() => {
                const rest = { ...pkg.edits }
                delete rest[page]
                onChange({ ...pkg, edits: rest })
                setFrameKey((value) => value + 1)
              }}
              className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-rose-600"
            >
              <RotateCcw size={12} /> Deshacer los de esta página
            </button>
          )}
          <a
            href={`${previewBase}&path=${encodeURIComponent(page)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
          >
            <ExternalLink size={12} /> Ver sin editar
          </a>
        </div>

        <p className="border-b border-slate-100 bg-amber-50/60 px-3 py-1.5 text-[11.5px] text-amber-800">
          Pasa el ratón por encima y pulsa cualquier texto para corregirlo; lo corregido queda en
          verde. La diagramación, los estilos y las interacciones son los del original y no se tocan.
        </p>

        <iframe
          key={`${page}-${frameKey}`}
          ref={frame}
          title="Pieza producida"
          src={`${previewBase}&edit=1&path=${encodeURIComponent(page)}`}
          className="min-h-0 w-full flex-1 border-0 bg-white"
        />
      </div>
    </div>
  )
}

export function UploadButton({
  uploading,
  onPick,
  compact,
  label = 'Elegir archivo',
}: {
  uploading: string
  onPick: (file: File) => void
  compact?: boolean
  label?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".zip,.html,.htm,application/zip,text/html"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onPick(file)
        }}
      />
      <button
        onClick={() => input.current?.click()}
        disabled={!!uploading}
        className={
          compact
            ? 'inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-white disabled:opacity-50'
            : 'mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[14px] font-bold text-white hover:bg-indigo-700 disabled:opacity-60'
        }
      >
        {uploading ? <Loader2 size={compact ? 12 : 15} className="animate-spin" /> : <Upload size={compact ? 12 : 15} />}
        {uploading || label}
      </button>
    </>
  )
}

/** Base64 sin desbordar la pila: los trozos llegan a dos megas. */
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const step = 0x8000
  for (let at = 0; at < bytes.length; at += step) {
    binary += String.fromCharCode(...bytes.subarray(at, at + step))
  }
  return btoa(binary)
}
