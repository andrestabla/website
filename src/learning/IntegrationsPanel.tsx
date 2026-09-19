/**
 * Learning Builder — las claves de API del workspace.
 *
 * Lo normal es no tocar nada: OpenAI y el almacenamiento vienen de la
 * plataforma y el workspace los hereda. Esta pantalla existe para los dos
 * casos en que eso no vale — el cliente que factura su propio consumo y el
 * que exige que sus materiales vivan en su cuenta — y para los proveedores
 * que la plataforma no tiene, como ElevenLabs, donde la clave es siempre del
 * cliente.
 *
 * Por eso cada proveedor muestra de dónde sale lo que se está usando ahora
 * mismo: propia, heredada o ninguna. Sin ese dato, quien administra no puede
 * saber si tiene que pedirle una clave al cliente o no.
 *
 * Las claves no vuelven del servidor: se muestra su cola y basta. Guardar sin
 * escribir una nueva conserva la que hubiera.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ExternalLink, Key, Loader2, Plug, Save, ShieldCheck } from 'lucide-react'
import {
  KEEP, LB_PROVIDERS,
  type LbProvider, type LbProviderSpec, type LbProviderStatus,
} from './lib/integrations'
import { learningApi, type ProbeRow } from './lib/api'

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px] focus:border-indigo-500 focus:outline-none'

const SOURCE_LABEL: Record<LbProviderStatus['source'], string> = {
  own: 'Clave propia del workspace',
  inherited: 'Heredada de la plataforma',
  none: 'Sin configurar',
}

const SOURCE_STYLE: Record<LbProviderStatus['source'], string> = {
  own: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  inherited: 'border-sky-200 bg-sky-50 text-sky-700',
  none: 'border-slate-200 bg-slate-100 text-slate-500',
}

export function IntegrationsPanel({ workspaceId }: { workspaceId: string }) {
  const [providers, setProviders] = useState<LbProviderStatus[] | null>(null)
  const [specs, setSpecs] = useState<Record<LbProvider, LbProviderSpec> | null>(null)
  const [platformReady, setPlatformReady] = useState<Partial<Record<LbProvider, boolean>>>({})
  const [error, setError] = useState('')

  // Se pide una vez por workspace. La bandera evita que una respuesta
  // atrasada de un workspace anterior pise la del que ya está abierto.
  useEffect(() => {
    let cancelled = false
    learningApi.workspaces
      .integrations(workspaceId)
      .then((payload) => {
        if (cancelled) return
        setProviders(payload.providers)
        setSpecs(payload.specs)
        setPlatformReady(payload.platformReady)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setError(caught instanceof Error ? caught.message : 'No se pudieron leer las integraciones')
      })
    return () => { cancelled = true }
  }, [workspaceId])

  if (error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</div>
  }
  if (!providers || !specs) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-slate-400">
        <Loader2 size={14} className="animate-spin" /> Leyendo las integraciones…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-slate-500">
        Mientras no se declare nada, este workspace usa las integraciones de la plataforma. Declara
        una clave aquí solo cuando el cliente ponga la suya: a partir de ese momento, todo lo que se
        produzca en este workspace se cargará a su cuenta.
      </p>

      {LB_PROVIDERS.map((key) => {
        const status = providers.find((row) => row.provider === key)
        if (!status) return null
        return (
          <ProviderCard
            key={key}
            spec={specs[key]}
            status={status}
            platformReady={!!platformReady[key]}
            workspaceId={workspaceId}
            onSaved={(next) => setProviders(next)}
          />
        )
      })}
    </div>
  )
}

function ProviderCard({
  spec,
  status,
  platformReady,
  workspaceId,
  onSaved,
}: {
  spec: LbProviderSpec
  status: LbProviderStatus
  platformReady: boolean
  workspaceId: string
  onSaved: (next: LbProviderStatus[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [probe, setProbe] = useState<ProbeRow | null>(null)
  const [probing, setProbing] = useState(false)
  const [error, setError] = useState('')
  // Los secretos arrancan vacíos y viajan como KEEP mientras no se escriban.
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [enabled, setEnabled] = useState(status.enabled)
  const [notes, setNotes] = useState(status.notes)

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const values: Record<string, string> = {}
      for (const field of spec.fields) {
        if (field.secret) values[field.key] = draft[field.key] ?? KEEP
        else values[field.key] = draft[field.key] ?? status.values[field.key] ?? ''
      }
      const payload = await learningApi.workspaces.integrationsSave(workspaceId, spec.provider, {
        enabled,
        values,
        notes,
      })
      onSaved(payload.providers)
      setDraft({})
      setProbe(null)
    } catch (caught: any) {
      setError(caught?.message || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    setProbing(true)
    setError('')
    try {
      setProbe(await learningApi.workspaces.integrationsTest(workspaceId, spec.provider))
    } catch (caught: any) {
      setError(caught?.message || 'No se pudo probar')
    } finally {
      setProbing(false)
    }
  }

  const unavailable = status.source === 'none' && !spec.inheritable

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
          status.source === 'none' ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'
        }`}>
          <Plug size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-[14.5px] font-black tracking-tight">{spec.label}</h4>
            <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${SOURCE_STYLE[status.source]}`}>
              {SOURCE_LABEL[status.source]}
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-slate-500">{spec.purpose}</p>
        </div>
        <button
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          {open ? 'Cerrar' : status.source === 'own' ? 'Cambiar clave' : 'Usar clave propia'}
        </button>
      </header>

      {unavailable && !open && (
        <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-[12px] text-amber-800">
          La plataforma no tiene cuenta de {spec.label}: mientras el cliente no ponga la suya, esta
          función no estará disponible en el workspace.
        </p>
      )}
      {status.source === 'inherited' && !open && (
        <p className="border-t border-slate-100 px-4 py-2 text-[12px] text-slate-500">
          Funcionando con la cuenta de Algoritmo T. No hace falta hacer nada.
        </p>
      )}
      {status.source === 'none' && spec.inheritable && !platformReady && !open && (
        <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-[12px] text-amber-800">
          Ni el workspace ni la plataforma lo tienen configurado.
        </p>
      )}

      {open && (
        <div className="space-y-3 border-t border-slate-100 p-4">
          <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            Usar la clave de este workspace
          </label>

          {spec.fields.map((field) => (
            <label key={field.key} className="block text-[13px]">
              <span className="mb-1 flex items-center gap-1.5 font-semibold text-slate-600">
                {field.secret && <Key size={11} className="text-slate-400" />}
                {field.label}
                {field.secret && status.hints[field.key] && (
                  <span className="font-mono text-[11px] font-normal text-slate-400">
                    guardada {status.hints[field.key]}
                  </span>
                )}
              </span>
              <input
                type={field.secret ? 'password' : 'text'}
                autoComplete="off"
                value={draft[field.key] ?? (field.secret ? '' : status.values[field.key] || '')}
                onChange={(event) => setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))}
                className={inputCls}
                placeholder={
                  field.placeholder ||
                  (field.secret && status.hints[field.key] ? 'Déjalo vacío para conservar la actual' : '')
                }
              />
              {field.hint && <span className="mt-1 block text-[11.5px] text-slate-400">{field.hint}</span>}
            </label>
          ))}

          <label className="block text-[13px]">
            <span className="mb-1 block font-semibold text-slate-600">Nota interna</span>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={inputCls}
              placeholder="Quién la facilitó, cuándo caduca, a qué contrato pertenece…"
            />
          </label>

          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{error}</div>}

          {probe && (
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[12.5px] ${
              probe.reachable ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
            }`}>
              {probe.reachable ? <ShieldCheck size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
              <div>
                <div className="font-semibold">{probe.message}</div>
                {probe.detail && <div className="opacity-80">{probe.detail}</div>}
                <div className="mt-0.5 opacity-70">
                  Se probó la credencial {probe.source === 'own' ? 'propia del workspace' : probe.source === 'inherited' ? 'heredada de la plataforma' : 'que no existe'}.
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[13px] font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
            </button>
            <button
              onClick={test}
              disabled={probing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {probing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Probar conexión
            </button>
            <div className="flex-1" />
            <a
              href={spec.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-indigo-600 hover:underline"
            >
              Dónde se saca <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}
    </section>
  )
}
