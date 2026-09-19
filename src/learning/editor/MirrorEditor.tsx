/**
 * Learning Builder — editor de una pieza importada.
 *
 * No hay formulario: se edita encima de la pieza. El original se sirve en un
 * marco, con cada texto suelto convertido en editable, y lo que se escribe
 * vuelve al guion como una edición sobre el texto número N de esa página. El
 * archivo no se toca nunca; quitar una edición devuelve la pieza a como llegó.
 *
 * El marco y este editor se hablan por mensajes, y solo se atienden los que
 * vienen del propio marco: cualquier otra ventana podría mandarlos.
 *
 * La subida va por trozos porque un SCORM real pesa decenas de megas y el
 * cuerpo de una función serverless no llega a cinco. El progreso que se ve es
 * el de verdad, trozo a trozo.
 */
import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, ExternalLink, FileText, Loader2, RotateCcw, Trash2, Upload,
} from 'lucide-react'
import type { LbIssue } from '../lib/blocks'
import type { LbDirectives } from '../lib/directives'
import { LB_MIRROR_ORIGIN_LABEL, mirrorEditCount, type LbMirrorContent } from '../lib/mirror'
import { learningApi } from '../lib/api'
import { CoverFields } from './CoverFields'
import { eyebrowCls, sideItemCls } from './ui'

type Incoming =
  | { source: 'lb-mirror'; type: 'ready'; slots: number }
  | { source: 'lb-mirror'; type: 'edit'; slot: string; text: string }

