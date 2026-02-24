import { useState } from 'react'
import { servicesDetail } from '../../data/details'
import { productsDetail } from '../../data/details'
import { Search, CheckCircle, AlertCircle, Edit2, Save, X, ChevronDown } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { siteConfig } from '../../data/config'

type SEOEntry = {
    id: string
    type: 'service' | 'product' | 'page'
    path: string
    label: string
    title: string
    description: string
}

function scoreTitle(title: string) {
    const len = title.length
    if (len >= 50 && len <= 60) return 'optimal'
    if (len >= 40 && len <= 70) return 'ok'
    return 'poor'
}

function scoreDesc(desc: string) {
    const len = desc.length
    if (len >= 140 && len <= 160) return 'optimal'
    if (len >= 100 && len <= 180) return 'ok'
    return 'poor'
}

const scoreLabel = {
    optimal: { label: 'Óptimo', color: 'text-green-600 bg-green-50' },
    ok: { label: 'Aceptable', color: 'text-amber-600 bg-amber-50' },
    poor: { label: 'Mejorar', color: 'text-red-500 bg-red-50' },
}

export function ManageSEO() {
    const initial: SEOEntry[] = [
        {
            id: 'home',
            type: 'page',
            path: '/',
            label: 'Página Principal',
            title: siteConfig.name,
            description: siteConfig.description,
        },
        ...servicesDetail.map(s => ({
            id: s.slug,
            type: 'service' as const,
            path: `/servicios/${s.slug}`,
            label: s.title,
            title: s.seoTitle || s.title,
            description: s.seoDescription || s.subtitle,
        })),
        ...productsDetail.map(p => ({
            id: p.slug,
            type: 'product' as const,
            path: `/productos/${p.slug}`,
            label: p.title,
            title: p.seoTitle || p.title,
            description: p.seoDescription || p.description,
        })),
    ]

    const [entries, setEntries] = useState<SEOEntry[]>(initial)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [draft, setDraft] = useState({ title: '', description: '' })
    const [filter, setFilter] = useState('')

    const startEdit = (entry: SEOEntry) => {
        setEditingId(entry.id)
        setDraft({ title: entry.title, description: entry.description })
    }

    const saveEdit = () => {
        setEntries(prev => prev.map(e => e.id === editingId ? { ...e, ...draft } : e))
        setEditingId(null)
    }

    const visible = entries.filter(e =>
        e.label.toLowerCase().includes(filter.toLowerCase()) ||
        e.path.toLowerCase().includes(filter.toLowerCase())
    )

    const typeLabel: Record<string, string> = {
        page: 'Página', service: 'Servicio', product: 'Producto'
    }

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">SEO Manager</h1>
                    <p className="text-slate-500 font-light">Optimiza los metadatos de cada ruta para mejorar el posicionamiento orgánico.</p>
                </div>
                <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-3 w-72">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                        className="flex-1 outline-none text-sm"
                        placeholder="Buscar página o slug..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Óptimo (50–60 chars título / 140–160 desc)</span>
                <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" /> Aceptable</span>
                <span className="flex items-center gap-2"><X className="w-4 h-4 text-red-400" /> Mejorar</span>
            </div>

            <div className="space-y-4">
                {visible.map(entry => {
                    const tScore = scoreTitle(entry.title)
                    const dScore = scoreDesc(entry.description)
                    const isEditing = editingId === entry.id

                    return (
                        <div key={entry.id} className={`bg-white border transition-all ${isEditing ? 'border-brand-primary shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className="flex items-center justify-between px-8 py-5">
                                <div className="flex items-center gap-6">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1">
                                        {typeLabel[entry.type]}
                                    </span>
                                    <div>
                                        <div className="font-bold text-slate-900 text-sm">{entry.label}</div>
                                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{entry.path}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 ${scoreLabel[tScore].color}`}>
                                        T: {scoreLabel[tScore].label}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 ${scoreLabel[dScore].color}`}>
                                        D: {scoreLabel[dScore].label}
                                    </span>
                                    <button
                                        onClick={() => isEditing ? setEditingId(null) : startEdit(entry)}
                                        className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                                    >
                                        {isEditing ? <ChevronDown className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {isEditing && (
                                <div className="border-t border-slate-100 px-8 py-6 space-y-5 bg-slate-50">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Meta Title
                                            </label>
                                            <span className={`text-[10px] font-black ${draft.title.length > 60 ? 'text-red-500' : draft.title.length >= 50 ? 'text-green-600' : 'text-amber-500'}`}>
                                                {draft.title.length}/60 chars
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            value={draft.title}
                                            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 p-4 font-bold text-slate-900 focus:border-brand-primary outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Meta Description
                                            </label>
                                            <span className={`text-[10px] font-black ${draft.description.length > 160 ? 'text-red-500' : draft.description.length >= 140 ? 'text-green-600' : 'text-amber-500'}`}>
                                                {draft.description.length}/160 chars
                                            </span>
                                        </div>
                                        <textarea
                                            rows={3}
                                            value={draft.description}
                                            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 p-4 text-slate-700 focus:border-brand-primary outline-none resize-none"
                                        />
                                    </div>

                                    {/* Google Preview */}
                                    <div className="bg-white border border-slate-200 p-6">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Vista Previa Google</div>
                                        <div className="text-[11px] text-green-700 font-mono mb-1">algoritmot.com{entry.path}</div>
                                        <div className="text-lg text-blue-800 font-medium mb-1 leading-tight" style={{ fontFamily: 'Arial, sans-serif' }}>
                                            {draft.title || 'Título de la página'}
                                        </div>
                                        <div className="text-sm text-slate-500 leading-relaxed" style={{ fontFamily: 'Arial, sans-serif' }}>
                                            {draft.description.slice(0, 160) || 'Descripción de la página...'}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button onClick={() => setEditingId(null)} className="px-6 py-3 text-slate-500 hover:text-slate-900 text-sm font-bold transition-colors">
                                            Cancelar
                                        </button>
                                        <Button onClick={saveEdit}>
                                            <Save className="w-4 h-4 mr-2" /> Guardar
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
