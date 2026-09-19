/**
 * Learning Builder — gobierno del workspace.
 *
 * Seis cuerpos en un solo panel, porque son las seis cosas que definen a un
 * cliente: su línea gráfica, su modelo instruccional, cómo entrega, quién está
 * en su equipo, de qué fuentes puede beber la IA y con qué cuentas de API
 * trabaja —las suyas o las de la plataforma—.
 *
 * Todo miembro puede mirar; solo el gestor guarda. Los controles se
 * deshabilitan cuando no corresponde, y la API vuelve a comprobarlo.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Plus, Save, Trash2, X, Users, Palette, GraduationCap, Package, Database, Plug } from 'lucide-react'
import { useDialogs } from '../cotizador/ui/dialogs'
import { LB_BLOCK_SPECS, LB_BLOCK_TYPES, type LbBlockType } from './lib/blocks'
import type { LbDirectives } from './lib/directives'
import { LB_ROLES, LB_ROLE_HINT, LB_ROLE_LABEL, LB_ROLE_STYLE, can, type LbRole } from './lib/roles'
import { learningApi, type DataSourceRow, type MemberRow, type WorkspaceRow } from './lib/api'
import { IntegrationsPanel } from './IntegrationsPanel'

type Tab = 'grafica' | 'instruccional' | 'entrega' | 'equipo' | 'datos' | 'apis'

const GROUP_LABEL: Record<string, string> = {
  texto: 'Texto',
  medios: 'Medios',
  interaccion: 'Interacción',
  evaluacion: 'Evaluación',
  estructura: 'Estructura',
}

const COMPLETION_LABEL: Record<LbDirectives['exports']['completion'], string> = {
  'visit-all': 'Al recorrer todas las pantallas',
  'checks-passed': 'Al acertar todas las comprobaciones',
  immediate: 'Al abrir el recurso',
}

const DENSITY_LABEL: Record<LbDirectives['graphic']['density'], string> = {
  compact: 'Compacta',
  regular: 'Regular',
  airy: 'Amplia',
}

const PROVIDERS: Array<[string, string]> = [
  ['GENERIC', 'Genérica (API o CSV)'],
  ['DATOS_GOV_CO', 'datos.gov.co'],
  ['DANE', 'DANE'],
  ['WORLD_BANK', 'Banco Mundial'],
  ['UNESCO', 'UNESCO'],
  ['OECD', 'OCDE'],
  ['CEPAL', 'CEPAL'],
  ['CROSSREF', 'Crossref'],
  ['OPENALEX', 'OpenAlex'],
  ['SEMANTIC_SCHOLAR', 'Semantic Scholar'],
]

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px] disabled:bg-slate-50 disabled:text-slate-500'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-[13px]">
      <span className="mb-1 block font-semibold text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] leading-snug text-slate-400">{hint}</span>}
    </label>
  )
}

function Toggle({
  checked, onChange, label, disabled,
}: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 text-[13px] ${disabled ? 'text-slate-400' : 'cursor-pointer text-slate-600'}`}>
      <input
        type="checkbox" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-indigo-600"
      />
      {label}
    </label>
  )
}

export function WorkspacePanel({
  workspace,
  onClose,
  onChanged,
}: {
  workspace: WorkspaceRow
  onClose: () => void
  onChanged: () => void
}) {
  const { confirm, dialogs } = useDialogs()
  const role = workspace.role
  const editable = can(role, 'workspace.directives')

  const [tab, setTab] = useState<Tab>(editable ? 'grafica' : 'equipo')
  const [draft, setDraft] = useState<WorkspaceRow>(() => structuredClone(workspace))
  const [members, setMembers] = useState<MemberRow[]>([])
  const [dataSources, setDataSources] = useState<DataSourceRow[]>([])
  const [busy, setBusy] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [invite, setInvite] = useState({ identifier: '', role: 'EDITOR' as LbRole })
  const [newSource, setNewSource] = useState({ name: '', provider: 'GENERIC', endpoint: '', notes: '' })

  useEffect(() => { setDraft(structuredClone(workspace)); setSaved(false) }, [workspace])

  const loadTeam = useCallback(async () => {
    try {
      const payload = await learningApi.workspaces.team(workspace.id)
      setMembers(payload.members || [])
    } catch (e: any) { setError(e.message) }
  }, [workspace.id])

  const loadData = useCallback(async () => {
    try {
      const payload = await learningApi.workspaces.dataSources(workspace.id)
      setDataSources(payload.dataSources || [])
    } catch (e: any) { setError(e.message) }
  }, [workspace.id])

  useEffect(() => { void loadTeam() }, [loadTeam])
  useEffect(() => { if (tab === 'datos') void loadData() }, [tab, loadData])

  const directives = draft.directives
  const patch = (patchValue: Partial<LbDirectives>) => {
    setDraft((prev) => ({ ...prev, directives: { ...prev.directives, ...patchValue } }))
    setSaved(false)
  }
  const patchGraphic = (value: Partial<LbDirectives['graphic']>) => patch({ graphic: { ...directives.graphic, ...value } })
  const patchInstructional = (value: Partial<LbDirectives['instructional']>) =>
    patch({ instructional: { ...directives.instructional, ...value } })
  const patchRules = (value: Partial<LbDirectives['instructional']['rules']>) =>
    patchInstructional({ rules: { ...directives.instructional.rules, ...value } })
  const patchAi = (value: Partial<LbDirectives['instructional']['ai']>) =>
    patchInstructional({ ai: { ...directives.instructional.ai, ...value } })
  const patchExports = (value: Partial<LbDirectives['exports']>) => patch({ exports: { ...directives.exports, ...value } })

  const save = async () => {
    setBusy('save'); setError('')
    try {
      await learningApi.workspaces.update(workspace.id, {
        name: draft.name,
        kind: draft.kind,
        notes: draft.notes || '',
        active: draft.active,
        directives: draft.directives,
      })
      setSaved(true)
      onChanged()
    } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  const addMember = async () => {
    if (!invite.identifier.trim()) return
    setBusy('invite'); setError('')
    try {
      await learningApi.workspaces.memberAdd(workspace.id, invite.identifier.trim(), invite.role)
      setInvite({ identifier: '', role: 'EDITOR' })
      await loadTeam()
    } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  const changeRole = async (member: MemberRow, next: LbRole) => {
    setError('')
    try {
      await learningApi.workspaces.memberRole(workspace.id, member.id, next)
      await loadTeam()
      onChanged()
    } catch (e: any) { setError(e.message) }
  }

  const removeMember = async (member: MemberRow) => {
    const ok = await confirm(`¿Quitar a ${member.displayName} del equipo de ${workspace.name}?`)
    if (!ok) return
    try {
      await learningApi.workspaces.memberRemove(workspace.id, member.id)
      await loadTeam()
      onChanged()
    } catch (e: any) { setError(e.message) }
  }

  const saveSource = async () => {
    if (!newSource.name.trim()) return
    setBusy('data'); setError('')
    try {
      await learningApi.workspaces.dataSave(workspace.id, {
        name: newSource.name.trim(),
        provider: newSource.provider,
        notes: newSource.notes.trim(),
        config: { endpoint: newSource.endpoint.trim(), format: 'json' },
      })
      setNewSource({ name: '', provider: 'GENERIC', endpoint: '', notes: '' })
      await loadData()
    } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  const removeSource = async (source: DataSourceRow) => {
    const ok = await confirm(`¿Quitar la fuente «${source.name}»?`)
    if (!ok) return
    try {
      await learningApi.workspaces.dataRemove(workspace.id, source.id)
      await loadData()
    } catch (e: any) { setError(e.message) }
  }

  const byGroup = useMemo(() => {
    const groups: Record<string, LbBlockType[]> = {}
    for (const type of LB_BLOCK_TYPES) {
      const group = LB_BLOCK_SPECS[type].group
      ;(groups[group] ||= []).push(type)
    }
    return groups
  }, [])

  const TABS: Array<[Tab, string, any, boolean]> = [
    ['grafica', 'Gráfica', Palette, true],
    ['instruccional', 'Instruccional', GraduationCap, true],
    ['entrega', 'Entrega', Package, true],
    ['equipo', 'Equipo', Users, true],
    ['datos', 'Fuentes', Database, can(role, 'data.manage')],
    ['apis', 'Integraciones', Plug, can(role, 'workspace.integrations')],
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      {dialogs}
      <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 px-5">
          <div className="min-w-0">
            <div className="truncate text-sm font-black tracking-tight">{workspace.name}</div>
            <div className="text-[11px] text-slate-400">Directivas, equipo, fuentes e integraciones</div>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${LB_ROLE_STYLE[role]}`}>
            {LB_ROLE_LABEL[role]}
          </span>
          <div className="flex-1" />
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
            <X size={16} />
          </button>
        </header>

        {error && <div className="border-b border-rose-200 bg-rose-50 px-5 py-2 text-[13px] text-rose-700">{error}</div>}
        {!editable && (
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-2 text-[12.5px] text-slate-500">
            {LB_ROLE_HINT[role]}
          </div>
        )}

        <div className="flex shrink-0 gap-1 border-b border-slate-200 px-4 py-2">
          {TABS.filter(([, , , visible]) => visible).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                tab === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Icon size={14} /> <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {tab === 'grafica' && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Nombre del workspace">
                  <input value={draft.name} disabled={!can(role, 'workspace.manage')}
                    onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setSaved(false) }} className={inputCls} />
                </Field>
                <Field label="Tipo">
                  <select value={draft.kind} disabled={!can(role, 'workspace.manage')}
                    onChange={(e) => { setDraft({ ...draft, kind: e.target.value }); setSaved(false) }} className={inputCls}>
                    <option value="EDUCATIVA">Institución educativa</option>
                    <option value="EMPRESARIAL">Empresa</option>
                    <option value="INTERNA">Uso interno</option>
                  </select>
                </Field>
                <div className="flex items-end pb-2">
                  <Toggle
                    checked={draft.active} disabled={!can(role, 'workspace.manage')}
                    onChange={(value) => { setDraft({ ...draft, active: value }); setSaved(false) }}
                    label="Activo (admite recursos nuevos)"
                  />
                </div>
              </div>

              <p className="text-[12.5px] text-slate-500">
                Estos valores pintan <b>todo</b> lo que se publique en el workspace: la vista previa, el enlace público,
                la descarga HTML y el paquete SCORM salen del mismo motor.
              </p>

              <div className="grid gap-3 sm:grid-cols-5">
                {([
                  ['accent', 'Acento'],
                  ['accentDark', 'Acento oscuro'],
                  ['surface', 'Superficie'],
                  ['text', 'Texto'],
                  ['muted', 'Texto suave'],
                ] as const).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      type="color" value={directives.graphic[key]} disabled={!editable}
                      onChange={(e) => patchGraphic({ [key]: e.target.value } as any)}
                      className="h-9 w-full cursor-pointer rounded-lg border border-slate-300 disabled:cursor-not-allowed"
                    />
                  </Field>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tipografía de títulos">
                  <input value={directives.graphic.headingFont} disabled={!editable}
                    onChange={(e) => patchGraphic({ headingFont: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Tipografía de texto">
                  <input value={directives.graphic.bodyFont} disabled={!editable}
                    onChange={(e) => patchGraphic({ bodyFont: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Logo (URL)" hint="Aparece en el índice de todo recurso publicado.">
                  <input value={directives.graphic.logoUrl || ''} disabled={!editable} placeholder="https://…"
                    onChange={(e) => patchGraphic({ logoUrl: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Pie de página">
                  <input value={directives.graphic.footerText || ''} disabled={!editable}
                    onChange={(e) => patchGraphic({ footerText: e.target.value })} className={inputCls} />
                </Field>
                <Field label={`Esquinas: ${directives.graphic.corners} px`}>
                  <input type="range" min={0} max={24} value={directives.graphic.corners} disabled={!editable}
                    onChange={(e) => patchGraphic({ corners: Number(e.target.value) })} className="w-full accent-indigo-600" />
                </Field>
                <Field label="Densidad" hint="Ajusta el tamaño de texto y el aire entre bloques.">
                  <select value={directives.graphic.density} disabled={!editable}
                    onChange={(e) => patchGraphic({ density: e.target.value as LbDirectives['graphic']['density'] })} className={inputCls}>
                    {Object.entries(DENSITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
              </div>
            </>
          )}

          {tab === 'instruccional' && (
            <>
              <section>
                <h4 className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Bloques habilitados</h4>
                <p className="mb-3 text-[12.5px] text-slate-500">
                  El editor solo ofrece estos y la revisión rechaza los demás. Desactivar uno que ya se usó marca error en
                  los recursos que lo tengan, hasta que se reemplace.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {Object.entries(byGroup).map(([group, types]) => (
                    <div key={group}>
                      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{GROUP_LABEL[group]}</div>
                      <div className="space-y-1">
                        {types.map((type) => (
                          <Toggle
                            key={type}
                            checked={directives.instructional.blocks.includes(type)}
                            disabled={!editable}
                            label={LB_BLOCK_SPECS[type].label}
                            onChange={(value) =>
                              patchInstructional({
                                blocks: value
                                  ? LB_BLOCK_TYPES.filter((candidate) => candidate === type || directives.instructional.blocks.includes(candidate))
                                  : directives.instructional.blocks.filter((candidate) => candidate !== type),
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border-t border-slate-200 pt-5">
                <h4 className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Estructura obligatoria</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Cómo se llama cada pantalla" hint="Lección, Tema, Momento…">
                    <input value={directives.instructional.lessonLabel} disabled={!editable}
                      onChange={(e) => patchInstructional({ lessonLabel: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Mínimo">
                    <input type="number" min={1} max={40} value={directives.instructional.minLessons} disabled={!editable}
                      onChange={(e) => patchInstructional({ minLessons: Number(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="Máximo">
                    <input type="number" min={1} max={40} value={directives.instructional.maxLessons} disabled={!editable}
                      onChange={(e) => patchInstructional({ maxLessons: Number(e.target.value) })} className={inputCls} />
                  </Field>
                </div>
                <div className="mt-3 space-y-2">
                  {directives.instructional.sections.map((section, index) => (
                    <div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[140px_1fr_auto]">
                      <input
                        value={section.key} disabled={!editable} placeholder="clave"
                        onChange={(e) => {
                          const sections = [...directives.instructional.sections]
                          sections[index] = { ...section, key: e.target.value }
                          patchInstructional({ sections })
                        }}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-[12.5px] disabled:bg-slate-50"
                      />
                      <div className="space-y-2">
                        <input
                          value={section.title} disabled={!editable} placeholder="Título de la sección"
                          onChange={(e) => {
                            const sections = [...directives.instructional.sections]
                            sections[index] = { ...section, title: e.target.value }
                            patchInstructional({ sections })
                          }}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13.5px] disabled:bg-slate-50"
                        />
                        <input
                          value={section.hint || ''} disabled={!editable}
                          placeholder="Qué debe contener (guía para quien escribe y para la IA)"
                          onChange={(e) => {
                            const sections = [...directives.instructional.sections]
                            sections[index] = { ...section, hint: e.target.value }
                            patchInstructional({ sections })
                          }}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] disabled:bg-slate-50"
                        />
                      </div>
                      <div className="flex flex-col items-end justify-between gap-2">
                        <Toggle
                          checked={section.required} disabled={!editable} label="Obligatoria"
                          onChange={(value) => {
                            const sections = [...directives.instructional.sections]
                            sections[index] = { ...section, required: value }
                            patchInstructional({ sections })
                          }}
                        />
                        {editable && (
                          <button
                            onClick={() => patchInstructional({ sections: directives.instructional.sections.filter((_, i) => i !== index) })}
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Quitar sección"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {editable && (
                    <button
                      onClick={() =>
                        patchInstructional({
                          sections: [
                            ...directives.instructional.sections,
                            { key: `seccion-${directives.instructional.sections.length + 1}`, title: 'Nueva sección', hint: '', required: true },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-[13px] font-semibold text-slate-500 hover:bg-slate-50"
                    >
                      <Plus size={14} /> Añadir sección
                    </button>
                  )}
                </div>
              </section>

              <section className="border-t border-slate-200 pt-5">
                <h4 className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Reglas de revisión</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Comprobaciones por pantalla">
                    <input type="number" min={0} max={10} value={directives.instructional.rules.minChecksPerLesson} disabled={!editable}
                      onChange={(e) => patchRules({ minChecksPerLesson: Number(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="Comprobaciones en total">
                    <input type="number" min={0} max={40} value={directives.instructional.rules.minChecksTotal} disabled={!editable}
                      onChange={(e) => patchRules({ minChecksTotal: Number(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="Máx. caracteres por párrafo">
                    <input type="number" min={200} max={8000} step={100} value={directives.instructional.rules.maxParagraphChars} disabled={!editable}
                      onChange={(e) => patchRules({ maxParagraphChars: Number(e.target.value) })} className={inputCls} />
                  </Field>
                </div>
                <div className="mt-3 space-y-1.5">
                  <Toggle checked={directives.instructional.rules.requireImageAlt} disabled={!editable}
                    label="Toda imagen debe tener texto alternativo" onChange={(value) => patchRules({ requireImageAlt: value })} />
                  <Toggle checked={directives.instructional.rules.requireCoverSummary} disabled={!editable}
                    label="La portada debe tener presentación" onChange={(value) => patchRules({ requireCoverSummary: value })} />
                  <Toggle checked={directives.instructional.rules.requireOutcomes} disabled={!editable}
                    label="La portada debe declarar resultados de aprendizaje" onChange={(value) => patchRules({ requireOutcomes: value })} />
                </div>
              </section>

              <section className="border-t border-slate-200 pt-5">
                <h4 className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Voz de la IA</h4>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Tono">
                    <input value={directives.instructional.ai.tone} disabled={!editable}
                      onChange={(e) => patchAi({ tone: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Nivel de lectura">
                    <input value={directives.instructional.ai.readingLevel} disabled={!editable}
                      onChange={(e) => patchAi({ readingLevel: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Bloques por pantalla">
                    <input type="number" min={3} max={20} value={directives.instructional.ai.blocksPerLesson} disabled={!editable}
                      onChange={(e) => patchAi({ blocksPerLesson: Number(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="Norma de citación">
                    <input value={directives.instructional.ai.citationStyle} disabled={!editable}
                      onChange={(e) => patchAi({ citationStyle: e.target.value })} className={inputCls} />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="Manual de estilo del cliente" hint="Terminología propia, prohibiciones, criterios de redacción.">
                    <textarea
                      value={directives.instructional.ai.instructions} disabled={!editable} rows={5}
                      onChange={(e) => patchAi({ instructions: e.target.value })}
                      className={`${inputCls} font-mono text-[12.5px]`}
                    />
                  </Field>
                </div>
              </section>
            </>
          )}

          {tab === 'entrega' && (
            <>
              <div className="space-y-1.5">
                <Toggle checked={directives.exports.scorm} disabled={!editable}
                  label="Paquete SCORM 1.2 para el campus" onChange={(value) => patchExports({ scorm: value })} />
                <Toggle checked={directives.exports.html} disabled={!editable}
                  label="Descarga HTML autocontenida" onChange={(value) => patchExports({ html: value })} />
                <Toggle checked={directives.exports.publicLink} disabled={!editable}
                  label="Enlace público (abierto o con código)" onChange={(value) => patchExports({ publicLink: value })} />
                <Toggle checked={directives.exports.embed} disabled={!editable}
                  label="Permitir incrustar en otra página" onChange={(value) => patchExports({ embed: value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Prefijo del identificador SCORM" hint="Va al imsmanifest; suele seguir la convención del campus.">
                  <input value={directives.exports.scormPrefix} disabled={!editable}
                    onChange={(e) => patchExports({ scormPrefix: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Cuándo se reporta «completado»">
                  <select
                    value={directives.exports.completion} disabled={!editable}
                    onChange={(e) => patchExports({ completion: e.target.value as LbDirectives['exports']['completion'] })}
                    className={inputCls}
                  >
                    {Object.entries(COMPLETION_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Notas internas del workspace">
                <textarea
                  value={draft.notes || ''} disabled={!editable} rows={3}
                  onChange={(e) => { setDraft({ ...draft, notes: e.target.value }); setSaved(false) }}
                  className={inputCls} placeholder="Contacto, acuerdos, particularidades del campus…"
                />
              </Field>
            </>
          )}

          {tab === 'equipo' && (
            <>
              <p className="text-[12.5px] text-slate-500">
                El rol decide qué puede hacer cada persona <b>en este workspace</b>. Para entrar al módulo necesita
                además el permiso «Learning Builder», y para agregarla aquí tiene que existir como usuario:
                ambas cosas se hacen en{' '}
                <a href="/admin/users" target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 hover:underline">
                  el panel de Usuarios
                </a>.
              </p>

              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold">{member.displayName}</div>
                      <div className="truncate text-[11.5px] text-slate-400">{member.email || member.username}</div>
                    </div>
                    {can(role, 'workspace.team') ? (
                      <select
                        value={member.role}
                        onChange={(e) => changeRole(member, e.target.value as LbRole)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12.5px]"
                        aria-label={`Rol de ${member.displayName}`}
                      >
                        {LB_ROLES.map((value) => <option key={value} value={value}>{LB_ROLE_LABEL[value]}</option>)}
                      </select>
                    ) : (
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${LB_ROLE_STYLE[member.role]}`}>
                        {LB_ROLE_LABEL[member.role]}
                      </span>
                    )}
                    {can(role, 'workspace.team') && (
                      <button
                        onClick={() => removeMember(member)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Quitar a ${member.displayName}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-[13px] text-slate-400">
                    Este workspace todavía no tiene equipo.
                  </div>
                )}
              </div>

              {can(role, 'workspace.team') && (
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Agregar al equipo</div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={invite.identifier}
                      onChange={(e) => setInvite({ ...invite, identifier: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') void addMember() }}
                      placeholder="usuario o correo"
                      className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-[13.5px]"
                    />
                    <select
                      value={invite.role}
                      onChange={(e) => setInvite({ ...invite, role: e.target.value as LbRole })}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-[13px]"
                      aria-label="Rol"
                    >
                      {LB_ROLES.map((value) => <option key={value} value={value}>{LB_ROLE_LABEL[value]}</option>)}
                    </select>
                    <button
                      onClick={addMember}
                      disabled={busy === 'invite' || !invite.identifier.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                    >
                      {busy === 'invite' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Agregar
                    </button>
                  </div>
                  <p className="mt-2 text-[11.5px] leading-snug text-slate-400">{LB_ROLE_HINT[invite.role]}</p>
                </div>
              )}
            </>
          )}

          {tab === 'apis' && can(role, 'workspace.integrations') && (
            <IntegrationsPanel workspaceId={workspace.id} />
          )}

          {tab === 'datos' && (
            <>
              <p className="text-[12.5px] text-slate-500">
                Fuentes que la IA puede citar al escribir contenidos de este workspace. Se le nombran en cada petición,
                junto con la norma de citación; las cifras concretas siguen saliendo de los insumos que subas.
              </p>

              <div className="space-y-2">
                {dataSources.map((source) => (
                  <div key={source.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold">{source.name}</div>
                      <div className="truncate text-[11.5px] text-slate-400">
                        {PROVIDERS.find(([value]) => value === source.provider)?.[1] || source.provider}
                        {source.config?.endpoint ? ` · ${source.config.endpoint}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => removeSource(source)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Quitar ${source.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {dataSources.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-[13px] text-slate-400">
                    Todavía no hay fuentes registradas.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Registrar una fuente</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                    placeholder="Nombre visible" className="rounded-lg border border-slate-300 px-3 py-2 text-[13.5px]"
                  />
                  <select
                    value={newSource.provider} onChange={(e) => setNewSource({ ...newSource, provider: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-[13px]" aria-label="Proveedor"
                  >
                    {PROVIDERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <input
                    value={newSource.endpoint} onChange={(e) => setNewSource({ ...newSource, endpoint: e.target.value })}
                    placeholder="Endpoint o URL del conjunto (opcional)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-[13.5px] sm:col-span-2"
                  />
                  <input
                    value={newSource.notes} onChange={(e) => setNewSource({ ...newSource, notes: e.target.value })}
                    placeholder="Para qué sirve y qué se puede tomar de ella"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-[13.5px] sm:col-span-2"
                  />
                </div>
                <button
                  onClick={saveSource}
                  disabled={busy === 'data' || !newSource.name.trim()}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                >
                  {busy === 'data' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Registrar
                </button>
              </div>
            </>
          )}
        </div>

        {editable && tab !== 'equipo' && tab !== 'datos' && (
          <footer className="flex shrink-0 items-center gap-2 border-t border-slate-200 px-5 py-3">
            <button
              onClick={save}
              disabled={busy === 'save'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? 'Guardado' : 'Guardar directivas'}
            </button>
            <span className="text-[12px] text-slate-400">Aplica a todos los recursos del workspace.</span>
          </footer>
        )}
      </div>
    </div>
  )
}
