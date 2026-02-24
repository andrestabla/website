/**
 * ManageHome — Admin editor for all home page sections:
 *   Hero, Services section headings, Products section, Frameworks
 */
import { useState } from 'react'
import { Save, Home, Monitor, Sparkles, CheckCircle2 } from 'lucide-react'
import { useCMS, type HeroContent } from '../context/CMSContext'
import { Field, Input, Textarea } from '../components/ContentModal'

type Tab = 'hero' | 'banners'

export function ManageHome() {
    const { state, updateHero } = useCMS()
    const [tab, setTab] = useState<Tab>('hero')
    const [heroDraft, setHeroDraft] = useState<HeroContent>({ ...state.hero })
    const [saved, setSaved] = useState(false)

    const setHeroField = <K extends keyof HeroContent>(key: K, val: HeroContent[K]) => {
        setHeroDraft(d => ({ ...d, [key]: val }))
    }

    const saveHero = () => {
        updateHero(heroDraft)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    const tabs = [
        { id: 'hero' as Tab, label: 'Hero Principal', icon: Monitor },
        { id: 'banners' as Tab, label: 'Secciones', icon: Sparkles },
    ]

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Editor del Home</h1>
                    <p className="text-slate-500 font-light">Modifica todos los textos visibles en la página principal del sitio.</p>
                </div>
                <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-primary transition-colors"
                >
                    <Home className="w-4 h-4" />
                    Ver Home
                </a>
            </div>

            {saved && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 px-6 py-4 text-green-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Cambios guardados correctamente en el CMS
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                {tabs.map(t => {
                    const Icon = t.icon
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-8 py-4 font-black text-[11px] uppercase tracking-widest transition-all border-b-2 ${tab === t.id
                                    ? 'border-brand-primary text-brand-primary'
                                    : 'border-transparent text-slate-400 hover:text-slate-700'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {t.label}
                        </button>
                    )
                })}
            </div>

            {/* ─── HERO TAB ─── */}
            {tab === 'hero' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Form */}
                    <div className="space-y-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-2">Contenido</div>

                        <Field label="Etiqueta Superior (highlight)" hint="Aparece sobre el titular principal en uppercase. Ej: 'Industria 5.0'">
                            <Input
                                value={heroDraft.highlight}
                                onChange={e => setHeroField('highlight', e.target.value)}
                            />
                        </Field>

                        <Field label="Titular Principal (H1)" hint="El mensaje más importante. Sé claro, directo y aspiracional.">
                            <Textarea
                                rows={3}
                                value={heroDraft.title}
                                onChange={e => setHeroField('title', e.target.value)}
                            />
                        </Field>

                        <Field label="Subtítulo" hint="Una oración que amplía el titular. ~20-30 palabras para SEO óptimo.">
                            <Textarea
                                rows={3}
                                value={heroDraft.subtitle}
                                onChange={e => setHeroField('subtitle', e.target.value)}
                            />
                        </Field>

                        <Field label="CTA Principal (botón azul)">
                            <Input
                                value={heroDraft.cta}
                                onChange={e => setHeroField('cta', e.target.value)}
                            />
                        </Field>

                        <Field label="CTA Secundario (botón outline)">
                            <Input
                                value={heroDraft.secondaryCta}
                                onChange={e => setHeroField('secondaryCta', e.target.value)}
                            />
                        </Field>

                        <button
                            onClick={saveHero}
                            className="flex items-center gap-2 px-8 py-4 bg-brand-primary text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-800 transition-colors"
                        >
                            <Save className="w-5 h-5" />
                            Guardar Hero
                        </button>
                    </div>

                    {/* Live preview */}
                    <div className="bg-slate-950 p-10 text-white sticky top-8">
                        <div className="text-[9px] font-black uppercase tracking-[0.5em] text-white/30 mb-8">Vista previa</div>

                        <div className="space-y-1 mb-6">
                            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary">
                                {heroDraft.highlight || ''}
                            </div>
                            <h2 className="text-2xl font-black tracking-tighter text-white leading-tight">
                                {heroDraft.title || <span className="text-white/20">Titular principal...</span>}
                            </h2>
                        </div>

                        <p className="text-white/50 font-light text-sm leading-relaxed mb-8">
                            {heroDraft.subtitle || <span className="text-white/20">Subtítulo...</span>}
                        </p>

                        <div className="flex gap-3 flex-wrap">
                            <div className="px-4 py-2 bg-brand-primary text-white font-black text-[10px] uppercase tracking-widest">
                                {heroDraft.cta || 'CTA Principal'}
                            </div>
                            <div className="px-4 py-2 border border-white/20 text-white/60 font-black text-[10px] uppercase tracking-widest">
                                {heroDraft.secondaryCta || 'CTA Secundario'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── SECTIONS TAB ─── */}
            {tab === 'banners' && (
                <div className="space-y-8">
                    {/* Services section */}
                    <div className="bg-white border border-slate-200 p-10">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
                            <div className="w-2 h-8 bg-brand-primary" />
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Sección</div>
                                <h3 className="font-black text-slate-900">Portafolio de Servicios</h3>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Field label="Título de la sección">
                                <Input defaultValue={state.services.length ? 'Portafolio de Servicios Digitales' : ''} disabled />
                            </Field>
                            <Field label="Número de servicios activos">
                                <Input value={state.services.length} disabled />
                            </Field>
                        </div>
                        <p className="text-sm text-slate-400 font-light mt-4">
                            Los títulos individuales de cada servicio se editan en <strong className="text-slate-600">Servicios → Editar</strong>.
                        </p>
                    </div>

                    {/* Why us */}
                    <div className="bg-white border border-slate-200 p-10">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
                            <div className="w-2 h-8 bg-emerald-500" />
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Sección</div>
                                <h3 className="font-black text-slate-900">Confianza & Estándares</h3>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 font-light">
                            Muestra los marcos internacionales (Industria 5.0, ISO 9241-210, NIST AI RMF) que respaldan la metodología.
                            Editable en un release futuro con backend/API.
                        </p>
                        <div className="mt-6 flex gap-2 flex-wrap">
                            {['Industry 5.0 — UE', 'ISO 9241-210 — ISO', 'NIST AI RMF — NIST'].map(f => (
                                <span key={f} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border border-slate-200 text-slate-500">{f}</span>
                            ))}
                        </div>
                    </div>

                    {/* Info note */}
                    <div className="bg-amber-50 border border-amber-200 px-8 py-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Nota CMS</div>
                        <p className="text-sm text-amber-800 font-light">
                            Los textos del Hero se guardan en <strong>localStorage</strong> y persisten en esta sesión.
                            Para propagarlos al sitio público en tiempo real, conecta un backend API (Supabase, Firebase o similar)
                            y sustituye el contexto <code className="bg-amber-100 px-1">CMSContext</code> por llamadas a ese API.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
