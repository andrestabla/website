import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Eye, Layout, Link2, Paintbrush, Plus, Search, Sparkles, Trash2, Type } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Field, Input, Textarea } from '../components/ContentModal'
import {
    useCMS,
    type SiteArchitecturePage,
    type SitePageBlock,
    type SitePageBlockType,
    type SitePageCategory,
    type SitePageEditor,
    type SitePageStatus,
} from '../context/CMSContext'

type BuilderTab = 'layout' | 'content' | 'styles'
type BuilderPageRow = SiteArchitecturePage & { source: 'managed' | 'generated'; readOnlyHint?: string }

const CATEGORY_OPTIONS: Array<{ value: SitePageCategory; label: string }> = [
    { value: 'principal', label: 'Principal' },
    { value: 'servicios', label: 'Servicios' },
    { value: 'productos', label: 'Productos' },
    { value: 'protocolos', label: 'Protocolos' },
    { value: 'legal', label: 'Legal' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'custom', label: 'Custom' },
]

const STATUS_OPTIONS: Array<{ value: SitePageStatus; label: string }> = [
    { value: 'published', label: 'Publicado' },
    { value: 'draft', label: 'Borrador' },
]

const EDITOR_OPTIONS: Array<{ value: SitePageEditor; label: string }> = [
    { value: 'home', label: 'Home Workspace' },
    { value: 'services', label: 'Servicios' },
    { value: 'products', label: 'Productos' },
    { value: 'design', label: 'Diseño Global' },
    { value: 'site', label: 'Configuración' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'none', label: 'Sin editor vinculado' },
]

const TEMPLATE_OPTIONS = [
    { value: 'immersive', label: 'Immersive' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'compact', label: 'Compact' },
]

const BLOCK_TYPE_OPTIONS: Array<{ value: SitePageBlockType; label: string }> = [
    { value: 'hero', label: 'Hero' },
    { value: 'text', label: 'Texto' },
    { value: 'feature-list', label: 'Lista de beneficios' },
    { value: 'cta', label: 'CTA' },
    { value: 'contact', label: 'Contacto' },
    { value: 'spacer', label: 'Espaciador' },
]

const EDITOR_ROUTE_BY_KEY: Record<SitePageEditor, string | null> = {
    home: '/admin/home-workspace',
    services: '/admin/services',
    products: '/admin/products',
    design: '/admin/design',
    site: '/admin/settings',
    marketing: '/admin/marketing',
    none: null,
}

function normalizePathInput(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return '/'
    const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    const compact = withSlash.replace(/\s+/g, '-').replace(/\/{2,}/g, '/')
    if (compact === '/') return '/'
    return compact.endsWith('/') ? compact.slice(0, -1) : compact
}

