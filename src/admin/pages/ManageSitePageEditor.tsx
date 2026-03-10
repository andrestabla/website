import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronUp, Eye, EyeOff, ExternalLink, Layers, Plus, Save, Settings2, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { DynamicPageRenderer } from '../../components/page-builder/DynamicPageRenderer'

type SidebarMode = 'insert' | 'layers' | 'design'
type BlockTab = 'layout' | 'content' | 'styles' | 'advanced'

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

const BLOCK_TYPE_LABEL: Record<SitePageBlockType, string> = {
    hero: 'Portada (Hero)',
    text: 'Texto',
    richtext: 'Texto enriquecido',
    'feature-list': 'Lista de beneficios',
    cta: 'Llamado a la acción',
    contact: 'Contacto',
    spacer: 'Espaciador',
    heading: 'Encabezado',
    button: 'Botón',
    image: 'Imagen',
    video: 'Video',
    embed: 'Embed URL',
    divider: 'Divisor',
    form: 'Formulario',
    social: 'Redes sociales',
    tabs: 'Pestañas',
    toggle: 'Toggle',
    gallery: 'Galería',
    counter: 'Contador',
    lottie: 'Lottie',
    accordion: 'Acordeón',
    carousel: 'Carrusel',
    map: 'Google Maps',
    testimonial: 'Testimonio',
    progress: 'Progress bars',
    progressbar: 'Progress bars (legacy)',
    grid: 'Cuadrícula',
    timeline: 'Línea de tiempo',
    bento: 'Bento Grid',
    loopgrid: 'Posts dinámicos',
    portfolio: 'Portafolio',
    pricing: 'Precios',
    flipbox: 'Flip Boxes',
    hotspots: 'Hotspots',
    navmenu: 'Nav Menu',
    icon: 'Ícono',
    stats: 'Stats',
    'navigation-selector': 'Selector de Navegación',
}

const INSERT_GROUPS: Array<{ label: string; items: SitePageBlockType[] }> = [
    { label: 'Estructura', items: ['hero', 'grid', 'bento', 'timeline'] },
    { label: 'Básicos', items: ['heading', 'text', 'richtext', 'button', 'image', 'video', 'embed', 'divider', 'spacer'] },
    { label: 'Avanzados', items: ['progress', 'form', 'testimonial', 'social', 'map', 'tabs', 'toggle', 'gallery', 'counter', 'lottie', 'accordion', 'carousel'] },
    { label: 'Profesionales', items: ['loopgrid', 'portfolio', 'pricing', 'flipbox', 'hotspots', 'cta', 'navmenu', 'feature-list', 'icon', 'stats'] },
]

function normalizePathInput(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return '/'
    const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    const compact = withSlash.replace(/\s+/g, '-').replace(/\/{2,}/g, '/')
    if (compact === '/') return '/'
    return compact.endsWith('/') ? compact.slice(0, -1) : compact
}

