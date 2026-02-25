/**
 * ManageDesign — Admin visual style editor.
 * Changes are applied to the site in real-time via CSS custom property injection.
 */
import { useEffect, useState } from 'react'
import { Palette, Type, Layout, Save, RotateCcw, CheckCircle2, Eye, ImageIcon, LoaderCircle, UploadCloud } from 'lucide-react'
import { useCMS, type DesignTokens, defaultDesign } from '../context/CMSContext'
import { Field, Input, Textarea } from '../components/ContentModal'

type Tab = 'colors' | 'typography' | 'layout' | 'branding'

const GOOGLE_FONTS = [
    'Inter',
    'Outfit',
    'Manrope',
    'DM Sans',
    'Plus Jakarta Sans',
    'Sora',
    'Space Grotesk',
    'IBM Plex Sans',
    'Roboto',
    'Open Sans',
]

const BORDER_RADII = [
    { value: 'none', label: 'Cuadrado (0px)', preview: '0px' },
    { value: 'sm', label: 'Suave (4px)', preview: '4px' },
    { value: 'md', label: 'Redondeado (8px)', preview: '8px' },
    { value: 'lg', label: 'Moderno (16px)', preview: '16px' },
    { value: 'full', label: 'Píldora', preview: '9999px' },
]

function ColorSwatch({ label, value, onChange, hint }: {
    label: string
    value: string
    onChange: (v: string) => void
    hint?: string
}) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">{label}</label>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <input
                        type="color"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        className="w-14 h-14 cursor-pointer border-2 border-slate-200 bg-transparent p-0.5"
                    />
                </div>
                <div className="flex-1">
                    <input
                        type="text"
                        value={value}
                        onChange={e => {
                            const v = e.target.value
                            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
                        }}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm font-mono text-slate-900 focus:border-brand-primary outline-none uppercase"
                        maxLength={7}
                    />
                    {hint && <p className="text-[11px] text-slate-400 font-light mt-1">{hint}</p>}
                </div>
                <div
                    className="w-10 h-10 shrink-0 border border-slate-200"
                    style={{ backgroundColor: value }}
                />
            </div>
        </div>
    )
}

function AssetPreview({ url, label }: { url: string; label: string }) {
    if (!url?.trim()) return null
    return (
        <div className="border border-slate-200 bg-white p-3 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
            <img
                src={url}
                alt={label}
                className="max-h-24 w-auto object-contain bg-slate-50 border border-slate-100 p-2"
                onError={(e) => {
                    const target = e.currentTarget
                    target.style.display = 'none'
                    const next = target.nextElementSibling as HTMLElement | null
                    if (next) next.style.display = 'block'
                }}
            />
            <div className="hidden text-xs text-amber-700 font-bold">
                No se pudo cargar el asset desde esta URL. Verifica acceso público (R2 `publicUrl`).
            </div>
        </div>
    )
}

function R2AssetUploadButton({ folder, onUploaded }: { folder: string; onUploaded: (url: string) => void }) {
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState('')

    const uploadFile = async (file: File) => {
        if (file.size > 4 * 1024 * 1024) {
            setError('Máximo 4MB por archivo.')
            return
        }
        setIsUploading(true)
        setError('')
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => {
                    const result = String(reader.result || '')
                    resolve(result.includes(',') ? result.split(',')[1] : result)
                }
                reader.onerror = () => reject(reader.error)
                reader.readAsDataURL(file)
            })

            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type || 'application/octet-stream',
                    base64,
                    folder,
                }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok || !json?.ok || !json?.data?.url) throw new Error(json?.error || `HTTP ${res.status}`)
            onUploaded(String(json.data.url))
            if (json?.warning) setError(String(json.warning))
        } catch (err: any) {
            setError(err?.message || 'Error subiendo archivo')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:border-brand-primary text-[11px] font-black uppercase tracking-widest cursor-pointer transition-colors">
                <UploadCloud className="w-4 h-4" />
                {isUploading ? 'Subiendo...' : 'Subir a R2'}
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void uploadFile(file)
                        e.currentTarget.value = ''
                    }}
                />
            </label>
            {error && <span className="text-xs font-bold text-red-600">{error}</span>}
        </div>
    )
}

