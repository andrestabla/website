import { useMemo, useState } from 'react'
import { Eye, Edit2, Plus, Trash2 } from 'lucide-react'
import { useCMS, type ServiceItem } from '../context/CMSContext'
import { ContentModal, ConfirmDelete, Field, Input, Textarea } from '../components/ContentModal'
import { useLanguage } from '../../context/LanguageContext'
import { ServicePageView } from '../../pages/ServicePageView'

const emptyService = (): ServiceItem => ({
    slug: '',
    title: '',
    highlight: '',
    subtitle: '',
    description: '',
    descriptionLong: '',
    ctaPrimary: 'Solicitar información',
    ctaSecondary: 'Agendar llamada',
    seoTitle: '',
    seoDescription: '',
    features: ['', '', ''],
    outcomes: ['', '', '', '', '', ''],
    tracking: '',
    abHypothesis: '',
    variants: [
        { tone: 'Corporativo', titular: '', rationale: '' },
        { tone: 'Humano', titular: '', rationale: '' },
        { tone: 'Técnico', titular: '', rationale: '' },
    ],
    ctaVariants: [
        { original: '', alt: ['', '', ''] },
        { original: '', alt: ['', '', ''] },
    ],
    visualConfig: {},
    visualStyle: {},
})

export function ManageServices() {
    const { state, updateService, addService, deleteService } = useCMS()
    const { uiText } = useLanguage()
    const services = state.services

    const [editTarget, setEditTarget] = useState<ServiceItem | null>(null)
    const [isNew, setIsNew] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null)
    const [draft, setDraft] = useState<ServiceItem | null>(null)
    const [saved, setSaved] = useState<string | null>(null)
    const [editorTab, setEditorTab] = useState<'content' | 'visual' | 'copy' | 'marketing' | 'seo'>('content')
    const [showVisualJson, setShowVisualJson] = useState(false)

    const openEdit = (s: ServiceItem) => {
        setEditorTab('content')
        setShowVisualJson(false)
        setIsNew(false)
        setDraft({
            ...s,
            features: [...s.features],
            outcomes: [...(s.outcomes ?? ['', '', '', '', '', ''])],
            variants: (s.variants ?? []).map(v => ({ ...v })),
            ctaVariants: (s.ctaVariants ?? []).map(v => ({ ...v, alt: [...(v.alt ?? [])] })),
            visualConfig: { ...((s as any).visualConfig ?? {}) },
            visualStyle: { ...((s as any).visualStyle ?? {}) },
        })
        setEditTarget(s)
    }

    const openNew = () => {
        setEditorTab('content')
        setShowVisualJson(false)
        const blank = emptyService()
        setIsNew(true)
        setDraft(blank)
        setEditTarget(blank)
    }

    const handleSave = () => {
        if (!draft) return
        if (isNew) {
            if (!draft.slug || !draft.title) return
            addService(draft)
        } else {
            updateService(draft.slug, draft)
        }
        setSaved(draft.title)
        setEditTarget(null)
        setDraft(null)
        setTimeout(() => setSaved(null), 3000)
    }

    const handleDelete = () => {
        if (!deleteTarget) return
        deleteService(deleteTarget.slug)
        setDeleteTarget(null)
    }

    const setDraftField = <K extends keyof ServiceItem>(key: K, value: ServiceItem[K]) => {
        setDraft(d => d ? { ...d, [key]: value } : d)
    }

    const setFeature = (i: number, val: string) => {
        setDraft(d => {
            if (!d) return d
            const features = [...d.features]
            features[i] = val
            return { ...d, features }
        })
    }

    const setOutcome = (i: number, val: string) => {
        setDraft(d => {
            if (!d) return d
            const outcomes = [...(d.outcomes ?? [])]
            outcomes[i] = val
            return { ...d, outcomes }
        })
    }

    const setVariantField = (i: number, key: 'tone' | 'titular' | 'rationale', val: string) => {
        setDraft(d => {
            if (!d) return d
            const variants = [...(d.variants ?? [])]
            variants[i] = { ...(variants[i] ?? { tone: '', titular: '', rationale: '' }), [key]: val }
            return { ...d, variants }
        })
    }

    const setCtaVariantField = (i: number, key: 'original', val: string) => {
        setDraft(d => {
            if (!d) return d
            const ctaVariants = [...(d.ctaVariants ?? [])]
            ctaVariants[i] = { ...(ctaVariants[i] ?? { original: '', alt: [] }), [key]: val }
            return { ...d, ctaVariants }
        })
    }

    const setCtaVariantAlt = (i: number, altIndex: number, val: string) => {
        setDraft(d => {
            if (!d) return d
            const ctaVariants = [...(d.ctaVariants ?? [])]
            const entry = { ...(ctaVariants[i] ?? { original: '', alt: [] }) }
            const alt = [...(entry.alt ?? [])]
            alt[altIndex] = val
            entry.alt = alt
            ctaVariants[i] = entry
            return { ...d, ctaVariants }
        })
    }

    const setVisualStyleField = (key: string, value: string) => {
        setDraft(d => d ? ({ ...d, visualStyle: { ...(d.visualStyle ?? {}), [key]: value } as any }) : d)
    }

    const setVisualConfigField = (key: string, value: any) => {
        setDraft(d => d ? ({ ...d, visualConfig: { ...(d.visualConfig ?? {}), [key]: value } as any }) : d)
    }

    const setVisualConfigJson = (raw: string) => {
        setDraft(d => {
            if (!d) return d
            try {
                const parsed = raw.trim() ? JSON.parse(raw) : {}
                return { ...d, visualConfig: parsed }
            } catch {
                return d
            }
        })
    }

    const visualStylePresets = useMemo(() => ([
        {
            name: 'Claro Editorial',
            values: {
                heroBackgroundColor: '#ffffff',
                sidebarBackgroundColor: '#0f172a',
                sidebarAccentColor: '#2563eb',
                outcomesBackgroundColor: '#020617',
                visualSectionBackgroundColor: '#ffffff',
            },
        },
        {
            name: 'Dark Tech',
            values: {
                heroBackgroundColor: '#020617',
                sidebarBackgroundColor: '#020617',
                sidebarAccentColor: '#3b82f6',
                outcomesBackgroundColor: '#000814',
                visualSectionBackgroundColor: '#0b1220',
            },
        },
        {
            name: 'Slate',
            values: {
                heroBackgroundColor: '#f8fafc',
                sidebarBackgroundColor: '#1e293b',
                sidebarAccentColor: '#60a5fa',
                outcomesBackgroundColor: '#111827',
                visualSectionBackgroundColor: '#f8fafc',
            },
        },
    ]), [])

    const applyVisualPreset = (values: Record<string, string>) => {
        setDraft(d => d ? ({ ...d, visualStyle: { ...(d.visualStyle ?? {}), ...values } as any }) : d)
    }

    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Catálogo de Servicios</h1>
                    <p className="text-slate-500 font-light">Gestiona las soluciones de Industria 5.0 visibles en el sitio.</p>
                </div>
                <button
                    onClick={openNew}
                    className="flex items-center gap-2 px-6 py-4 bg-brand-primary text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-800 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Servicio
                </button>
            </div>

            {saved && (
                <div className="bg-green-50 border border-green-200 px-6 py-4 text-green-800 font-bold text-sm">
                    ✓ "{saved}" guardado correctamente
                </div>
            )}

            {/* Table */}
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <tr>
                            <th className="px-8 py-6">ID / Slug</th>
                            <th className="px-8 py-6">Servicio</th>
                            <th className="px-8 py-6">Estado SEO</th>
                            <th className="px-8 py-6 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {services.map(service => (
                            <tr key={service.slug} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-8 py-6">
                                    <span className="text-xs font-mono bg-slate-100 px-3 py-1 text-slate-600">{service.slug}</span>
                                </td>
                                <td className="px-8 py-6">
                                    <div>
                                        <div className="font-bold text-slate-900">{service.title}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{service.highlight}</div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${service.seoTitle ? 'bg-green-500' : 'bg-amber-400'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            {service.seoTitle ? 'Optimizado' : 'Incompleto'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <a
                                            href={`/servicios/${service.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-slate-400 hover:text-brand-primary transition-colors"
                                            title="Ver en sitio"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </a>
                                        <button
                                            onClick={() => openEdit(service)}
                                            className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(service)}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit / New Modal */}
            <ContentModal
                isOpen={!!editTarget}
                onClose={() => { setEditTarget(null); setDraft(null) }}
                title={isNew ? 'Nuevo Servicio' : `Editar: ${editTarget?.title}`}
                subtitle={isNew ? 'Completa los campos para agregar un nuevo servicio al sitio.' : 'Los cambios se aplicarán inmediatamente.'}
                onSave={handleSave}
                saveLabel={isNew ? 'Crear Servicio' : 'Guardar Cambios'}
                panelClassName="max-w-[96vw] lg:max-w-[94vw]"
            >
                {draft && (
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(520px,1fr)_minmax(420px,48vw)] gap-8 items-start">
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200 p-4 text-xs text-blue-900">
                                <div className="font-black uppercase tracking-widest text-[10px] mb-1">Editor completo de servicio</div>
                                Aquí puedes editar contenido, SEO, sección visual (gráficos), estilos de la página y ver una vista previa real del servicio.
                            </div>
                            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border border-slate-200 p-2">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                    <EditorTabButton active={editorTab === 'content'} onClick={() => setEditorTab('content')}>Contenido</EditorTabButton>
                                    <EditorTabButton active={editorTab === 'visual'} onClick={() => setEditorTab('visual')}>Visual</EditorTabButton>
                                    <EditorTabButton active={editorTab === 'copy'} onClick={() => setEditorTab('copy')}>Copy</EditorTabButton>
                                    <EditorTabButton active={editorTab === 'marketing'} onClick={() => setEditorTab('marketing')}>Marketing</EditorTabButton>
                                    <EditorTabButton active={editorTab === 'seo'} onClick={() => setEditorTab('seo')}>SEO</EditorTabButton>
                                </div>
                            </div>
                            {editorTab === 'content' && (
                            <div className="space-y-6">
                            {isNew && (
                                <Field label="Slug (URL)" hint="Solo letras minúsculas y guiones. Ej: nuevo-servicio">
                                    <Input
                                        value={draft.slug}
                                        onChange={e => setDraftField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                                        placeholder="mi-servicio"
                                    />
                                </Field>
                            )}
                            <Field label="Nombre del Servicio">
                                <Input value={draft.title} onChange={e => setDraftField('title', e.target.value)} />
                            </Field>
                            <Field label="Etiqueta (highlight)">
                                <Input value={draft.highlight} onChange={e => setDraftField('highlight', e.target.value)} />
                            </Field>
                            <Field label="Subtítulo (tagline)">
                                <Input value={draft.subtitle} onChange={e => setDraftField('subtitle', e.target.value)} />
                            </Field>
                            <Field label="Descripción corta">
                                <Textarea rows={2} value={draft.description} onChange={e => setDraftField('description', e.target.value)} />
                            </Field>
                            <Field label="Descripción larga (visible en la página de detalle)">
                                <Textarea rows={5} value={draft.descriptionLong} onChange={e => setDraftField('descriptionLong', e.target.value)} />
                            </Field>
                            <Field label="CTA Principal">
                                <Input value={draft.ctaPrimary} onChange={e => setDraftField('ctaPrimary', e.target.value)} />
                            </Field>
                            <Field label="CTA Secundario">
                                <Input value={draft.ctaSecondary} onChange={e => setDraftField('ctaSecondary', e.target.value)} />
                            </Field>
                            <Field label="Características (3 bullets)">
                                <div className="space-y-2">
                                    {[0, 1, 2].map(i => (
                                        <Input key={i} value={draft.features[i] ?? ''} onChange={e => setFeature(i, e.target.value)} placeholder={`Característica ${i + 1}`} />
                                    ))}
                                </div>
                            </Field>
                            <Field label="Outcomes / Entregables (6 ítems de la página de detalle)">
                                <div className="space-y-2">
                                    {[0, 1, 2, 3, 4, 5].map(i => (
                                        <Textarea key={i} rows={2} value={draft.outcomes?.[i] ?? ''} onChange={e => setOutcome(i, e.target.value)} placeholder={`Outcome ${i + 1}`} />
                                    ))}
                                </div>
                            </Field>
                            </div>
                            )}

                            {editorTab === 'visual' && (
                            <div className="border-t border-slate-100 pt-6 space-y-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Sección Visual (gráfico / visualización)</div>
                                <div className="bg-slate-50 border border-slate-200 p-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Presets de estilos de página</div>
                                    <div className="flex flex-wrap gap-2">
                                        {visualStylePresets.map(preset => (
                                            <button
                                                key={preset.name}
                                                type="button"
                                                onClick={() => applyVisualPreset(preset.values)}
                                                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest border border-slate-300 bg-white hover:border-brand-primary hover:text-brand-primary"
                                            >
                                                {preset.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label="Visual title (común)">
                                        <Input value={(draft.visualConfig as any)?.title ?? ''} onChange={e => setVisualConfigField('title', e.target.value)} placeholder="Se usa en la mayoría de visuales" />
                                    </Field>
                                    <Field label="Visual eyebrow (común)">
                                        <Input value={(draft.visualConfig as any)?.eyebrow ?? ''} onChange={e => setVisualConfigField('eyebrow', e.target.value)} />
                                    </Field>
                                </div>
                                <Field label="Visual subtitle (común)">
                                    <Textarea rows={3} value={(draft.visualConfig as any)?.subtitle ?? ''} onChange={e => setVisualConfigField('subtitle', e.target.value)} placeholder="Subtítulo descriptivo del gráfico/visualización" />
                                </Field>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ColorInputField label="Fondo Hero Servicio" value={(draft.visualStyle as any)?.heroBackgroundColor ?? ''} onChange={(v) => setVisualStyleField('heroBackgroundColor', v)} />
                                    <ColorInputField label="Sidebar fondo" value={(draft.visualStyle as any)?.sidebarBackgroundColor ?? ''} onChange={(v) => setVisualStyleField('sidebarBackgroundColor', v)} />
                                    <ColorInputField label="Sidebar acento" value={(draft.visualStyle as any)?.sidebarAccentColor ?? ''} onChange={(v) => setVisualStyleField('sidebarAccentColor', v)} />
                                    <ColorInputField label="Fondo Outcomes" value={(draft.visualStyle as any)?.outcomesBackgroundColor ?? ''} onChange={(v) => setVisualStyleField('outcomesBackgroundColor', v)} />
                                    <ColorInputField label="Fondo sección visual" value={(draft.visualStyle as any)?.visualSectionBackgroundColor ?? ''} onChange={(v) => setVisualStyleField('visualSectionBackgroundColor', v)} />
                                </div>
                                <div className="border border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowVisualJson(v => !v)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-left"
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">JSON avanzado del visual</span>
                                        <span className="text-xs font-bold text-slate-500">{showVisualJson ? 'Ocultar' : 'Mostrar'}</span>
                                    </button>
                                    {showVisualJson && (
                                        <div className="p-4">
                                            <Field label="Visual config JSON (título/subtítulo/datos del gráfico)" hint="Edición avanzada. Aquí puedes sobrescribir datasets, labels y textos específicos del visual por servicio.">
                                                <Textarea
                                                    rows={14}
                                                    value={JSON.stringify((draft.visualConfig as any) ?? {}, null, 2)}
                                                    onChange={e => setVisualConfigJson(e.target.value)}
                                                    placeholder='{"title":"...", "subtitle":"...", "data":[...]}'
                                                />
                                            </Field>
                                        </div>
                                    )}
                                </div>
                            </div>
                            )}

                            {editorTab === 'copy' && (
                            <div className="border-t border-slate-100 pt-6 space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Variantes de Copy (cards inferiores)</div>
                            {[0, 1, 2].map(i => (
                                <div key={i} className="border border-slate-200 p-4 space-y-3">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Variante {i + 1}</div>
                                    <Field label="Tone">
                                        <Input value={draft.variants?.[i]?.tone ?? ''} onChange={e => setVariantField(i, 'tone', e.target.value)} />
                                    </Field>
                                    <Field label="Titular">
                                        <Input value={draft.variants?.[i]?.titular ?? ''} onChange={e => setVariantField(i, 'titular', e.target.value)} />
                                    </Field>
                                    <Field label="Rationale (opcional)">
                                        <Textarea rows={2} value={draft.variants?.[i]?.rationale ?? ''} onChange={e => setVariantField(i, 'rationale', e.target.value)} />
                                    </Field>
                                </div>
                            ))}
                        </div>
                            )}
                            {editorTab === 'marketing' && (
                            <div className="border-t border-slate-100 pt-6 space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Marketing / Experimentos</div>
                            <Field label="Tracking UTM / Querystring">
                                <Input value={draft.tracking ?? ''} onChange={e => setDraftField('tracking', e.target.value)} placeholder="?utm_campaign=..." />
                            </Field>
                            <Field label="Hipótesis A/B">
                                <Textarea rows={2} value={draft.abHypothesis ?? ''} onChange={e => setDraftField('abHypothesis', e.target.value)} />
                            </Field>
                            {[0, 1, 2].map(i => (
                                <div key={i} className="border border-slate-200 p-4 space-y-3">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">CTA Variant Group {i + 1}</div>
                                    <Field label="Original">
                                        <Input value={draft.ctaVariants?.[i]?.original ?? ''} onChange={e => setCtaVariantField(i, 'original', e.target.value)} />
                                    </Field>
                                    <Field label="Alternativas">
                                        <div className="space-y-2">
                                            {[0, 1, 2, 3, 4, 5].map(altIndex => (
                                                <Input
                                                    key={altIndex}
                                                    value={draft.ctaVariants?.[i]?.alt?.[altIndex] ?? ''}
                                                    onChange={e => setCtaVariantAlt(i, altIndex, e.target.value)}
                                                    placeholder={`Alternativa ${altIndex + 1}`}
                                                />
                                            ))}
                                        </div>
                                    </Field>
                                </div>
                            ))}
                        </div>
                            )}
                            {editorTab === 'seo' && (
                            <div className="border-t border-slate-100 pt-6 space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">SEO</div>
                            <Field label="SEO Title">
                                <Input value={draft.seoTitle} onChange={e => setDraftField('seoTitle', e.target.value)} />
                            </Field>
                            <Field label="SEO Description">
                                <Textarea rows={2} value={draft.seoDescription} onChange={e => setDraftField('seoDescription', e.target.value)} />
                            </Field>
                            </div>
                            )}
                        </div>

                        <div className="xl:sticky xl:top-0 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview real página de servicio</div>
                                <a
                                    href={draft.slug ? `/servicios/${draft.slug}` : '#'}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="text-[10px] font-black uppercase tracking-widest text-brand-primary"
                                >
                                    Abrir en sitio
                                </a>
                            </div>
                            <div className="border border-slate-200 bg-white overflow-hidden rounded-sm shadow-sm">
                                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Vista previa (mismo render que producción)
                                </div>
                                <div className="h-[78vh] overflow-auto bg-slate-100 relative">
                                    <div className="sticky top-0 z-10 px-3 py-2 bg-white/90 backdrop-blur border-b border-slate-200 text-[10px] font-bold text-slate-500">
                                        Tip: cambia pestañas a la izquierda y revisa aquí el resultado en tiempo real.
                                    </div>
                                    <div className="origin-top-left scale-[0.46] xl:scale-[0.52] 2xl:scale-[0.58] w-[217%] xl:w-[193%] 2xl:w-[173%] pointer-events-none">
                                        <ServicePageView service={draft} uiText={uiText.servicePage as any} preview />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </ContentModal>

            {/* Delete confirm */}
            <ConfirmDelete
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                itemName={deleteTarget?.title ?? ''}
            />
        </div>
    )
}

function EditorTabButton({
    active,
    onClick,
    children,
}: {
    active: boolean
    onClick: () => void
    children: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest border transition-colors ${
                active
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
        >
            {children}
        </button>
    )
}

function ColorInputField({
    label,
    value,
    onChange,
}: {
    label: string
    value: string
    onChange: (value: string) => void
}) {
    const swatches = ['#ffffff', '#f8fafc', '#e2e8f0', '#0f172a', '#020617', '#1e293b', '#2563eb', '#3b82f6']
    return (
        <Field label={label}>
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={normalizeColor(value)}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-11 w-12 border border-slate-200 bg-white p-1 cursor-pointer"
                    />
                    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#ffffff" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {swatches.map((hex) => (
                        <button
                            key={hex}
                            type="button"
                            onClick={() => onChange(hex)}
                            className={`w-6 h-6 border ${value?.toLowerCase() === hex ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'}`}
                            style={{ backgroundColor: hex }}
                            title={hex}
                        />
                    ))}
                </div>
            </div>
        </Field>
    )
}

function normalizeColor(value?: string) {
    if (!value) return '#ffffff'
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : '#ffffff'
}
