/**
 * Learning Builder — la raíz del módulo.
 *
 * Muestra todos los workspaces a los que llega tu permiso, con su rol y su
 * línea gráfica, y de ahí se entra a la metabiblioteca de uno. Un mismo usuario
 * puede ser gestor en un cliente y auditor en otro: la tarjeta lo dice antes de
 * entrar, porque de eso depende lo que podrá hacer dentro.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Library, Loader2, Plus, X, Users } from 'lucide-react'
import { LB_ROLE_HINT, LB_ROLE_LABEL, LB_ROLE_STYLE } from './lib/roles'
import { learningApi, timeAgo, type WorkspaceRow } from './lib/api'

const KIND_LABEL: Record<string, string> = {
  EDUCATIVA: 'Institución educativa',
  EMPRESARIAL: 'Empresa',
  INTERNA: 'Uso interno',
}

export function WorkspacesGrid() {
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([])
  const [canCreate, setCanCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const payload = await learningApi.workspaces.list()
      setWorkspaces(payload.workspaces || [])
      setCanCreate(!!payload.canCreate)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const create = async () => {
    if (!name.trim()) return
    setBusy(true); setError('')
    try {
      const payload = await learningApi.workspaces.create({ name: name.trim() })
      navigate(`/ecosistema/learning/${payload.workspace.code}`)
    } catch (e: any) { setError(e.message); setBusy(false) }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Cargando workspaces…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
        <Link to="/ecosistema" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-rose-600">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Ecosistema</span>
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white">
          <Library size={16} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-black tracking-tight">Learning Builder</div>
          <div className="text-[11px] text-slate-400">Tus workspaces</div>
        </div>
      </header>

      {error && (
        <div className="flex items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 px-4 py-2 text-[13px] text-rose-700 sm:px-6">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Cerrar aviso"><X size={14} /></button>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-black tracking-tight">Workspaces</h1>
        <p className="mb-8 mt-1 text-sm text-slate-500">
          Cada workspace es un cliente, con su equipo, su línea gráfica y su modelo instruccional. Entra al que vas a
          trabajar.
        </p>

        {workspaces.length === 0 ? (
          <div className="grid min-h-[40vh] place-items-center rounded-2xl border border-dashed border-slate-300 text-center">
            <div className="max-w-md px-6">
              <div className="text-sm font-semibold text-slate-600">
                {canCreate ? 'Todavía no hay ningún workspace' : 'Todavía no perteneces a ningún workspace'}
              </div>
              <p className="mt-1 text-[13px] text-slate-400">
                {canCreate
                  ? 'Crea el primero y quedarás como su gestor.'
                  : 'Pide a un gestor que te agregue al equipo de su workspace.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => {
              const brand = workspace.directives.graphic
              return (
                <Link
                  key={workspace.id}
                  to={`/ecosistema/learning/${workspace.code}`}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                    workspace.active ? '' : 'opacity-70'
                  }`}
                >
                  {/* Franja con el acento real del cliente: se reconoce de un vistazo. */}
                  <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: brand.accent }} aria-hidden />
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="grid h-12 w-12 place-items-center rounded-xl text-white"
                      style={{ background: `linear-gradient(135deg, ${brand.accent}, ${brand.accentDark})` }}
                    >
                      {brand.logoUrl ? (
                        <img src={brand.logoUrl} alt="" className="h-7 w-7 object-contain" />
                      ) : (
                        <Library size={22} />
                      )}
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${LB_ROLE_STYLE[workspace.role]}`}>
                      {LB_ROLE_LABEL[workspace.role]}
                    </span>
                  </div>

                  <h3 className="mt-3 text-[17px] font-bold tracking-tight">{workspace.name}</h3>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-400">{workspace.code}</div>
                  <p className="mt-2 text-[12.5px] leading-snug text-slate-500">{LB_ROLE_HINT[workspace.role]}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10.5px] text-slate-500">
                      {KIND_LABEL[workspace.kind] || workspace.kind}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10.5px] text-slate-500">
                      {workspace.resourceCount} recurso{workspace.resourceCount === 1 ? '' : 's'}
                    </span>
                    {!workspace.active && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10.5px] text-amber-700">
                        Inactivo
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-[11.5px] text-slate-400">Actualizado {timeAgo(workspace.updatedAt)}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: brand.accent }}>
                      Abrir <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              )
            })}

            {canCreate && (
              <div className="flex flex-col justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400"><Plus size={22} /></div>
                <h3 className="mt-3 text-[17px] font-bold tracking-tight text-slate-700">Nuevo workspace</h3>
                <p className="mt-1 text-[12.5px] leading-snug text-slate-500">
                  Quedarás como su gestor y podrás fijar sus directivas y su equipo.
                </p>
                <div className="mt-4 flex gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void create() }}
                    placeholder="Nombre del cliente"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-[13.5px]"
                  />
                  <button
                    onClick={create}
                    disabled={busy || !name.trim()}
                    className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : 'Crear'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {workspaces.length > 0 && (
          <p className="mt-8 inline-flex items-center gap-1.5 text-[12px] text-slate-400">
            <Users size={13} /> Tu rol lo fija el gestor de cada workspace, y puede ser distinto en cada uno.
          </p>
        )}
      </main>
    </div>
  )
}
