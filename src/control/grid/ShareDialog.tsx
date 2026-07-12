import { useEffect, useState } from 'react'
import { X, Copy, Check, Globe, UserPlus } from 'lucide-react'
import {
  addCollaborator,
  listCollaborators,
  removeCollaborator,
  setCollaboratorRole,
  setPublicShare,
  type Collaborator,
} from '../lib/control-api'
import { publicBoardUrl } from '../lib/base'

export function ShareDialog({
  boardId,
  initialEnabled,
  initialToken,
  onClose,
  onPublicChange,
}: {
  boardId: string
  initialEnabled: boolean
  initialToken: string | null
  onClose: () => void
  onPublicChange?: (enabled: boolean, token: string | null) => void
}) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [token, setToken] = useState(initialToken)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [collabs, setCollabs] = useState<Collaborator[]>([])
  const [identifier, setIdentifier] = useState('')
  const [role, setRole] = useState<'VIEW' | 'EDIT'>('VIEW')
  const [error, setError] = useState('')

  useEffect(() => {
    listCollaborators(boardId).then(setCollabs).catch(() => {})
  }, [boardId])

  const togglePublic = async () => {
    setBusy(true)
    setError('')
    try {
      const r = await setPublicShare(boardId, !enabled)
      setEnabled(r.shareEnabled)
      setToken(r.shareToken)
      onPublicChange?.(r.shareEnabled, r.shareToken)
    } catch (e: any) {
      setError(e?.message || 'No se pudo actualizar')
    } finally {
      setBusy(false)
    }
  }

  const url = token ? publicBoardUrl(token) : ''
  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  const add = async () => {
    if (!identifier.trim()) return
    setBusy(true)
    setError('')
    try {
      setCollabs(await addCollaborator(boardId, identifier.trim(), role))
      setIdentifier('')
    } catch (e: any) {
      setError(e?.message || 'No se pudo añadir')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black tracking-tight text-slate-900">Compartir tablero</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>

        {error && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</div>}

        {/* Enlace público */}
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-slate-500" />
              <div>
                <div className="text-[13px] font-bold text-slate-800">Enlace público (solo lectura)</div>
                <div className="text-[11.5px] text-slate-500">Cualquiera con el enlace puede ver el tablero.</div>
              </div>
            </div>
            <button
              onClick={togglePublic}
              disabled={busy}
              className={`relative h-6 w-11 rounded-full transition ${enabled ? 'bg-indigo-600' : 'bg-slate-300'} disabled:opacity-60`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          {enabled && url && (
            <div className="mt-3 flex items-center gap-2">
              <input readOnly value={url} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] text-slate-600" />
              <button onClick={copy} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white hover:bg-slate-700">
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          )}
        </div>

        {/* Colaboradores internos */}
        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <div className="mb-2 flex items-center gap-2">
            <UserPlus size={16} className="text-slate-500" />
            <div className="text-[13px] font-bold text-slate-800">Usuarios de la plataforma</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') add() }}
              placeholder="usuario o correo"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-[13px] outline-none focus:border-indigo-400"
            />
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className="rounded-lg border border-slate-200 px-2 py-2 text-[13px]">
              <option value="VIEW">Ver</option>
              <option value="EDIT">Editar</option>
            </select>
            <button onClick={add} disabled={busy} className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              Añadir
            </button>
          </div>
          <div className="mt-3 space-y-1.5">
            {collabs.map((c) => (
              <div key={c.userId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-slate-700">{c.displayName}</div>
                  <div className="truncate text-[11px] text-slate-400">{c.username || c.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={c.role}
                    onChange={async (e) => setCollabs(await setCollaboratorRole(boardId, c.userId, e.target.value as any))}
                    className="rounded-md border border-slate-200 px-1.5 py-1 text-[12px]"
                  >
                    <option value="VIEW">Ver</option>
                    <option value="EDIT">Editar</option>
                  </select>
                  <button onClick={async () => setCollabs(await removeCollaborator(boardId, c.userId))} className="text-slate-300 hover:text-rose-500"><X size={15} /></button>
                </div>
              </div>
            ))}
            {collabs.length === 0 && <div className="px-1 py-1 text-[12px] text-slate-400">Nadie más tiene acceso todavía.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
