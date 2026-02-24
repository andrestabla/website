import { useState } from 'react'
import { Eye, Edit2, Plus, Trash2 } from 'lucide-react'
import { useCMS, type ProductItem } from '../context/CMSContext'
import { ContentModal, ConfirmDelete, Field, Input, Textarea } from '../components/ContentModal'

const emptyProduct = (): ProductItem => ({
    slug: '',
    title: '',
    highlight: '',
    description: '',
    descriptionLong: '',
    price: '',
    ctaText: 'Solicitar información',
    seoTitle: '',
    seoDescription: '',
})

export function ManageProducts() {
    const { state, updateProduct, addProduct, deleteProduct } = useCMS()
    const products = state.products

    const [editTarget, setEditTarget] = useState<ProductItem | null>(null)
    const [isNew, setIsNew] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null)
    const [draft, setDraft] = useState<ProductItem | null>(null)
    const [saved, setSaved] = useState<string | null>(null)

    const openEdit = (p: ProductItem) => {
        setIsNew(false)
        setDraft({ ...p })
        setEditTarget(p)
    }

    const openNew = () => {
        const blank = emptyProduct()
        setIsNew(true)
        setDraft(blank)
        setEditTarget(blank)
    }

    const handleSave = () => {
        if (!draft) return
        if (isNew) {
            if (!draft.slug || !draft.title) return
            addProduct(draft)
        } else {
            updateProduct(draft.slug, draft)
        }
        setSaved(draft.title)
        setEditTarget(null)
        setDraft(null)
        setTimeout(() => setSaved(null), 3000)
    }

    const handleDelete = () => {
        if (!deleteTarget) return
        deleteProduct(deleteTarget.slug)
        setDeleteTarget(null)
    }

    const setDraftField = <K extends keyof ProductItem>(key: K, value: ProductItem[K]) => {
        setDraft(d => d ? { ...d, [key]: value } : d)
    }

    return (
        <div className="space-y-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Inventario de Productos</h1>
                    <p className="text-slate-500 font-light">Gestiona los paquetes y soluciones tecnológicas de AlgoritmoT.</p>
                </div>
                <button
                    onClick={openNew}
                    className="flex items-center gap-2 px-6 py-4 bg-brand-primary text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-800 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Producto
                </button>
            </div>

            {saved && (
                <div className="bg-green-50 border border-green-200 px-6 py-4 text-green-800 font-bold text-sm">
                    ✓ "{saved}" guardado correctamente
                </div>
            )}

            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <tr>
                            <th className="px-8 py-6">Slug</th>
                            <th className="px-8 py-6">Producto</th>
                            <th className="px-8 py-6">Inversión</th>
                            <th className="px-8 py-6 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {products.map(product => (
                            <tr key={product.slug} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-8 py-6">
                                    <span className="text-xs font-mono bg-slate-100 px-3 py-1 text-slate-600">{product.slug}</span>
                                </td>
                                <td className="px-8 py-6">
                                    <div>
                                        <div className="font-bold text-slate-900">{product.title}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{product.highlight}</div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="text-sm font-bold text-brand-primary">{product.price}</span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <a
                                            href={`/productos/${product.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-slate-400 hover:text-brand-primary transition-colors"
                                            title="Ver en sitio"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </a>
                                        <button
                                            onClick={() => openEdit(product)}
                                            className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(product)}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
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

            {/* Edit Modal */}
            <ContentModal
                isOpen={!!editTarget}
                onClose={() => { setEditTarget(null); setDraft(null) }}
                title={isNew ? 'Nuevo Producto' : `Editar: ${editTarget?.title}`}
                subtitle="Todos los cambios se guardan en el CMS."
                onSave={handleSave}
                saveLabel={isNew ? 'Crear Producto' : 'Guardar Cambios'}
            >
                {draft && (
                    <div className="space-y-6">
                        {isNew && (
                            <Field label="Slug" hint="Solo letras minúsculas y guiones.">
                                <Input
                                    value={draft.slug}
                                    onChange={e => setDraftField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                                    placeholder="mi-producto"
                                />
                            </Field>
                        )}
                        <Field label="Nombre del Producto">
                            <Input value={draft.title} onChange={e => setDraftField('title', e.target.value)} />
                        </Field>
                        <Field label="Etiqueta">
                            <Input value={draft.highlight} onChange={e => setDraftField('highlight', e.target.value)} />
                        </Field>
                        <Field label="Descripción corta">
                            <Textarea rows={2} value={draft.description} onChange={e => setDraftField('description', e.target.value)} />
                        </Field>
                        <Field label="Descripción larga">
                            <Textarea rows={5} value={draft.descriptionLong} onChange={e => setDraftField('descriptionLong', e.target.value)} />
                        </Field>
                        <Field label="Precio / Modelo">
                            <Input value={draft.price} onChange={e => setDraftField('price', e.target.value)} />
                        </Field>
                        <Field label="Texto del CTA">
                            <Input value={draft.ctaText} onChange={e => setDraftField('ctaText', e.target.value)} />
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

            <ConfirmDelete
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                itemName={deleteTarget?.title ?? ''}
            />
        </div>
    )
}
