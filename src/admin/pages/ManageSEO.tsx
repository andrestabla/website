import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Edit2,
  ExternalLink,
  Gauge,
  Save,
  Search,
  WandSparkles,
  X,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useCMS } from '../context/CMSContext'

type EntrySource = 'sitePage' | 'service' | 'product'
type EntryHealth = 'critical' | 'warning' | 'healthy'

type SeoEntry = {
  key: string
  entityId: string
  source: EntrySource
  path: string
  label: string
  title: string
  description: string
  defaultTitle: string
  defaultDescription: string
  status: 'published' | 'draft'
  indexable: boolean
}

type SeoIssue = {
  severity: 'critical' | 'warning' | 'info'
  code: string
  message: string
}

function normalizePath(input: string) {
  const raw = String(input || '').trim()
  if (!raw) return '/'
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`
  if (withSlash === '/') return '/'
  return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash
}

function normalizeBaseUrl(input: string) {
  const raw = String(input || '').trim()
  const fallback = 'https://www.algoritmot.com'
  if (!raw) return fallback
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const parsed = new URL(normalized)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return fallback
  }
}

function isDynamicTemplatePath(path: string) {
  return path.includes('/:') || path.includes('*') || path.includes('[') || path.includes(':')
}

function isIndexablePath(path: string) {
  const normalized = normalizePath(path)
  if (normalized === '/' || normalized === '/inicio') return false
  if (!normalized.startsWith('/')) return false
  if (normalized.startsWith('/admin')) return false
  if (normalized.startsWith('/api')) return false
  if (isDynamicTemplatePath(normalized)) return false
  return true
}

function normalizeText(input: string) {
  return String(input || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function limitText(input: string, max: number) {
  const text = String(input || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trim()}...`
}

function scoreTitle(title: string) {
  const len = title.trim().length
  if (len >= 45 && len <= 65) return 'optimal'
  if (len >= 35 && len <= 75) return 'ok'
  return 'poor'
}

function scoreDescription(description: string) {
  const len = description.trim().length
  if (len >= 120 && len <= 165) return 'optimal'
  if (len >= 90 && len <= 180) return 'ok'
  return 'poor'
}

function scoreColor(score: 'optimal' | 'ok' | 'poor') {
  if (score === 'optimal') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (score === 'ok') return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-rose-700 bg-rose-50 border-rose-200'
}

function getTypeLabel(source: EntrySource) {
  if (source === 'sitePage') return 'Página'
  if (source === 'service') return 'Servicio'
  return 'Producto'
}

function buildIssues(entry: SeoEntry, duplicateTitleCount: number, duplicateDescriptionCount: number): SeoIssue[] {
  const issues: SeoIssue[] = []
  const title = String(entry.title || '').trim()
  const description = String(entry.description || '').trim()

  if (!entry.indexable) {
    issues.push({ severity: 'info', code: 'noindex', message: 'Ruta no indexable (template, admin o redirección).' })
  }
  if (entry.status === 'draft') {
    issues.push({ severity: 'warning', code: 'draft', message: 'Página en borrador: evitar indexación hasta publicar.' })
  }
  if (!title) {
    issues.push({ severity: 'critical', code: 'missing_title', message: 'Falta SEO title.' })
  }
  if (!description) {
    issues.push({ severity: 'critical', code: 'missing_description', message: 'Falta SEO description.' })
  }

  if (title) {
    const len = title.length
    if (len < 35 || len > 75) {
      issues.push({ severity: 'warning', code: 'title_length', message: `Longitud de title fuera de rango recomendado (${len} chars).` })
    }
  }

  if (description) {
    const len = description.length
    if (len < 90 || len > 180) {
      issues.push({ severity: 'warning', code: 'description_length', message: `Longitud de description fuera de rango recomendado (${len} chars).` })
    }
  }

  if (duplicateTitleCount > 1 && title) {
    issues.push({ severity: 'warning', code: 'duplicate_title', message: 'Title duplicado en más de una URL.' })
  }
  if (duplicateDescriptionCount > 1 && description) {
    issues.push({ severity: 'warning', code: 'duplicate_description', message: 'Description duplicada en más de una URL.' })
  }

  return issues
}

function entryHealth(issues: SeoIssue[]): EntryHealth {
  if (issues.some((issue) => issue.severity === 'critical')) return 'critical'
  if (issues.some((issue) => issue.severity === 'warning')) return 'warning'
  return 'healthy'
}