export function ManageDesign() {
    const { state, updateDesign, resetDesign } = useCMS()
    const [tab, setTab] = useState<Tab>('colors')
    const [draft, setDraft] = useState<DesignTokens>({ ...state.design })
    const [saved, setSaved] = useState(false)
    const [confirmReset, setConfirmReset] = useState(false)

    useEffect(() => {
        setDraft({ ...state.design })
    }, [state.design])

    const set = <K extends keyof DesignTokens>(key: K, val: DesignTokens[K]) => {
        const next = { ...draft, [key]: val }
        setDraft(next)
        updateDesign({ [key]: val }) // live injection
    }

    const handleSave = () => {
        updateDesign(draft)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    const handleReset = () => {
        setDraft({ ...defaultDesign })
        resetDesign()
        setConfirmReset(false)
    }

    const tabs: { id: Tab; label: string; icon: typeof Palette }[] = [
        { id: 'colors', label: 'Colores', icon: Palette },
        { id: 'typography', label: 'Tipografía', icon: Type },
        { id: 'layout', label: 'Forma & Layout', icon: Layout },
        { id: 'branding', label: 'Branding & Assets', icon: ImageIcon },
    ]

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Editor de Estilos</h1>
                    <p className="text-slate-500 font-light">Los cambios se aplican en tiempo real en todo el sitio.</p>
                </div>
                <div className="flex items-center gap-3">
                    <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-3 border border-slate-200 text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-colors"
                    >
                        <Eye className="w-4 h-4" />
                        Ver Sitio
                    </a>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-800 transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Guardar
                    </button>
                </div>
            </div>

            {saved && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 px-6 py-4 text-green-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Estilos guardados y aplicados al sitio
                </div>
            )}

            {/* Live preview bar */}
            <div
                className="p-6 flex items-center gap-4 flex-wrap border"
                style={{ backgroundColor: draft.colorSurface, borderColor: draft.colorPrimary + '30' }}
            >
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Vista previa:</div>
                <div
                    className="px-6 py-3 text-white font-black text-xs uppercase tracking-widest"
                    style={{
                        backgroundColor: draft.colorPrimary,
                        color: draft.buttonPrimaryTextColor || '#fff',
                        borderRadius: { none: '0px', sm: '4px', md: '8px', lg: '16px', full: '9999px' }[draft.borderRadius] ?? '0px',
                        fontFamily: draft.fontBody,
                    }}
                >
                    CTA Principal
                </div>
                <div
                    className="px-6 py-3 font-black text-xs uppercase tracking-widest border-2"
                    style={{
                        color: draft.buttonOutlineTextColor || draft.colorPrimary,
                        borderColor: draft.buttonOutlineBorderColor || draft.colorPrimary,
                        borderRadius: { none: '0px', sm: '4px', md: '8px', lg: '16px', full: '9999px' }[draft.borderRadius] ?? '0px',
                        fontFamily: draft.fontBody,
                    }}
                >
                    CTA Secundario
                </div>
                <div
                    className="px-4 py-2 text-white text-xs font-bold"
                    style={{ backgroundColor: draft.colorSecondary, borderRadius: { none: '0px', sm: '4px', md: '8px', lg: '16px', full: '9999px' }[draft.borderRadius] ?? '0px' }}
                >
                    Tag / Badge
                </div>
                <span
                    className="text-2xl font-black"
                    style={{ color: draft.colorPrimary, fontFamily: draft.fontDisplay }}
                >
                    Titular de Muestra
                </span>
            </div>

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

            {/* ─── COLORS TAB ─── */}
            {tab === 'colors' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white border border-slate-200 p-10 space-y-8">
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-4">Colores de Marca</div>
                        <ColorSwatch
                            label="Color Primario (titulares, nav, sidebar)"
                            value={draft.colorPrimary}
                            onChange={v => set('colorPrimary', v)}
                            hint="Usado en textos principales y elementos de navegación"
                        />
                        <ColorSwatch
                            label="Color Secundario (botones, badges, enlaces activos)"
                            value={draft.colorSecondary}
                            onChange={v => set('colorSecondary', v)}
                            hint="Color de acción — debe contrastar bien con blanco"
                        />
                        <ColorSwatch
                            label="Color de Acento (gradientes, hover)"
                            value={draft.colorAccent}
                            onChange={v => set('colorAccent', v)}
                        />
                    </div>
                    <div className="bg-white border border-slate-200 p-10 space-y-8">
                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-4">Fondos y Paneles</div>
                        <ColorSwatch
                            label="Color de Superficie (fondo de secciones claras)"
                            value={draft.colorSurface}
                            onChange={v => set('colorSurface', v)}
                            hint="Debe ser muy cercano al blanco"
                        />
                        <ColorSwatch
                            label="Color Oscuro (paneles de contacto, hero cards)"
                            value={draft.colorDark}
                            onChange={v => set('colorDark', v)}
                            hint="Sidebar del admin, cards de servicio, sección hero lateral"
                        />

                        {/* Palette presets */}
                        <div className="pt-4 border-t border-slate-100">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Paletas Predefinidas</div>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { name: 'AlgoritmoT (original)', primary: '#1a2d5a', secondary: '#2563eb', accent: '#3b82f6', dark: '#0f172a', surface: '#f8faff' },
                                    { name: 'Verde Tecnológico', primary: '#064e3b', secondary: '#059669', accent: '#10b981', dark: '#022c22', surface: '#f0fdf4' },
                                    { name: 'Púrpura Innovación', primary: '#3b0764', secondary: '#7c3aed', accent: '#a855f7', dark: '#1e0538', surface: '#faf5ff' },
                                    { name: 'Naranja Startup', primary: '#7c2d12', secondary: '#ea580c', accent: '#f97316', dark: '#431407', surface: '#fff7ed' },
                                    { name: 'Gris Ejecutivo', primary: '#0f172a', secondary: '#334155', accent: '#64748b', dark: '#020617', surface: '#f8fafc' },
                                ].map(palette => (
                                    <button
                                        key={palette.name}
                                        onClick={() => {
                                            set('colorPrimary', palette.primary)
                                            set('colorSecondary', palette.secondary)
                                            set('colorAccent', palette.accent)
                                            set('colorDark', palette.dark)
                                            set('colorSurface', palette.surface)
                                        }}
                                        className="flex items-center gap-3 p-4 border border-slate-200 hover:border-brand-primary transition-colors text-left group"
                                    >
                                        <div className="flex gap-1 shrink-0">
                                            {[palette.primary, palette.secondary, palette.accent, palette.dark].map((c, i) => (
                                                <div key={i} className="w-5 h-5 border border-white/20" style={{ backgroundColor: c }} />
                                            ))}
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-brand-primary transition-colors">{palette.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TYPOGRAPHY TAB ─── */}
            {tab === 'typography' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white border border-slate-200 p-10 space-y-8">
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-4">Familias Tipográficas</div>

                        <Field label="Fuente Principal (cuerpo, botones, navegación)">
                            <select
                                value={draft.fontBody}
                                onChange={e => set('fontBody', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 px-4 py-4 text-sm font-medium text-slate-900 focus:border-brand-primary outline-none"
                            >
                                {GOOGLE_FONTS.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Fuente Display (titulares grandes, logos)">
                            <select
                                value={draft.fontDisplay}
                                onChange={e => set('fontDisplay', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 px-4 py-4 text-sm font-medium text-slate-900 focus:border-brand-primary outline-none"
                            >
                                {GOOGLE_FONTS.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        </Field>

                        <div className="bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm font-light">
                            Las fuentes de Google Fonts se cargan automáticamente al cambiar la selección.
                        </div>
                    </div>

                    {/* Typography preview */}
                    <div className="bg-slate-950 p-10 text-white">
                        <div className="text-[9px] font-black uppercase tracking-[0.5em] text-white/30 mb-8">Vista previa tipográfica</div>
                        <div className="space-y-6">
                            <div>
                                <div className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Display / H1</div>
                                <p className="text-4xl font-black tracking-tighter leading-none" style={{ fontFamily: draft.fontDisplay }}>
                                    Transformación Digital
                                </p>
                            </div>
                            <div>
                                <div className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Body / Subtítulo</div>
                                <p className="text-xl text-white/70 font-light leading-relaxed" style={{ fontFamily: draft.fontBody }}>
                                    Elevamos tu madurez digital con un enfoque humano-céntrico basado en Industria 5.0.
                                </p>
                            </div>
                            <div>
                                <div className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Labels / Navigation</div>
                                <p className="text-xs font-black uppercase tracking-[0.4em] text-white/50" style={{ fontFamily: draft.fontBody }}>
                                    METODOLOGÍA — ISO 9241 — NIST AI RMF
                                </p>
                            </div>
                            <div>
                                <div className="text-[9px] text-white/30 uppercase tracking-widest mb-2">Párrafo</div>
                                <p className="text-sm text-white/60 font-light leading-relaxed" style={{ fontFamily: draft.fontBody }}>
                                    Combinamos intensidad tecnológica con capacidad de gestión humana para diseñar soluciones que realmente se adoptan.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── LAYOUT TAB ─── */}
            {tab === 'layout' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white border border-slate-200 p-10 space-y-10">
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-4">Formas y Bordes</div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Radio de Bordes (botones, cards, inputs)</label>
                            <div className="grid grid-cols-1 gap-2">
                                {BORDER_RADII.map(r => (
                                    <button
                                        key={r.value}
                                        onClick={() => set('borderRadius', r.value)}
                                        className={`flex items-center gap-4 p-4 border transition-all ${draft.borderRadius === r.value
                                                ? 'border-brand-primary bg-brand-primary/5'
                                                : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <div
                                            className="w-10 h-10 bg-brand-primary shrink-0"
                                            style={{ borderRadius: r.preview }}
                                        />
                                        <div className="text-left">
                                            <div className={`text-sm font-bold ${draft.borderRadius === r.value ? 'text-brand-primary' : 'text-slate-700'}`}>
                                                {r.label}
                                            </div>
                                            <div className="text-xs text-slate-400 font-mono">{r.preview}</div>
                                        </div>
                                        {draft.borderRadius === r.value && (
                                            <CheckCircle2 className="w-5 h-5 text-brand-primary ml-auto" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 border-t border-slate-100 pt-8">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                                Opacidad del Grid de Fondo ({(parseFloat(draft.gridOpacity) * 100).toFixed(0)}%)
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="0.12"
                                step="0.005"
                                value={draft.gridOpacity}
                                onChange={e => set('gridOpacity', e.target.value)}
                                className="w-full accent-brand-primary"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Invisible</span>
                                <span>Muy visible</span>
                            </div>
                        </div>
                    </div>

                    {/* Layout preview */}
                    <div className="space-y-4">
                        <div className="bg-white border border-slate-200 p-8" style={{
                            backgroundSize: '60px 60px',
                            backgroundImage: `linear-gradient(to right, rgba(30,40,80,${draft.gridOpacity}) 1px, transparent 1px), linear-gradient(to bottom, rgba(30,40,80,${draft.gridOpacity}) 1px, transparent 1px)`,
                        }}>
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-6">Card de muestra</div>
                            <div className="border border-slate-200 p-6 space-y-4 bg-white">
                                <div className="w-10 h-10 bg-brand-primary" style={{ borderRadius: { none: '0px', sm: '4px', md: '8px', lg: '16px', full: '9999px' }[draft.borderRadius] ?? '0px' }} />
                                <div className="font-black text-slate-900 text-lg">Nombre del Servicio</div>
                                <div className="text-slate-500 text-sm font-light">Descripción corta del servicio o producto.</div>
                                <div
                                    className="inline-block px-5 py-2 text-white font-black text-xs uppercase tracking-widest"
                                    style={{
                                        backgroundColor: draft.colorSecondary,
                                        borderRadius: { none: '0px', sm: '4px', md: '8px', lg: '16px', full: '9999px' }[draft.borderRadius] ?? '0px',
                                    }}
                                >
                                    Más información →
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── BRANDING & ASSETS TAB ─── */}
            {tab === 'branding' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-8">
                        <div className="bg-white border border-slate-200 p-8 space-y-6">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-primary">
                                <ImageIcon className="w-4 h-4" />
                                Logos y Favicon
                            </div>

                            <Field label="Modo de logo (header/footer)">
                                <select
                                    value={draft.logoMode}
                                    onChange={(e) => set('logoMode', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-4 text-sm font-medium text-slate-900 focus:border-brand-primary outline-none"
                                >
                                    <option value="text">Texto (ALGORITMOT)</option>
                                    <option value="image">Imagen</option>
                                </select>
                            </Field>

                            <Field label="Logo header (URL)">
                                <div className="space-y-3">
                                    <Input value={draft.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://..." />
                                    <R2AssetUploadButton folder="branding/logo-header" onUploaded={(url) => set('logoUrl', url)} />
                                    <AssetPreview url={draft.logoUrl} label="Logo Header" />
                                </div>
                            </Field>

                            <Field label="Logo footer (URL) — opcional">
                                <div className="space-y-3">
                                    <Input value={draft.logoFooterUrl} onChange={(e) => set('logoFooterUrl', e.target.value)} placeholder="https://..." />
                                    <R2AssetUploadButton folder="branding/logo-footer" onUploaded={(url) => set('logoFooterUrl', url)} />
                                    <AssetPreview url={draft.logoFooterUrl} label="Logo Footer" />
                                </div>
                            </Field>

                            <Field label="Texto ALT del logo">
                                <Input value={draft.logoAlt} onChange={(e) => set('logoAlt', e.target.value)} placeholder="AlgoritmoT" />
                            </Field>

                            <Field label="Favicon (URL .png/.ico/.svg)">
                                <div className="space-y-3">
                                    <Input value={draft.faviconUrl} onChange={(e) => set('faviconUrl', e.target.value)} placeholder="https://..." />
                                    <R2AssetUploadButton folder="branding/favicon" onUploaded={(url) => set('faviconUrl', url)} />
                                    <AssetPreview url={draft.faviconUrl} label="Favicon" />
                                </div>
                            </Field>
                        </div>

                        <div className="bg-white border border-slate-200 p-8 space-y-6">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-primary">
                                <LoaderCircle className="w-4 h-4" />
                                Loader Global
                            </div>

                            <Field label="Activar loader al entrar al sitio (público)">
                                <select
                                    value={draft.loaderEnabled}
                                    onChange={(e) => set('loaderEnabled', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-4 text-sm font-medium text-slate-900 focus:border-brand-primary outline-none"
                                >
                                    <option value="false">Desactivado</option>
                                    <option value="true">Activado</option>
                                </select>
                            </Field>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ColorSwatch label="Fondo loader" value={draft.loaderBackgroundColor} onChange={(v) => set('loaderBackgroundColor', v)} />
                                <ColorSwatch label="Acento loader (barra)" value={draft.loaderAccentColor} onChange={(v) => set('loaderAccentColor', v)} />
                                <ColorSwatch label="Texto loader" value={draft.loaderTextColor} onChange={(v) => set('loaderTextColor', v)} />
                                <Field label="Duración (ms)">
                                    <Input type="number" min={300} max={5000} step={100} value={draft.loaderDurationMs} onChange={(e) => set('loaderDurationMs', e.target.value)} />
                                </Field>
                            </div>

                            <Field label="Texto loader">
                                <Textarea rows={2} value={draft.loaderLabel} onChange={(e) => set('loaderLabel', e.target.value)} />
                            </Field>

                            <Field label="Logo loader (URL) — opcional">
                                <div className="space-y-3">
                                    <Input value={draft.loaderLogoUrl} onChange={(e) => set('loaderLogoUrl', e.target.value)} placeholder="https://..." />
                                    <R2AssetUploadButton folder="branding/loader" onUploaded={(url) => set('loaderLogoUrl', url)} />
                                    <AssetPreview url={draft.loaderLogoUrl} label="Loader Logo" />
                                </div>
                            </Field>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-white border border-slate-200 p-8 space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vista previa branding</div>
                            <div className="border border-slate-200 p-5 flex items-center justify-between bg-white">
                                <div className="inline-flex items-center">
                                    {draft.logoMode === 'image' && draft.logoUrl ? (
                                        <img src={draft.logoUrl} alt={draft.logoAlt || 'Logo'} className="h-10 w-auto object-contain" />
                                    ) : (
                                        <div className="text-2xl font-black tracking-tighter text-slate-900">ALGORITMO<span style={{ color: draft.colorPrimary }}>T</span></div>
                                    )}
                                </div>
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">Header</div>
                            </div>

                            <div className="border border-slate-800 bg-slate-900 p-6 flex items-center justify-between">
                                <div className="inline-flex items-center">
                                    {draft.logoMode === 'image' && (draft.logoFooterUrl || draft.logoUrl) ? (
                                        <img src={draft.logoFooterUrl || draft.logoUrl} alt={draft.logoAlt || 'Logo'} className="h-12 w-auto object-contain" />
                                    ) : (
                                        <div className="text-3xl font-black tracking-tighter text-white">ALGORITMO<span className="text-white/30">T</span></div>
                                    )}
                                </div>
                                <div className="text-xs text-white/30 font-bold uppercase tracking-widest">Footer</div>
                            </div>

                            <div className="border border-slate-200 p-4 bg-slate-50">
                                <div className="text-xs font-bold text-slate-500 mb-2">Favicon (preview)</div>
                                <div className="inline-flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white border border-slate-200 flex items-center justify-center">
                                        {draft.faviconUrl ? (
                                            <img src={draft.faviconUrl} alt="favicon" className="w-5 h-5 object-contain" />
                                        ) : (
                                            <span className="text-xs font-black text-slate-400">ICO</span>
                                        )}
                                    </div>
                                    <span className="text-sm text-slate-600">Browser tab icon</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 p-8 space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vista previa loader</div>
                            <div className="border border-slate-200 overflow-hidden">
                                <div className="p-8 flex flex-col items-center gap-5" style={{ backgroundColor: draft.loaderBackgroundColor }}>
                                    {draft.loaderLogoUrl ? (
                                        <img src={draft.loaderLogoUrl} alt={draft.logoAlt || 'Loader'} className="h-12 w-auto object-contain" />
                                    ) : (
                                        <div className="text-2xl font-black tracking-tighter" style={{ color: draft.loaderTextColor }}>
                                            ALGORITMO<span style={{ color: draft.loaderAccentColor }}>T</span>
                                        </div>
                                    )}
                                    <div className="w-56 h-1.5 bg-white/10 overflow-hidden">
                                        <div className="h-full w-24" style={{ backgroundColor: draft.loaderAccentColor }} />
                                    </div>
                                    <div className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: draft.loaderTextColor }}>
                                        {draft.loaderLabel || 'Cargando experiencia'}
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500">
                                El loader se muestra una vez por sesión en el sitio público cuando está activado.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-8">
                <div>
                    <p className="text-sm text-slate-500 font-light">¿Quieres volver a los estilos originales de AlgoritmoT?</p>
                </div>
                {!confirmReset ? (
                    <button
                        onClick={() => setConfirmReset(true)}
                        className="flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-500 hover:text-red-600 hover:border-red-300 font-black text-[10px] uppercase tracking-widest transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Restaurar Diseño Default
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <span className="text-red-500 font-bold text-sm">¿Confirmar restauración de diseño?</span>
                        <button onClick={handleReset} className="px-5 py-3 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-colors">
                            Sí, restaurar
                        </button>
                        <button onClick={() => setConfirmReset(false)} className="px-5 py-3 border border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:border-slate-400 transition-colors">
                            Cancelar
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
