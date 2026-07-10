import { useCallback, useEffect, useId, useMemo, useRef, type ReactNode } from 'react'
import { BlockDigestContext, type BlockDigestSink } from './blockScope'
import { useAssistant } from './AssistantContext'

/**
 * Tarjeta de contenido del BI, "señalable" por el asistente IA.
 * Sustituye al Card local de cada módulo (misma firma + `right`) y añade el
 * botón "✨ Explicar", que abre el panel del asistente con los datos del bloque.
 */
export function Block({
  title,
  hint,
  right,
  summary,
  children,
}: {
  title?: string
  hint?: string
  right?: ReactNode
  /** Texto adicional para bloques sin gráfica (tablas, listas) que el asistente debe conocer. */
  summary?: string
  children: ReactNode
}) {
  const asst = useAssistant()
  const id = useId()
  const digests = useRef<Map<string, string>>(new Map())

  const sink = useMemo<BlockDigestSink>(
    () => ({
      add: (k, v) => digests.current.set(k, v),
      remove: (k) => digests.current.delete(k),
    }),
    []
  )

  const getDigest = useCallback(() => {
    const parts: string[] = []
    if (summary) parts.push(summary)
    const charts = [...digests.current.values()].filter(Boolean)
    if (charts.length) parts.push(charts.join('\n'))
    return parts.join('\n')
  }, [summary])

  // Nota: dependemos de las funciones estables (no del objeto de contexto completo,
  // que cambia de identidad en cada registro y provocaría un bucle de renders).
  const registerBlock = asst?.registerBlock
  const unregisterBlock = asst?.unregisterBlock
  useEffect(() => {
    if (!registerBlock || !unregisterBlock) return
    registerBlock({ id, title: title || 'Bloque', getDigest })
    return () => unregisterBlock(id)
  }, [registerBlock, unregisterBlock, id, title, getDigest])

  const explain = () => asst?.explainBlock({ title: title || 'Bloque', hint, digest: getDigest() })

  const button = asst ? (
    <button
      onClick={explain}
      title="Interpretar con el asistente IA"
      className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-600 opacity-0 transition group-hover:opacity-100 focus:opacity-100 hover:border-indigo-400 hover:bg-indigo-100 print:hidden"
    >
      <span aria-hidden>✨</span> Explicar
    </button>
  ) : null

  const hasHeader = Boolean(title || right)

  return (
    <BlockDigestContext.Provider value={sink}>
      <div className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {hasHeader ? (
          <div className="flex items-center justify-between gap-2">
            {title ? <h3 className="text-sm font-bold tracking-tight text-slate-800">{title}</h3> : <span />}
            <div className="flex items-center gap-2">
              {button}
              {right}
            </div>
          </div>
        ) : (
          <div className="absolute right-2 top-2 z-10">{button}</div>
        )}
        {hint && <p className="mb-1 text-[11.5px] text-slate-400">{hint}</p>}
        {children}
      </div>
    </BlockDigestContext.Provider>
  )
}
