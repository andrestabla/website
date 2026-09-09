/**
 * Diálogos de la plataforma (confirmar, preguntar un texto, avisar) en lugar
 * de los del navegador. Se usan con promesas:
 *
 *   const { confirm, prompt, alert, dialogs } = useDialogs()
 *   if (await confirm('¿Eliminar la página?')) …
 *   const name = await prompt('Nombre de la plantilla', 'Propuesta base')
 *   … y en el JSX: {dialogs}
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

type Pending =
  | { kind: 'confirm'; title?: string; message: string; okLabel?: string; danger?: boolean; resolve: (ok: boolean) => void }
  | { kind: 'prompt'; title?: string; message: string; initial: string; placeholder?: string; okLabel?: string; resolve: (value: string | null) => void }
  | { kind: 'alert'; title?: string; message: string; resolve: () => void }

export function useDialogs() {
  const [pending, setPending] = useState<Pending | null>(null)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const confirm = useCallback((message: string, opts: { title?: string; okLabel?: string; danger?: boolean } = {}) =>
    new Promise<boolean>((resolve) => setPending({ kind: 'confirm', message, ...opts, resolve })), [])
  const prompt = useCallback((message: string, initial = '', opts: { title?: string; placeholder?: string; okLabel?: string } = {}) =>
    new Promise<string | null>((resolve) => { setValue(initial); setPending({ kind: 'prompt', message, initial, ...opts, resolve }) }), [])
  const alert = useCallback((message: string, opts: { title?: string } = {}) =>
    new Promise<void>((resolve) => setPending({ kind: 'alert', message, ...opts, resolve })), [])

  const close = (result?: unknown) => {
    const p = pending
    setPending(null)
    if (!p) return
    if (p.kind === 'confirm') p.resolve(result === true)
    else if (p.kind === 'prompt') p.resolve(typeof result === 'string' ? result : null)
    else p.resolve()
  }

  useEffect(() => {
    if (!pending) return
    if (pending.kind === 'prompt') window.setTimeout(() => inputRef.current?.select(), 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(pending.kind === 'prompt' ? null : false) }
      if (e.key === 'Enter' && pending.kind !== 'prompt') { e.preventDefault(); close(pending.kind === 'confirm' ? true : undefined) }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])

  const dialogs: ReactNode = pending ? (
    <div className="at-dialog-wrap" onClick={() => close(pending.kind === 'prompt' ? null : false)} role="presentation">
      <div className="at-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {pending.title && <h3>{pending.title}</h3>}
        <p>{pending.message}</p>
        {pending.kind === 'prompt' && (
          <input
            ref={inputRef}
            value={value}
            placeholder={pending.placeholder}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); close(value) } }}
          />
        )}
        <div className="at-dialog-actions">
          {pending.kind !== 'alert' && <button onClick={() => close(pending.kind === 'prompt' ? null : false)}>Cancelar</button>}
          <button
            className={`primary${pending.kind === 'confirm' && pending.danger ? ' danger' : ''}`}
            onClick={() => close(pending.kind === 'prompt' ? value : pending.kind === 'confirm' ? true : undefined)}
          >
            {pending.kind === 'alert' ? 'Entendido' : pending.okLabel || (pending.kind === 'confirm' ? 'Confirmar' : 'Aceptar')}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, prompt, alert, dialogs }
}