export function ManageSEO() {
  const { state, updateService, updateProduct, updateSiteArchitecturePage } = useCMS()
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draft, setDraft] = useState({ title: '', description: '' })
  const [query, setQuery] = useState('')
  const [healthFilter, setHealthFilter] = useState<'all' | 'critical' | 'warning' | 'healthy'>('all')

  const baseUrl = useMemo(() => normalizeBaseUrl(state.site.url), [state.site.url])

  const entries = useMemo(() => {
    const sitePageEntries: SeoEntry[] = state.siteArchitecture.pages
      .filter((page) => !!page.path && !isDynamicTemplatePath(page.path))
      .map((page) => {
        const path = normalizePath(page.path)
        return {
          key: `page:${page.id}`,
          entityId: page.id,
          source: 'sitePage' as const,
          path,
          label: page.title || path,
          title: page.title || '',
          description: page.description || '',
          defaultTitle: page.title || path,
          defaultDescription: page.description || state.site.description || '',
          status: page.status,
          indexable: page.status === 'published' && isIndexablePath(path),
        }
      })

    const serviceEntries: SeoEntry[] = state.services.map((service) => {
      const path = `/servicios/${service.slug}`
      return {
        key: `service:${service.slug}`,
        entityId: service.slug,
        source: 'service' as const,
        path,
        label: service.title,
        title: service.seoTitle || '',
        description: service.seoDescription || '',
        defaultTitle: `${service.title} | ${state.site.name}`,
        defaultDescription: service.description || service.subtitle || state.site.description || '',
        status: 'published' as const,
        indexable: true,
      }
    })

    const productEntries: SeoEntry[] = state.products.map((product) => {
      const path = `/productos/${product.slug}`
      return {
        key: `product:${product.slug}`,
        entityId: product.slug,
        source: 'product' as const,
        path,
        label: product.title,
        title: product.seoTitle || '',
        description: product.seoDescription || '',
        defaultTitle: `${product.title} | ${state.site.name}`,
        defaultDescription: product.description || state.site.description || '',
        status: 'published' as const,
        indexable: true,
      }
    })

    const byPath = new Map<string, SeoEntry>()
    ;[...serviceEntries, ...productEntries, ...sitePageEntries].forEach((entry) => {
      const key = normalizePath(entry.path)
      if (!byPath.has(key)) byPath.set(key, entry)
    })

    return Array.from(byPath.values()).sort((a, b) => a.path.localeCompare(b.path))
  }, [state.products, state.services, state.site.description, state.site.name, state.siteArchitecture.pages])

  const diagnostics = useMemo(() => {
    const titleCount = new Map<string, number>()
    const descriptionCount = new Map<string, number>()

    for (const entry of entries) {
      const normalizedTitle = normalizeText(entry.title)
      const normalizedDescription = normalizeText(entry.description)
      if (normalizedTitle) titleCount.set(normalizedTitle, (titleCount.get(normalizedTitle) || 0) + 1)
      if (normalizedDescription) descriptionCount.set(normalizedDescription, (descriptionCount.get(normalizedDescription) || 0) + 1)
    }

    const byKey = new Map<string, { issues: SeoIssue[]; health: EntryHealth }>()
    for (const entry of entries) {
      const duplicateTitleCount = titleCount.get(normalizeText(entry.title)) || 0
      const duplicateDescriptionCount = descriptionCount.get(normalizeText(entry.description)) || 0
      const issues = buildIssues(entry, duplicateTitleCount, duplicateDescriptionCount)
      byKey.set(entry.key, { issues, health: entryHealth(issues) })
    }

    return byKey
  }, [entries])

  const summary = useMemo(() => {
    const values = entries.map((entry) => diagnostics.get(entry.key) || { issues: [], health: 'healthy' as EntryHealth })
    const total = values.length
    const critical = values.filter((entry) => entry.health === 'critical').length
    const warning = values.filter((entry) => entry.health === 'warning').length
    const healthy = values.filter((entry) => entry.health === 'healthy').length
    const score = total > 0 ? Math.round((healthy / total) * 100) : 0
    return { total, critical, warning, healthy, score }
  }, [diagnostics, entries])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((entry) => {
      const diag = diagnostics.get(entry.key)
      const health = diag?.health || 'healthy'

      if (healthFilter !== 'all' && health !== healthFilter) return false

      if (!q) return true
      return (
        entry.label.toLowerCase().includes(q) ||
        entry.path.toLowerCase().includes(q) ||
        entry.title.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q)
      )
    })
  }, [diagnostics, entries, healthFilter, query])

  const openEdit = (entry: SeoEntry) => {
    setEditingKey(entry.key)
    setDraft({ title: entry.title, description: entry.description })
  }

  const closeEdit = () => {
    setEditingKey(null)
    setDraft({ title: '', description: '' })
  }

  const persistEntry = (entry: SeoEntry, nextTitle: string, nextDescription: string) => {
    const title = nextTitle.trim()
    const description = nextDescription.trim()

    if (entry.source === 'service') {
      updateService(entry.entityId, { seoTitle: title, seoDescription: description })
      return
    }
    if (entry.source === 'product') {
      updateProduct(entry.entityId, { seoTitle: title, seoDescription: description })
      return
    }
    updateSiteArchitecturePage(entry.entityId, {
      title: title || entry.defaultTitle,
      description: description || entry.defaultDescription,
    })
  }

  const saveEdit = () => {
    const target = entries.find((entry) => entry.key === editingKey)
    if (!target) return
    persistEntry(target, draft.title, draft.description)
    closeEdit()
  }

  const autoFillMissing = () => {
    entries.forEach((entry) => {
      const title = entry.title.trim() || limitText(entry.defaultTitle, 70)
      const description = entry.description.trim() || limitText(entry.defaultDescription, 180)
      if (title !== entry.title || description !== entry.description) {
        persistEntry(entry, title, description)
      }
    })
  }

  const normalizeLengths = () => {
    entries.forEach((entry) => {
      const title = limitText(entry.title || entry.defaultTitle, 70)
      const description = limitText(entry.description || entry.defaultDescription, 180)
      if (title !== entry.title || description !== entry.description) {
        persistEntry(entry, title, description)
      }
    })
  }

  const sitemapUrl = `${baseUrl}/sitemap.xml`
  const robotsUrl = `${baseUrl}/robots.txt`

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900">SEO Manager</h1>
          <p className="mt-2 text-slate-500 font-light max-w-3xl">
            Auditoría operativa de SEO técnico y metadatos para rutas públicas. Ajusta títulos, descripciones y resuelve incidencias que afectan indexación y CTR.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={autoFillMissing}>
            <WandSparkles className="w-4 h-4 mr-2" />
            Autocompletar faltantes
          </Button>
          <button
            type="button"
            onClick={normalizeLengths}
            className="h-10 px-4 border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase tracking-[0.22em] hover:border-slate-300"
          >
            Normalizar longitudes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-6">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Gauge className="w-4 h-4 text-brand-primary" />
            Puntaje SEO
          </div>
          <div className="mt-3 text-4xl font-black tracking-tight text-slate-900">{summary.score}%</div>
          <p className="mt-2 text-xs text-slate-500">Entradas saludables sobre el total auditado.</p>
        </div>
        <div className="bg-white border border-slate-200 p-6">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Críticos</div>
          <div className="mt-3 text-4xl font-black tracking-tight text-rose-600">{summary.critical}</div>
          <p className="mt-2 text-xs text-slate-500">Faltantes de title/description o bloqueo de calidad.</p>
        </div>
        <div className="bg-white border border-slate-200 p-6">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Con atención</div>
          <div className="mt-3 text-4xl font-black tracking-tight text-amber-600">{summary.warning}</div>
          <p className="mt-2 text-xs text-slate-500">Longitudes, duplicados o estado draft.</p>
        </div>
        <div className="bg-white border border-slate-200 p-6">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rutas auditadas</div>
          <div className="mt-3 text-4xl font-black tracking-tight text-slate-900">{summary.total}</div>
          <p className="mt-2 text-xs text-slate-500">Servicios, productos y páginas gestionadas.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Infraestructura SEO</h2>
            <p className="text-sm text-slate-500">Recursos de rastreo activos para buscadores.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={sitemapUrl} target="_blank" rel="noreferrer" className="h-10 px-4 border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase tracking-[0.22em] inline-flex items-center gap-2 hover:border-slate-300">
              sitemap.xml <ExternalLink className="w-4 h-4" />
            </a>
            <a href={robotsUrl} target="_blank" rel="noreferrer" className="h-10 px-4 border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase tracking-[0.22em] inline-flex items-center gap-2 hover:border-slate-300">
              robots.txt <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-6 md:p-8 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 border border-slate-200 bg-slate-50 px-4 py-3 w-full lg:w-[420px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por ruta, título o descripción..."
              className="w-full bg-transparent text-sm text-slate-700 outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'critical', label: 'Críticos' },
              { key: 'warning', label: 'Con atención' },
              { key: 'healthy', label: 'Saludables' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setHealthFilter(item.key as 'all' | 'critical' | 'warning' | 'healthy')}
                className={`h-9 px-3 border text-[10px] font-black uppercase tracking-[0.2em] ${
                  healthFilter === item.key
                    ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                    : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {visible.length === 0 && (
            <div className="border border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
              No hay resultados con los filtros actuales.
            </div>
          )}

          {visible.map((entry) => {
            const diag = diagnostics.get(entry.key) || { issues: [], health: 'healthy' as EntryHealth }
            const titleQuality = scoreTitle(entry.title)
            const descriptionQuality = scoreDescription(entry.description)
            const isEditing = editingKey === entry.key

            return (
              <article key={entry.key} className={`border ${isEditing ? 'border-brand-primary bg-slate-50' : 'border-slate-200 bg-white'}`}>
                <div className="px-6 py-5 md:px-8 md:py-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-1 border border-slate-200">
                        {getTypeLabel(entry.source)}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-1 border border-slate-200">
                        {entry.status}
                      </span>
                      {!entry.indexable && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-1 border border-slate-200">
                          noindex
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black tracking-tight text-slate-900">{entry.label}</h3>
                    <div className="text-xs font-mono text-slate-500">{entry.path}</div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 border ${scoreColor(titleQuality)}`}>
                        Title {titleQuality === 'optimal' ? 'óptimo' : titleQuality === 'ok' ? 'aceptable' : 'mejorar'}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 border ${scoreColor(descriptionQuality)}`}>
                        Desc {descriptionQuality === 'optimal' ? 'óptima' : descriptionQuality === 'ok' ? 'aceptable' : 'mejorar'}
                      </span>
                      {diag.health === 'healthy' ? (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 border border-emerald-200 text-emerald-700 bg-emerald-50 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Saludable
                        </span>
                      ) : (
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 border inline-flex items-center gap-1 ${diag.health === 'critical' ? 'border-rose-200 text-rose-700 bg-rose-50' : 'border-amber-200 text-amber-700 bg-amber-50'}`}>
                          <AlertTriangle className="w-3.5 h-3.5" /> {diag.health === 'critical' ? 'Crítico' : 'Atención'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => (isEditing ? closeEdit() : openEdit(entry))}
                      className="h-10 px-4 border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase tracking-[0.2em] inline-flex items-center gap-2 hover:border-slate-300"
                    >
                      {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      {isEditing ? 'Cerrar' : 'Editar'}
                    </button>
                  </div>
                </div>

                <div className="px-6 pb-5 md:px-8">
                  <div className="bg-slate-50 border border-slate-200 p-4">
                    <div className="text-[11px] text-emerald-700 font-mono">{baseUrl}{entry.path}</div>
                    <div className="text-lg text-blue-800 leading-tight mt-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                      {entry.title || 'SEO title pendiente'}
                    </div>
                    <div className="text-sm text-slate-600 mt-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                      {(entry.description || 'SEO description pendiente').slice(0, 180)}
                    </div>
                  </div>

                  {diag.issues.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {diag.issues.map((issue) => (
                        <span
                          key={`${entry.key}-${issue.code}`}
                          className={`text-[10px] font-black uppercase tracking-[0.18em] px-2 py-1 border ${
                            issue.severity === 'critical'
                              ? 'border-rose-200 text-rose-700 bg-rose-50'
                              : issue.severity === 'warning'
                                ? 'border-amber-200 text-amber-700 bg-amber-50'
                                : 'border-slate-200 text-slate-500 bg-slate-50'
                          }`}
                        >
                          {issue.message}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="border-t border-slate-200 px-6 py-5 md:px-8 md:py-6 bg-white space-y-4">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">SEO title</label>
                        <input
                          value={draft.title}
                          onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                          className="mt-2 w-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-brand-primary focus:bg-white outline-none"
                        />
                        <div className="mt-2 text-[11px] text-slate-500">{draft.title.length} caracteres (recomendado: 45-65)</div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">SEO description</label>
                        <textarea
                          rows={4}
                          value={draft.description}
                          onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                          className="mt-2 w-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-brand-primary focus:bg-white outline-none resize-none"
                        />
                        <div className="mt-2 text-[11px] text-slate-500">{draft.description.length} caracteres (recomendado: 120-165)</div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={closeEdit}
                        className="h-10 px-4 border border-slate-200 bg-white text-slate-600 text-xs font-black uppercase tracking-[0.2em] hover:border-slate-300"
                      >
                        Cancelar
                      </button>
                      <Button onClick={saveEdit}>
                        <Save className="w-4 h-4 mr-2" /> Guardar SEO
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
