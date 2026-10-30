/**
 * Learning Builder — la pieza final de un recurso ya producido.
 *
 * Un recurso vive dos veces. Primero como guion, que es lo que se escribe y lo
 * que la revisión comprueba. Después como pieza entregada: el HTML que salió
 * de producción con sus imágenes, el paquete Rise, el MP4 con sus subtítulos.
 *
 * Adjuntarla aquí cambia lo que se publica: a partir de ese momento el
 * estudiante recibe el archivo original, no una reconstrucción a partir del
 * guion. Es la única manera de prometer que se ve igual, y por eso el aviso de
 * arriba lo dice con todas las letras en vez de dejarlo implícito.
 *
 * El guion no se pierde ni se congela: sigue editándose al lado, y sirve de
 * fuente para rehacer la pieza cuando haga falta.
 */
import { CheckCircle2, FileText, FileVideo, Loader2, Package, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { learningApi, toBase64 } from '../lib/api'
import { describeFinal, type LbFinal, type LbPackage } from '../lib/final'
import { DeliveriesList } from './Deliveries'
import { useDeliveries } from '../lib/deliveries'
import { MAX_PACKAGE_MB, PackagePanel } from './PackagePanel'
import { fieldCls } from './ui'

export function FinalPanel({
  resourceId,
  final,
  kindLabel,
  onChange,
  saving,
}: {
  resourceId: string
  final: LbFinal | null
  /** Cómo se llama este tipo de recurso, para hablar en su idioma. */
  kindLabel: string
  onChange: (next: LbFinal | null) => void
  saving?: 'idle' | 'saving' | 'saved'
}) {
  // Un archivo de medios no se edita por dentro: se reproduce. Lo que se ve
  // aquí es de dónde salió, cómo suena o se ve, y su historial de versiones.
  if (final?.kind === 'MEDIA') {
    return (
      <MediaPiece
        resourceId={resourceId}
        final={final}
        kindLabel={kindLabel}
        onChange={onChange}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      {final && (
        <div className="px-4 pt-4">
          <Banner final={final} onToggle={(deliver) => onChange({ ...final, deliver })} />
        </div>
      )}
      <div className="min-h-0 flex-1">
        <PackagePanel
          resourceId={resourceId}
          // La pieza de un video o de un pódcast es su archivo: aquí sí cabe.
          allowMedia
          pkg={final && final.pages.length ? final : null}
          onChange={(next: LbPackage) => (final ? onChange({ ...final, ...next }) : undefined)}
          onUploaded={(payload) => onChange((payload.final as LbFinal) ?? null)}
          onCleared={() => onChange(null)}
          saving={saving}
          emptyTitle="Adjunta la pieza tal como se entregó"
          emptyHint={
            `Mientras no la haya, el ${kindLabel.toLowerCase()} se publica desde su guion. ` +
            'Al adjuntarla, pasa a entregarse el archivo original —con sus estilos, sus imágenes y sus ' +
            'interacciones— y sus textos se corrigen encima sin tocarlo.'
          }
        />
      </div>
    </div>
  )
}

/**
 * Qué se entrega lo decide quien edita. Adjuntar la pieza no obliga a
 * publicarla: a veces se quiere tenerla guardada mientras se sigue
 * entregando lo que sale del guion, y ese interruptor tiene que estar donde
 * se ve el efecto, no escondido en la ficha.
 */
function Banner({ final, onToggle }: { final: LbFinal; onToggle: (deliver: boolean) => void }) {
  const on = final.deliver
  return (
    <div className={`flex flex-wrap items-start gap-2.5 rounded-xl border px-4 py-3 ${
      on ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
    }`}>
      <span className={`mt-0.5 shrink-0 ${on ? 'text-emerald-600' : 'text-slate-400'}`}>
        {on ? (final.kind === 'MEDIA' ? <FileVideo size={16} /> : <Package size={16} />) : <FileText size={16} />}
      </span>
      <div className={`min-w-0 flex-1 text-[12.5px] ${on ? 'text-emerald-900' : 'text-slate-600'}`}>
        <div className="font-bold">
          {on ? <><CheckCircle2 size={12} className="mr-1 inline" />Se está entregando esta pieza</> : 'Guardada, pero no se entrega'}
        </div>
        <div className="opacity-90">
          {describeFinal(final)}.{' '}
          {on
            ? 'El enlace público, el incrustado y la descarga sirven este archivo, no el guion.'
            : 'Lo que se publica sale del guion. Enciéndelo para entregar el archivo original.'}
        </div>
      </div>
      <button
        onClick={() => onToggle(!on)}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-bold ${
          on ? 'border border-emerald-300 text-emerald-800 hover:bg-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {on ? 'Entregar el guion' : 'Entregar esta pieza'}
      </button>
    </div>
  )
}

/**
 * La pieza de un recurso cuando es un archivo reproducible: un MP4 con su
 * pista, un MP3.
 *
 * Se reproduce, se consulta de dónde salió y **se versiona como cualquier
 * paquete**. Que un video no se pueda editar por dentro no quiere decir que no
 * se pueda corregir: se vuelve a montar fuera y se sube, y la versión anterior
 * se queda con sus comentarios apuntando a lo que se vio.
 *
 * La pista `.vtt` no abre versión: acompaña a la vigente. Primero el video y
 * después sus subtítulos es el orden natural, y abrir una versión por cada
 * archivo partiría en dos lo que es una sola entrega.
 */
function MediaPiece({
  resourceId,
  final,
  kindLabel,
  onChange,
}: {
  resourceId: string
  final: LbFinal
  kindLabel: string
  onChange: (next: LbFinal | null) => void
}) {
  const { deliveries, live, reload } = useDeliveries(resourceId)
  const [subiendo, setSubiendo] = useState('')
  const [error, setError] = useState('')
  const [nueva, setNueva] = useState(false)
  const [nota, setNota] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const modo = useRef<'version' | 'replace'>('replace')

  const video = final.media!.contentType.startsWith('video/')

  const subir = async (file: File) => {
    setError('')
    setSubiendo('Preparando…')
    try {
      const buffer = new Uint8Array(await file.arrayBuffer())
      const begin = await learningApi.importPkg.begin(resourceId, buffer.length)
      const size = begin.maxPartBytes
      const parts = Math.ceil(buffer.length / size)
      for (let index = 0; index < parts; index += 1) {
        setSubiendo(`Subiendo ${index + 1} de ${parts}…`)
        await learningApi.importPkg.part(
          resourceId, begin.uploadId, index,
          toBase64(buffer.subarray(index * size, (index + 1) * size))
        )
      }
      setSubiendo('Guardando…')
      // Una pista va siempre a la versión vigente, diga lo que diga el botón:
      // es lo que el servidor hace y lo que aquí se promete.
      const esPista = /\.vtt$/i.test(file.name)
      const payload = await learningApi.importPkg.ingest(
        resourceId, begin.uploadId, parts, file.name,
        { as: 'media', mode: esPista ? 'replace' : modo.current, notes: nota.trim() || undefined }
      )
      onChange((payload.final as LbFinal) ?? null)
      setNueva(false)
      setNota('')
      void reload()
    } catch (caught: any) {
      setError(caught?.message || 'No se pudo subir el archivo')
    } finally {
      setSubiendo('')
    }
  }

  const pedir = (siguiente: 'version' | 'replace') => {
    modo.current = siguiente
    input.current?.click()
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <Banner final={final} onToggle={(deliver) => onChange({ ...final, deliver })} />
      <div className="mx-auto mt-4 max-w-3xl space-y-4">
        {video ? (
          <video controls poster={final.media!.posterUrl} className="w-full rounded-xl border border-slate-200 bg-black">
            <source src={final.media!.url} type={final.media!.contentType} />
            {final.media!.captionsUrl && (
              <track kind="captions" srcLang="es" label="Español" src={final.media!.captionsUrl} default />
            )}
          </video>
        ) : (
          <audio controls src={final.media!.url} className="w-full" />
        )}

        <dl className="grid grid-cols-[150px_minmax(0,1fr)] gap-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[12.5px]">
          <dt className="text-slate-400">Archivo</dt>
          <dd className="truncate">{final.origin.fileName || '—'}</dd>
          <dt className="text-slate-400">Tamaño</dt>
          <dd>{final.origin.bytes ? `${(final.origin.bytes / 1024 / 1024).toFixed(1)} MB` : '—'}</dd>
          <dt className="text-slate-400">Tipo</dt>
          <dd className="font-mono text-[11.5px]">{final.media!.contentType}</dd>
          <dt className="text-slate-400">Subtítulos</dt>
          <dd>{final.media!.captionsUrl ? 'sí, pista WebVTT' : 'no'}</dd>
          <dt className="text-slate-400">Adjuntada</dt>
          <dd>{final.origin.importedAt ? new Date(final.origin.importedAt).toLocaleString('es-CO') : '—'}</dd>
          <dt className="text-slate-400">Versión vigente</dt>
          <dd>V{live}</dd>
        </dl>

        <div className="rounded-xl border border-slate-200 p-4">
          <input
            ref={input}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/ogg,audio/wav,.vtt,text/vtt"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void subir(file)
            }}
          />
          {nueva && (
            <label className="mb-2 block text-[12.5px] font-semibold text-slate-600">
              Qué cambia en la V{live + 1}
              <textarea
                value={nota}
                onChange={(event) => setNota(event.target.value)}
                rows={2}
                placeholder="Los ajustes que atiende esta versión"
                className={`mt-1 ${fieldCls}`}
              />
            </label>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => (nueva ? pedir('version') : setNueva(true))}
              disabled={!!subiendo}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {subiendo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {subiendo || (nueva ? `Elegir el archivo de la V${live + 1}` : `Subir nueva versión (V${live + 1})`)}
            </button>
            {nueva && !subiendo && (
              <button onClick={() => { setNueva(false); setNota('') }} className="text-[12px] font-semibold text-slate-500 hover:underline">
                Cancelar
              </button>
            )}
            {!nueva && (
              <button
                onClick={() => pedir('replace')}
                disabled={!!subiendo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <Upload size={12} /> Reemplazar la V{live}
              </button>
            )}
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">
            El {video ? 'video' : 'audio'} y su pista `.vtt` se suben aquí, hasta {MAX_PACKAGE_MB} MB.
            Una versión nueva conserva la anterior con sus comentarios; reemplazar corrige la vigente.
            La pista se añade a la versión vigente, sin abrir otra.
          </p>
          {error && <p className="mt-2 text-[12.5px] font-semibold text-rose-600">{error}</p>}
        </div>

        <DeliveriesList resourceId={resourceId} deliveries={deliveries} piece="media" />

        <p className="text-[12.5px] leading-relaxed text-slate-500">
          El archivo se sirve desde el almacenamiento del workspace, y cada versión
          se puede descargar desde su fila. El guion del {kindLabel.toLowerCase()} sigue
          editándose al lado: es de donde sale el montaje.
        </p>
      </div>
    </div>
  )
}
