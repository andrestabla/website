/**
 * Learning Builder — el paquete de un recurso: subirlo, verlo y retocarlo.
 *
 * No hay formulario: se trabaja encima de la pieza. El original se sirve en
 * un marco con todo señalado —los textos se escriben en el sitio, las
 * imágenes se pulsan para cambiarlas, y cada bloque trae su barra para
 * añadir encima, añadir debajo o quitar—, y lo que se hace vuelve aquí como
 * un retoque. El archivo no se toca nunca: quitar los retoques devuelve la
 * pieza a como llegó.
 *
 * El mismo panel sirve a los dos casos: una pieza importada, cuyo guion **es**
 * el paquete, y la pieza final que se le adjunta a un OVA, una lectura o una
 * presentación ya producidos.
 *
 * El marco y este panel se hablan por mensajes, y solo se atienden los que
 * vienen del propio marco: cualquier otra ventana podría mandarlos.
 *
 * Un cambio de estructura recarga el marco en vez de tocarlo por dentro. Es
 * más lento y es lo correcto: lo que se ve después de insertar es la pieza
 * servida con sus retoques aplicados, que es exactamente lo que se publica.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check, ExternalLink, Image as ImageIcon, Loader2, Plus, RotateCcw, Trash2, Upload, X,
} from 'lucide-react'
import { packageEditCount, type LbPackage, type LbPatch } from '../lib/final'
import { learningApi, readAsDataUrl } from '../lib/api'
import { eyebrowCls, fieldCls, sideItemCls } from './ui'

type Incoming =
  | { source: 'lb-mirror'; type: 'ready'; textos: number; imagenes: number; bloques: number }
  | { source: 'lb-mirror'; type: 'text'; at: number; value: string }
  | { source: 'lb-mirror'; type: 'image'; at: number; src: string; alt: string }
  | { source: 'lb-mirror'; type: 'add-before' | 'add-after' | 'remove'; at: number }

/** Lo que cabe subir de una vez; el endpoint aplica el mismo tope. */
export const MAX_PACKAGE_MB = 60

/**
 * Lo que se puede añadir. Se inserta HTML semántico a secas, sin estilos
 * propios: así lo nuevo hereda la hoja de la pieza y se ve como lo que ya
 * había, en vez de como un parche pegado encima.
 */
const NUEVOS: Array<{ id: string; label: string; html: (texto: string) => string }> = [
  { id: 'parrafo', label: 'Párrafo', html: (t) => `<p>${t}</p>` },
  { id: 'titulo', label: 'Título', html: (t) => `<h2>${t}</h2>` },
  { id: 'subtitulo', label: 'Subtítulo', html: (t) => `<h3>${t}</h3>` },
  {
    id: 'lista',
    label: 'Lista',
    html: (t) => `<ul>${t.split('\n').filter(Boolean).map((line) => `<li>${line}</li>`).join('')}</ul>`,
  },
  { id: 'cita', label: 'Cita', html: (t) => `<blockquote>${t}</blockquote>` },
  { id: 'separador', label: 'Separador', html: () => '<hr>' },
]