function normalizeLinkInput(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('#') || trimmed.startsWith('/#')) return trimmed
    if (/^(mailto:|tel:)/i.test(trimmed)) return trimmed
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    if (/^\/https?:\/\//i.test(trimmed)) return trimmed.replace(/^\/(https?:\/\/)/i, '$1')
    if (/^\/https?:\//i.test(trimmed)) return trimmed.replace(/^\/https?:\//i, (match) => (match.includes('https') ? 'https://' : 'http://'))
    if (/^https?:\/[^/]/i.test(trimmed)) return trimmed.replace(/^https?:\//i, (match) => (match.toLowerCase().startsWith('https') ? 'https://' : 'http://'))
    return normalizePathInput(trimmed)
}

function createDefaultBlockByType(type: SitePageBlockType, order: number, accentColor: string): SitePageBlock {
    const id = `${type}-${order + 1}`

    if (type === 'hero') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                eyebrow: 'Bloque principal',
                title: 'Título principal',
                subtitle: 'Subtítulo que refuerza la promesa de valor.',
                body: 'Explica en lenguaje simple qué haces y para quién.',
                primaryLabel: 'Iniciar transformación',
                primaryHref: '/#contacto',
                secondaryLabel: 'Ver servicios',
                secondaryHref: '/landing-servicios',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '5rem',
            },
        }
    }

    if (type === 'grid' || type === 'bento') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: type === 'grid' ? 'Cuadrícula de valor' : 'Bento de capacidades',
                body: 'Organiza aquí tarjetas con mensajes clave.',
                items: [
                    { title: 'Elemento 1', body: 'Descripción breve.' },
                    { title: 'Elemento 2', body: 'Descripción breve.' },
                    { title: 'Elemento 3', body: 'Descripción breve.' },
                ],
            },
            style: {
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
                align: 'left',
                columns: '3',
                paddingY: '4rem',
            },
        }
    }

    if (type === 'timeline') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                eyebrow: 'Cómo trabajamos',
                title: 'Línea de tiempo',
                items: [
                    { title: 'Fase 1', body: 'Diagnóstico inicial.' },
                    { title: 'Fase 2', body: 'Implementación controlada.' },
                    { title: 'Fase 3', body: 'Escalamiento.' },
                ],
                badges: ['Rapidez', 'Acompañamiento', 'Control'],
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '4rem',
            },
        }
    }

    if (type === 'navigation-selector') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                corporateTitle: 'SOLUCIONES PARA EMPRESA',
                corporateDescription: 'Optimización operativa, automatización de procesos y despliegue estratégico de IA.',
                corporateCta: 'INGRESAR',
                educationTitle: 'SOLUCIONES EDUCATIVAS',
                educationDescription: 'Transformación digital para instituciones, colegios y centros de formación técnica.',
                educationCta: 'INGRESAR',
                logoText: 'ALGORITMOT'
            },
            style: {
                backgroundColor: '#0f172a',
                paddingY: '0',
            },
        }
    }

    if (type === 'stats' || type === 'progress') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: type === 'stats' ? 'Indicadores' : 'Progreso',
                items: [
                    { label: 'Indicador 1', value: 85 },
                    { label: 'Indicador 2', value: 72 },
                    { label: 'Indicador 3', value: 93 },
                ],
            },
            style: {
                backgroundColor: '#0f172a',
                textColor: '#ffffff',
                align: 'left',
                paddingY: '3.5rem',
            },
        }
    }

    if (type === 'heading') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Encabezado de sección',
                tag: 'h2',
                subtitle: 'Texto complementario del encabezado.',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '2.5rem',
            },
        }
    }

    if (type === 'button') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                label: 'Agendar sesión',
                href: '/#contacto',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#2563eb',
                align: 'left',
                paddingY: '2.5rem',
            },
        }
    }

    if (type === 'image') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Imagen destacada',
                imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1400&auto=format&fit=crop',
                imageAlt: 'Equipo en sesión de trabajo',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'center',
                paddingY: '3rem',
                radius: '1rem',
            },
        }
    }

    if (type === 'video') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Video',
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'center',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'embed') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Embed',
                embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'center',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'divider') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Divisor',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#cbd5e1',
                align: 'left',
                paddingY: '1.25rem',
            },
        }
    }

    if (type === 'spacer') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {},
            style: {
                height: '3rem',
            },
        }
    }

    if (type === 'cta') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: '¿Listo para empezar?',
                body: 'Agenda una sesión para diseñar la siguiente fase.',
                primaryLabel: 'Hablar con un asesor',
                primaryHref: 'https://wa.me/573044544525',
            },
            style: {
                backgroundColor: accentColor,
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
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Canales de contacto',
                body: 'Responde en el canal más conveniente.',
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

    if (type === 'form') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Formulario',
                body: 'Describe para qué sirve este formulario.',
                submitLabel: 'Enviar',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'social') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Redes sociales',
                items: [
                    { label: 'LinkedIn', url: 'https://linkedin.com' },
                    { label: 'Website', url: 'https://algoritmot.com' },
                ],
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'tabs') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Pestañas',
                items: [
                    { label: 'Paso 1', body: 'Definición de objetivos.' },
                    { label: 'Paso 2', body: 'Implementación y pruebas.' },
                    { label: 'Paso 3', body: 'Escalado y adopción.' },
                ],
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'map') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Ubicación',
                embedUrl: 'https://maps.google.com/maps?q=Bogota&t=&z=13&ie=UTF8&iwloc=&output=embed',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'center',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'testimonial') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Testimonio',
                body: 'El equipo logró estructurar su transformación en semanas.',
                author: 'Nombre Cliente',
                role: 'Gerencia General',
            },
            style: {
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'icon') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                icon: '⚡',
                title: 'Bloque con ícono',
                body: 'Usa íconos para reforzar mensajes cortos.',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'richtext') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Texto enriquecido',
                html: '<p>Contenido <strong>enriquecido</strong> del bloque.</p>',
                body: 'Puedes complementar con texto plano.',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'toggle' || type === 'accordion') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: type === 'toggle' ? 'Bloque Toggle' : 'Preguntas frecuentes',
                items: [
                    { label: 'Pregunta 1', body: 'Respuesta 1' },
                    { label: 'Pregunta 2', body: 'Respuesta 2' },
                    { label: 'Pregunta 3', body: 'Respuesta 3' },
                ],
            },
            style: {
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'gallery' || type === 'carousel') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: type === 'gallery' ? 'Galería' : 'Carrusel',
                items: [
                    { title: 'Imagen 1', body: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop' },
                    { title: 'Imagen 2', body: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?q=80&w=1200&auto=format&fit=crop' },
                    { title: 'Imagen 3', body: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=1200&auto=format&fit=crop' },
                ],
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                columns: type === 'gallery' ? '3' : '1',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'counter' || type === 'progressbar') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: type === 'counter' ? 'Contadores' : 'Progress bars',
                items: [
                    { label: 'Métrica 1', value: 75 },
                    { label: 'Métrica 2', value: 86 },
                    { label: 'Métrica 3', value: 92 },
                ],
            },
            style: {
                backgroundColor: '#0f172a',
                textColor: '#ffffff',
                align: 'left',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'lottie') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Lottie',
                jsonUrl: 'https://assets3.lottiefiles.com/packages/lf20_UJNc2t.json',
                body: 'Animación JSON externa.',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'center',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'loopgrid' || type === 'portfolio' || type === 'hotspots') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: type === 'loopgrid' ? 'Posts dinámicos' : type === 'portfolio' ? 'Portafolio' : 'Hotspots',
                items: [
                    { title: 'Elemento 1', body: 'Descripción del elemento 1.' },
                    { title: 'Elemento 2', body: 'Descripción del elemento 2.' },
                    { title: 'Elemento 3', body: 'Descripción del elemento 3.' },
                ],
            },
            style: {
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
                align: 'left',
                columns: '3',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'pricing') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Plan estratégico',
                price: '$99',
                period: '/mes',
                items: ['Diagnóstico inicial', 'Roadmap de implementación', 'Acompañamiento ejecutivo'],
                primaryLabel: 'Comenzar',
                primaryHref: '/#contacto',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'center',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'flipbox') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Flip Box',
                frontTitle: 'Frente',
                backTitle: 'Reverso',
                body: 'Contenido del frente',
                backBody: 'Contenido del reverso',
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'center',
                paddingY: '3rem',
            },
        }
    }

    if (type === 'navmenu') {
        return {
            id,
            type,
            name: BLOCK_TYPE_LABEL[type],
            visible: true,
            order,
            content: {
                title: 'Menú de navegación',
                items: [
                    { label: 'Inicio', body: '/' },
                    { label: 'Servicios', body: '/landing-servicios' },
                    { label: 'Contacto', body: '/#contacto' },
                ],
            },
            style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                align: 'left',
                paddingY: '2rem',
            },
        }
    }

    return {
        id,
        type: 'text',
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

function parseItemsLines(value: string, mode: 'single' | 'pair' | 'metric') {
    return value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            if (mode === 'single') return line
            const [left, right] = line.split('|').map((part) => part.trim())
            if (mode === 'metric') {
                return {
                    label: left || 'Item',
                    value: Number(right || '0') || 0,
                }
            }
            return {
                label: left || 'Item',
                body: right || '',
                title: left || 'Item',
                url: right || '',
            }
        })
}

function itemsToLines(items: unknown, mode: 'single' | 'pair' | 'metric') {
    if (!Array.isArray(items)) return ''
    return items
        .map((item) => {
            if (mode === 'single') {
                if (typeof item === 'string') return item
                if (item && typeof item === 'object') {
                    const objectItem = item as Record<string, unknown>
                    return String(objectItem.label ?? objectItem.title ?? objectItem.value ?? '')
                }
                return ''
            }
            if (!item || typeof item !== 'object') return ''
            const objectItem = item as Record<string, unknown>
            if (mode === 'metric') {
                const label = String(objectItem.label ?? objectItem.title ?? 'Item')
                const value = String(objectItem.value ?? '0')
                return `${label}|${value}`
            }
            const left = String(objectItem.label ?? objectItem.title ?? 'Item')
            const right = String(objectItem.body ?? objectItem.content ?? objectItem.url ?? '')
            return `${left}|${right}`
        })
        .filter(Boolean)
        .join('\n')
}