function blockTypeLabel(value: SitePageBlockType) {
    return BLOCK_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function createDefaultBlock(type: SitePageBlockType, order: number, accentColor: string): SitePageBlock {
    const id = `${type}-${order + 1}`
    if (type === 'hero') {
        return {
            id,
            type,
            name: 'Hero principal',
            visible: true,
            order,
            content: {
                eyebrow: 'Bloque inicial',
                title: 'Título principal',
                body: 'Describe la propuesta de valor principal de la página.',
                primaryLabel: 'Contáctanos',
                primaryHref: '/#contacto',
                secondaryLabel: 'Ver más',
                secondaryHref: '/inicio',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
            },
        }
    }
    if (type === 'feature-list') {
        return {
            id,
            type,
            name: 'Beneficios',
            visible: true,
            order,
            content: {
                title: 'Beneficios clave',
                body: 'Resumen corto del valor que entrega este bloque.',
                items: ['Beneficio 1', 'Beneficio 2', 'Beneficio 3'],
            },
            style: {
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '4rem',
                columns: '2',
            },
        }
    }
    if (type === 'cta') {
        return {
            id,
            type,
            name: 'Llamado a la acción',
            visible: true,
            order,
            content: {
                title: '¿Listo para avanzar?',
                body: 'Coordina una conversación con nuestro equipo.',
                primaryLabel: 'Agendar llamada',
                primaryHref: '/#contacto',
            },
            style: {
                backgroundColor: accentColor || '#2563eb',
                textColor: '#ffffff',
                align: 'center',
                paddingY: '3.5rem',
            },
        }
    }
    if (type === 'contact') {
        return {
            id,
            type,
            name: 'Datos de contacto',
            visible: true,
            order,
            content: {
                title: 'Canales directos',
                body: 'Elige el canal más cómodo para tu equipo.',
                email: 'hola@algoritmot.com',
                phone: '+57 300 000 0000',
            },
            style: {
                backgroundColor: '#0f172a',
                textColor: '#ffffff',
                align: 'left',
                paddingY: '3rem',
            },
        }
    }
    if (type === 'spacer') {
        return {
            id,
            type,
            name: 'Espaciador',
            visible: true,
            order,
            content: {},
            style: {
                height: '3rem',
            },
        }
    }
    return {
        id,
        type,
        name: 'Bloque de texto',
        visible: true,
        order,
        content: {
            title: 'Título de sección',
            body: 'Aquí puedes redactar información complementaria para esta página.',
        },
        style: {
            backgroundColor: '#ffffff',
            textColor: '#334155',
            align: 'left',
            paddingY: '3.5rem',
        },
    }
}

function createDefaultBlocksForNewPage(accentColor: string): SitePageBlock[] {
    return [
        createDefaultBlock('hero', 0, accentColor),
        createDefaultBlock('text', 1, accentColor),
        createDefaultBlock('cta', 2, accentColor),
    ]
}

function createNewPage(existing: SiteArchitecturePage[]): SiteArchitecturePage {
    const existingIds = new Set(existing.map((page) => page.id))
    const existingPaths = new Set(existing.map((page) => page.path))
    let idCounter = 1
    let pageId = `custom-page-${idCounter}`
    while (existingIds.has(pageId)) {
        idCounter += 1
        pageId = `custom-page-${idCounter}`
    }
    let pathCounter = 1
    let path = '/nueva-pagina'
    while (existingPaths.has(path)) {
        pathCounter += 1
        path = `/nueva-pagina-${pathCounter}`
    }
    const accentColor = '#2563eb'
    return {
        id: pageId,
        title: 'Nueva página',
        path,
        description: '',
        category: 'custom',
        status: 'draft',
        editor: 'none',
        template: 'balanced',
        navLabel: 'Nueva página',
        showInNavigation: false,
        previewPath: path,
        accentColor,
        notes: '',
        order: existing.length,
        locked: false,
        blocks: createDefaultBlocksForNewPage(accentColor),
    }
}

function TabButton({
    active,
    onClick,
    icon: Icon,
    label,
}: {
    active: boolean
    onClick: () => void
    icon: typeof Layout
    label: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-2 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] transition-colors ${active
                ? 'bg-brand-primary text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    )
}

function BlockVisualPreview({ block, accentColor }: { block: SitePageBlock | null; accentColor: string }) {
    if (!block) {
        return <div className="p-5 text-xs text-slate-500">Selecciona un bloque para previsualizarlo aquí.</div>
    }
    const textColor = block.style.textColor || (block.type === 'cta' || block.type === 'contact' ? '#ffffff' : '#0f172a')
    const backgroundColor = block.style.backgroundColor || (block.type === 'cta' ? accentColor : '#ffffff')

    if (block.type === 'spacer') {
        return (
            <div className="p-5">
                <div className="rounded border border-dashed border-slate-300 bg-slate-50 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500" style={{ height: block.style.height || '3rem', lineHeight: block.style.height || '3rem' }}>
                    Espaciador
                </div>
            </div>
        )
    }

    return (
        <div className="p-5">
            <div className="rounded border border-slate-200 p-5" style={{ backgroundColor, color: textColor }}>
                {block.content.eyebrow && (
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-80">{block.content.eyebrow}</p>
                )}
                {block.content.title && <h4 className="mt-2 text-xl font-black tracking-tight">{block.content.title}</h4>}
                {block.content.body && <p className="mt-3 text-sm leading-relaxed opacity-90">{block.content.body}</p>}

                {block.type === 'feature-list' && Array.isArray(block.content.items) && block.content.items.length > 0 && (
                    <ul className="mt-4 grid gap-2 text-sm">
                        {block.content.items.map((item, index) => (
                            <li key={`${typeof item === 'string' ? item : JSON.stringify(item)}-${index}`}>
                                • {typeof item === 'string' ? item : String(item.label ?? item.title ?? item.value ?? `Item ${index + 1}`)}
                            </li>
                        ))}
                    </ul>
                )}

                {(block.type === 'hero' || block.type === 'cta') && (block.content.primaryLabel || block.content.secondaryLabel) && (
                    <div className="mt-5 flex flex-wrap gap-2">
                        {block.content.primaryLabel && (
                            <span className="inline-flex items-center gap-2 rounded border border-current/30 bg-white/15 px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em]">
                                {block.content.primaryLabel}
                            </span>
                        )}
                        {block.content.secondaryLabel && (
                            <span className="inline-flex items-center gap-2 rounded border border-current/30 bg-transparent px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em]">
                                {block.content.secondaryLabel}
                            </span>
                        )}
                    </div>
                )}

                {block.type === 'contact' && (
                    <div className="mt-5 space-y-1 text-sm">
                        {block.content.email && <p>{block.content.email}</p>}
                        {block.content.phone && <p>{block.content.phone}</p>}
                    </div>
                )}
            </div>
        </div>
    )
}

export function ManageContentBuilder() {
    const {
        state,
        addSiteArchitecturePage,
        updateSiteArchitecturePage,
        deleteSiteArchitecturePage,
        reorderSiteArchitecturePage,
    } = useCMS()

    const [query, setQuery] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<BuilderTab>('layout')
    const [newBlockType, setNewBlockType] = useState<SitePageBlockType>('text')

    const managedPages = state.siteArchitecture.pages

    const generatedPages = useMemo<BuilderPageRow[]>(() => {
        const servicePages = state.services.map((service, index) => ({
            id: `generated-service-${service.slug}`,
            title: `Servicio · ${service.title}`,
            path: `/servicios/${service.slug}`,
            description: service.subtitle || service.description,
            category: 'servicios' as SitePageCategory,
            status: 'published' as SitePageStatus,
            editor: 'services' as SitePageEditor,
            template: state.site.pageTemplateService || 'balanced',
            navLabel: service.title,
            showInNavigation: false,
            previewPath: `/servicios/${service.slug}`,
            accentColor: '#0891b2',
            notes: '',
            order: 200 + index,
            locked: true,
            blocks: [],
            source: 'generated' as const,
            readOnlyHint: 'Se edita desde Catálogo de Servicios.',
        }))
        const productPages = state.products.map((product, index) => ({
            id: `generated-product-${product.slug}`,
            title: `Producto · ${product.title}`,
            path: `/productos/${product.slug}`,
            description: product.description,
            category: 'productos' as SitePageCategory,
            status: 'published' as SitePageStatus,
            editor: 'products' as SitePageEditor,
            template: state.site.pageTemplateProduct || 'balanced',
            navLabel: product.title,
            showInNavigation: false,
            previewPath: `/productos/${product.slug}`,
            accentColor: '#7c3aed',
            notes: '',
            order: 300 + index,
            locked: true,
            blocks: [],
            source: 'generated' as const,
            readOnlyHint: 'Se edita desde Catálogo de Productos.',
        }))
        return [...servicePages, ...productPages]
    }, [state.products, state.services, state.site.pageTemplateProduct, state.site.pageTemplateService])

    const allPages = useMemo<BuilderPageRow[]>(() => {
        const rows = [
            ...managedPages.map((page) => ({ ...page, source: 'managed' as const })),
            ...generatedPages,
        ]
        return rows.sort((a, b) => a.order - b.order)
    }, [generatedPages, managedPages])

    useEffect(() => {
        if (allPages.length === 0) {
            setSelectedId(null)
            return
        }
        if (!selectedId || !allPages.some((page) => page.id === selectedId)) {
            setSelectedId(allPages[0].id)
        }
    }, [allPages, selectedId])

    const selectedPage = useMemo(() => allPages.find((page) => page.id === selectedId) ?? null, [allPages, selectedId])
    const selectedManagedPage = useMemo(
        () => (selectedPage?.source === 'managed' ? managedPages.find((page) => page.id === selectedPage.id) ?? null : null),
        [managedPages, selectedPage]
    )

    useEffect(() => {
        if (!selectedManagedPage || selectedManagedPage.blocks.length === 0) {
            setSelectedBlockId(null)
            return
        }
        if (!selectedBlockId || !selectedManagedPage.blocks.some((block) => block.id === selectedBlockId)) {
            setSelectedBlockId(selectedManagedPage.blocks[0].id)
        }
    }, [selectedManagedPage, selectedBlockId])

    const selectedBlock = useMemo(() => {
        if (!selectedManagedPage || !selectedBlockId) return null
        return selectedManagedPage.blocks.find((block) => block.id === selectedBlockId) ?? null
    }, [selectedManagedPage, selectedBlockId])

    const filteredPages = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase()
        if (!normalizedQuery) return allPages
        return allPages.filter((page) =>
            page.title.toLowerCase().includes(normalizedQuery) ||
            page.path.toLowerCase().includes(normalizedQuery) ||
            page.description.toLowerCase().includes(normalizedQuery)
        )
    }, [allPages, query])

    const groupedPages = useMemo(() => {
        return CATEGORY_OPTIONS.map((category) => ({
            ...category,
            items: filteredPages.filter((page) => page.category === category.value),
        })).filter((group) => group.items.length > 0)
    }, [filteredPages])

    const linkedEditorPath = selectedPage ? EDITOR_ROUTE_BY_KEY[selectedPage.editor] : null

    const pathConflict = useMemo(() => {
        if (!selectedManagedPage) return false
        return managedPages.some((page) => page.id !== selectedManagedPage.id && page.path === selectedManagedPage.path)
    }, [managedPages, selectedManagedPage])

    const updateSelectedPage = (data: Partial<SiteArchitecturePage>) => {
        if (!selectedManagedPage) return
        updateSiteArchitecturePage(selectedManagedPage.id, data)
    }

    const updateSelectedBlocks = (nextBlocks: SitePageBlock[]) => {
        if (!selectedManagedPage) return
        const normalizedBlocks = nextBlocks
            .map((block, index) => ({ ...block, order: index }))
            .sort((a, b) => a.order - b.order)
        updateSelectedPage({ blocks: normalizedBlocks })
    }

    const updateSelectedBlock = (patch: Partial<SitePageBlock>) => {
        if (!selectedManagedPage || !selectedBlock) return
        const nextBlocks = selectedManagedPage.blocks.map((block) =>
            block.id === selectedBlock.id
                ? { ...block, ...patch }
                : block
        )
        updateSelectedBlocks(nextBlocks)
    }

    const updateSelectedBlockContent = (patch: Partial<SitePageBlock['content']>) => {
        if (!selectedBlock) return
        updateSelectedBlock({
            content: {
                ...selectedBlock.content,
                ...patch,
            },
        })
    }

    const updateSelectedBlockStyle = (patch: Partial<SitePageBlock['style']>) => {
        if (!selectedBlock) return
        updateSelectedBlock({
            style: {
                ...selectedBlock.style,
                ...patch,
            },
        })
    }

    const handleCreatePage = () => {
        const page = createNewPage(managedPages)
        addSiteArchitecturePage(page)
        setSelectedId(page.id)
        setSelectedBlockId(page.blocks[0]?.id ?? null)
        setActiveTab('layout')
    }

    const handleDeletePage = () => {
        if (!selectedManagedPage || selectedManagedPage.locked) return
        const confirmed = window.confirm(`¿Eliminar la página "${selectedManagedPage.title}"?`)
        if (!confirmed) return
        deleteSiteArchitecturePage(selectedManagedPage.id)
    }

    const handleAddBlock = () => {
        if (!selectedManagedPage) return
        const nextBlock = createDefaultBlock(newBlockType, selectedManagedPage.blocks.length, selectedManagedPage.accentColor || '#2563eb')
        const uniqueIdBase = nextBlock.id
        let uniqueId = uniqueIdBase
        let suffix = 2
        while (selectedManagedPage.blocks.some((block) => block.id === uniqueId)) {
            uniqueId = `${uniqueIdBase}-${suffix}`
            suffix += 1
        }
        nextBlock.id = uniqueId
        const nextBlocks = [...selectedManagedPage.blocks, nextBlock].map((block, index) => ({ ...block, order: index }))
        updateSelectedBlocks(nextBlocks)
        setSelectedBlockId(uniqueId)
    }

    const handleDeleteBlock = (blockId: string) => {
        if (!selectedManagedPage) return
        if (selectedManagedPage.blocks.length <= 1) return
        const nextBlocks = selectedManagedPage.blocks.filter((block) => block.id !== blockId)
        updateSelectedBlocks(nextBlocks)
    }

    const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
        if (!selectedManagedPage) return
        const blocks = [...selectedManagedPage.blocks].sort((a, b) => a.order - b.order)
        const currentIndex = blocks.findIndex((block) => block.id === blockId)
        if (currentIndex === -1) return
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        if (targetIndex < 0 || targetIndex >= blocks.length) return
        const [moved] = blocks.splice(currentIndex, 1)
        blocks.splice(targetIndex, 0, moved)
        updateSelectedBlocks(blocks)
    }

    const handleChangeBlockType = (nextType: SitePageBlockType) => {
        if (!selectedBlock || !selectedManagedPage) return
        const rebuilt = createDefaultBlock(nextType, selectedBlock.order, selectedManagedPage.accentColor || '#2563eb')
        const nextBlock: SitePageBlock = {
            ...rebuilt,
            id: selectedBlock.id,
            order: selectedBlock.order,
            visible: selectedBlock.visible,
            name: selectedBlock.name || rebuilt.name,
        }
        const nextBlocks = selectedManagedPage.blocks.map((block) => block.id === selectedBlock.id ? nextBlock : block)
        updateSelectedBlocks(nextBlocks)
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-brand-primary">
                        <Sparkles className="h-4 w-4" />
                        Site Builder
                    </p>
                    <h1 className="mt-2 text-3xl font-black tracking-tighter text-slate-900 md:text-4xl">Arquitectura y Editor de Páginas</h1>
                    <p className="mt-2 max-w-3xl text-sm text-slate-500">
                        Gestiona toda la estructura del sitio en un solo lugar: crea páginas, organiza rutas y edita cada página con workspace y preview.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleCreatePage}
                    className="inline-flex items-center justify-center gap-2 border border-brand-primary bg-brand-primary px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4" />
                    Nueva Página
                </button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar página o ruta..."
                            className="w-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-brand-primary focus:bg-white"
                        />
                    </div>

                    <div className="max-h-[72vh] overflow-y-auto pr-1">
                        {groupedPages.map((group) => (
                            <div key={group.value} className="mb-4 last:mb-0">
                                <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{group.label}</p>
                                <div className="space-y-1">
                                    {group.items.map((page) => {
                                        const active = selectedId === page.id
                                        return (
                                            <button
                                                key={page.id}
                                                type="button"
                                                onClick={() => setSelectedId(page.id)}
                                                className={`w-full border px-3 py-3 text-left transition-colors ${active
                                                    ? 'border-brand-primary bg-blue-50'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm font-bold text-slate-900">{page.title}</p>
                                                    <span className={`shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] ${page.source === 'generated'
                                                        ? 'bg-amber-50 text-amber-700'
                                                        : page.status === 'published'
                                                            ? 'bg-green-50 text-green-700'
                                                            : 'bg-slate-100 text-slate-600'
                                                        }`}
                                                    >
                                                        {page.source === 'generated' ? 'Auto' : page.status}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">{page.path}</p>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                        {groupedPages.length === 0 && (
                            <div className="border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">
                                No hay páginas para ese filtro.
                            </div>
                        )}
                    </div>
                </aside>

                <section className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        {!selectedPage ? (
                            <div className="py-10 text-center text-sm text-slate-500">Selecciona una página para comenzar.</div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-primary">
                                            {selectedPage.source === 'generated' ? 'Página generada' : 'Página administrada'}
                                        </p>
                                        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{selectedPage.title}</h2>
                                        <p className="mt-1 text-sm text-slate-500">{selectedPage.path}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedManagedPage && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => reorderSiteArchitecturePage(selectedManagedPage.id, 'up')}
                                                    className="inline-flex items-center gap-1 border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:border-slate-400"
                                                >
                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                    Subir
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => reorderSiteArchitecturePage(selectedManagedPage.id, 'down')}
                                                    className="inline-flex items-center gap-1 border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:border-slate-400"
                                                >
                                                    <ArrowDown className="h-3.5 w-3.5" />
                                                    Bajar
                                                </button>
                                            </>
                                        )}
                                        {selectedManagedPage ? (
                                            <Link
                                                to={`/admin/site-builder/editor/${selectedManagedPage.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 border border-brand-primary bg-brand-primary px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-blue-700"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                Editar página
                                            </Link>
                                        ) : linkedEditorPath ? (
                                            <Link
                                                to={linkedEditorPath}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 border border-brand-primary px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary hover:bg-blue-50"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                Editar página
                                            </Link>
                                        ) : null}
                                        {linkedEditorPath && (
                                            <Link
                                                to={linkedEditorPath}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:border-brand-primary hover:text-brand-primary"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                Abrir editor
                                            </Link>
                                        )}
                                        <a
                                            href={selectedPage.previewPath}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:border-brand-primary hover:text-brand-primary"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            Ver página
                                        </a>
                                        {selectedManagedPage && !selectedManagedPage.locked && (
                                            <button
                                                type="button"
                                                onClick={handleDeletePage}
                                                className="inline-flex items-center gap-1 border border-red-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {selectedPage.source === 'generated' && selectedPage.readOnlyHint && (
                                    <div className="border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                                        {selectedPage.readOnlyHint}
                                    </div>
                                )}

                                <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(370px,40%)]">
                                    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
                                            <TabButton active={activeTab === 'layout'} onClick={() => setActiveTab('layout')} icon={Layout} label="Layout" />
                                            <TabButton active={activeTab === 'content'} onClick={() => setActiveTab('content')} icon={Type} label="Contenido" />
                                            <TabButton active={activeTab === 'styles'} onClick={() => setActiveTab('styles')} icon={Paintbrush} label="Estilos" />
                                        </div>

                                        {activeTab === 'layout' && selectedPage && (
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <Field label="Nombre de página">
                                                    <Input
                                                        value={selectedPage.title}
                                                        onChange={(event) => updateSelectedPage({ title: event.target.value })}
                                                        disabled={!selectedManagedPage}
                                                    />
                                                </Field>
                                                <Field label="Ruta">
                                                    <Input
                                                        value={selectedPage.path}
                                                        onChange={(event) => {
                                                            const nextPath = normalizePathInput(event.target.value)
                                                            updateSelectedPage({ path: nextPath, previewPath: normalizePathInput(selectedPage.previewPath || nextPath) })
                                                        }}
                                                        disabled={!selectedManagedPage || selectedManagedPage.locked}
                                                    />
                                                </Field>
                                                <Field label="Categoría">
                                                    <select
                                                        value={selectedPage.category}
                                                        onChange={(event) => updateSelectedPage({ category: event.target.value as SitePageCategory })}
                                                        disabled={!selectedManagedPage}
                                                        className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary disabled:bg-slate-100"
                                                    >
                                                        {CATEGORY_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                </Field>
                                                <Field label="Estado">
                                                    <select
                                                        value={selectedPage.status}
                                                        onChange={(event) => updateSelectedPage({ status: event.target.value as SitePageStatus })}
                                                        disabled={!selectedManagedPage}
                                                        className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary disabled:bg-slate-100"
                                                    >
                                                        {STATUS_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                </Field>
                                                <Field label="Editor vinculado">
                                                    <select
                                                        value={selectedPage.editor}
                                                        onChange={(event) => updateSelectedPage({ editor: event.target.value as SitePageEditor })}
                                                        disabled={!selectedManagedPage || selectedManagedPage.locked}
                                                        className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary disabled:bg-slate-100"
                                                    >
                                                        {EDITOR_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                </Field>
                                                <Field label="Template visual">
                                                    <select
                                                        value={selectedPage.template}
                                                        onChange={(event) => updateSelectedPage({ template: event.target.value })}
                                                        disabled={!selectedManagedPage}
                                                        className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary disabled:bg-slate-100"
                                                    >
                                                        {TEMPLATE_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                </Field>
                                                <Field label="Label en navegación">
                                                    <Input
                                                        value={selectedPage.navLabel}
                                                        onChange={(event) => updateSelectedPage({ navLabel: event.target.value })}
                                                        disabled={!selectedManagedPage}
                                                    />
                                                </Field>
                                                <Field label="Mostrar en navegación">
                                                    <select
                                                        value={selectedPage.showInNavigation ? 'true' : 'false'}
                                                        onChange={(event) => updateSelectedPage({ showInNavigation: event.target.value === 'true' })}
                                                        disabled={!selectedManagedPage}
                                                        className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary disabled:bg-slate-100"
                                                    >
                                                        <option value="true">Sí</option>
                                                        <option value="false">No</option>
                                                    </select>
                                                </Field>
                                                {pathConflict && (
                                                    <div className="md:col-span-2 border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                                                        Ya existe otra página con esa ruta. Ajusta el path para evitar colisiones.
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {(activeTab === 'content' || activeTab === 'styles') && selectedManagedPage && (
                                            <div className="space-y-4">
                                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Bloques de la página</p>
                                                        <div className="ml-auto flex items-center gap-2">
                                                            <select
                                                                value={newBlockType}
                                                                onChange={(event) => setNewBlockType(event.target.value as SitePageBlockType)}
                                                                className="border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none"
                                                            >
                                                                {BLOCK_TYPE_OPTIONS.map((option) => (
                                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                type="button"
                                                                onClick={handleAddBlock}
                                                                className="inline-flex items-center gap-1 border border-brand-primary bg-brand-primary px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white"
                                                            >
                                                                <Plus className="h-3.5 w-3.5" />
                                                                Agregar
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 space-y-2">
                                                        {selectedManagedPage.blocks.map((block) => {
                                                            const active = selectedBlockId === block.id
                                                            return (
                                                                <button
                                                                    key={block.id}
                                                                    type="button"
                                                                    onClick={() => setSelectedBlockId(block.id)}
                                                                    className={`w-full border px-3 py-2 text-left transition-colors ${active
                                                                        ? 'border-brand-primary bg-blue-50'
                                                                        : 'border-slate-200 bg-white hover:bg-slate-50'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="text-xs font-bold text-slate-800">{block.name}</span>
                                                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{blockTypeLabel(block.type)}</span>
                                                                    </div>
                                                                    <div className="mt-1 flex items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(event) => {
                                                                                event.stopPropagation()
                                                                                handleMoveBlock(block.id, 'up')
                                                                            }}
                                                                            className="border border-slate-200 p-1 text-slate-500 hover:text-slate-700"
                                                                        >
                                                                            <ArrowUp className="h-3.5 w-3.5" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(event) => {
                                                                                event.stopPropagation()
                                                                                handleMoveBlock(block.id, 'down')
                                                                            }}
                                                                            className="border border-slate-200 p-1 text-slate-500 hover:text-slate-700"
                                                                        >
                                                                            <ArrowDown className="h-3.5 w-3.5" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(event) => {
                                                                                event.stopPropagation()
                                                                                handleDeleteBlock(block.id)
                                                                            }}
                                                                            disabled={selectedManagedPage.blocks.length <= 1}
                                                                            className="border border-red-200 p-1 text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>

                                                {!selectedBlock ? (
                                                    <div className="rounded border border-dashed border-slate-300 bg-white p-5 text-center text-xs text-slate-500">
                                                        Selecciona un bloque para editar.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="grid gap-4 md:grid-cols-2">
                                                            <Field label="Nombre del bloque">
                                                                <Input
                                                                    value={selectedBlock.name}
                                                                    onChange={(event) => updateSelectedBlock({ name: event.target.value })}
                                                                />
                                                            </Field>
                                                            <Field label="Tipo de bloque">
                                                                <select
                                                                    value={selectedBlock.type}
                                                                    onChange={(event) => handleChangeBlockType(event.target.value as SitePageBlockType)}
                                                                    className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary"
                                                                >
                                                                    {BLOCK_TYPE_OPTIONS.map((option) => (
                                                                        <option key={option.value} value={option.value}>{option.label}</option>
                                                                    ))}
                                                                </select>
                                                            </Field>
                                                        </div>

                                                        <Field label="Visible en página">
                                                            <select
                                                                value={selectedBlock.visible ? 'true' : 'false'}
                                                                onChange={(event) => updateSelectedBlock({ visible: event.target.value === 'true' })}
                                                                className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary"
                                                            >
                                                                <option value="true">Sí</option>
                                                                <option value="false">No</option>
                                                            </select>
                                                        </Field>

                                                        {activeTab === 'content' && (
                                                            <div className="space-y-4">
                                                                <div className="grid gap-4 md:grid-cols-2">
                                                                    <Field label="Eyebrow">
                                                                        <Input
                                                                            value={selectedBlock.content.eyebrow ?? ''}
                                                                            onChange={(event) => updateSelectedBlockContent({ eyebrow: event.target.value })}
                                                                        />
                                                                    </Field>
                                                                    <Field label="Título">
                                                                        <Input
                                                                            value={selectedBlock.content.title ?? ''}
                                                                            onChange={(event) => updateSelectedBlockContent({ title: event.target.value })}
                                                                        />
                                                                    </Field>
                                                                </div>
                                                                <Field label="Texto / descripción">
                                                                    <Textarea
                                                                        rows={3}
                                                                        value={selectedBlock.content.body ?? ''}
                                                                        onChange={(event) => updateSelectedBlockContent({ body: event.target.value })}
                                                                    />
                                                                </Field>

                                                                {(selectedBlock.type === 'hero' || selectedBlock.type === 'cta') && (
                                                                    <div className="grid gap-4 md:grid-cols-2">
                                                                        <Field label="Texto botón principal">
                                                                            <Input
                                                                                value={selectedBlock.content.primaryLabel ?? ''}
                                                                                onChange={(event) => updateSelectedBlockContent({ primaryLabel: event.target.value })}
                                                                            />
                                                                        </Field>
                                                                        <Field label="URL botón principal">
                                                                            <Input
                                                                                value={selectedBlock.content.primaryHref ?? ''}
                                                                                onChange={(event) => updateSelectedBlockContent({ primaryHref: normalizePathInput(event.target.value) })}
                                                                            />
                                                                        </Field>
                                                                        <Field label="Texto botón secundario">
                                                                            <Input
                                                                                value={selectedBlock.content.secondaryLabel ?? ''}
                                                                                onChange={(event) => updateSelectedBlockContent({ secondaryLabel: event.target.value })}
                                                                            />
                                                                        </Field>
                                                                        <Field label="URL botón secundario">
                                                                            <Input
                                                                                value={selectedBlock.content.secondaryHref ?? ''}
                                                                                onChange={(event) => updateSelectedBlockContent({ secondaryHref: normalizePathInput(event.target.value) })}
                                                                            />
                                                                        </Field>
                                                                    </div>
                                                                )}

                                                                {selectedBlock.type === 'feature-list' && (
                                                                    <Field label="Lista de items (uno por línea)">
                                                                        <Textarea
                                                                            rows={5}
                                                                            value={(selectedBlock.content.items ?? []).join('\n')}
                                                                            onChange={(event) => {
                                                                                const items = event.target.value
                                                                                    .split('\n')
                                                                                    .map((item) => item.trim())
                                                                                    .filter(Boolean)
                                                                                updateSelectedBlockContent({ items })
                                                                            }}
                                                                        />
                                                                    </Field>
                                                                )}

                                                                {selectedBlock.type === 'contact' && (
                                                                    <div className="grid gap-4 md:grid-cols-2">
                                                                        <Field label="Email">
                                                                            <Input
                                                                                value={selectedBlock.content.email ?? ''}
                                                                                onChange={(event) => updateSelectedBlockContent({ email: event.target.value })}
                                                                            />
                                                                        </Field>
                                                                        <Field label="Teléfono">
                                                                            <Input
                                                                                value={selectedBlock.content.phone ?? ''}
                                                                                onChange={(event) => updateSelectedBlockContent({ phone: event.target.value })}
                                                                            />
                                                                        </Field>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {activeTab === 'styles' && (
                                                            <div className="space-y-4">
                                                                <div className="grid gap-4 md:grid-cols-2">
                                                                    <Field label="Color de fondo">
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="color"
                                                                                value={selectedBlock.style.backgroundColor || '#ffffff'}
                                                                                onChange={(event) => updateSelectedBlockStyle({ backgroundColor: event.target.value })}
                                                                                className="h-11 w-14 border border-slate-200 bg-white p-1"
                                                                            />
                                                                            <Input
                                                                                value={selectedBlock.style.backgroundColor ?? ''}
                                                                                onChange={(event) => updateSelectedBlockStyle({ backgroundColor: event.target.value })}
                                                                            />
                                                                        </div>
                                                                    </Field>
                                                                    <Field label="Color de texto">
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="color"
                                                                                value={selectedBlock.style.textColor || '#0f172a'}
                                                                                onChange={(event) => updateSelectedBlockStyle({ textColor: event.target.value })}
                                                                                className="h-11 w-14 border border-slate-200 bg-white p-1"
                                                                            />
                                                                            <Input
                                                                                value={selectedBlock.style.textColor ?? ''}
                                                                                onChange={(event) => updateSelectedBlockStyle({ textColor: event.target.value })}
                                                                            />
                                                                        </div>
                                                                    </Field>
                                                                    <Field label="Alineación">
                                                                        <select
                                                                            value={selectedBlock.style.align || 'left'}
                                                                            onChange={(event) => updateSelectedBlockStyle({ align: event.target.value as 'left' | 'center' })}
                                                                            className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary"
                                                                        >
                                                                            <option value="left">Izquierda</option>
                                                                            <option value="center">Centro</option>
                                                                        </select>
                                                                    </Field>
                                                                    <Field label="Padding vertical (ej: 4rem)">
                                                                        <Input
                                                                            value={selectedBlock.style.paddingY ?? ''}
                                                                            onChange={(event) => updateSelectedBlockStyle({ paddingY: event.target.value })}
                                                                        />
                                                                    </Field>
                                                                </div>
                                                                {selectedBlock.type === 'feature-list' && (
                                                                    <Field label="Columnas (1,2,3)">
                                                                        <Input
                                                                            value={selectedBlock.style.columns ?? ''}
                                                                            onChange={(event) => updateSelectedBlockStyle({ columns: event.target.value })}
                                                                        />
                                                                    </Field>
                                                                )}
                                                                {selectedBlock.type === 'spacer' && (
                                                                    <Field label="Altura (ej: 2rem)">
                                                                        <Input
                                                                            value={selectedBlock.style.height ?? ''}
                                                                            onChange={(event) => updateSelectedBlockStyle({ height: event.target.value })}
                                                                        />
                                                                    </Field>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {(activeTab === 'content' || activeTab === 'styles') && !selectedManagedPage && (
                                            <div className="rounded border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                                                Esta página se genera desde otro módulo. Usa el botón <strong>Abrir editor</strong> para modificar su contenido.
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white">
                                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                <Link2 className="h-4 w-4" />
                                                Preview en vivo
                                            </p>
                                            <a
                                                href={selectedPage?.previewPath || '/'}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary hover:text-blue-800"
                                            >
                                                Abrir completo
                                            </a>
                                        </div>
                                        <div className="border-b border-slate-100">
                                            <div className="px-4 pt-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Preview del bloque activo</div>
                                            <BlockVisualPreview block={selectedBlock} accentColor={selectedPage?.accentColor || '#2563eb'} />
                                        </div>
                                        <div className="h-[420px] w-full overflow-hidden bg-slate-100">
                                            {selectedPage ? (
                                                <iframe
                                                    key={selectedPage.previewPath}
                                                    src={selectedPage.previewPath}
                                                    title={`Preview ${selectedPage.title}`}
                                                    className="h-full w-full border-0 bg-white"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-sm text-slate-500">Sin página seleccionada</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
