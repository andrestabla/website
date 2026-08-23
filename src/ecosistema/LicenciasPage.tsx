import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, KeyRound, Copy, Check, Ban, RotateCcw, Plus, ShieldAlert } from 'lucide-react'

/**
 * Emisión y control de licencias del plugin Learning Analytics para Moodle.
 *
 * La activación en la plataforma del cliente es local, por firma: esta pantalla
 * emite el código, lleva el registro y permite revocar.
 */

type Licence = {
  id: string
  licenceId: string
  customer: string
  contactEmail: string | null
  siteHash: string
  features: string[]
  code: string
  issuedAt: string
  expiresAt: string | null
  revokedAt: string | null
  notes: string | null
  lastCheckAt: string | null
  lastVersion: string | null
  checkCount: number
  status: 'active' | 'revoked' | 'expired'
}

const STATUS_STYLE: Record<Licence['status'], string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  revoked: 'bg-rose-50 text-rose-700 ring-rose-200',
  expired: 'bg-amber-50 text-amber-700 ring-amber-200',
}

const STATUS_LABEL: Record<Licence['status'], string> = {
  active: 'Activa',
  revoked: 'Revocada',
  expired: 'Caducada',
}

export function LicenciasPage() {
  const [licences, setLicences] = useState<Licence[]>([])
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState({
    customer: '', contactEmail: '', siteHash: '', months: 12, notes: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/licences', { credentials: 'include' })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'No se pudo cargar')
      setLicences(data.licences)
      setPublicKey(data.publicKey)
      setError(null)
    } catch (e: any) {
      setError(e.message || 'Error al cargar las licencias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.customer.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/licences', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: form.customer.trim(),
          contactEmail: form.contactEmail.trim() || undefined,
          siteHash: form.siteHash.trim() || '*',
          months: Number(form.months) || 0,
          notes: form.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'No se pudo emitir')
      setForm({ customer: '', contactEmail: '', siteHash: '', months: 12, notes: '' })
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const toggle = async (licence: Licence) => {
    const action = licence.revokedAt ? 'restore' : 'revoke'
    if (action === 'revoke' && !confirm(
      `¿Revocar la licencia de ${licence.customer}?\n\nLa plataforma volverá al nivel gratuito ` +
      `en su próxima revalidación, hasta 24 horas después.`
    )) return

    await fetch('/api/admin/licences', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: licence.id, action }),
    })
    await load()
  }

  const copy = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code)
    setCopied(id)
    setTimeout(() => setCopied(null), 1800)
  }

  const stats = useMemo(() => ({
    total: licences.length,
    active: licences.filter((l) => l.status === 'active').length,
    revoked: licences.filter((l) => l.status === 'revoked').length,
    expired: licences.filter((l) => l.status === 'expired').length,
  }), [licences])

  const fmt = (value: string | null) =>
    value ? new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
        <Link to="/ecosistema" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
          <ArrowLeft size={18} />
        </Link>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 text-white">
          <KeyRound size={16} />
        </div>
        <div className="text-sm font-black tracking-tight">Licencias · Learning Analytics</div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {!publicKey && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />
            <div>
              <strong>Falta la clave de firma.</strong> Defina <code>LICENCE_PRIVATE_KEY</code> en
              las variables de entorno para poder emitir códigos. Sin ella se puede consultar
              el registro, pero no crear licencias nuevas.
            </div>
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([['Emitidas', stats.total, 'text-slate-900'],
             ['Activas', stats.active, 'text-emerald-600'],
             ['Caducadas', stats.expired, 'text-amber-600'],
             ['Revocadas', stats.revoked, 'text-rose-600']] as const).map(([label, value, tone]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className={`text-2xl font-black ${tone}`}>{value}</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
            </div>
          ))}
        </div>

        <form onSubmit={create} className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black"><Plus size={16} /> Emitir licencia</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold text-slate-600">
              Cliente *
              <input required value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Correo de contacto
              <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Identificador del sitio
              <input value={form.siteHash} onChange={(e) => setForm({ ...form, siteHash: e.target.value })}
                placeholder="vacío = cualquier plataforma"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Vigencia (meses)
              <input type="number" min={0} value={form.months} onChange={(e) => setForm({ ...form, months: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
              <span className="mt-1 block font-normal text-slate-400">0 = sin caducidad</span>
            </label>
          </div>
          <div className="mt-3 flex items-end gap-3">
            <label className="flex-1 text-xs font-semibold text-slate-600">
              Notas
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
            <button type="submit" disabled={creating || !publicKey}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40">
              {creating ? 'Emitiendo…' : 'Emitir'}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            El identificador del sitio lo muestra el propio plugin en sus ajustes. Si se deja vacío,
            el código servirá en cualquier plataforma: úselo solo para pruebas.
          </p>
        </form>

        {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Licencia</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Vence</th>
                <th className="px-4 py-3">Última señal</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Cargando…</td></tr>}
              {!loading && !licences.length && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Todavía no se ha emitido ninguna licencia.
                </td></tr>
              )}
              {licences.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{l.customer}</div>
                    {l.contactEmail && <div className="text-xs text-slate-400">{l.contactEmail}</div>}
                    <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                      {l.siteHash === '*' ? 'cualquier plataforma' : l.siteHash}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{l.licenceId}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${STATUS_STYLE[l.status]}`}>
                      {STATUS_LABEL[l.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{l.expiresAt ? fmt(l.expiresAt) : 'sin caducidad'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {l.lastCheckAt ? (
                      <>
                        {fmt(l.lastCheckAt)}
                        <div className="text-[11px] text-slate-400">{l.checkCount} comprobaciones</div>
                      </>
                    ) : <span className="text-slate-300">nunca</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => copy(l.code, l.id)} title="Copiar código"
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
                        {copied === l.id ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                      </button>
                      <button onClick={() => toggle(l)} title={l.revokedAt ? 'Restablecer' : 'Revocar'}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                        {l.revokedAt ? <RotateCcw size={15} /> : <Ban size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Revocar no desactiva al instante: la plataforma del cliente revalida una vez al día.
          Si no tiene salida a internet, la licencia seguirá funcionando hasta caducar.
        </p>
      </main>
    </div>
  )
}

export default LicenciasPage
