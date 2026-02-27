import { useState } from 'react'
import { Terminal, Save, Globe, MessageSquare, CheckCircle2, RefreshCw, ShieldCheck, LayoutTemplate, Rocket, TriangleAlert } from 'lucide-react'
import { useCMS, type SiteConfig } from '../context/CMSContext'
import { Field, Input, Textarea } from '../components/ContentModal'

function SelectField({
    value,
    onChange,
    options,
}: {
    value: string
    onChange: (v: string) => void
    options: Array<{ value: string; label: string }>
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-medium text-slate-900 focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all duration-200"
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}

export function ManageSite() {
    const { state, updateSite, resetToDefaults } = useCMS()
    const [draft, setDraft] = useState<SiteConfig>({ ...state.site })
    const [saved, setSaved] = useState(false)
    const [confirmReset, setConfirmReset] = useState(false)

    const set = <K extends keyof SiteConfig>(key: K, val: SiteConfig[K]) => {
        setDraft((d) => ({ ...d, [key]: val }))
    }

    const handleSave = () => {
        updateSite(draft)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    const handleReset = () => {
        resetToDefaults()
        setConfirmReset(false)
    }

    return (
        <div className="space-y-12 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Configuración Global</h1>
                    <p className="text-slate-500 font-light">Controla identidad, templates globales, performance y comportamiento base del sitio.</p>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-4 bg-brand-primary text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-800 transition-colors"
                >
                    <Save className="w-5 h-5" />
                    Guardar Cambios
                </button>
            </div>

            {saved && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 px-6 py-4 text-green-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Configuración guardada correctamente
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-slate-200 p-10 space-y-8">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-2">
                        <Globe className="w-5 h-5 text-brand-primary" />
                        <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Identidad Digital</h3>
                    </div>
                    <div className="space-y-6">
                        <Field label="Nombre del Sitio">
                            <Input value={draft.name} onChange={(e) => set('name', e.target.value)} />
                        </Field>
                        <Field label="Descripción Meta (SEO)">
                            <Textarea rows={3} value={draft.description} onChange={(e) => set('description', e.target.value)} />
                        </Field>
                        <Field label="URL del Sitio">
                            <Input value={draft.url} onChange={(e) => set('url', e.target.value)} />
                        </Field>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-10 space-y-8">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-2">
                        <MessageSquare className="w-5 h-5 text-brand-primary" />
                        <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Protocolos de Contacto</h3>
                    </div>
                    <div className="space-y-6">
                        <Field label="Email de Ventas">
                            <Input type="email" value={draft.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
                        </Field>
                        <Field label="Ubicación HQ">
                            <Input value={draft.contactAddress} onChange={(e) => set('contactAddress', e.target.value)} />
                        </Field>
                        <Field label="LinkedIn URL">
                            <Input value={draft.linkedin} onChange={(e) => set('linkedin', e.target.value)} />
                        </Field>
                        <Field label="Twitter/X URL">
                            <Input value={draft.twitter} onChange={(e) => set('twitter', e.target.value)} />
                        </Field>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 p-10 space-y-8">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-2">
                    <LayoutTemplate className="w-5 h-5 text-brand-primary" />
                    <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Theme Builder (Header, Footer y Plantillas)</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Field label="Variante de Header">
                        <SelectField
                            value={draft.headerVariant}
                            onChange={(v) => set('headerVariant', v)}
                            options={[
                                { value: 'classic', label: 'Classic' },
                                { value: 'minimal', label: 'Minimal' },
                                { value: 'split', label: 'Split (navegación centrada)' },
                            ]}
                        />
                    </Field>
                    <Field label="Header fijo">
                        <SelectField
                            value={draft.headerSticky}
                            onChange={(v) => set('headerSticky', v)}
                            options={[
                                { value: 'true', label: 'Sí, fijo (sticky)' },
                                { value: 'false', label: 'No, en flujo normal' },
                            ]}
                        />
                    </Field>
                    <Field label="CTA en Header">
                        <SelectField
                            value={draft.headerCtaEnabled}
                            onChange={(v) => set('headerCtaEnabled', v)}
                            options={[
                                { value: 'true', label: 'Mostrar CTA' },
                                { value: 'false', label: 'Ocultar CTA' },
                            ]}
                        />
                    </Field>
                    <Field label="Variante de Footer">
                        <SelectField
                            value={draft.footerVariant}
                            onChange={(v) => set('footerVariant', v)}
                            options={[
                                { value: 'detailed', label: 'Detallado' },
                                { value: 'compact', label: 'Compacto' },
                                { value: 'minimal', label: 'Minimal' },
                            ]}
                        />
                    </Field>
                    <Field label="Texto CTA Header">
                        <Input value={draft.headerCtaLabel} onChange={(e) => set('headerCtaLabel', e.target.value)} />
                    </Field>
                    <Field label="URL CTA Header">
                        <Input value={draft.headerCtaHref} onChange={(e) => set('headerCtaHref', e.target.value)} />
                    </Field>
                    <Field label="Announcement bar">
                        <SelectField
                            value={draft.announcementEnabled}
                            onChange={(v) => set('announcementEnabled', v)}
                            options={[
                                { value: 'false', label: 'Desactivado' },
                                { value: 'true', label: 'Activado' },
                            ]}
                        />
                    </Field>
                    <Field label="Texto Announcement">
                        <Input value={draft.announcementText} onChange={(e) => set('announcementText', e.target.value)} />
                    </Field>
                    <Field label="URL Announcement">
                        <Input value={draft.announcementHref} onChange={(e) => set('announcementHref', e.target.value)} />
                    </Field>
                    <Field label="Color Fondo Announcement">
                        <Input value={draft.announcementBgColor} onChange={(e) => set('announcementBgColor', e.target.value)} />
                    </Field>
                    <Field label="Color Texto Announcement">
                        <Input value={draft.announcementTextColor} onChange={(e) => set('announcementTextColor', e.target.value)} />
                    </Field>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Field label="Template Home">
                        <SelectField
                            value={draft.pageTemplateHome}
                            onChange={(v) => set('pageTemplateHome', v)}
                            options={[
                                { value: 'immersive', label: 'Immersive' },
                                { value: 'balanced', label: 'Balanced' },
                                { value: 'compact', label: 'Compact' },
                            ]}
                        />
                    </Field>
                    <Field label="Template Servicios">
                        <SelectField
                            value={draft.pageTemplateService}
                            onChange={(v) => set('pageTemplateService', v)}
                            options={[
                                { value: 'immersive', label: 'Immersive' },
                                { value: 'balanced', label: 'Balanced' },
                                { value: 'compact', label: 'Compact' },
                            ]}
                        />
                    </Field>
                    <Field label="Template Productos">
                        <SelectField
                            value={draft.pageTemplateProduct}
                            onChange={(v) => set('pageTemplateProduct', v)}
                            options={[
                                { value: 'immersive', label: 'Immersive' },
                                { value: 'balanced', label: 'Balanced' },
                                { value: 'compact', label: 'Compact' },
                            ]}
                        />
                    </Field>
                    <Field label="Template Protocolos">
                        <SelectField
                            value={draft.pageTemplateProtocol}
                            onChange={(v) => set('pageTemplateProtocol', v)}
                            options={[
                                { value: 'immersive', label: 'Immersive' },
                                { value: 'balanced', label: 'Balanced' },
                                { value: 'compact', label: 'Compact' },
                            ]}
                        />
                    </Field>
                    <Field label="Template Política de Datos">
                        <SelectField
                            value={draft.pageTemplatePolicy}
                            onChange={(v) => set('pageTemplatePolicy', v)}
                            options={[
                                { value: 'immersive', label: 'Immersive' },
                                { value: 'balanced', label: 'Balanced' },
                                { value: 'compact', label: 'Compact' },
                            ]}
                        />
                    </Field>
                </div>
            </div>

            <div className="bg-white border border-slate-200 p-10 space-y-8">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-2">
                    <Rocket className="w-5 h-5 text-brand-primary" />
                    <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Performance y Movimiento</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Field label="Modo de performance">
                        <SelectField
                            value={draft.performanceMode}
                            onChange={(v) => set('performanceMode', v)}
                            options={[
                                { value: 'standard', label: 'Standard' },
                                { value: 'lite', label: 'Lite (menos fondos/patrones)' },
                            ]}
                        />
                    </Field>
                    <Field label="Preferencia de motion">
                        <SelectField
                            value={draft.motionPreference}
                            onChange={(v) => set('motionPreference', v)}
                            options={[
                                { value: 'system', label: 'Seguir sistema' },
                                { value: 'always', label: 'Reducir movimiento' },
                                { value: 'never', label: 'Animaciones completas' },
                            ]}
                        />
                    </Field>
                </div>
            </div>

            <div className="bg-white border border-slate-200 p-10 space-y-8">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-2">
                    <TriangleAlert className="w-5 h-5 text-brand-primary" />
                    <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Plantilla 404</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Field label="Título 404">
                        <Input value={draft.notFoundTitle} onChange={(e) => set('notFoundTitle', e.target.value)} />
                    </Field>
                    <Field label="CTA label 404">
                        <Input value={draft.notFoundCtaLabel} onChange={(e) => set('notFoundCtaLabel', e.target.value)} />
                    </Field>
                    <Field label="CTA URL 404">
                        <Input value={draft.notFoundCtaHref} onChange={(e) => set('notFoundCtaHref', e.target.value)} />
                    </Field>
                </div>
                <Field label="Descripción 404">
                    <Textarea rows={3} value={draft.notFoundDescription} onChange={(e) => set('notFoundDescription', e.target.value)} />
                </Field>
            </div>

            <div className="bg-white border border-slate-200 p-10 space-y-8">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-2">
                    <ShieldCheck className="w-5 h-5 text-brand-primary" />
                    <h3 className="font-black uppercase tracking-widest text-xs text-slate-900">Política de Tratamiento de Datos y Consentimiento</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Field label="Consentimiento habilitado (true/false)">
                        <Input value={draft.dataPolicyEnabled} onChange={(e) => set('dataPolicyEnabled', e.target.value)} />
                    </Field>
                    <Field label="Versión de política (ej. v1, 2026-02)">
                        <Input value={draft.dataPolicyVersion} onChange={(e) => set('dataPolicyVersion', e.target.value)} />
                    </Field>
                    <Field label="Título de política">
                        <Input value={draft.dataPolicyTitle} onChange={(e) => set('dataPolicyTitle', e.target.value)} />
                    </Field>
                    <Field label="Texto enlace de lectura">
                        <Input value={draft.dataPolicyLinkLabel} onChange={(e) => set('dataPolicyLinkLabel', e.target.value)} />
                    </Field>
                    <Field label="Botón aceptar">
                        <Input value={draft.dataPolicyAcceptLabel} onChange={(e) => set('dataPolicyAcceptLabel', e.target.value)} />
                    </Field>
                    <Field label="Botón continuar sin analítica">
                        <Input value={draft.dataPolicyRejectLabel} onChange={(e) => set('dataPolicyRejectLabel', e.target.value)} />
                    </Field>
                </div>
                <Field label="Resumen breve (modal)">
                    <Textarea rows={4} value={draft.dataPolicySummary} onChange={(e) => set('dataPolicySummary', e.target.value)} />
                </Field>
                <Field label="Texto completo de la política (lectura)">
                    <Textarea rows={14} value={draft.dataPolicyContent} onChange={(e) => set('dataPolicyContent', e.target.value)} />
                </Field>
            </div>

            <div className="bg-slate-950 border-t-8 border-brand-primary p-12 text-white overflow-hidden relative">
                <Terminal className="absolute -bottom-4 -right-4 w-48 h-48 text-white/5" />
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black tracking-tighter mb-4">Núcleo del Sistema</h3>
                        <p className="text-white/40 text-sm font-light max-w-lg mb-8">
                            Cuidado: Restablecer el CMS eliminará todos los cambios realizados en servicios, productos, home y configuración.
                        </p>
                        <div className="flex items-center gap-4">
                            <a
                                href="/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest transition-colors border border-white/10"
                            >
                                Ver Sitio en Vivo
                            </a>
                            {!confirmReset ? (
                                <button
                                    onClick={() => setConfirmReset(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Restablecer CMS
                                </button>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <span className="text-red-400 font-bold text-sm">¿Estás seguro?</span>
                                    <button onClick={handleReset} className="px-4 py-3 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-colors">
                                        Sí, restablecer
                                    </button>
                                    <button onClick={() => setConfirmReset(false)} className="px-4 py-3 bg-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-colors">
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mb-2">Versión CMS</div>
                        <div className="text-4xl font-black text-brand-primary">v9.0</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
