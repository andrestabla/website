/**
 * Cotizador — del esquema clásico a páginas libres.
 *
 * Una cotización construida con las secciones fijas del visor (carta,
 * diagnóstico, método, cronograma, inversión…) se convierte en páginas con
 * bloques tipados (content.pages), que es lo que el editor por páginas sabe
 * mover, agregar y borrar. Nada se pierde: cada sección visible pasa a una
 * página con sus textos, y lo calculado (inversión, plan de pagos) queda
 * como bloques que siguen leyendo las líneas de la cotización.
 */
import { computeTotals, formatMoney, QUOTE_TEMPLATES, normalizeTemplate, type QuoteItem } from './quotes.js'
import { renumberPages, splitPagesByCapacity, type DocPage, type PageBlock } from './quote-attachments.js'

const DEFAULT_TITLES: Record<string, [string, string]> = {
  presentacion: ['Presentación', 'Una propuesta que se lee y se configura'],
  diagnostico: ['Diagnóstico', 'Lectura del reto'],
  arquitectura: ['Método', 'Cómo lo hacemos'],
  enfoque: ['Alcance y método', 'Qué comprende el trabajo'],
  pantallas: ['La plataforma en pantalla', 'Así se ve funcionando'],
  modulos: ['Alcance', 'Servicios incluidos'],
  cronograma: ['Tiempos', 'Cronograma de ejecución'],
  inversion: ['Inversión', 'Propuesta económica'],
  pagos: ['Condiciones', 'Plan de pagos e hitos'],
  servicio: ['Después de la entrega', 'Servicio, soporte y renovación'],
  equipo: ['Cómo trabajamos', 'Equipo y forma de trabajo'],
  condiciones: ['Letra clara', 'Supuestos y exclusiones'],
}