function escape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

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
  const [counts, setCounts] = useState<{ textos: number; imagenes: number; bloques: number } | null>(null)
  /** Lo que el marco acaba de señalar y espera respuesta. */
  const [asking, setAsking] = useState<
    | { kind: 'image'; at: number; src: string; alt: string }
    | { kind: 'add'; at: number; where: 'before' | 'after' }
    | null
  >(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [frameKey, setFrameKey] = useState(0)
  const reload = () => setFrameKey((value) => value + 1)

  // El paquete cambia en cada tecleo dentro del marco; el manejador tiene que
  // ver siempre el último, y no el que había cuando se registró.
  const latest = useRef(pkg)
  latest.current = pkg
  const pageRef = useRef(page)
  pageRef.current = page

  /** Añade un retoque a la página abierta, sustituyendo al que hubiera en ese sitio. */
  const patch = useCallback(
    (next: LbPatch, replaceSame = true) => {
      const current = latest.current
      if (!current) return
      const path = pageRef.current
      const previous = current.patches[path] || []
      const kept = replaceSame ? previous.filter((row) => !(row.op === next.op && row.at === next.at)) : previous
      onChange({ ...current, patches: { ...current.patches, [path]: [...kept, next] } })
    },
    [onChange]
  )

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return
      const data = event.data as Incoming
      if (!data || data.source !== 'lb-mirror') return

      switch (data.type) {
        case 'ready':
          setCounts({ textos: data.textos, imagenes: data.imagenes, bloques: data.bloques })
          return
        case 'text':
          patch({ op: 'text', at: data.at, value: data.value })
          return
        case 'image':
          setAsking({ kind: 'image', at: data.at, src: data.src, alt: data.alt })
          return
        case 'add-before':
          setAsking({ kind: 'add', at: data.at, where: 'before' })
          return
        case 'add-after':
          setAsking({ kind: 'add', at: data.at, where: 'after' })
          return
        case 'remove':
          patch({ op: 'remove', at: data.at })
          reload()
          return
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [patch])

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
        await learningApi.importPkg.part(
          resourceId,
          begin.uploadId,
          index,
          toBase64(buffer.subarray(index * size, (index + 1) * size))
        )
      }
      setUploading('Abriendo el paquete…')
      onUploaded(await learningApi.importPkg.ingest(resourceId, begin.uploadId, parts, file.name))
      reload()
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
          <PackageButton uploading={uploading} onPick={upload} />
          {error && <p className="mt-3 text-[12.5px] font-semibold text-rose-600">{error}</p>}
          <p className="mt-4 text-[11.5px] text-slate-400">
            Un SCORM, un sitio comprimido o una página HTML. Hasta {MAX_PACKAGE_MB} MB.
          </p>
        </div>
      </div>
    )
  }

  const pagePatches = pkg.patches[page] || []
  const previewBase = learningApi.previewUrl(resourceId)

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50 p-3 md:border-b-0 md:border-r">
        <div className={`mb-1 px-3 ${eyebrowCls}`}>Páginas · {pkg.pages.length}</div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {pkg.pages.map((row, index) => {
            const count = (pkg.patches[row.path] || []).length
            return (
              <button key={row.id} onClick={() => setPage(row.path)} className={sideItemCls(page === row.path)} title={row.path}>
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10.5px] font-bold ${
                    page === row.path ? 'bg-white/20' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="truncate">{row.title}</span>
                {count > 0 && (
                  <span
                    className={`ml-auto shrink-0 text-[11px] font-bold ${
                      page === row.path ? 'text-white/80' : 'text-emerald-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-slate-500">Retoques</span>
            <b className={packageEditCount(pkg) ? 'text-emerald-600' : ''}>{packageEditCount(pkg)}</b>
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
            {saving === 'saving' ? (
              <>
                <Loader2 size={11} className="animate-spin" /> Guardando…
              </>
            ) : (
              <>
                <Check size={11} className="text-emerald-500" /> Todo guardado
              </>
            )}
          </div>
          {packageEditCount(pkg) > 0 && (
            <button
              onClick={() => {
                onChange({ ...pkg, patches: {} })
                reload()
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-white"
            >
              <RotateCcw size={12} /> Descartar todo
            </button>
          )}
          <PackageButton uploading={uploading} onPick={upload} compact label="Reemplazar paquete" />
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

      <div className="relative flex min-h-0 min-w-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 text-[12px]">
          <span className="font-mono text-slate-500">{page}</span>
          {counts && (
            <span className="text-slate-400">
              {counts.textos} textos · {counts.imagenes} imágenes · {counts.bloques} bloques
            </span>
          )}
          <div className="flex-1" />
          {pagePatches.length > 0 && (
            <button
              onClick={() => {
                const rest = { ...pkg.patches }
                delete rest[page]
                onChange({ ...pkg, patches: rest })
                reload()
              }}
              className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-rose-600"
            >
              <RotateCcw size={12} /> Deshacer esta página ({pagePatches.length})
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
          Pulsa un texto para reescribirlo o una imagen para cambiarla; en cada bloque, la barra de la
          esquina añade encima, añade debajo o lo quita. La diagramación y los estilos son los del
          original y no se tocan.
        </p>

        <iframe
          key={`${page}-${frameKey}`}
          ref={frame}
          title="Pieza producida"
          src={`${previewBase}&edit=1&path=${encodeURIComponent(page)}`}
          className="min-h-0 w-full flex-1 border-0 bg-white"
        />

        {asking?.kind === 'image' && (
          <ImageDialog
            resourceId={resourceId}
            current={asking}
            onClose={() => setAsking(null)}
            onPick={(url, alt) => {
              patch({ op: 'image', at: asking.at, url, alt })
              setAsking(null)
              reload()
            }}
          />
        )}
        {asking?.kind === 'add' && (
          <AddDialog
            onClose={() => setAsking(null)}
            onAdd={(html) => {
              patch({ op: 'insert', at: asking.at, where: asking.where, html }, false)
              setAsking(null)
              reload()
            }}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Cambiar una imagen: subiendo un archivo, que va al almacenamiento del
 * cliente, o pegando la dirección de una que ya esté en línea.
 */
function ImageDialog({
  resourceId,
  current,
  onClose,
  onPick,
}: {
  resourceId: string
  current: { src: string; alt: string }
  onClose: () => void
  onPick: (url: string, alt: string) => void
}) {
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState(current.alt)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)

  const subir = async (file: File) => {
    setBusy('Subiendo…')
    setError('')
    try {
      const payload = await learningApi.media.image(resourceId, await readAsDataUrl(file), file.name)
      onPick(payload.url, alt)
    } catch (caught: any) {
      setError(caught?.message || 'No se pudo subir la imagen')
      setBusy('')
    }
  }

  return (
    <Overlay title="Cambiar la imagen" onClose={onClose}>
      <img src={current.src} alt="" className="mb-3 max-h-40 w-full rounded-lg border border-slate-200 object-contain" />
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void subir(file)
        }}
      />
      <label className="mb-2 block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">Texto alternativo</span>
        <input value={alt} onChange={(event) => setAlt(event.target.value)} className={fieldCls} />
      </label>
      <button
        onClick={() => input.current?.click()}
        disabled={!!busy}
        className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-[13.5px] font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
        {busy || 'Subir una imagen del equipo'}
      </button>
      <div className="mb-1 text-[11.5px] text-slate-400">o pega la dirección de una que ya esté en línea</div>
      <div className="flex gap-2">
        <input value={url} onChange={(event) => setUrl(event.target.value)} className={fieldCls} placeholder="https://…" />
        <button
          onClick={() => url.trim() && onPick(url.trim(), alt)}
          disabled={!url.trim()}
          className="shrink-0 rounded-lg border border-slate-300 px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Usar
        </button>
      </div>
      {error && <p className="mt-3 text-[12.5px] font-semibold text-rose-600">{error}</p>}
    </Overlay>
  )
}

/** Añadir contenido nuevo junto a un bloque. */
function AddDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (html: string) => void }) {
  const [tipo, setTipo] = useState(NUEVOS[0])
  const [texto, setTexto] = useState('')
  const necesitaTexto = tipo.id !== 'separador'

  return (
    <Overlay title="Añadir contenido" onClose={onClose}>
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {NUEVOS.map((row) => (
          <button
            key={row.id}
            onClick={() => setTipo(row)}
            className={`rounded-lg px-2 py-2 text-[12.5px] font-semibold ${
              tipo.id === row.id ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {row.label}
          </button>
        ))}
      </div>
      {necesitaTexto && (
        <textarea
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          rows={tipo.id === 'lista' ? 4 : 3}
          className={`${fieldCls} mb-1 leading-relaxed`}
          placeholder={tipo.id === 'lista' ? 'Un elemento por línea' : 'Escribe el contenido'}
          autoFocus
        />
      )}
      <p className="mb-3 text-[11.5px] text-slate-400">
        Se inserta como {tipo.label.toLowerCase()} de la propia pieza, así que hereda sus estilos.
      </p>
      <button
        onClick={() => onAdd(tipo.html(escape(texto.trim())))}
        disabled={necesitaTexto && !texto.trim()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-[13.5px] font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        <Plus size={15} /> Añadir
      </button>
    </Overlay>
  )
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-slate-900/40 p-6" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2">
          <h4 className="text-[14.5px] font-black tracking-tight">{title}</h4>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function PackageButton({
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
