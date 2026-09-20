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
import { CheckCircle2, FileText, FileVideo, Package } from 'lucide-react'
import { describeFinal, type LbFinal, type LbPackage } from '../lib/final'
import { PackagePanel } from './PackagePanel'

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
  // aquí es de dónde salió y cómo suena o se ve.
  if (final?.kind === 'MEDIA') {
    const video = final.media!.contentType.startsWith('video/')
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
          </dl>
          <p className="text-[12.5px] leading-relaxed text-slate-500">
            El archivo se sirve desde el almacenamiento del workspace. Para reemplazarlo,
            sube el nuevo desde el guion del {kindLabel.toLowerCase()} y vuelve a publicar.
          </p>
        </div>
      </div>
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