export function legacyToPages(quote: any): DocPage[] {
  const c = quote.content || {}
  const items: QuoteItem[] = Array.isArray(quote.pricing?.items) ? quote.pricing.items : []
  const template = normalizeTemplate(quote.template)
  const isUnits = QUOTE_TEMPLATES[template].kind === 'UNIDADES'
  const noun: string = c.itemsNoun || (isUnits ? 'Líneas' : 'Módulos')
  const labels: Record<string, string> = c.labels || {}
  const sections: Record<string, { kicker?: string; title?: string; hidden?: boolean }> = c.sections || {}
  const money = (n: number) => formatMoney(n, quote.currency)
  const totals = computeTotals(items, {
    scale: Array.isArray(quote.discountScale) && quote.discountScale.length ? quote.discountScale : undefined,
    minWeeks: QUOTE_TEMPLATES[template].minWeeks,
    paymentSplit: Array.isArray(c.paymentSplit) && c.paymentSplit.length ? c.paymentSplit : undefined,
  })

  const pages: DocPage[] = []
  const page = (id: string, blocks: PageBlock[]) => {
    const o = sections[id] || {}
    if (o.hidden) return
    const clean = blocks.filter(Boolean)
    if (!clean.length) return
    const [kicker, title] = DEFAULT_TITLES[id] || ['', id]
    pages.push({ id, kicker: o.kicker || kicker, title: o.title || title, blocks: clean })
  }
  const p = (text?: string): PageBlock | null => (text ? { type: 'p', text } : null)
  const lede = (text?: string): PageBlock | null => (text ? { type: 'lede', text } : null)
  const note = (text?: string): PageBlock | null => (text ? { type: 'note', text } : null)
  const box = (b?: { title?: string; body?: string }): PageBlock | null => (b?.body ? { type: 'box', title: b.title || '', body: b.body } : null)
  const h3 = (text?: string): PageBlock | null => (text ? { type: 'h3', text } : null)

  // carta
  page('presentacion', [
    c.letterhead ? { type: 'letterhead', ...c.letterhead } : null,
    ...(c.intro ? [{ type: 'p', text: c.intro } as PageBlock] : []),
  ] as PageBlock[])

  // diagnóstico
  const fronts: any[] = Array.isArray(c.diagnosis?.fronts) ? c.diagnosis.fronts : []
  page('diagnostico', [
    lede(c.diagnosis?.lede),
    fronts.length ? { type: 'cards', cols: fronts.length >= 3 ? 3 : 2, items: fronts.map((f: any, i: number) => ({ tag: `${labels.front || 'Frente'} ${String(i + 1).padStart(2, '0')}`, title: f.title, body: f.body, foot: f.needs ? `${labels.needs || 'Necesita:'} ${f.needs}` : '' })) } : null,
    box(c.diagnosis?.note),
  ] as PageBlock[])

  // método / arquitectura
  const arch = c.architecture || {}
  const layers: any[] = Array.isArray(arch.layers) ? arch.layers : []
  page('arquitectura', [
    lede(arch.lede),
    ...layers.map((l: any) => ({ type: 'phase', id: l.name || '', name: l.title || '', when: '', defs: l.desc ? [{ term: 'Qué se hace', desc: l.desc }] : [] } as PageBlock)),
    arch.stack?.length ? h3(labels.stackTitle || 'Base tecnológica') : null,
    p(arch.stackNote),
    arch.stack?.length ? { type: 'table', headers: arch.stackHeaders?.length === 3 ? arch.stackHeaders : ['Componente', 'Tecnología', 'Qué aporta'], rows: arch.stack.map((r: any) => [r.component || '', r.tech || '', r.what || '']), firstCol: 'key' } : null,
    box(arch.ownership),
  ] as PageBlock[])

  // enfoque
  page('enfoque', [p(c.approach), c.scopeNote ? { type: 'box', title: labels.scopeNoteTitle || 'Nota de alcance', body: c.scopeNote } : null] as PageBlock[])

  // capturas
  const shots: any[] = Array.isArray(c.screens?.items) ? c.screens.items.filter((s: any) => s?.url) : []
  page('pantallas', [
    p(c.screens?.intro),
    ...shots.map((s: any) => ({ type: 'img', url: s.url, caption: s.caption || '', wide: s.wide !== false } as PageBlock)),
    note(c.screens?.note),
  ] as PageBlock[])

  // líneas (núcleo + activas)
  const active = items.filter((i) => i.kind === 'CORE' || i.on)
  page('modulos', [
    active.length ? { type: 'cards', cols: active.length >= 3 ? 3 : 2, items: active.map((i) => ({ tag: i.code, title: i.name, body: i.summary || '', foot: `${(i.qty ?? 1) > 1 ? `${i.qty} × ` : ''}${money(i.price)}${i.unit ? ` / ${i.unit}` : ''}` })) } : null,
    box(c.coreNote),
    c.timelineNote ? { type: 'box', title: labels.timelineNoteTitle || 'Cómo leer el plazo', body: c.timelineNote } : null,
  ] as PageBlock[])

  // cronograma: semanas → barras
  const groups: any[] = Array.isArray(c.schedule?.groups) ? c.schedule.groups : []
  if (groups.length) {
    const maxWeek = Math.max(6, ...groups.flatMap((g: any) => (g.rows || []).flatMap((r: any) => [...(r.on || []), ...(r.hito || [])])))
    const rows = groups.flatMap((g: any) => [
      { label: g.name, from: 1, to: 1, tone: 'deep', bold: true },
      ...(g.rows || []).map((r: any) => {
        const weeks: number[] = [...(r.on || []), ...(r.hito || [])].filter((n) => n >= 1)
        return { label: r.label, from: weeks.length ? Math.min(...weeks) : 1, to: weeks.length ? Math.max(...weeks) : 1, tone: r.hito?.length ? 'gold' : 'cyan' }
      }),
    ])
    page('cronograma', [
      p(c.schedule?.intro),
      { type: 'gantt', cols: Array.from({ length: maxWeek }, (_, i) => `${labels.weekPrefix || 'S'}${i + 1}`), rows, note: c.schedule?.legend || '' },
    ] as PageBlock[])
  }

  // inversión
  page('inversion', [
    p(labels.investmentIntro),
    { type: 'invoice', note: c.investmentNote || '' },
  ] as PageBlock[])

  // pagos e hitos
  const customLabels: any[] = Array.isArray(c.paymentLabels) ? c.paymentLabels : []
  const fallback = [['A la firma', ''], ['Hito 01', ''], ['Hito 02', ''], ['Hito 03', '']]
  const milestones: any[] = Array.isArray(c.milestones) ? c.milestones : []
  page('pagos', [
    { type: 'payments', items: totals.payments.map((pay, i) => ({ pct: `${pay.pct} %`, label: `${customLabels[i]?.moment || labels[`payMoment${i}`] || fallback[i]?.[0] || `Pago ${i + 1}`} · ${money(pay.amount)}${customLabels[i]?.milestone ? ` — ${customLabels[i].milestone}` : ''}` })) },
    milestones.length ? h3(labels.milestonesTitle || 'Qué se aprueba en cada hito') : null,
    milestones.length ? { type: 'table', headers: ['Hito', 'Semana', 'Criterio de aprobación'], rows: milestones.map((m: any) => [m.name || '', m.week || '', m.criterion || '']), firstCol: 'key' } : null,
    note(c.paymentsNote),
  ] as PageBlock[])

  // servicio
  const svc = c.service || {}
  const svcRows: any[] = Array.isArray(svc.rows) && svc.rows.length ? svc.rows : []
  if (svcRows.length || svc.includedMonths) {
    const rows = svcRows.length
      ? svcRows.map((r: any) => [r.period || '', [r.title, r.desc].filter(Boolean).join(' — '), r.value || ''])
      : [
          [`Meses 1–${svc.includedMonths}`, 'Infraestructura y soporte 2, 3 y 4', 'Incluido'],
          ...(svc.renewalPrice ? [[`Mes ${svc.includedMonths + 1} en adelante`, 'Renovación anual del servicio', `${money(svc.renewalPrice)} / año`]] : []),
          ...(svc.exitPrice ? [['Salida del servicio', 'Traslado de la operación al cliente o a un tercero', `${money(svc.exitPrice)} por una vez`]] : []),
        ]
    const levels: any[] = Array.isArray(svc.levels) ? svc.levels : []
    page('servicio', [
      { type: 'table', headers: ['Periodo', 'Qué cubre', 'Valor'], rows, firstCol: 'key' },
      levels.length ? h3(labels.levelsTitle || 'Niveles de soporte') : null,
      p(svc.levelsIntro),
      levels.length ? { type: 'list', items: levels.map((l: any) => `**${l.name}.** ${l.desc}`) } : null,
      box(svc.budgetNote),
      note(svc.note),
    ] as PageBlock[])
  }

  // equipo
  const team: any[] = Array.isArray(c.team) ? c.team : []
  page('equipo', [
    lede(c.teamIntro),
    team.length ? { type: 'team', items: team.map((m: any) => ({ role: m.role || '', dedication: m.dedication || '', functions: Array.isArray(m.functions) ? m.functions : [] })) } : null,
    box(c.workRhythm),
  ] as PageBlock[])

  // condiciones
  const guarantees: any[] = Array.isArray(c.guarantees) ? c.guarantees : []
  page('condiciones', [
    c.assumptions?.length ? h3(labels.assumptionsTitle || 'Lo que asumimos') : null,
    c.assumptions?.length ? { type: 'list', items: c.assumptions } : null,
    c.exclusions?.length ? h3(labels.exclusionsTitle || 'Lo que queda fuera') : null,
    c.exclusions?.length ? { type: 'list', items: c.exclusions } : null,
    guarantees.length ? h3(labels.guaranteesTitle || 'Garantía, propiedad y ampliación') : null,
    guarantees.length ? { type: 'table', headers: ['Concepto', 'Alcance'], rows: guarantees.map((g: any) => [g.concept || '', g.text || '']), firstCol: 'key' } : null,
    note(c.finalNote || `Propuesta válida por ${quote.validDays} días.`),
  ] as PageBlock[])

  return renumberPages(splitPagesByCapacity(pages))
}
