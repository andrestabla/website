/**
 * Learning Builder — editor de una pieza importada.
 *
 * Una pieza importada no tiene guion aparte: su guion **es** el paquete. Así
 * que este editor son dos cosas y nada más — la ficha de la pieza y el propio
 * paquete, que se corrige encima del original (PackagePanel).
 */
import { useState } from 'react'
import { AlertTriangle, FileText, Layers } from 'lucide-react'
import type { LbIssue } from '../lib/blocks'
import type { LbDirectives } from '../lib/directives'
import { LB_MIRROR_ORIGIN_LABEL, type LbMirrorContent } from '../lib/mirror'
import { sanitizeMirror } from '../lib/mirror'
import { CoverFields } from './CoverFields'
import { PackagePanel } from './PackagePanel'

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
  const [tab, setTab] = useState<'pieza' | 'ficha'>('pieza')
  const errors = issues.filter((issue) => issue.level === 'error')

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        {([['pieza', 'La pieza', Layers], ['ficha', 'Ficha', FileText]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold ${
              tab === key ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
        <div className="ml-auto text-[12px] text-slate-500">
          {content.pages.length
            ? `${LB_MIRROR_ORIGIN_LABEL[content.origin.kind]} · ${content.pages.length} página(s)`
            : 'Sin paquete'}
        </div>
      </div>

      {errors.length > 0 && tab === 'pieza' && (
        <ul className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-[12px] text-rose-700">
          {errors.map((issue, index) => (
            <li key={index} className="flex items-start gap-1.5">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {issue.message}
            </li>
          ))}
        </ul>
      )}

      <div className="min-h-0 flex-1">
        {tab === 'ficha' ? (
          <div className="h-full overflow-y-auto p-4 sm:p-6">
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
                <dt className="text-slate-400">Entrada</dt><dd className="font-mono text-[11.5px]">{content.entry || '—'}</dd>
              </dl>
            </div>
          </div>
        ) : (
          <PackagePanel
            resourceId={resourceId}
            pkg={content.pages.length ? content : null}
            onChange={(next) => onChange({ ...content, ...next })}
            onUploaded={(payload) => onChange(sanitizeMirror(payload.content))}
            onCleared={(payload) => onChange(sanitizeMirror(payload.content))}
            emptyTitle="Sube el paquete original"
            emptyHint="Se guarda tal cual y se sirve igual que venía; lo único que se le añade es la capa que permite corregir sus textos en línea."
          />
        )}
      </div>
    </div>
  )
}
