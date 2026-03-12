import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ADMIN_MODULE_LABELS,
  ADMIN_MODULES,
  defaultPermissionsForRole,
  normalizePermissions,
  type AdminPermissionMap,
  type AdminRoleKey,
} from '../lib/permissions'
import { KeyRound, Loader2, Mail, Shield, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react'

type AdminUserRow = {
  id: string
  username: string
  email: string | null
  displayName: string
  role: AdminRoleKey
  active: boolean
  passwordSetupRequired: boolean
  suspendedAt: string | null
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  permissions: AdminPermissionMap
}

type NavigationLogRow = {
  id: string
  userId: string
  username: string
  role: string
  path: string
  action: string
  createdAt: string
}

const ROLE_OPTIONS: AdminRoleKey[] = ['SUPERADMIN', 'ADMIN', 'EDITOR', 'ANALYST']

export function ManageUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [logs, setLogs] = useState<NavigationLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [newDisplayName, setNewDisplayName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState<AdminRoleKey>('ADMIN')
  const [newPermissions, setNewPermissions] = useState<AdminPermissionMap>(defaultPermissionsForRole('ADMIN'))

  const [draftRoleByUser, setDraftRoleByUser] = useState<Record<string, AdminRoleKey>>({})
  const [draftPermissionsByUser, setDraftPermissionsByUser] = useState<Record<string, AdminPermissionMap>>({})

  const usersCount = users.length
  const activeUsers = users.filter((user) => user.active).length
  const pendingSetupUsers = users.filter((user) => user.passwordSetupRequired).length

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => Number(b.active) - Number(a.active) || Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [users]
  )

  const hydrateDrafts = (nextUsers: AdminUserRow[]) => {
    setDraftRoleByUser(() =>
      nextUsers.reduce((acc, user) => {
        acc[user.id] = user.role
        return acc
      }, {} as Record<string, AdminRoleKey>)
    )
    setDraftPermissionsByUser(() =>
      nextUsers.reduce((acc, user) => {
        acc[user.id] = normalizePermissions(user.permissions, user.role)
        return acc
      }, {} as Record<string, AdminPermissionMap>)
    )
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/users?logs=1')
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'No fue posible cargar usuarios.')
      const nextUsers = (data.users || []) as AdminUserRow[]
      setUsers(nextUsers)
      setLogs((data.logs || []) as NavigationLogRow[])
      hydrateDrafts(nextUsers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando usuarios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const runAction = async (payload: Record<string, unknown>, successMessage?: string) => {
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'No fue posible ejecutar la acción.')
      }
      const nextUsers = (data.users || []) as AdminUserRow[]
      setUsers(nextUsers)
      hydrateDrafts(nextUsers)
      if (successMessage) setMessage(successMessage)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error ejecutando acción.')
    } finally {
      setSaving(false)
    }
  }

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: newDisplayName,
          email: newEmail,
          username: newUsername || undefined,
          role: newRole,
          permissions: newPermissions,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'No fue posible crear el usuario.')
      }
      const nextUsers = (data.users || []) as AdminUserRow[]
      setUsers(nextUsers)
      hydrateDrafts(nextUsers)
      setNewDisplayName('')
      setNewEmail('')
      setNewUsername('')
      setNewRole('ADMIN')
      setNewPermissions(defaultPermissionsForRole('ADMIN'))
      setMessage(data?.emailDelivery?.sent
        ? 'Usuario creado y credenciales enviadas por correo.'
        : 'Usuario creado. SMTP no configurado o envío fallido, reenvía credenciales desde la tabla.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando usuario.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900">Gestión de usuarios</h1>
          <p className="text-slate-500 mt-2">Crea, suspende, elimina usuarios y controla permisos por módulo.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          <StatCard label="Usuarios" value={String(usersCount)} icon={Users} />
          <StatCard label="Activos" value={String(activeUsers)} icon={ShieldCheck} />
          <StatCard label="Pendientes" value={String(pendingSetupUsers)} icon={KeyRound} />
        </div>
      </div>

      {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 font-semibold text-sm">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 font-semibold text-sm">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-1 bg-white border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="w-4 h-4 text-brand-primary" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-700">Crear usuario</h2>
          </div>
          <form onSubmit={createUser} className="space-y-4">
            <Input label="Nombre visible" value={newDisplayName} onChange={setNewDisplayName} placeholder="Ej: María López" required />
            <Input label="Correo" value={newEmail} onChange={setNewEmail} placeholder="maria@empresa.com" type="email" required />
            <Input label="Username (opcional)" value={newUsername} onChange={setNewUsername} placeholder="maria.lopez" />

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rol</label>
              <select
                className="mt-1 w-full h-11 border border-slate-200 bg-white px-3 text-sm font-semibold"
                value={newRole}
                onChange={(e) => {
                  const role = e.target.value as AdminRoleKey
                  setNewRole(role)
                  setNewPermissions(defaultPermissionsForRole(role))
                }}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option value={role} key={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="border border-slate-200 p-3 max-h-72 overflow-auto">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Permisos por módulo</p>
              <div className="space-y-2">
                {ADMIN_MODULES.map((module) => (
                  <label key={module} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={newPermissions[module]}
                      onChange={(e) =>
                        setNewPermissions((prev) => ({
                          ...prev,
                          [module]: e.target.checked,
                        }))
                      }
                    />
                    {ADMIN_MODULE_LABELS[module]}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-11 bg-brand-primary text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 inline-flex items-center justify-center"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear y enviar credenciales'}
            </button>
          </form>
        </section>

        <section className="xl:col-span-2 bg-white border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-4 h-4 text-brand-primary" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-700">Usuarios del panel</h2>
          </div>

          {loading ? (
            <div className="h-40 flex items-center justify-center text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Cargando usuarios...
            </div>
          ) : (
            <div className="space-y-6">
              {sortedUsers.map((user) => {
                const draftRole = draftRoleByUser[user.id] || user.role
                const draftPermissions = draftPermissionsByUser[user.id] || normalizePermissions(user.permissions, user.role)
                return (
                  <article key={user.id} className="border border-slate-200 p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-slate-900">{user.displayName}</p>
                        <p className="text-sm text-slate-600">{user.username} · {user.email || 'Sin email'}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {user.active ? 'Activo' : 'Suspendido'} · Último login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Nunca'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {user.active ? (
                          <ActionButton disabled={saving} onClick={() => runAction({ action: 'suspend', userId: user.id }, 'Usuario suspendido.')}>Suspender</ActionButton>
                        ) : (
                          <ActionButton disabled={saving} onClick={() => runAction({ action: 'activate', userId: user.id }, 'Usuario activado.')}>Reactivar</ActionButton>
                        )}
                        <ActionButton disabled={saving} onClick={() => runAction({ action: 'resend_credentials', userId: user.id }, 'Credenciales regeneradas y enviadas.')}>
                          <Mail className="w-3 h-3 mr-1" /> Reenviar credenciales
                        </ActionButton>
                        <ActionButton
                          danger
                          disabled={saving}
                          onClick={() => {
                            if (!window.confirm(`¿Eliminar usuario ${user.displayName}?`)) return
                            void runAction({ action: 'delete', userId: user.id }, 'Usuario eliminado.')
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                        </ActionButton>
                      </div>
                    </div>

                    <div className="mt-4 border border-slate-200 p-3">
                      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rol</label>
                        <select
                          className="h-10 border border-slate-200 px-3 text-sm font-semibold"
                          value={draftRole}
                          onChange={(e) => {
                            const nextRole = e.target.value as AdminRoleKey
                            setDraftRoleByUser((prev) => ({ ...prev, [user.id]: nextRole }))
                            setDraftPermissionsByUser((prev) => ({ ...prev, [user.id]: defaultPermissionsForRole(nextRole) }))
                          }}
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                        {user.passwordSetupRequired && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2 py-1">
                            Setup pendiente
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                        {ADMIN_MODULES.map((module) => (
                          <label key={`${user.id}-${module}`} className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={draftPermissions[module]}
                              onChange={(e) =>
                                setDraftPermissionsByUser((prev) => ({
                                  ...prev,
                                  [user.id]: {
                                    ...draftPermissions,
                                    [module]: e.target.checked,
                                  },
                                }))
                              }
                            />
                            {ADMIN_MODULE_LABELS[module]}
                          </label>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => runAction({
                          action: 'update_access',
                          userId: user.id,
                          role: draftRole,
                          permissions: draftPermissions,
                        }, 'Permisos actualizados.')}
                        className="mt-4 h-10 px-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60"
                      >
                        Guardar acceso
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <section className="bg-white border border-slate-200 p-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-4">Logs de navegación del admin</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-[0.2em] text-[10px] font-black">
              <tr>
                <th className="text-left px-4 py-3">Usuario</th>
                <th className="text-left px-4 py-3">Rol</th>
                <th className="text-left px-4 py-3">Ruta</th>
                <th className="text-left px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={4}>Sin registros por ahora.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-800">{log.username}</td>
                  <td className="px-4 py-3 text-slate-600">{log.role}</td>
                  <td className="px-4 py-3 text-slate-600">{log.path}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  type?: string
}) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label>
      <input
        type={type}
        className="mt-1 w-full h-11 border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-primary"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  disabled,
  danger = false,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-9 px-3 text-[11px] font-black uppercase tracking-widest border disabled:opacity-60 inline-flex items-center ${
        danger
          ? 'border-red-200 text-red-700 bg-red-50'
          : 'border-slate-200 text-slate-700 bg-white'
      }`}
    >
      {children}
    </button>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="bg-white border border-slate-200 p-4 min-w-[120px]">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-4 h-4 text-brand-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
    </div>
  )
}
