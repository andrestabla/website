import { useEffect, useMemo, useState } from 'react'
import {
    Megaphone,
    Copy,
    FlaskConical,
    Link,
    Save,
    Sparkles,
    Accessibility,
    RefreshCw,
    CheckCircle2,
    Mail,
    Send,
    Rocket,
    ExternalLink,
    Plus,
    Trash2,
    WandSparkles,
    GripVertical,
    Monitor,
    Tablet,
    Smartphone,
    LayoutTemplate,
} from 'lucide-react'
import { useCMS, type SiteConfig } from '../context/CMSContext'
import { Field, Input, Textarea } from '../components/ContentModal'

type SelectedVariants = Record<string, string>
type AIProvider = 'auto' | 'openai' | 'gemini'

type A11yFinding = {
    id: string
    severity: 'high' | 'medium' | 'low'
    message: string
    count: number
    samples?: string[]
}

type CampaignSection = {
    id: string
    title: string
    body: string
    bullets: string[]
}

type CampaignLanding = {
    id: string
    slug: string
    name: string
    objective: string
    audience: string
    tone: string
    provider: 'openai' | 'gemini' | 'manual'
    createdAt: string
    updatedAt: string
    lastGeneratedAt?: string
    status: 'draft' | 'published'
    seoTitle: string
    seoDescription: string
    heroEyebrow: string
    heroTitle: string
    heroSubtitle: string
    primaryCtaLabel: string
    primaryCtaHref: string
    secondaryCtaLabel: string
    secondaryCtaHref: string
    sections: CampaignSection[]
    offerTitle: string
    offerBody: string
    formTitle: string
    thankYouMessage: string
    accentColor: string
    backgroundStyle: string
}

type LandingViewport = 'desktop' | 'tablet' | 'mobile'

type LandingWidgetTemplate = {
    id: string
    label: string
    description: string
    section: CampaignSection
}

const LANDING_WIDGET_TEMPLATES: LandingWidgetTemplate[] = [
    {
        id: 'pain-point',
        label: 'Pain Point',
        description: 'Expone el problema crítico del cliente ideal.',
        section: {
            id: 'pain-point',
            title: 'El cuello de botella actual',
            body: 'Tu operación exige resultados más rápidos, pero sin un flujo estandarizado cada iniciativa se vuelve más lenta y costosa.',
            bullets: ['Demoras en ejecución', 'Poca visibilidad de avance', 'Dependencia de tareas manuales'],
        },
    },
    {
        id: 'solution',
        label: 'Solución',
        description: 'Muestra la propuesta y el método.',
        section: {
            id: 'solution',
            title: 'Cómo resolvemos el reto',
            body: 'Diseñamos e implementamos un plan accionable, con responsables y métricas, para generar impacto real en semanas.',
            bullets: ['Roadmap por fases', 'Automatización de procesos clave', 'Acompañamiento operativo'],
        },
    },
    {
        id: 'proof',
        label: 'Prueba',
        description: 'Incluye señales de confianza y resultados.',
        section: {
            id: 'proof',
            title: 'Resultados que puedes esperar',
            body: 'El enfoque prioriza quick wins y mejoras sostenidas en productividad, control y capacidad de escalar.',
            bullets: ['Menos fricción operativa', 'Más velocidad de entrega', 'Mejor experiencia del cliente interno'],
        },
    },
    {
        id: 'faq',
        label: 'FAQ breve',
        description: 'Responde objeciones principales.',
        section: {
            id: 'faq',
            title: 'Preguntas frecuentes',
            body: 'Aclaramos alcance, tiempos y forma de trabajo para facilitar la decisión.',
            bullets: ['¿Cuánto tarda el diagnóstico?', '¿Qué equipo necesita participar?', '¿Cómo medimos resultados?'],
        },
    },
]

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => { })
}