export function ManageSitePageEditor() {
    const { pageId } = useParams<{ pageId: string }>()
    const navigate = useNavigate()
    const { state, persistence, updateSiteArchitecturePage } = useCMS()

    const selectedPage = useMemo(
        () => state.siteArchitecture.pages.find((page) => page.id === pageId) ?? null,
        [pageId, state.siteArchitecture.pages]
    )

    const [sidebarMode, setSidebarMode] = useState<SidebarMode>('insert')
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
    const [blockTab, setBlockTab] = useState<BlockTab>('content')
    const [jsonContentDraft, setJsonContentDraft] = useState('')
    const [jsonStyleDraft, setJsonStyleDraft] = useState('')
    const [advancedError, setAdvancedError] = useState('')
    const [contentJsonError, setContentJsonError] = useState('')
    const [jsonItemsDraft, setJsonItemsDraft] = useState('')
    const [itemsJsonError, setItemsJsonError] = useState('')
    const [jsonBadgesDraft, setJsonBadgesDraft] = useState('')
    const [badgesJsonError, setBadgesJsonError] = useState('')
    const [savePulse, setSavePulse] = useState<'idle' | 'saved'>('idle')
    const [publishModalOpen, setPublishModalOpen] = useState(false)
    const [blockSearch, setBlockSearch] = useState('')
    const canvasScrollRef = useRef<HTMLDivElement | null>(null)
    const sidebarScrollRef = useRef<HTMLDivElement | null>(null)

    const sortedBlocks = selectedPage ? [...selectedPage.blocks].sort((a, b) => a.order - b.order) : []
    const effectiveSelectedBlockId = useMemo(() => {
        if (!selectedPage || !selectedBlockId) return null
        if (selectedPage.blocks.some((block) => block.id === selectedBlockId)) return selectedBlockId
        return selectedPage.blocks[0]?.id ?? null
    }, [selectedPage, selectedBlockId])
    const selectedBlock = useMemo(() => {
        if (!selectedPage || !effectiveSelectedBlockId) return null
        return selectedPage.blocks.find((block) => block.id === effectiveSelectedBlockId) ?? null
    }, [selectedPage, effectiveSelectedBlockId])
    const normalizedBlockQuery = blockSearch.trim().toLowerCase()
    const filteredLayerBlocks = normalizedBlockQuery.length > 0
        ? sortedBlocks.filter((block) => {
            const text = `${block.name} ${block.id} ${BLOCK_TYPE_LABEL[block.type]} ${block.type}`.toLowerCase()
            return text.includes(normalizedBlockQuery)
        })
        : sortedBlocks
    const renderPublishedAsIframe = selectedPage?.path.includes(':') ?? false

    const hydrateJsonDrafts = (block: SitePageBlock | null) => {
        if (!block) {
            setJsonContentDraft('')
            setJsonStyleDraft('')
            setJsonItemsDraft('')
            setJsonBadgesDraft('')
            setAdvancedError('')
            setContentJsonError('')
            setItemsJsonError('')
            setBadgesJsonError('')
            return
        }
        setJsonContentDraft(JSON.stringify(block.content ?? {}, null, 2))
        setJsonStyleDraft(JSON.stringify(block.style ?? {}, null, 2))
        setJsonItemsDraft(JSON.stringify(block.content?.items ?? [], null, 2))
        setJsonBadgesDraft(JSON.stringify(Array.isArray(block.content?.badges) ? block.content.badges : [], null, 2))
        setAdvancedError('')
        setContentJsonError('')
        setItemsJsonError('')
        setBadgesJsonError('')
    }

    const selectBlock = (blockId: string | null, options?: { tab?: BlockTab }) => {
        if (!blockId) {
            setSelectedBlockId(null)
            hydrateJsonDrafts(null)
            return
        }
        setSelectedBlockId(blockId)
        const block = sortedBlocks.find((entry) => entry.id === blockId) ?? null
        hydrateJsonDrafts(block)
        if (options?.tab) setBlockTab(options.tab)
    }

    useEffect(() => {
        if (!publishModalOpen) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setPublishModalOpen(false)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [publishModalOpen])

    useEffect(() => {
        if (!selectedPage || !effectiveSelectedBlockId) return
        const canvasNode = canvasScrollRef.current
        if (!canvasNode) return
        const blockNodes = canvasNode.querySelectorAll<HTMLElement>('[data-block-id]')
        const targetNode = Array.from(blockNodes).find((node) => node.dataset.blockId === effectiveSelectedBlockId)
        if (!targetNode) return
        targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, [effectiveSelectedBlockId, selectedPage])

    if (!selectedPage) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Editor de Página</p>
                <h1 className="mt-2 text-2xl font-black text-slate-900">Página no encontrada</h1>
                <p className="mt-2 text-sm text-slate-500">La página solicitada no existe en la arquitectura actual.</p>
                <button
                    type="button"
                    onClick={() => navigate('/admin/site-builder')}
                    className="mt-6 inline-flex items-center gap-2 border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-700"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Volver al Site Builder
                </button>
            </div>
        )
    }

    const pulseSaved = () => {
        setSavePulse('saved')
        window.setTimeout(() => setSavePulse('idle'), 1200)
    }

    const updatePage = (patch: Partial<SiteArchitecturePage>) => {
        updateSiteArchitecturePage(selectedPage.id, patch)
        pulseSaved()
    }

    const updateBlocks = (blocks: SitePageBlock[]) => {
        updatePage({
            blocks: blocks
                .map((block, index) => ({ ...block, order: index }))
                .sort((a, b) => a.order - b.order),
        })
    }

    const updateSelectedBlock = (patch: Partial<SitePageBlock>) => {
        if (!selectedBlock) return
        let updatedBlock: SitePageBlock | null = null
        const nextBlocks = sortedBlocks.map((block) => {
            if (block.id !== selectedBlock.id) return block
            updatedBlock = { ...block, ...patch }
            return updatedBlock
        })
        updateBlocks(nextBlocks)
        hydrateJsonDrafts(updatedBlock)
    }

    const updateSelectedBlockContent = (patch: Record<string, unknown>) => {
        if (!selectedBlock) return
        updateSelectedBlock({
            content: {
                ...(selectedBlock.content ?? {}),
                ...patch,
            },
        })
    }

    const updateSelectedBlockStyle = (patch: Record<string, unknown>) => {
        if (!selectedBlock) return
        updateSelectedBlock({
            style: {
                ...(selectedBlock.style ?? {}),
                ...patch,
            },
        })
    }

    const addBlock = (type: SitePageBlockType) => {
        const base = createDefaultBlockByType(type, sortedBlocks.length, selectedPage.accentColor || '#2563eb')
        const existingIds = new Set(sortedBlocks.map((block) => block.id))
        let uniqueId = base.id
        let suffix = 2
        while (existingIds.has(uniqueId)) {
            uniqueId = `${base.id}-${suffix}`
            suffix += 1
        }
        const nextBlock = { ...base, id: uniqueId }
        updateBlocks([...sortedBlocks, nextBlock])
        selectBlock(uniqueId, { tab: 'content' })
    }

    const deleteBlock = (blockId: string) => {
        if (sortedBlocks.length <= 1) return
        const nextBlocks = sortedBlocks.filter((block) => block.id !== blockId)
        updateBlocks(nextBlocks)
        if (effectiveSelectedBlockId === blockId) {
            const nextActiveBlock = nextBlocks[0] ?? null
            selectBlock(nextActiveBlock?.id ?? null)
        }
    }

    const toggleBlockVisibility = (blockId: string) => {
        const block = sortedBlocks.find((entry) => entry.id === blockId)
        if (!block) return
        updateBlocks(sortedBlocks.map((entry) => (
            entry.id === blockId
                ? { ...entry, visible: !entry.visible }
                : entry
        )))
    }

    const moveBlock = (blockId: string, direction: 'up' | 'down') => {
        const index = sortedBlocks.findIndex((block) => block.id === blockId)
        if (index === -1) return
        const target = direction === 'up' ? index - 1 : index + 1
        if (target < 0 || target >= sortedBlocks.length) return
        const reordered = [...sortedBlocks]
        const [moved] = reordered.splice(index, 1)
        reordered.splice(target, 0, moved)
        updateBlocks(reordered)
    }

    const changeSelectedType = (nextType: SitePageBlockType) => {
        if (!selectedBlock) return
        const rebuilt = createDefaultBlockByType(nextType, selectedBlock.order, selectedPage.accentColor || '#2563eb')
        updateSelectedBlock({
            type: nextType,
            content: {
                ...rebuilt.content,
                ...(selectedBlock.content ?? {}),
            },
            style: {
                ...rebuilt.style,
                ...(selectedBlock.style ?? {}),
            },
            name: selectedBlock.name || rebuilt.name,
        })
    }

    const applyAdvancedJson = () => {
        if (!selectedBlock) return
        try {
            const parsedContent = JSON.parse(jsonContentDraft)
            const parsedStyle = JSON.parse(jsonStyleDraft)
            if (!parsedContent || typeof parsedContent !== 'object' || Array.isArray(parsedContent)) {
                setAdvancedError('El JSON de contenido debe ser un objeto válido.')
                return
            }
            if (!parsedStyle || typeof parsedStyle !== 'object' || Array.isArray(parsedStyle)) {
                setAdvancedError('El JSON de estilos debe ser un objeto válido.')
                return
            }
            updateSelectedBlock({
                content: parsedContent,
                style: parsedStyle,
            })
            setAdvancedError('')
        } catch {
            setAdvancedError('JSON inválido. Revisa la sintaxis antes de aplicar.')
        }
    }

    const applyItemsJson = () => {
        if (!selectedBlock) return
        try {
            const parsed = JSON.parse(jsonItemsDraft)
            if (!Array.isArray(parsed)) {
                setItemsJsonError('Items JSON debe ser un arreglo válido.')
                return
            }
            updateSelectedBlockContent({ items: parsed })
            setItemsJsonError('')
        } catch {
            setItemsJsonError('JSON inválido en items. Revisa la sintaxis.')
        }
    }

    const applyBadgesJson = () => {
        if (!selectedBlock) return
        try {
            const parsed = JSON.parse(jsonBadgesDraft)
            if (!Array.isArray(parsed)) {
                setBadgesJsonError('Badges JSON debe ser un arreglo válido.')
                return
            }
            updateSelectedBlockContent({
                badges: parsed
                    .filter((value): value is string => typeof value === 'string')
                    .map((value) => value.trim())
                    .filter(Boolean),
            })
            setBadgesJsonError('')
        } catch {
            setBadgesJsonError('JSON inválido en badges. Revisa la sintaxis.')
        }
    }

    const applyContentJson = () => {
        if (!selectedBlock) return
        try {
            const parsed = JSON.parse(jsonContentDraft)
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                setContentJsonError('El JSON de contenido debe ser un objeto válido.')
                return
            }
            updateSelectedBlock({ content: parsed })
            setContentJsonError('')
        } catch {
            setContentJsonError('JSON inválido en contenido. Revisa la sintaxis.')
        }
    }

    const handlePublishClick = () => {
        setPublishModalOpen(true)
    }

    const confirmPublish = () => {
        if (selectedPage.status !== 'published') {
            updateSiteArchitecturePage(selectedPage.id, { status: 'published' })
        }
        pulseSaved()
        setPublishModalOpen(false)
    }

    const openPageArchitecture = () => {
        selectBlock(null)
        setSidebarMode('layers')
        setBlockSearch('')
        window.setTimeout(() => {
            sidebarScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        }, 0)
    }

    const renderSelectedContentEditor = () => {
        if (!selectedBlock) return null

        const type = selectedBlock.type
        const itemsSingle = itemsToLines(selectedBlock.content.items, 'single')
        const itemsPair = itemsToLines(selectedBlock.content.items, 'pair')
        const itemsMetric = itemsToLines(selectedBlock.content.items, 'metric')
        const badgesLines = Array.isArray(selectedBlock.content.badges)
            ? selectedBlock.content.badges
                .filter((value): value is string => typeof value === 'string')
                .join('\n')
            : ''

        return (
            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Título">
                        <Input
                            value={String(selectedBlock.content.title ?? '')}
                            onChange={(event) => updateSelectedBlockContent({ title: event.target.value })}
                        />
                    </Field>
                    <Field label="Subtítulo">
                        <Input
                            value={String(selectedBlock.content.subtitle ?? '')}
                            onChange={(event) => updateSelectedBlockContent({ subtitle: event.target.value })}
                        />
                    </Field>
                </div>

                <Field label="Texto / descripción">
                    <Textarea
                        rows={3}
                        value={String(selectedBlock.content.body ?? '')}
                        onChange={(event) => updateSelectedBlockContent({ body: event.target.value })}
                    />
                </Field>

                {type === 'richtext' && (
                    <Field label="HTML enriquecido">
                        <Textarea
                            rows={6}
                            value={String(selectedBlock.content.html ?? '')}
                            onChange={(event) => updateSelectedBlockContent({ html: event.target.value })}
                        />
                    </Field>
                )}

                {(type === 'hero' || type === 'cta') && (
                    <>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Texto botón principal">
                                <Input
                                    value={String(selectedBlock.content.primaryLabel ?? '')}
                                    onChange={(event) => updateSelectedBlockContent({ primaryLabel: event.target.value })}
                                />
                            </Field>
                            <Field label="URL botón principal">
                                <Input
                                    value={String(selectedBlock.content.primaryHref ?? '')}
                                    onChange={(event) => updateSelectedBlockContent({ primaryHref: normalizeLinkInput(event.target.value) })}
                                />
                            </Field>
                            <Field label="Texto botón secundario">
                                <Input
                                    value={String(selectedBlock.content.secondaryLabel ?? '')}
                                    onChange={(event) => updateSelectedBlockContent({ secondaryLabel: event.target.value })}
                                />
                            </Field>
                            <Field label="URL botón secundario">
                                <Input
                                    value={String(selectedBlock.content.secondaryHref ?? '')}
                                    onChange={(event) => updateSelectedBlockContent({ secondaryHref: normalizeLinkInput(event.target.value) })}
                                />
                            </Field>
                        </div>
                        <Field label="Eyebrow">
                            <Input
                                value={String(selectedBlock.content.eyebrow ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ eyebrow: event.target.value })}
                            />
                        </Field>
                    </>
                )}

                {type === 'heading' && (
                    <Field label="Tag del heading">
                        <select
                            value={String(selectedBlock.content.tag ?? 'h2')}
                            onChange={(event) => updateSelectedBlockContent({ tag: event.target.value })}
                            className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary"
                        >
                            <option value="h1">H1</option>
                            <option value="h2">H2</option>
                            <option value="h3">H3</option>
                            <option value="h4">H4</option>
                            <option value="h5">H5</option>
                            <option value="h6">H6</option>
                        </select>
                    </Field>
                )}

                {type === 'button' && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Texto del botón">
                            <Input
                                value={String(selectedBlock.content.label ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ label: event.target.value })}
                            />
                        </Field>
                        <Field label="URL">
                            <Input
                                value={String(selectedBlock.content.href ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ href: normalizeLinkInput(event.target.value) })}
                            />
                        </Field>
                    </div>
                )}

                {type === 'image' && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="URL imagen">
                            <Input
                                value={String(selectedBlock.content.imageUrl ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ imageUrl: event.target.value })}
                            />
                        </Field>
                        <Field label="Alt imagen">
                            <Input
                                value={String(selectedBlock.content.imageAlt ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ imageAlt: event.target.value })}
                            />
                        </Field>
                    </div>
                )}

                {(type === 'video' || type === 'embed' || type === 'map') && (
                    <Field label="URL / Embed URL">
                        <Input
                            value={String(selectedBlock.content.videoUrl ?? selectedBlock.content.embedUrl ?? selectedBlock.content.url ?? '')}
                            onChange={(event) => {
                                if (type === 'video') updateSelectedBlockContent({ videoUrl: event.target.value })
                                if (type === 'embed') updateSelectedBlockContent({ embedUrl: event.target.value })
                                if (type === 'map') updateSelectedBlockContent({ embedUrl: event.target.value })
                            }}
                        />
                    </Field>
                )}

                {type === 'lottie' && (
                    <Field label="URL JSON de Lottie">
                        <Input
                            value={String(selectedBlock.content.jsonUrl ?? '')}
                            onChange={(event) => updateSelectedBlockContent({ jsonUrl: event.target.value })}
                        />
                    </Field>
                )}

                {(type === 'feature-list' || type === 'text' || type === 'richtext' || type === 'pricing') && (
                    <Field label="Items (uno por línea)">
                        <Textarea
                            rows={5}
                            value={itemsSingle}
                            onChange={(event) => updateSelectedBlockContent({ items: parseItemsLines(event.target.value, 'single') })}
                        />
                    </Field>
                )}

                {(type === 'social' || type === 'tabs' || type === 'timeline' || type === 'grid' || type === 'bento' || type === 'toggle' || type === 'accordion' || type === 'gallery' || type === 'carousel' || type === 'loopgrid' || type === 'portfolio' || type === 'hotspots' || type === 'navmenu') && (
                    <Field label="Items (formato: titulo|detalle)">
                        <Textarea
                            rows={6}
                            value={itemsPair}
                            onChange={(event) => updateSelectedBlockContent({ items: parseItemsLines(event.target.value, 'pair') })}
                        />
                    </Field>
                )}

                {type === 'timeline' && (
                    <Field label="Badges / chips (uno por línea)">
                        <Textarea
                            rows={4}
                            value={badgesLines}
                            onChange={(event) => updateSelectedBlockContent({
                                badges: event.target.value
                                    .split('\n')
                                    .map((line) => line.trim())
                                    .filter(Boolean),
                            })}
                        />
                    </Field>
                )}

                {(type === 'progress' || type === 'progressbar' || type === 'stats' || type === 'counter') && (
                    <Field label="Métricas (formato: label|valor)">
                        <Textarea
                            rows={5}
                            value={itemsMetric}
                            onChange={(event) => updateSelectedBlockContent({ items: parseItemsLines(event.target.value, 'metric') })}
                        />
                    </Field>
                )}

                {type === 'contact' && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Email">
                            <Input
                                value={String(selectedBlock.content.email ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ email: event.target.value })}
                            />
                        </Field>
                        <Field label="Teléfono">
                            <Input
                                value={String(selectedBlock.content.phone ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ phone: event.target.value })}
                            />
                        </Field>
                    </div>
                )}

                {type === 'testimonial' && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Autor">
                            <Input
                                value={String(selectedBlock.content.author ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ author: event.target.value })}
                            />
                        </Field>
                        <Field label="Cargo / Empresa">
                            <Input
                                value={String(selectedBlock.content.role ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ role: event.target.value })}
                            />
                        </Field>
                    </div>
                )}

                {type === 'icon' && (
                    <Field label="Ícono (emoji o texto)">
                        <Input
                            value={String(selectedBlock.content.icon ?? '')}
                            onChange={(event) => updateSelectedBlockContent({ icon: event.target.value })}
                        />
                    </Field>
                )}

                {type === 'pricing' && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Precio">
                            <Input
                                value={String(selectedBlock.content.price ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ price: event.target.value })}
                            />
                        </Field>
                        <Field label="Periodo (ej: /mes)">
                            <Input
                                value={String(selectedBlock.content.period ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ period: event.target.value })}
                            />
                        </Field>
                    </div>
                )}

                {type === 'flipbox' && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Título frente">
                            <Input
                                value={String(selectedBlock.content.frontTitle ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ frontTitle: event.target.value })}
                            />
                        </Field>
                        <Field label="Título reverso">
                            <Input
                                value={String(selectedBlock.content.backTitle ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ backTitle: event.target.value })}
                            />
                        </Field>
                        <Field label="Texto frente">
                            <Textarea
                                rows={3}
                                value={String(selectedBlock.content.body ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ body: event.target.value })}
                            />
                        </Field>
                        <Field label="Texto reverso">
                            <Textarea
                                rows={3}
                                value={String(selectedBlock.content.backBody ?? '')}
                                onChange={(event) => updateSelectedBlockContent({ backBody: event.target.value })}
                            />
                        </Field>
                    </div>
                )}

                <Field label="Contenido completo del bloque (JSON)">
                    <Textarea
                        rows={8}
                        value={jsonContentDraft}
                        onChange={(event) => setJsonContentDraft(event.target.value)}
                    />
                </Field>
                {contentJsonError && (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                        {contentJsonError}
                    </div>
                )}
                <button
                    type="button"
                    onClick={applyContentJson}
                    className="inline-flex items-center gap-2 border border-slate-300 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 hover:border-brand-primary hover:text-brand-primary"
                >
                    Aplicar contenido JSON
                </button>

                <Field label="Items JSON estructurado (edición total)">
                    <Textarea
                        rows={6}
                        value={jsonItemsDraft}
                        onChange={(event) => setJsonItemsDraft(event.target.value)}
                    />
                </Field>
                {itemsJsonError && (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                        {itemsJsonError}
                    </div>
                )}
                <button
                    type="button"
                    onClick={applyItemsJson}
                    className="inline-flex items-center gap-2 border border-slate-300 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 hover:border-brand-primary hover:text-brand-primary"
                >
                    Aplicar items JSON
                </button>

                {type === 'timeline' && (
                    <>
                        <Field label="Badges JSON (timeline)">
                            <Textarea
                                rows={4}
                                value={jsonBadgesDraft}
                                onChange={(event) => setJsonBadgesDraft(event.target.value)}
                            />
                        </Field>
                        {badgesJsonError && (
                            <div className="rounded border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                                {badgesJsonError}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={applyBadgesJson}
                            className="inline-flex items-center gap-2 border border-slate-300 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 hover:border-brand-primary hover:text-brand-primary"
                        >
                            Aplicar badges JSON
                        </button>
                    </>
                )}
            </div>
        )
    }

    const renderSelectedStyleEditor = () => {
        if (!selectedBlock) return null
        const isSpacer = selectedBlock.type === 'spacer'

        return (
            <div className="space-y-4">
                {!isSpacer && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Color de fondo">
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={String(selectedBlock.style.backgroundColor || '#ffffff')}
                                    onChange={(event) => updateSelectedBlockStyle({ backgroundColor: event.target.value })}
                                    className="h-11 w-14 border border-slate-200 bg-white p-1"
                                />
                                <Input
                                    value={String(selectedBlock.style.backgroundColor ?? '')}
                                    onChange={(event) => updateSelectedBlockStyle({ backgroundColor: event.target.value })}
                                />
                            </div>
                        </Field>

                        <Field label="Color de texto">
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={String(selectedBlock.style.textColor || '#0f172a')}
                                    onChange={(event) => updateSelectedBlockStyle({ textColor: event.target.value })}
                                    className="h-11 w-14 border border-slate-200 bg-white p-1"
                                />
                                <Input
                                    value={String(selectedBlock.style.textColor ?? '')}
                                    onChange={(event) => updateSelectedBlockStyle({ textColor: event.target.value })}
                                />
                            </div>
                        </Field>

                        <Field label="Alineación">
                            <select
                                value={String(selectedBlock.style.align || 'left')}
                                onChange={(event) => updateSelectedBlockStyle({ align: event.target.value })}
                                className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary"
                            >
                                <option value="left">Izquierda</option>
                                <option value="center">Centro</option>
                                <option value="right">Derecha</option>
                            </select>
                        </Field>

                        <Field label="Padding vertical (ej: 4rem)">
                            <Input
                                value={String(selectedBlock.style.paddingY ?? '')}
                                onChange={(event) => updateSelectedBlockStyle({ paddingY: event.target.value })}
                            />
                        </Field>

                        <Field label="Columnas (grid/lista)">
                            <Input
                                value={String(selectedBlock.style.columns ?? '')}
                                onChange={(event) => updateSelectedBlockStyle({ columns: event.target.value })}
                            />
                        </Field>

                        <Field label="Radio (ej: 1rem)">
                            <Input
                                value={String(selectedBlock.style.radius ?? '')}
                                onChange={(event) => updateSelectedBlockStyle({ radius: event.target.value })}
                            />
                        </Field>
                    </div>
                )}

                {isSpacer && (
                    <Field label="Altura del espaciador (ej: 3rem)">
                        <Input
                            value={String(selectedBlock.style.height ?? '')}
                            onChange={(event) => updateSelectedBlockStyle({ height: event.target.value })}
                        />
                    </Field>
                )}
            </div>
        )
    }

    return (
        <div className="h-screen w-full overflow-hidden bg-slate-100 text-slate-900">
            <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-500">Page Builder</p>
                    <h1 className="mt-1 text-[28px] font-black tracking-tight text-slate-900">Editor · {selectedPage.title}</h1>
                    <p className="text-sm text-slate-500">{selectedPage.path}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                        persistence.status === 'saving'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : persistence.pendingChanges
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}>
                        {persistence.status === 'saving' ? 'Guardando...' : persistence.pendingChanges ? 'Cambios pendientes' : 'Sin cambios'}
                    </span>
                    <button
                        type="button"
                        onClick={openPageArchitecture}
                        className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 hover:border-slate-500"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Volver
                    </button>
                    <a
                        href={selectedPage.previewPath || selectedPage.path}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 hover:border-indigo-500 hover:text-indigo-600"
                    >
                        <Eye className="h-3.5 w-3.5" />
                        Vista previa
                    </a>
                    <a
                        href={selectedPage.path}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 hover:border-indigo-500 hover:text-indigo-600"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver página
                    </a>
                    <button
                        type="button"
                        onClick={handlePublishClick}
                        className={`inline-flex items-center gap-2 border px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${savePulse === 'saved' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-indigo-500 bg-indigo-600 text-white'}`}
                    >
                        <Save className="h-3.5 w-3.5" />
                        {savePulse === 'saved' ? 'Guardado' : 'Actualizar y publicar'}
                    </button>
                </div>
            </header>

            <div className="flex h-[calc(100vh-5rem)]">
                <aside className="flex h-full w-full max-w-[750px] flex-col overflow-hidden border-r border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between bg-indigo-700 px-4 py-3 text-white">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em]">Supreme Builder</p>
                        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-indigo-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            En vivo
                        </div>
                    </div>

                    {!selectedBlock && (
                        <div className="px-2 py-2">
                            <div className="flex rounded-xl bg-slate-200/60 p-1">
                                <button
                                    type="button"
                                    onClick={() => setSidebarMode('insert')}
                                    className={`flex-1 rounded-lg py-2 text-[11px] font-black uppercase tracking-[0.2em] ${sidebarMode === 'insert' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                                >
                                    <span className="inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Insertar</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSidebarMode('layers')}
                                    className={`flex-1 rounded-lg py-2 text-[11px] font-black uppercase tracking-[0.2em] ${sidebarMode === 'layers' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                                >
                                    <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> Capas</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSidebarMode('design')}
                                    className={`flex-1 rounded-lg py-2 text-[11px] font-black uppercase tracking-[0.2em] ${sidebarMode === 'design' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                                >
                                    <span className="inline-flex items-center gap-1"><Settings2 className="h-3.5 w-3.5" /> Diseño</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {selectedBlock && (
                        <div className="space-y-3 border-b border-slate-200 px-3 py-3">
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={openPageArchitecture}
                                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:text-indigo-800"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                    Volver
                                </button>
                                <button
                                    type="button"
                                    onClick={() => deleteBlock(selectedBlock.id)}
                                    disabled={sortedBlocks.length <= 1}
                                    className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-600 disabled:opacity-40"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Eliminar
                                </button>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-800">{selectedBlock.name || BLOCK_TYPE_LABEL[selectedBlock.type]}</p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">{selectedBlock.type}</p>
                            </div>
                            <div className="flex rounded-xl bg-slate-200/60 p-1">
                                {(['layout', 'content', 'styles', 'advanced'] as BlockTab[]).map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setBlockTab(tab)}
                                        className={`flex-1 rounded-lg py-2 text-[10px] font-black uppercase tracking-[0.2em] ${blockTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        {tab === 'layout' ? 'Layout' : tab === 'content' ? 'Contenido' : tab === 'styles' ? 'Estilos' : 'Avanzado'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div ref={sidebarScrollRef} className="flex-1 overflow-y-auto px-3 py-3">
                        {!selectedBlock && sidebarMode === 'insert' && (
                            <div className="space-y-5">
                                {INSERT_GROUPS.map((group) => (
                                    <section key={group.label}>
                                        <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{group.label}</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {group.items.map((blockType) => (
                                                <button
                                                    key={blockType}
                                                    type="button"
                                                    onClick={() => addBlock(blockType)}
                                                    className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center transition-colors hover:border-indigo-500 hover:bg-indigo-50"
                                                >
                                                    <span className="rounded-full bg-slate-100 p-1 text-slate-500"><Plus className="h-3.5 w-3.5" /></span>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">{BLOCK_TYPE_LABEL[blockType]}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )}

                        {!selectedBlock && sidebarMode === 'layers' && (
                            <div className="space-y-2">
                                <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Estructura general de la página</p>
                                    <p className="mt-1 text-sm font-black tracking-tight text-slate-800">{selectedPage.title}</p>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <p className="text-xs text-slate-600">Gestiona bloques: agregar, editar, mover y eliminar.</p>
                                        <button
                                            type="button"
                                            onClick={() => setSidebarMode('insert')}
                                            className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 hover:bg-indigo-100"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Agregar
                                        </button>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <Field label="Buscar bloque">
                                        <Input
                                            value={blockSearch}
                                            onChange={(event) => setBlockSearch(event.target.value)}
                                            placeholder="Nombre, tipo o id..."
                                        />
                                    </Field>
                                </div>
                                {filteredLayerBlocks.map((block) => {
                                    const active = block.id === effectiveSelectedBlockId
                                    const index = sortedBlocks.findIndex((entry) => entry.id === block.id)
                                    return (
                                        <button
                                            key={block.id}
                                            type="button"
                                            onClick={() => {
                                                selectBlock(block.id, { tab: 'content' })
                                            }}
                                            className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${active ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">{block.name || BLOCK_TYPE_LABEL[block.type]}</span>
                                                <span className="text-[10px] font-semibold text-slate-400">{block.type} · #{index + 1}</span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        selectBlock(block.id, { tab: 'content' })
                                                    }}
                                                    className="rounded border border-indigo-200 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-700 hover:bg-indigo-50"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        toggleBlockVisibility(block.id)
                                                    }}
                                                    className={`rounded border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                                                        block.visible
                                                            ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                                            : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                                    }`}
                                                >
                                                    <span className="inline-flex items-center gap-1">
                                                        {block.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                                        {block.visible ? 'Visible' : 'Oculto'}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        moveBlock(block.id, 'up')
                                                    }}
                                                    disabled={index === 0}
                                                    className="rounded border border-slate-200 p-1 text-slate-500 disabled:opacity-30"
                                                >
                                                    <ChevronUp className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        moveBlock(block.id, 'down')
                                                    }}
                                                    disabled={index === sortedBlocks.length - 1}
                                                    className="rounded border border-slate-200 p-1 text-slate-500 disabled:opacity-30"
                                                >
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        deleteBlock(block.id)
                                                    }}
                                                    disabled={sortedBlocks.length <= 1}
                                                    className="rounded border border-red-200 p-1 text-red-600 disabled:opacity-30"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </button>
                                    )
                                })}
                                {filteredLayerBlocks.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
                                        No encontramos bloques con ese criterio.
                                    </div>
                                )}
                            </div>
                        )}

                        {!selectedBlock && sidebarMode === 'design' && (
                            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                                <Field label="Nombre de página">
                                    <Input value={selectedPage.title} onChange={(event) => updatePage({ title: event.target.value })} />
                                </Field>
                                <Field label="Ruta">
                                    <Input
                                        value={selectedPage.path}
                                        onChange={(event) => {
                                            const nextPath = normalizePathInput(event.target.value)
                                            updatePage({ path: nextPath, previewPath: normalizePathInput(selectedPage.previewPath || nextPath) })
                                        }}
                                        disabled={selectedPage.locked}
                                    />
                                </Field>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Categoría">
                                        <select
                                            value={selectedPage.category}
                                            onChange={(event) => updatePage({ category: event.target.value as SitePageCategory })}
                                            className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary"
                                        >
                                            {CATEGORY_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Estado">
                                        <select
                                            value={selectedPage.status}
                                            onChange={(event) => updatePage({ status: event.target.value as SitePageStatus })}
                                            className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary"
                                        >
                                            {STATUS_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Editor vinculado">
                                        <select
                                            value={selectedPage.editor}
                                            onChange={(event) => updatePage({ editor: event.target.value as SitePageEditor })}
                                            className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary"
                                        >
                                            {EDITOR_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Template visual">
                                        <select
                                            value={selectedPage.template}
                                            onChange={(event) => updatePage({ template: event.target.value })}
                                            className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary"
                                        >
                                            {TEMPLATE_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Label en navegación">
                                        <Input
                                            value={selectedPage.navLabel}
                                            onChange={(event) => updatePage({ navLabel: event.target.value })}
                                        />
                                    </Field>
                                    <Field label="Mostrar en navegación">
                                        <select
                                            value={selectedPage.showInNavigation ? 'true' : 'false'}
                                            onChange={(event) => updatePage({ showInNavigation: event.target.value === 'true' })}
                                            className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary"
                                        >
                                            <option value="true">Sí</option>
                                            <option value="false">No</option>
                                        </select>
                                    </Field>
                                </div>
                                <Field label="Color acento de la página">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={selectedPage.accentColor || '#2563eb'}
                                            onChange={(event) => updatePage({ accentColor: event.target.value })}
                                            className="h-11 w-14 border border-slate-200 bg-white p-1"
                                        />
                                        <Input
                                            value={selectedPage.accentColor || ''}
                                            onChange={(event) => updatePage({ accentColor: event.target.value })}
                                        />
                                    </div>
                                </Field>
                                <Field label="Notas internas">
                                    <Textarea
                                        rows={4}
                                        value={selectedPage.notes}
                                        onChange={(event) => updatePage({ notes: event.target.value })}
                                    />
                                </Field>
                            </div>
                        )}

                        {selectedBlock && (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
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
                                                onChange={(event) => changeSelectedType(event.target.value as SitePageBlockType)}
                                                className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary"
                                            >
                                                {(Object.keys(BLOCK_TYPE_LABEL) as SitePageBlockType[]).map((type) => (
                                                    <option key={type} value={type}>{BLOCK_TYPE_LABEL[type]}</option>
                                                ))}
                                            </select>
                                        </Field>
                                    </div>
                                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                                        <Field label="Visible">
                                            <select
                                                value={selectedBlock.visible ? 'true' : 'false'}
                                                onChange={(event) => updateSelectedBlock({ visible: event.target.value === 'true' })}
                                                className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary"
                                            >
                                                <option value="true">Sí</option>
                                                <option value="false">No</option>
                                            </select>
                                        </Field>
                                        <Field label="Orden">
                                            <Input value={String(selectedBlock.order + 1)} disabled />
                                        </Field>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    {blockTab === 'layout' && (
                                        <div className="space-y-4">
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <Field label="Subir / bajar rápido">
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => moveBlock(selectedBlock.id, 'up')}
                                                            className="inline-flex items-center gap-1 border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600"
                                                        >
                                                            <ChevronUp className="h-3.5 w-3.5" />
                                                            Subir
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => moveBlock(selectedBlock.id, 'down')}
                                                            className="inline-flex items-center gap-1 border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600"
                                                        >
                                                            <ChevronDown className="h-3.5 w-3.5" />
                                                            Bajar
                                                        </button>
                                                    </div>
                                                </Field>
                                                <Field label="Eliminar bloque">
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteBlock(selectedBlock.id)}
                                                        disabled={sortedBlocks.length <= 1}
                                                        className="inline-flex items-center gap-1 border border-red-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-600 disabled:opacity-40"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Eliminar
                                                    </button>
                                                </Field>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                Usa Layout para ordenar capas y controlar visibilidad/estructura del bloque.
                                            </p>
                                        </div>
                                    )}

                                    {blockTab === 'content' && renderSelectedContentEditor()}
                                    {blockTab === 'styles' && renderSelectedStyleEditor()}

                                    {blockTab === 'advanced' && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-slate-500">
                                                Modo avanzado para editar absolutamente cualquier propiedad del bloque.
                                            </p>
                                            <Field label="JSON de contenido">
                                                <Textarea
                                                    rows={8}
                                                    value={jsonContentDraft}
                                                    onChange={(event) => setJsonContentDraft(event.target.value)}
                                                />
                                            </Field>
                                            <Field label="JSON de estilos">
                                                <Textarea
                                                    rows={8}
                                                    value={jsonStyleDraft}
                                                    onChange={(event) => setJsonStyleDraft(event.target.value)}
                                                />
                                            </Field>
                                            {advancedError && (
                                                <div className="rounded border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                                                    {advancedError}
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={applyAdvancedJson}
                                                className="inline-flex items-center gap-2 border border-indigo-500 bg-indigo-600 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white"
                                            >
                                                <Save className="h-3.5 w-3.5" />
                                                Aplicar JSON
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 border-t border-slate-200 bg-slate-50 px-3 py-3">
                        <a
                            href={selectedPage.previewPath || selectedPage.path}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-[12px] font-black uppercase tracking-[0.2em] text-slate-700 hover:border-indigo-500 hover:text-indigo-600"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            Vista previa
                        </a>
                        <button
                            type="button"
                            onClick={handlePublishClick}
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-black uppercase tracking-[0.2em] ${savePulse === 'saved' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-sky-500 bg-sky-500 text-white'}`}
                        >
                            <Save className="h-3.5 w-3.5" />
                            {savePulse === 'saved' ? 'Guardado' : 'Actualizar y publicar'}
                        </button>
                    </div>
                </aside>

                <section className="h-full flex-1 overflow-hidden bg-slate-100">
                    <div className="border-b border-slate-200 bg-white/80 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="mr-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Bloques de la página ({sortedBlocks.length})</p>
                            {sortedBlocks.map((block) => (
                                <button
                                    key={`published-chip-${block.id}`}
                                    type="button"
                                    onClick={() => selectBlock(block.id)}
                                    className={`rounded border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${effectiveSelectedBlockId === block.id ? 'border-blue-500 bg-blue-50 text-blue-700' : block.visible ? 'border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-700' : 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400'}`}
                                >
                                    {block.name || BLOCK_TYPE_LABEL[block.type]}{block.visible ? '' : ' · oculto'}
                                </button>
                            ))}
                            {sortedBlocks.length === 0 && (
                                <span className="text-xs text-slate-500">No hay bloques configurados en esta página.</span>
                            )}
                        </div>
                    </div>
                    <div ref={canvasScrollRef} className="h-[calc(100%-3.25rem)] overflow-y-auto">
                        {renderPublishedAsIframe ? (
                            <div className="h-full bg-white">
                                <iframe
                                    src={selectedPage.previewPath || selectedPage.path}
                                    title={`Publicado · ${selectedPage.title}`}
                                    className="h-full w-full border-0"
                                />
                            </div>
                        ) : (
                            <DynamicPageRenderer
                                page={selectedPage}
                                selectable
                                selectedBlockId={effectiveSelectedBlockId}
                                onSelectBlock={selectBlock}
                                className="min-h-full bg-slate-100"
                            />
                        )}
                    </div>
                </section>
            </div>

            {publishModalOpen && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/50 px-4">
                    <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-500">Confirmar publicación</p>
                        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">¿Actualizar y publicar esta página?</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Se aplicarán los cambios en <span className="font-bold text-slate-800">{selectedPage.title}</span> ({selectedPage.path}).
                        </p>
                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPublishModalOpen(false)}
                                className="inline-flex items-center gap-2 border border-slate-300 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 hover:border-slate-500"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmPublish}
                                className="inline-flex items-center gap-2 border border-indigo-500 bg-indigo-600 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-indigo-700"
                            >
                                <Save className="h-3.5 w-3.5" />
                                Confirmar publicación
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