export function MirrorEditor({
  resourceId,
  content,
  directives,
  issues,
  onChange,
}: {
  resourceId: string
  content: LbMirrorContent
  directives: LbDirectives
  issues: LbIssue[]
  onChange: (next: LbMirrorContent) => void
}) {
  const [page, setPage] = useState(content.entry)
  const [tab, setTab] = useState<'pieza' | 'ficha'>('pieza')
  const [uploading, setUploading] = useState('')
  const [error, setError] = useState('')
  const frame = useRef<HTMLIFrameElement>(null)
  const [frameKey, setFrameKey] = useState(0)

  // El guion cambia en cada tecleo dentro del marco; el manejador tiene que
  // ver siempre el último, y no el que había cuando se registró.
  const latest = useRef(content)
  latest.current = content

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return
      const data = event.data as Incoming
      if (!data || data.source !== 'lb-mirror' || data.type !== 'edit') return

      const current = latest.current
      const forPage = { ...(current.edits[page] || {}) }
      forPage[data.slot] = data.text
      onChange({ ...current, edits: { ...current.edits, [page]: forPage } })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [page, onChange])

  useEffect(() => {
    if (!content.pages.some((row) => row.path === page)) setPage(content.entry)
  }, [content.pages, content.entry, page])

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
        const slice = buffer.subarray(index * size, (index + 1) * size)
        await learningApi.importPkg.part(resourceId, begin.uploadId, index, toBase64(slice))
      }

      setUploading('Abriendo el paquete…')
      const done = await learningApi.importPkg.ingest(resourceId, begin.uploadId, parts, file.name)
      onChange(done.content)
      setPage(done.content.entry)
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
      const done = await learningApi.importPkg.clear(resourceId)
      onChange(done.content)
    } catch (caught: any) {
      setError(caught?.message || 'No se pudo borrar el paquete')
    } finally {
      setUploading('')
    }
  }

  const edits = mirrorEditCount(content)
  const pageEdits = Object.keys(content.edits[page] || {}).length
  const errors = issues.filter((issue) => issue.level === 'error')

  if (!content.pages.length) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
            <Upload size={24} />
          </div>
          <h3 className="text-[17px] font-black tracking-tight">Sube el paquete original</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
            Un SCORM, un sitio comprimido o una página HTML suelta. Se guarda tal cual y se
            sirve igual que venía; lo único que se le añade es la capa que permite
            corregir sus textos en línea.
          </p>
          <UploadButton uploading={uploading} onPick={upload} />
          {error && <p className="mt-3 text-[12.5px] font-semibold text-rose-600">{error}</p>}
          <p className="mt-4 text-[11.5px] text-slate-400">Hasta 60 MB.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50 p-3 md:border-b-0 md:border-r">
        <div className="mb-2 flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
          {([['pieza', 'Pieza'], ['ficha', 'Ficha']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-md py-1.5 text-[12.5px] font-semibold ${
                tab === key ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={`mb-1 px-3 ${eyebrowCls}`}>Páginas · {content.pages.length}</div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {content.pages.map((row) => {
            const count = Object.keys(content.edits[row.path] || {}).length
            return (
              <button
                key={row.id}
                onClick={() => { setPage(row.path); setTab('pieza') }}
                className={sideItemCls(page === row.path && tab === 'pieza')}
                title={row.path}
              >
                <FileText size={13} className="shrink-0" />
                <span className="truncate">{row.title}</span>
                {row.path === content.entry && (
                  <span className={`shrink-0 text-[9.5px] font-black uppercase tracking-wider ${
                    page === row.path ? 'text-white/70' : 'text-indigo-500'
                  }`}>entrada</span>
                )}
                {count > 0 && (
                  <span className={`ml-auto shrink-0 text-[11px] font-bold ${
                    page === row.path && tab === 'pieza' ? 'text-white/80' : 'text-emerald-600'
                  }`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
          <div className="space-y-1 text-[12px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Origen</span>
              <b>{LB_MIRROR_ORIGIN_LABEL[content.origin.kind]}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Textos editados</span>
              <b className={edits ? 'text-emerald-600' : ''}>{edits}</b>
            </div>
          </div>
          <UploadButton uploading={uploading} onPick={upload} compact label="Reemplazar paquete" />
          <button
            onClick={clearPackage}
            disabled={!!uploading}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-500 hover:bg-white hover:text-rose-600 disabled:opacity-50"
          >
            <Trash2 size={12} /> Borrar el paquete
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col">
        {tab === 'ficha' ? (
          <div className="overflow-y-auto p-4 sm:p-6">
            <CoverFields
              cover={content.cover}
              directives={directives}
              onChange={(cover) => onChange({ ...content, cover })}
              title="Ficha de la pieza"
            />
            <div className="mt-6 max-w-2xl rounded-xl border border-slate-200 bg-slate-50 p-4 text-[12.5px] text-slate-600">
              <div className="mb-2 font-bold text-slate-700">Del archivo original</div>
              <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-y-1">
                <dt className="text-slate-400">Archivo</dt><dd className="truncate">{content.origin.fileName || '—'}</dd>
                <dt className="text-slate-400">Importado</dt>
                <dd>{content.origin.importedAt ? new Date(content.origin.importedAt).toLocaleString('es-CO') : '—'}</dd>
                <dt className="text-slate-400">Título declarado</dt><dd>{content.origin.manifestTitle || '—'}</dd>
                <dt className="text-slate-400">Versión SCORM</dt><dd>{content.origin.scormVersion || '—'}</dd>
                <dt className="text-slate-400">Entrada</dt><dd className="font-mono text-[11.5px]">{content.entry}</dd>
              </dl>
            </div>
          </div>
        ) : (
          <>
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
                    const rest = { ...content.edits }
                    delete rest[page]
                    onChange({ ...content, edits: rest })
                    setFrameKey((value) => value + 1)
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-rose-600"
                >
                  <RotateCcw size={12} /> Deshacer los de esta página
                </button>
              )}
              <a
                href={`${learningApi.previewUrl(resourceId)}&path=${encodeURIComponent(page)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
              >
                <ExternalLink size={12} /> Ver sin editar
              </a>
            </div>

            <p className="border-b border-slate-100 bg-amber-50/60 px-3 py-1.5 text-[11.5px] text-amber-800">
              Pulsa cualquier texto de la pieza para corregirlo. La diagramación, los estilos y
              las interacciones son los del original y no se tocan.
            </p>

            {errors.length > 0 && (
              <ul className="border-b border-rose-100 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                {errors.map((issue, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {issue.message}
                  </li>
                ))}
              </ul>
            )}

            <iframe
              key={`${page}-${frameKey}`}
              ref={frame}
              title="Pieza importada"
              src={`${learningApi.previewUrl(resourceId)}&edit=1&path=${encodeURIComponent(page)}`}
              className="min-h-0 w-full flex-1 border-0 bg-white"
            />
          </>
        )}
      </div>
    </div>
  )
}

function UploadButton({
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