function SelectField({
    value,
    onChange,
    options,
}: {
    value: string
    onChange: (value: string) => void
    options: Array<{ value: string; label: string }>
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all duration-200"
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}

function createEmptyLanding(): CampaignLanding {
    return {
        id: '',
        slug: '',
        name: '',
        objective: '',
        audience: '',
        tone: '',
        provider: 'manual',
        createdAt: '',
        updatedAt: '',
        status: 'draft',
        seoTitle: '',
        seoDescription: '',
        heroEyebrow: 'Campaña focalizada',
        heroTitle: '',
        heroSubtitle: '',
        primaryCtaLabel: 'Solicitar diagnóstico',
        primaryCtaHref: '/#contacto',
        secondaryCtaLabel: 'Ver servicios',
        secondaryCtaHref: '/#servicios',
        sections: [
            { id: 'problema', title: '', body: '', bullets: [] },
            { id: 'solucion', title: '', body: '', bullets: [] },
            { id: 'prueba', title: '', body: '', bullets: [] },
        ],
        offerTitle: '',
        offerBody: '',
        formTitle: '',
        thankYouMessage: '',
        accentColor: '#2563eb',
        backgroundStyle: 'dark-grid',
    }
}

function slugify(input: string) {
    return String(input || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
}

function ensureUniqueSectionId(baseId: string, sections: CampaignSection[]) {
    const normalized = slugify(baseId) || `section-${sections.length + 1}`
    if (!sections.some((section) => section.id === normalized)) return normalized
    let suffix = 2
    let next = `${normalized}-${suffix}`
    while (sections.some((section) => section.id === next)) {
        suffix += 1
        next = `${normalized}-${suffix}`
    }
    return next
}

export function ManageMarketing() {
    const { state, updateSite } = useCMS()
    const [selected, setSelected] = useState<SelectedVariants>({})
    const [utmSource, setUtmSource] = useState('linkedin')
    const [utmMedium, setUtmMedium] = useState('social')
    const [utmCampaign, setUtmCampaign] = useState('q1-2026')
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [draft, setDraft] = useState<SiteConfig>({ ...state.site })

    const [aiProvider, setAiProvider] = useState<AIProvider>('auto')

    const [aiObjective, setAiObjective] = useState('Captar leads para diagnóstico de madurez digital.')
    const [aiAudience, setAiAudience] = useState('Directores de operaciones y tecnología')
    const [aiTone, setAiTone] = useState('Directo y consultivo')
    const [aiLoading, setAiLoading] = useState(false)
    const [aiError, setAiError] = useState<string | null>(null)
    const [aiProviderUsed, setAiProviderUsed] = useState<string | null>(null)

    const [scanPath, setScanPath] = useState('/')
    const [scanLoading, setScanLoading] = useState(false)
    const [scanError, setScanError] = useState<string | null>(null)
    const [scanScore, setScanScore] = useState<number | null>(null)
    const [scanFindings, setScanFindings] = useState<A11yFinding[]>([])

    const [emailCampaignName, setEmailCampaignName] = useState('Campaña Q1')
    const [emailObjective, setEmailObjective] = useState('Invitar a una sesión estratégica de transformación digital.')
    const [emailAudience, setEmailAudience] = useState('Directores de operaciones')
    const [emailTone, setEmailTone] = useState('Consultivo y directo')
    const [emailSubject, setEmailSubject] = useState('')
    const [emailPreheader, setEmailPreheader] = useState('')
    const [emailBodyText, setEmailBodyText] = useState('')
    const [emailCtaLabel, setEmailCtaLabel] = useState('Agendar sesión')
    const [emailCtaHref, setEmailCtaHref] = useState('/#contacto')
    const [emailRecipientsText, setEmailRecipientsText] = useState('')
    const [emailLoading, setEmailLoading] = useState(false)
    const [emailError, setEmailError] = useState<string | null>(null)
    const [emailResult, setEmailResult] = useState<string | null>(null)
    const [emailProviderUsed, setEmailProviderUsed] = useState<string | null>(null)

    const [landingItems, setLandingItems] = useState<CampaignLanding[]>([])
    const [landingDraft, setLandingDraft] = useState<CampaignLanding>(() => createEmptyLanding())
    const [landingCampaignName, setLandingCampaignName] = useState('Campaña Transformación 2026')
    const [landingObjective, setLandingObjective] = useState('Captar leads calificados para sesiones de diagnóstico.')
    const [landingAudience, setLandingAudience] = useState('Gerencias y dirección')
    const [landingTone, setLandingTone] = useState('Ejecutivo y persuasivo')
    const [landingLoading, setLandingLoading] = useState(false)
    const [landingError, setLandingError] = useState<string | null>(null)
    const [landingProviderUsed, setLandingProviderUsed] = useState<string | null>(null)
    const [landingListLoading, setLandingListLoading] = useState(false)
    const [landingListError, setLandingListError] = useState<string | null>(null)
    const [landingViewport, setLandingViewport] = useState<LandingViewport>('desktop')
    const [landingSelectedBlock, setLandingSelectedBlock] = useState<'hero' | 'offer' | 'form' | `section:${number}`>('hero')
    const [landingDraggedSectionIndex, setLandingDraggedSectionIndex] = useState<number | null>(null)

    const pick = (serviceSlug: string, variant: string) => {
        setSelected((s) => ({ ...s, [serviceSlug]: variant }))
    }

    const setSite = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => {
        setDraft((prev) => ({ ...prev, [key]: value }))
    }

    const handleSave = () => {
        updateSite(draft)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    const loadLandings = async () => {
        setLandingListLoading(true)
        setLandingListError(null)
        try {
            const response = await fetch('/api/admin/campaign-landings')
            const json = await response.json().catch(() => null)
            if (!response.ok || !json?.ok) throw new Error(json?.error || `HTTP ${response.status}`)
            setLandingItems(Array.isArray(json.items) ? json.items : [])
        } catch (error) {
            setLandingListError(error instanceof Error ? error.message : 'No se pudo cargar landings')
        } finally {
            setLandingListLoading(false)
        }
    }

    useEffect(() => {
        void loadLandings()
    }, [])

    const buildUTM = (path: string) => {
        const base = (state.site.url || 'https://algoritmot.com').replace(/\/+$/, '')
        return `${base}${path}?utm_source=${encodeURIComponent(utmSource)}&utm_medium=${encodeURIComponent(utmMedium)}&utm_campaign=${encodeURIComponent(utmCampaign)}`
    }

    const handleCopy = (id: string, url: string) => {
        copyToClipboard(url)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const popupPreview = useMemo(() => ({
        title: draft.popupTitle || 'Agenda una sesión estratégica',
        body: draft.popupBody || 'Te ayudamos a definir un roadmap realista de transformación digital.',
        ctaLabel: draft.popupCtaLabel || 'Quiero mi sesión',
        dismissLabel: draft.popupDismissLabel || 'Ahora no',
    }), [draft.popupBody, draft.popupCtaLabel, draft.popupDismissLabel, draft.popupTitle])

    const generateAiCopy = async () => {
        setAiLoading(true)
        setAiError(null)
        setAiProviderUsed(null)
        try {
            const response = await fetch('/api/admin/ai-copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    objective: aiObjective,
                    audience: aiAudience,
                    tone: aiTone,
                    locale: 'es',
                    provider: aiProvider,
                }),
            })
            const json = await response.json().catch(() => null)
            if (!response.ok || !json?.ok) throw new Error(json?.error || `HTTP ${response.status}`)
            setAiProviderUsed(json.providerUsed || null)
            setDraft((prev) => ({
                ...prev,
                popupTitle: json.data.title || prev.popupTitle,
                popupBody: json.data.body || prev.popupBody,
                popupCtaLabel: json.data.ctaLabel || prev.popupCtaLabel,
                popupCtaHref: json.data.ctaHref || prev.popupCtaHref,
                popupDismissLabel: json.data.dismissLabel || prev.popupDismissLabel,
            }))
        } catch (error) {
            setAiError(error instanceof Error ? error.message : 'No se pudo generar copy')
        } finally {
            setAiLoading(false)
        }
    }

    const runAccessibilityScan = async () => {
        setScanLoading(true)
        setScanError(null)
        try {
            const path = scanPath.trim().startsWith('/') ? scanPath.trim() : '/'
            const response = await fetch(`/api/admin/accessibility-scan?path=${encodeURIComponent(path)}`)
            const json = await response.json().catch(() => null)
            if (!response.ok || !json?.ok) throw new Error(json?.error || `HTTP ${response.status}`)
            setScanScore(Number(json.score || 0))
            setScanFindings(Array.isArray(json.findings) ? json.findings : [])
        } catch (error) {
            setScanError(error instanceof Error ? error.message : 'No se pudo ejecutar el escaneo')
            setScanScore(null)
            setScanFindings([])
        } finally {
            setScanLoading(false)
        }
    }

    const generateAiEmail = async () => {
        setEmailLoading(true)
        setEmailError(null)
        setEmailProviderUsed(null)
        setEmailResult(null)
        try {
            const response = await fetch('/api/admin/ai-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignName: emailCampaignName,
                    objective: emailObjective,
                    audience: emailAudience,
                    tone: emailTone,
                    provider: aiProvider,
                    locale: 'es',
                }),
            })
            const json = await response.json().catch(() => null)
            if (!response.ok || !json?.ok) throw new Error(json?.error || `HTTP ${response.status}`)
            setEmailProviderUsed(json.providerUsed || null)
            setEmailSubject(json.data.subject || '')
            setEmailPreheader(json.data.preheader || '')
            setEmailBodyText(json.data.bodyText || '')
            setEmailCtaLabel(json.data.ctaLabel || emailCtaLabel)
            setEmailCtaHref(json.data.ctaHref || emailCtaHref)
        } catch (error) {
            setEmailError(error instanceof Error ? error.message : 'No se pudo generar email')
        } finally {
            setEmailLoading(false)
        }
    }

    const sendEmailCampaign = async (previewOnly: boolean) => {
        setEmailLoading(true)
        setEmailError(null)
        setEmailResult(null)
        try {
            const ctaUrl = emailCtaHref.startsWith('http')
                ? emailCtaHref
                : `${(state.site.url || 'https://algoritmot.com').replace(/\/+$/, '')}${emailCtaHref.startsWith('/') ? emailCtaHref : `/${emailCtaHref}`}`
            const html = `
                <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;">
                    ${emailPreheader ? `<div style="font-size:12px;color:#64748b;margin-bottom:12px;">${emailPreheader}</div>` : ''}
                    <h1 style="font-size:28px;line-height:1.15;margin:0 0 16px 0;">${emailSubject || emailCampaignName}</h1>
                    <div style="font-size:16px;line-height:1.7;white-space:pre-line;margin-bottom:24px;">${emailBodyText || ''}</div>
                    <a href="${ctaUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:.12em;text-transform:uppercase;padding:12px 18px;">${emailCtaLabel || 'Ver más'}</a>
                </div>
            `
            const response = await fetch('/api/admin/email-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignName: emailCampaignName,
                    subject: emailSubject,
                    text: `${emailPreheader}\n\n${emailBodyText}\n\n${emailCtaLabel}: ${ctaUrl}`.trim(),
                    html,
                    recipients: emailRecipientsText,
                    previewOnly,
                }),
            })
            const json = await response.json().catch(() => null)
            if (!response.ok || !json?.ok) throw new Error(json?.error || `HTTP ${response.status}`)
            if (previewOnly) {
                setEmailResult('Preview enviado al primer destinatario válido.')
            } else {
                setEmailResult(`Envío completado: ${json.sent} enviados, ${json.failed} fallidos.`)
            }
        } catch (error) {
            setEmailError(error instanceof Error ? error.message : 'No se pudo enviar campaña')
        } finally {
            setEmailLoading(false)
        }
    }

    const setLandingField = <K extends keyof CampaignLanding>(key: K, value: CampaignLanding[K]) => {
        setLandingDraft((prev) => ({ ...prev, [key]: value }))
    }

    const setLandingSectionField = (index: number, key: keyof CampaignSection, value: string | string[]) => {
        setLandingDraft((prev) => {
            const nextSections = [...prev.sections]
            const current = nextSections[index] || { id: `section-${index + 1}`, title: '', body: '', bullets: [] }
            nextSections[index] = {
                ...current,
                [key]: value,
            } as CampaignSection
            return { ...prev, sections: nextSections }
        })
    }

    const getSelectedLandingSectionIndex = () => {
        if (!landingSelectedBlock.startsWith('section:')) return -1
        const parsed = Number(landingSelectedBlock.split(':')[1] ?? '')
        if (!Number.isFinite(parsed)) return -1
        return parsed
    }

    const reorderLandingSections = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return
        setLandingDraft((prev) => {
            const items = [...prev.sections]
            if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return prev
            const [moved] = items.splice(fromIndex, 1)
            items.splice(toIndex, 0, moved)
            return { ...prev, sections: items }
        })
        const selectedIndex = getSelectedLandingSectionIndex()
        if (selectedIndex === fromIndex) {
            setLandingSelectedBlock(`section:${toIndex}`)
        } else if (selectedIndex > fromIndex && selectedIndex <= toIndex) {
            setLandingSelectedBlock(`section:${selectedIndex - 1}`)
        } else if (selectedIndex < fromIndex && selectedIndex >= toIndex) {
            setLandingSelectedBlock(`section:${selectedIndex + 1}`)
        }
    }

    const addLandingSectionFromTemplate = (templateId: string) => {
        setLandingError(null)
        if (landingDraft.sections.length >= 6) {
            setLandingError('Máximo de 6 secciones por landing.')
            return
        }
        setLandingDraft((prev) => {
            const template = LANDING_WIDGET_TEMPLATES.find((item) => item.id === templateId)
            const seed = template?.section || {
                id: 'section',
                title: 'Nueva sección',
                body: 'Describe un bloque de valor para esta campaña.',
                bullets: ['Punto clave 1', 'Punto clave 2', 'Punto clave 3'],
            }
            const nextSection: CampaignSection = {
                id: ensureUniqueSectionId(seed.id, prev.sections),
                title: seed.title,
                body: seed.body,
                bullets: [...seed.bullets],
            }
            const nextSections = [...prev.sections, nextSection]
            setLandingSelectedBlock(`section:${nextSections.length - 1}`)
            return { ...prev, sections: nextSections }
        })
    }

    const duplicateLandingSection = (index: number) => {
        setLandingError(null)
        if (landingDraft.sections.length >= 6) {
            setLandingError('Máximo de 6 secciones por landing.')
            return
        }
        setLandingDraft((prev) => {
            const source = prev.sections[index]
            if (!source) return prev
            const duplicated: CampaignSection = {
                ...source,
                id: ensureUniqueSectionId(`${source.id}-copy`, prev.sections),
                title: source.title ? `${source.title} (Copia)` : 'Sección (Copia)',
                bullets: [...source.bullets],
            }
            const nextSections = [...prev.sections]
            nextSections.splice(index + 1, 0, duplicated)
            setLandingSelectedBlock(`section:${index + 1}`)
            return { ...prev, sections: nextSections }
        })
    }

    const removeLandingSectionAt = (index: number) => {
        setLandingError(null)
        const confirm = window.confirm('¿Eliminar esta sección del canvas?')
        if (!confirm) return
        setLandingDraft((prev) => {
            const nextSections = prev.sections.filter((_, itemIndex) => itemIndex !== index)
            return { ...prev, sections: nextSections }
        })
        const selectedIndex = getSelectedLandingSectionIndex()
        if (selectedIndex === index) {
            const nextLength = Math.max(landingDraft.sections.length - 1, 0)
            setLandingSelectedBlock(nextLength > 0 ? `section:${Math.max(0, index - 1)}` : 'hero')
        } else if (selectedIndex > index) {
            setLandingSelectedBlock(`section:${selectedIndex - 1}`)
        }
    }

    const moveLandingSelectedSection = (direction: -1 | 1) => {
        const selectedIndex = getSelectedLandingSectionIndex()
        if (selectedIndex < 0) return
        const target = selectedIndex + direction
        if (target < 0 || target >= landingDraft.sections.length) return
        reorderLandingSections(selectedIndex, target)
    }

    const generateAiLanding = async () => {
        setLandingLoading(true)
        setLandingError(null)
        setLandingProviderUsed(null)
        try {
            const response = await fetch('/api/admin/ai-landing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignName: landingCampaignName,
                    objective: landingObjective,
                    audience: landingAudience,
                    tone: landingTone,
                    provider: aiProvider,
                    locale: 'es',
                }),
            })
            const json = await response.json().catch(() => null)
            if (!response.ok || !json?.ok) throw new Error(json?.error || `HTTP ${response.status}`)
            setLandingProviderUsed(json.providerUsed || null)
            setLandingDraft(json.landing as CampaignLanding)
            setLandingSelectedBlock('hero')
        } catch (error) {
            setLandingError(error instanceof Error ? error.message : 'No se pudo generar landing')
        } finally {
            setLandingLoading(false)
        }
    }

    const saveLanding = async () => {
        setLandingLoading(true)
        setLandingError(null)
        try {
            const normalized = {
                ...landingDraft,
                slug: landingDraft.slug || slugify(landingDraft.name || landingDraft.heroTitle),
                name: landingDraft.name || landingCampaignName,
                objective: landingDraft.objective || landingObjective,
                audience: landingDraft.audience || landingAudience,
                tone: landingDraft.tone || landingTone,
            }
            const response = await fetch('/api/admin/campaign-landings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ landing: normalized }),
            })
            const json = await response.json().catch(() => null)
            if (!response.ok || !json?.ok) throw new Error(json?.error || `HTTP ${response.status}`)
            const persisted = (json.landing || normalized) as CampaignLanding
            setLandingDraft(persisted)
            setLandingSelectedBlock('hero')
            setLandingItems(Array.isArray(json.items) ? json.items : [])
        } catch (error) {
            setLandingError(error instanceof Error ? error.message : 'No se pudo guardar landing')
        } finally {
            setLandingLoading(false)
        }
    }

    const removeLanding = async (idOrSlug: string) => {
        const ok = window.confirm('¿Eliminar esta landing de campaña?')
        if (!ok) return
        setLandingLoading(true)
        setLandingError(null)
        try {
            const response = await fetch('/api/admin/campaign-landings', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: idOrSlug }),
            })
            const json = await response.json().catch(() => null)
            if (!response.ok || !json?.ok) throw new Error(json?.error || `HTTP ${response.status}`)
            setLandingItems(Array.isArray(json.items) ? json.items : [])
            if (landingDraft.id === idOrSlug || landingDraft.slug === idOrSlug) {
                setLandingDraft(createEmptyLanding())
                setLandingSelectedBlock('hero')
            }
        } catch (error) {
            setLandingError(error instanceof Error ? error.message : 'No se pudo eliminar landing')
        } finally {
            setLandingLoading(false)
        }
    }

    const openLanding = (landing: CampaignLanding) => {
        setLandingDraft(landing)
        setLandingCampaignName(landing.name)
        setLandingObjective(landing.objective)
        setLandingAudience(landing.audience)
        setLandingTone(landing.tone)
        setLandingSelectedBlock('hero')
    }

    const resetLandingEditor = () => {
        setLandingDraft(createEmptyLanding())
        setLandingCampaignName('Campaña Transformación 2026')
        setLandingObjective('Captar leads calificados para sesiones de diagnóstico.')
        setLandingAudience('Gerencias y dirección')
        setLandingTone('Ejecutivo y persuasivo')
        setLandingSelectedBlock('hero')
    }

    const landingPreviewUrl = landingDraft.slug ? `/campanias/${landingDraft.slug}${landingDraft.status === 'draft' ? '?preview=1' : ''}` : null
    const selectedLandingSectionIndex = getSelectedLandingSectionIndex()
    const selectedLandingSection = selectedLandingSectionIndex >= 0 ? landingDraft.sections[selectedLandingSectionIndex] : null
    const landingCanvasWidthClass =
        landingViewport === 'mobile'
            ? 'max-w-sm'
            : landingViewport === 'tablet'
                ? 'max-w-3xl'
                : 'max-w-full'

    return (
        <div className="space-y-12 pb-20">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Centro de Marketing</h1>
                    <p className="text-slate-500 font-light">Email marketing, popup builder, AI de campañas y landingpages focalizadas.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-52">
                        <SelectField
                            value={aiProvider}
                            onChange={(v) => setAiProvider(v as AIProvider)}
                            options={[
                                { value: 'auto', label: 'IA: Auto (OpenAI/Gemini)' },
                                { value: 'openai', label: 'IA: OpenAI' },
                                { value: 'gemini', label: 'IA: Gemini' },
                            ]}
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-4 bg-brand-primary text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-800 transition-colors"
                    >
                        <Save className="w-5 h-5" />
                        Guardar Marketing
                    </button>
                </div>
            </div>

            {saved && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 px-6 py-4 text-green-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Configuración de marketing guardada
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-white border border-slate-200 p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Megaphone className="w-5 h-5 text-brand-primary" />
                        <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Popup Builder</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Popup activo">
                            <SelectField
                                value={draft.popupEnabled}
                                onChange={(v) => setSite('popupEnabled', v)}
                                options={[
                                    { value: 'false', label: 'Desactivado' },
                                    { value: 'true', label: 'Activado' },
                                ]}
                            />
                        </Field>
                        <Field label="Trigger">
                            <SelectField
                                value={draft.popupTrigger}
                                onChange={(v) => setSite('popupTrigger', v)}
                                options={[
                                    { value: 'time', label: 'Por tiempo' },
                                    { value: 'scroll', label: 'Por scroll' },
                                    { value: 'exit', label: 'Por intención de salida' },
                                ]}
                            />
                        </Field>
                        <Field label="Páginas objetivo">
                            <SelectField
                                value={draft.popupPages}
                                onChange={(v) => setSite('popupPages', v)}
                                options={[
                                    { value: 'all', label: 'Todo el sitio' },
                                    { value: 'home', label: 'Solo Home' },
                                    { value: 'services', label: 'Servicios' },
                                    { value: 'products', label: 'Productos' },
                                    { value: 'protocols', label: 'Protocolos' },
                                ]}
                            />
                        </Field>
                        <Field label="Frecuencia">
                            <SelectField
                                value={draft.popupFrequency}
                                onChange={(v) => setSite('popupFrequency', v)}
                                options={[
                                    { value: 'once_session', label: '1 vez por sesión' },
                                    { value: 'once_day', label: '1 vez por día' },
                                    { value: 'always', label: 'Siempre mostrar' },
                                ]}
                            />
                        </Field>
                        <Field label="Delay (segundos)">
                            <Input value={draft.popupDelaySeconds} onChange={(e) => setSite('popupDelaySeconds', e.target.value)} />
                        </Field>
                        <Field label="Scroll %">
                            <Input value={draft.popupScrollPercent} onChange={(e) => setSite('popupScrollPercent', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Título popup">
                        <Input value={draft.popupTitle} onChange={(e) => setSite('popupTitle', e.target.value)} />
                    </Field>
                    <Field label="Mensaje popup">
                        <Textarea rows={3} value={draft.popupBody} onChange={(e) => setSite('popupBody', e.target.value)} />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="CTA label">
                            <Input value={draft.popupCtaLabel} onChange={(e) => setSite('popupCtaLabel', e.target.value)} />
                        </Field>
                        <Field label="CTA URL">
                            <Input value={draft.popupCtaHref} onChange={(e) => setSite('popupCtaHref', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Label botón dismiss">
                        <Input value={draft.popupDismissLabel} onChange={(e) => setSite('popupDismissLabel', e.target.value)} />
                    </Field>
                    <div className="border border-slate-200 bg-slate-50 p-5">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview</div>
                        <div className="mt-3 text-xl font-black tracking-tight text-slate-900">{popupPreview.title}</div>
                        <div className="mt-2 text-sm text-slate-600">{popupPreview.body}</div>
                        <div className="mt-4 flex items-center gap-2">
                            <span className="px-3 py-2 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest">{popupPreview.ctaLabel}</span>
                            <span className="px-3 py-2 border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600">{popupPreview.dismissLabel}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white border border-slate-200 p-8 space-y-5">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-brand-primary" />
                            <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">AI Popup Copy</h2>
                        </div>
                        <Field label="Objetivo">
                            <Textarea rows={3} value={aiObjective} onChange={(e) => setAiObjective(e.target.value)} />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Audiencia">
                                <Input value={aiAudience} onChange={(e) => setAiAudience(e.target.value)} />
                            </Field>
                            <Field label="Tono">
                                <Input value={aiTone} onChange={(e) => setAiTone(e.target.value)} />
                            </Field>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={generateAiCopy}
                                disabled={aiLoading}
                                className="h-11 px-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 disabled:opacity-60"
                            >
                                {aiLoading ? 'Generando...' : 'Generar copy con IA'}
                            </button>
                            {aiLoading && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
                            {aiProviderUsed && (
                                <div className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-blue-200 bg-blue-50 text-brand-primary">
                                    {aiProviderUsed}
                                </div>
                            )}
                        </div>
                        {aiError && <div className="bg-red-50 border border-red-200 p-3 text-sm text-red-700">{aiError}</div>}
                    </div>

                    <div className="bg-white border border-slate-200 p-8 space-y-5">
                        <div className="flex items-center gap-3">
                            <FlaskConical className="w-5 h-5 text-brand-primary" />
                            <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Formulario de Conversión</h2>
                        </div>
                        <Field label="Mensaje éxito formulario">
                            <Textarea rows={3} value={draft.formSuccessMessage} onChange={(e) => setSite('formSuccessMessage', e.target.value)} />
                        </Field>
                        <Field label="Mensaje error formulario">
                            <Textarea rows={3} value={draft.formErrorMessage} onChange={(e) => setSite('formErrorMessage', e.target.value)} />
                        </Field>
                        <div className="text-xs text-slate-500">
                            El formulario envía `POST /api/contact-submit`. Puedes integrar automatizaciones vía `CONTACT_FORM_WEBHOOK_URL`.
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 p-8 space-y-6">
                <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-brand-primary" />
                    <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Email Marketing</h2>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <Field label="Nombre de campaña">
                            <Input value={emailCampaignName} onChange={(e) => setEmailCampaignName(e.target.value)} />
                        </Field>
                        <Field label="Objetivo de campaña (IA)">
                            <Textarea rows={3} value={emailObjective} onChange={(e) => setEmailObjective(e.target.value)} />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Audiencia">
                                <Input value={emailAudience} onChange={(e) => setEmailAudience(e.target.value)} />
                            </Field>
                            <Field label="Tono">
                                <Input value={emailTone} onChange={(e) => setEmailTone(e.target.value)} />
                            </Field>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={generateAiEmail}
                                disabled={emailLoading}
                                className="h-11 px-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 disabled:opacity-60"
                            >
                                <WandSparkles className="w-4 h-4 inline mr-2" />
                                Generar email con IA
                            </button>
                            {emailProviderUsed && (
                                <div className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-blue-200 bg-blue-50 text-brand-primary">
                                    {emailProviderUsed}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Field label="Asunto">
                            <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                        </Field>
                        <Field label="Preheader">
                            <Input value={emailPreheader} onChange={(e) => setEmailPreheader(e.target.value)} />
                        </Field>
                        <Field label="Body (texto)">
                            <Textarea rows={8} value={emailBodyText} onChange={(e) => setEmailBodyText(e.target.value)} />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="CTA label">
                                <Input value={emailCtaLabel} onChange={(e) => setEmailCtaLabel(e.target.value)} />
                            </Field>
                            <Field label="CTA href">
                                <Input value={emailCtaHref} onChange={(e) => setEmailCtaHref(e.target.value)} />
                            </Field>
                        </div>
                        <Field label="Destinatarios (emails separados por coma o salto de línea)">
                            <Textarea rows={5} value={emailRecipientsText} onChange={(e) => setEmailRecipientsText(e.target.value)} />
                        </Field>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => sendEmailCampaign(true)}
                                disabled={emailLoading}
                                className="h-11 px-4 border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900"
                            >
                                Enviar preview
                            </button>
                            <button
                                type="button"
                                onClick={() => sendEmailCampaign(false)}
                                disabled={emailLoading}
                                className="h-11 px-4 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 disabled:opacity-60"
                            >
                                <Send className="w-4 h-4 inline mr-2" />
                                Enviar campaña
                            </button>
                            {emailLoading && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
                        </div>
                        {emailError && <div className="bg-red-50 border border-red-200 p-3 text-sm text-red-700">{emailError}</div>}
                        {emailResult && <div className="bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{emailResult}</div>}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Rocket className="w-5 h-5 text-brand-primary" />
                        <div>
                            <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Landing Builder Visual</h2>
                            <p className="text-xs text-slate-500 mt-1">Experiencia tipo Elementor: widgets, canvas en vivo e inspector contextual.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={resetLandingEditor}
                            className="h-10 px-3 border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600"
                        >
                            <Plus className="w-3 h-3 inline mr-1" />
                            Nueva
                        </button>
                        <button
                            type="button"
                            onClick={() => void loadLandings()}
                            className="h-10 px-3 border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600"
                        >
                            <RefreshCw className={`w-3 h-3 inline mr-1 ${landingListLoading ? 'animate-spin' : ''}`} />
                            Refrescar
                        </button>
                        <button
                            type="button"
                            onClick={saveLanding}
                            disabled={landingLoading}
                            className="h-10 px-4 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 disabled:opacity-60"
                        >
                            Guardar landing
                        </button>
                        {landingPreviewUrl && (
                            <a
                                href={landingPreviewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="h-10 px-3 border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 inline-flex items-center"
                            >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Ver preview
                            </a>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 2xl:grid-cols-[300px_minmax(0,1fr)_360px] gap-6">
                    <div className="space-y-4">
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                            <div className="flex items-center gap-2 mb-3">
                                <LayoutTemplate className="w-4 h-4 text-brand-primary" />
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Widgets</div>
                            </div>
                            <p className="text-xs text-slate-500 mb-3">Agrega bloques al canvas. Límite: 6 secciones.</p>
                            <div className="space-y-2">
                                {LANDING_WIDGET_TEMPLATES.map((template) => (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => addLandingSectionFromTemplate(template.id)}
                                        className="w-full text-left border border-slate-200 bg-white rounded-xl p-3 hover:border-brand-primary/30 transition-colors"
                                    >
                                        <div className="text-xs font-black uppercase tracking-wider text-slate-800">{template.label}</div>
                                        <div className="text-[11px] text-slate-500 mt-1">{template.description}</div>
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => addLandingSectionFromTemplate('blank')}
                                    className="w-full h-10 border border-dashed border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-brand-primary/40 hover:text-brand-primary"
                                >
                                    + Sección en blanco
                                </button>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">AI Brief</div>
                            <Field label="Nombre campaña">
                                <Input value={landingCampaignName} onChange={(e) => setLandingCampaignName(e.target.value)} />
                            </Field>
                            <Field label="Objetivo">
                                <Textarea rows={3} value={landingObjective} onChange={(e) => setLandingObjective(e.target.value)} />
                            </Field>
                            <div className="grid grid-cols-1 gap-3">
                                <Field label="Audiencia">
                                    <Input value={landingAudience} onChange={(e) => setLandingAudience(e.target.value)} />
                                </Field>
                                <Field label="Tono">
                                    <Input value={landingTone} onChange={(e) => setLandingTone(e.target.value)} />
                                </Field>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={generateAiLanding}
                                    disabled={landingLoading}
                                    className="h-10 px-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 disabled:opacity-60"
                                >
                                    <WandSparkles className="w-3 h-3 inline mr-1" />
                                    Generar IA
                                </button>
                                {landingProviderUsed && (
                                    <div className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-blue-200 bg-blue-50 text-brand-primary">
                                        {landingProviderUsed}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-2xl p-4 bg-white">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Landings guardadas</div>
                            {landingListError && <div className="text-sm text-red-700 mb-2">{landingListError}</div>}
                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                {landingItems.map((item) => (
                                    <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-slate-900 truncate">{item.name || item.heroTitle || item.slug}</div>
                                                <div className="text-[10px] text-slate-400 font-mono truncate">/{item.slug}</div>
                                            </div>
                                            <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${item.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                                {item.status}
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openLanding(item)}
                                                className="h-8 px-2 border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600"
                                            >
                                                Editar
                                            </button>
                                            <a
                                                href={`/campanias/${item.slug}${item.status === 'draft' ? '?preview=1' : ''}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="h-8 px-2 border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 inline-flex items-center"
                                            >
                                                <ExternalLink className="w-3 h-3 mr-1" />
                                                Ver
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => void removeLanding(item.id)}
                                                className="h-8 px-2 border border-red-200 bg-red-50 text-[10px] font-black uppercase tracking-widest text-red-700"
                                            >
                                                <Trash2 className="w-3 h-3 inline mr-1" />
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {landingItems.length === 0 && (
                                    <div className="text-xs text-slate-500">Aún no hay landings guardadas.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                        <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Canvas</div>
                                <div className="text-sm font-bold text-slate-900">Drag & drop de secciones</div>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
                                {([
                                    { value: 'desktop', icon: Monitor, label: 'Desktop' },
                                    { value: 'tablet', icon: Tablet, label: 'Tablet' },
                                    { value: 'mobile', icon: Smartphone, label: 'Mobile' },
                                ] as const).map((option) => {
                                    const Icon = option.icon
                                    const active = landingViewport === option.value
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setLandingViewport(option.value)}
                                            title={`Vista ${option.label}`}
                                            className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-blue-50 text-brand-primary border border-blue-100' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="p-4">
                            <div className={`mx-auto space-y-3 ${landingCanvasWidthClass}`}>
                                <button
                                    type="button"
                                    onClick={() => setLandingSelectedBlock('hero')}
                                    className={`w-full text-left rounded-2xl border p-4 transition-all ${landingSelectedBlock === 'hero' ? 'border-brand-primary bg-white shadow-md shadow-blue-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                >
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hero</div>
                                    <div className="text-xl font-black tracking-tight text-slate-900 mt-2">{landingDraft.heroTitle || 'Titular principal de campaña'}</div>
                                    <div className="text-sm text-slate-500 mt-2 line-clamp-2">{landingDraft.heroSubtitle || 'Subtítulo de apoyo para propuesta de valor.'}</div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: landingDraft.accentColor || '#2563eb' }}>
                                            {landingDraft.primaryCtaLabel || 'CTA Principal'}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-300 text-slate-600">
                                            {landingDraft.secondaryCtaLabel || 'CTA Secundario'}
                                        </span>
                                    </div>
                                </button>

                                {landingDraft.sections.map((section, index) => (
                                    <div
                                        key={`${section.id}-${index}`}
                                        draggable
                                        onDragStart={() => setLandingDraggedSectionIndex(index)}
                                        onDragEnd={() => setLandingDraggedSectionIndex(null)}
                                        onDragOver={(event) => {
                                            event.preventDefault()
                                            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
                                        }}
                                        onDrop={(event) => {
                                            event.preventDefault()
                                            if (landingDraggedSectionIndex === null) return
                                            reorderLandingSections(landingDraggedSectionIndex, index)
                                            setLandingDraggedSectionIndex(null)
                                        }}
                                        className={`rounded-2xl border p-4 bg-white transition-all ${landingSelectedBlock === `section:${index}` ? 'border-brand-primary shadow-md shadow-blue-100' : 'border-slate-200 hover:border-slate-300'} ${landingDraggedSectionIndex === index ? 'opacity-60' : ''}`}
                                        onClick={() => setLandingSelectedBlock(`section:${index}`)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="pt-0.5 text-slate-300">
                                                <GripVertical className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sección {index + 1}</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-slate-200 text-slate-500">{section.id || `section-${index + 1}`}</span>
                                                </div>
                                                <div className="text-base font-black text-slate-900 mt-2">{section.title || 'Título de bloque'}</div>
                                                <div className="text-xs text-slate-500 mt-1 line-clamp-3">{section.body || 'Describe el contenido de esta sección.'}</div>
                                                {section.bullets.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {section.bullets.slice(0, 3).map((bullet, bulletIndex) => (
                                                            <span key={`${section.id}-bullet-${bulletIndex}`} className="text-[10px] px-2 py-0.5 border border-slate-200 rounded-full text-slate-600">
                                                                {bullet}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        duplicateLandingSection(index)
                                                    }}
                                                    className="h-7 px-2 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800"
                                                >
                                                    Copiar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        removeLandingSectionAt(index)
                                                    }}
                                                    className="h-7 px-2 border border-red-200 bg-red-50 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-700"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => setLandingSelectedBlock('offer')}
                                    className={`w-full text-left rounded-2xl border p-4 transition-all ${landingSelectedBlock === 'offer' ? 'border-brand-primary bg-slate-900 text-white shadow-md shadow-slate-300' : 'border-slate-200 bg-slate-900 text-white/90 hover:border-slate-400'}`}
                                >
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Oferta</div>
                                    <div className="text-xl font-black tracking-tight mt-2">{landingDraft.offerTitle || 'Título de la oferta'}</div>
                                    <div className="text-sm mt-2 text-white/70 line-clamp-2">{landingDraft.offerBody || 'Contenido de oferta para impulsar conversión.'}</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setLandingSelectedBlock('form')}
                                    className={`w-full text-left rounded-2xl border p-4 transition-all ${landingSelectedBlock === 'form' ? 'border-brand-primary bg-white shadow-md shadow-blue-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                >
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formulario</div>
                                    <div className="text-lg font-black tracking-tight text-slate-900 mt-2">{landingDraft.formTitle || 'Título de formulario'}</div>
                                    <div className="text-xs text-slate-500 mt-2 line-clamp-2">{landingDraft.thankYouMessage || 'Mensaje mostrado luego de enviar contacto.'}</div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="border border-slate-200 rounded-2xl p-4 bg-white">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inspector</div>
                            <h3 className="text-sm font-black tracking-tight text-slate-900 mt-1">Bloque seleccionado</h3>

                            {landingSelectedBlock === 'hero' && (
                                <div className="mt-4 space-y-3">
                                    <Field label="Eyebrow">
                                        <Input value={landingDraft.heroEyebrow} onChange={(e) => setLandingField('heroEyebrow', e.target.value)} />
                                    </Field>
                                    <Field label="Hero title">
                                        <Input value={landingDraft.heroTitle} onChange={(e) => setLandingField('heroTitle', e.target.value)} />
                                    </Field>
                                    <Field label="Hero subtitle">
                                        <Textarea rows={3} value={landingDraft.heroSubtitle} onChange={(e) => setLandingField('heroSubtitle', e.target.value)} />
                                    </Field>
                                    <div className="grid grid-cols-1 gap-3">
                                        <Field label="CTA principal">
                                            <Input value={landingDraft.primaryCtaLabel} onChange={(e) => setLandingField('primaryCtaLabel', e.target.value)} />
                                        </Field>
                                        <Field label="Href principal">
                                            <Input value={landingDraft.primaryCtaHref} onChange={(e) => setLandingField('primaryCtaHref', e.target.value)} />
                                        </Field>
                                        <Field label="CTA secundario">
                                            <Input value={landingDraft.secondaryCtaLabel} onChange={(e) => setLandingField('secondaryCtaLabel', e.target.value)} />
                                        </Field>
                                        <Field label="Href secundario">
                                            <Input value={landingDraft.secondaryCtaHref} onChange={(e) => setLandingField('secondaryCtaHref', e.target.value)} />
                                        </Field>
                                    </div>
                                </div>
                            )}

                            {landingSelectedBlock.startsWith('section:') && selectedLandingSection && (
                                <div className="mt-4 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-slate-200 text-slate-500">
                                            Sección {selectedLandingSectionIndex + 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => moveLandingSelectedSection(-1)}
                                            disabled={selectedLandingSectionIndex <= 0}
                                            className="h-8 px-2 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-40"
                                        >
                                            Subir
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveLandingSelectedSection(1)}
                                            disabled={selectedLandingSectionIndex >= landingDraft.sections.length - 1}
                                            className="h-8 px-2 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-40"
                                        >
                                            Bajar
                                        </button>
                                    </div>
                                    <Field label="ID sección">
                                        <Input
                                            value={selectedLandingSection.id}
                                            onChange={(event) => setLandingSectionField(selectedLandingSectionIndex, 'id', event.target.value)}
                                        />
                                    </Field>
                                    <Field label="Título">
                                        <Input
                                            value={selectedLandingSection.title}
                                            onChange={(event) => setLandingSectionField(selectedLandingSectionIndex, 'title', event.target.value)}
                                        />
                                    </Field>
                                    <Field label="Cuerpo">
                                        <Textarea
                                            rows={4}
                                            value={selectedLandingSection.body}
                                            onChange={(event) => setLandingSectionField(selectedLandingSectionIndex, 'body', event.target.value)}
                                        />
                                    </Field>
                                    <Field label="Bullets (uno por línea)">
                                        <Textarea
                                            rows={4}
                                            value={selectedLandingSection.bullets.join('\n')}
                                            onChange={(event) =>
                                                setLandingSectionField(
                                                    selectedLandingSectionIndex,
                                                    'bullets',
                                                    event.target.value.split('\n').map((line) => line.trim()).filter(Boolean)
                                                )
                                            }
                                        />
                                    </Field>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => duplicateLandingSection(selectedLandingSectionIndex)}
                                            className="h-8 px-3 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500"
                                        >
                                            Duplicar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeLandingSectionAt(selectedLandingSectionIndex)}
                                            className="h-8 px-3 border border-red-200 bg-red-50 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-700"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {landingSelectedBlock === 'offer' && (
                                <div className="mt-4 space-y-3">
                                    <Field label="Offer title">
                                        <Input value={landingDraft.offerTitle} onChange={(e) => setLandingField('offerTitle', e.target.value)} />
                                    </Field>
                                    <Field label="Offer body">
                                        <Textarea rows={4} value={landingDraft.offerBody} onChange={(e) => setLandingField('offerBody', e.target.value)} />
                                    </Field>
                                </div>
                            )}

                            {landingSelectedBlock === 'form' && (
                                <div className="mt-4 space-y-3">
                                    <Field label="Form title">
                                        <Input value={landingDraft.formTitle} onChange={(e) => setLandingField('formTitle', e.target.value)} />
                                    </Field>
                                    <Field label="Mensaje thank you">
                                        <Textarea rows={3} value={landingDraft.thankYouMessage} onChange={(e) => setLandingField('thankYouMessage', e.target.value)} />
                                    </Field>
                                </div>
                            )}
                        </div>

                        <div className="border border-slate-200 rounded-2xl p-4 bg-white">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ajustes de página</div>
                            <h3 className="text-sm font-black tracking-tight text-slate-900 mt-1">SEO + publicación</h3>
                            <div className="mt-4 space-y-3">
                                <Field label="Slug">
                                    <Input value={landingDraft.slug} onChange={(e) => setLandingField('slug', e.target.value)} />
                                </Field>
                                <Field label="Estado">
                                    <SelectField
                                        value={landingDraft.status}
                                        onChange={(value) => setLandingField('status', value as CampaignLanding['status'])}
                                        options={[
                                            { value: 'draft', label: 'Draft' },
                                            { value: 'published', label: 'Published' },
                                        ]}
                                    />
                                </Field>
                                <Field label="Nombre interno">
                                    <Input value={landingDraft.name} onChange={(e) => setLandingField('name', e.target.value)} />
                                </Field>
                                <Field label="SEO title">
                                    <Input value={landingDraft.seoTitle} onChange={(e) => setLandingField('seoTitle', e.target.value)} />
                                </Field>
                                <Field label="SEO description">
                                    <Textarea rows={3} value={landingDraft.seoDescription} onChange={(e) => setLandingField('seoDescription', e.target.value)} />
                                </Field>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Field label="Accent color">
                                        <Input value={landingDraft.accentColor} onChange={(e) => setLandingField('accentColor', e.target.value)} />
                                    </Field>
                                    <Field label="Background style">
                                        <SelectField
                                            value={landingDraft.backgroundStyle}
                                            onChange={(value) => setLandingField('backgroundStyle', value)}
                                            options={[
                                                { value: 'dark-grid', label: 'Dark grid' },
                                                { value: 'light-grid', label: 'Light grid' },
                                            ]}
                                        />
                                    </Field>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {landingLoading && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                        Procesando cambios de landing...
                    </div>
                )}
                {landingError && <div className="bg-red-50 border border-red-200 p-3 text-sm text-red-700">{landingError}</div>}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <FlaskConical className="w-5 h-5 text-brand-primary" />
                        <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Selector de Variantes A/B</h2>
                    </div>

                    {state.services.map((service) => {
                        const currentVariant = selected[service.slug] || service.ctaPrimary
                        const allOptions = [
                            service.ctaPrimary,
                            service.ctaSecondary,
                            ...((service.variants ?? []).map((v) => v.titular).filter(Boolean)).slice(0, 4),
                        ].filter(Boolean)

                        return (
                            <div key={service.slug} className="bg-white border border-slate-200 p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="font-black text-slate-900 tracking-tighter">{service.title}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{service.highlight}</div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary bg-blue-50 px-2 py-1">Activo</span>
                                </div>

                                <div className="space-y-2">
                                    {allOptions.map((variant, i) => (
                                        <button
                                            key={i}
                                            onClick={() => pick(service.slug, variant)}
                                            className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm font-bold transition-all border ${currentVariant === variant
                                                ? 'bg-brand-primary text-white border-brand-primary'
                                                : 'bg-slate-50 text-slate-700 border-transparent hover:border-slate-200'
                                                }`}
                                        >
                                            <span>{variant}</span>
                                            {i === 0 && (
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 ${currentVariant === variant ? 'bg-white/20 text-white' : 'bg-blue-50 text-brand-primary'}`}>
                                                    Original
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Megaphone className="w-5 h-5 text-brand-primary" />
                        <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Constructor de UTM</h2>
                    </div>

                    <div className="bg-white border border-slate-200 p-8 space-y-6 sticky top-8">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">utm_source</label>
                                <input
                                    type="text"
                                    value={utmSource}
                                    onChange={(e) => setUtmSource(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 p-3 font-mono text-sm text-slate-900 focus:border-brand-primary outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">utm_medium</label>
                                <input
                                    type="text"
                                    value={utmMedium}
                                    onChange={(e) => setUtmMedium(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 p-3 font-mono text-sm text-slate-900 focus:border-brand-primary outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">utm_campaign</label>
                                <input
                                    type="text"
                                    value={utmCampaign}
                                    onChange={(e) => setUtmCampaign(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 p-3 font-mono text-sm text-slate-900 focus:border-brand-primary outline-none"
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6 space-y-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">URLs Generadas</div>
                            {state.services.map((service) => {
                                const url = buildUTM(`/servicios/${service.slug}`)
                                return (
                                    <div key={service.slug} className="flex items-center gap-3 group">
                                        <div className="flex-1 bg-slate-50 px-3 py-2 font-mono text-[10px] text-slate-500 truncate border border-slate-100">
                                            {url}
                                        </div>
                                        <button
                                            onClick={() => handleCopy(service.slug, url)}
                                            className="p-2 text-slate-400 hover:text-brand-primary transition-colors shrink-0"
                                            title="Copiar URL"
                                        >
                                            {copiedId === service.slug
                                                ? <Link className="w-4 h-4 text-green-500" />
                                                : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 p-8 space-y-5">
                <div className="flex items-center gap-3">
                    <Accessibility className="w-5 h-5 text-brand-primary" />
                    <h2 className="font-black uppercase tracking-[0.3em] text-xs text-slate-900">Escaneo de Accesibilidad (rápido)</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                    <Input value={scanPath} onChange={(e) => setScanPath(e.target.value)} placeholder="/, /servicios/adn-digital, /productos/..." />
                    <button
                        type="button"
                        onClick={runAccessibilityScan}
                        disabled={scanLoading}
                        className="h-11 px-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 disabled:opacity-60"
                    >
                        {scanLoading ? 'Escaneando...' : 'Ejecutar scan'}
                    </button>
                </div>
                {scanError && <div className="bg-red-50 border border-red-200 p-3 text-sm text-red-700">{scanError}</div>}
                {scanScore !== null && (
                    <div className="border border-slate-200 bg-slate-50 p-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Score A11Y</div>
                        <div className="text-3xl font-black tracking-tight text-slate-900 mt-1">{scanScore}/100</div>
                    </div>
                )}
                {scanFindings.length > 0 && (
                    <div className="space-y-3">
                        {scanFindings.map((finding) => (
                            <div key={finding.id} className="border border-slate-200 p-4 bg-white">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-bold text-slate-900">{finding.message}</div>
                                    <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${finding.severity === 'high' ? 'border-red-200 bg-red-50 text-red-700' : finding.severity === 'medium' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                        {finding.severity} · {finding.count}
                                    </div>
                                </div>
                                {finding.samples && finding.samples.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {finding.samples.map((sample, idx) => (
                                            <div key={`${finding.id}-${idx}`} className="bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-[10px] text-slate-500 break-all">
                                                {sample}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
