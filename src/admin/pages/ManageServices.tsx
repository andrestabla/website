import { useState } from 'react'
import { Eye, Edit2, Plus, Trash2 } from 'lucide-react'
import { useCMS, type ServiceItem } from '../context/CMSContext'
import { ContentModal, ConfirmDelete, Field, Input, Textarea } from '../components/ContentModal'

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
})

export function ManageServices() {
    const { state, updateService, addService, deleteService } = useCMS()
    const services = state.services

    const [editTarget, setEditTarget] = useState<ServiceItem | null>(null)
    const [isNew, setIsNew] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null)
    const [draft, setDraft] = useState<ServiceItem | null>(null)
    const [saved, setSaved] = useState<string | null>(null)

    const openEdit = (s: ServiceItem) => {
        setIsNew(false)
        setDraft({ ...s, features: [...s.features] })
        setEditTarget(s)
    }

    const openNew = () => {
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
            >
                {draft && (
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
                        <div className="border-t border-slate-100 pt-6 space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">SEO</div>
                            <Field label="SEO Title">
                                <Input value={draft.seoTitle} onChange={e => setDraftField('seoTitle', e.target.value)} />
                            </Field>
                            <Field label="SEO Description">
                                <Textarea rows={2} value={draft.seoDescription} onChange={e => setDraftField('seoDescription', e.target.value)} />
                            </Field>
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
