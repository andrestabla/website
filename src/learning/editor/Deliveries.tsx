/**
 * Learning Builder — las versiones entregadas de un recurso.
 *
 * Una pieza se entrega, se revisa y se vuelve a entregar corregida. Esa
 * historia es la lista de aquí: cada versión con su archivo, quién la subió,
 * qué dijo que cambiaba y los comentarios que se le hicieron.
 *
 * Y **cada versión se puede bajar**, no solo la vigente. Es la mitad que
 * faltaba: comparar lo entregado con lo corregido pide tener las dos en la
 * mano, y una revisión que solo sirve la última obliga a creerse de memoria lo
 * que decía la anterior.
 *
 * La misma lista sirve a las dos clases de pieza. Un sitio se baja como el
 * paquete que es; un medio se baja como archivo, con su pista al lado, porque
 * empaquetar un MP4 solo le añade una capa que hay que descomprimir.
 */
import { CheckCircle2, Download, ExternalLink, History, MessageSquare, Subtitles } from 'lucide-react'
import { learningApi, timeAgo, type DeliveryRow } from '../lib/api'
import type { DeliveryPiece } from '../lib/deliveries'
import { eyebrowCls } from './ui'

const linkCls = 'inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline'

export function DeliveriesList({
  resourceId,
  deliveries,
  piece,
}: {
  resourceId: string
  deliveries: DeliveryRow[]
  piece: DeliveryPiece
}) {
  if (!deliveries.length) return null
  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <div className={`mb-1.5 flex items-center gap-1.5 px-1 ${eyebrowCls}`}>
        <History size={12} /> Versiones · {deliveries.length}
      </div>
      <div className="max-h-56 space-y-1.5 overflow-y-auto">
        {deliveries.map((row) => (
          <div
            key={row.id}
            className={`rounded-lg border px-2.5 py-2 text-[11.5px] ${row.live ? 'border-indigo-300 bg-white' : 'border-slate-200 bg-slate-50'}`}
          >
            <div className="flex items-center gap-1.5">
              <b className="text-[12.5px] text-slate-800">V{row.version}</b>
              {row.live && <span className="rounded-full bg-indigo-600 px-1.5 py-px text-[10px] font-bold text-white">vigente</span>}
              <span className="ml-auto text-slate-400" title={new Date(row.createdAt).toLocaleString('es-CO')}>{timeAgo(row.createdAt)}</span>
            </div>
            <div className="truncate text-slate-500" title={row.fileName}>
              {row.fileName}{row.createdByName ? ` · ${row.createdByName}` : ''}
            </div>
            {row.notes && <p className="mt-1 whitespace-pre-wrap text-slate-600">{row.notes}</p>}
            <div className="mt-1 flex items-center gap-2">
              {row.comments.open + row.comments.resolved > 0 ? (
                <span className="inline-flex items-center gap-1 text-slate-500" title="Comentarios de revisión hechos sobre esta versión">
                  <MessageSquare size={11} /> {row.comments.open + row.comments.resolved}
                  {row.comments.resolved > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-emerald-600"><CheckCircle2 size={11} /> {row.comments.resolved}</span>
                  )}
                  {row.comments.open > 0 && <span className="text-amber-600">· {row.comments.open} sin atender</span>}
                </span>
              ) : (
                <span className="text-slate-400">Sin comentarios</span>
              )}
              <span className="ml-auto flex items-center gap-2">
                {!row.live && piece === 'package' && (
                  <a href={learningApi.previewUrl(resourceId, row.version)} target="_blank" rel="noreferrer" className={linkCls}>
                    <ExternalLink size={11} /> Ver
                  </a>
                )}
                {piece === 'package' ? (
                  <a
                    href={learningApi.exportUrl(resourceId, 'scorm', row.live ? undefined : row.version)}
                    className={linkCls}
                    title={`Descargar el paquete de la V${row.version}`}
                  >
                    <Download size={11} /> ZIP
                  </a>
                ) : (
                  <>
                    <a
                      href={learningApi.exportUrl(resourceId, 'media', row.live ? undefined : row.version)}
                      className={linkCls}
                      title={`Descargar el archivo de la V${row.version}`}
                    >
                      <Download size={11} /> Archivo
                    </a>
                    {/* Dos archivos en la versión son el medio y su pista. */}
                    {row.files > 1 && (
                      <a
                        href={learningApi.exportUrl(resourceId, 'captions', row.live ? undefined : row.version)}
                        className={linkCls}
                        title={`Descargar los subtítulos de la V${row.version}`}
                      >
                        <Subtitles size={11} /> VTT
                      </a>
                    )}
                  </>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
