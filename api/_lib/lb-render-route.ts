/**
 * Learning Builder · render de la ruta de aprendizaje.
 *
 * La ruta se entrega y se imprime: es la propuesta que el cliente aprueba
 * antes de que se produzca nada. Por eso este render no tiene navegación ni
 * pasos — todo está a la vista, en orden, y sale bien por la impresora.
 *
 * Al lado de cada actividad va su estado de producción: cuando ya existe el
 * recurso que la realiza, se muestra su código. Así el mismo documento sirve
 * de propuesta al cliente y de tablero de avance al equipo, sin mantener dos.
 */
import {
  LB_ACTIVITY_LABEL, LB_ACTIVITY_MODE_LABEL, routeCoverage, routeHours,
  type LbRouteContent,
} from '../../src/learning/lib/route.js'
import type { LbDirectives } from '../../src/learning/lib/directives.js'
import {
  completionScript, coverHtml, escapeHtml, inline, prose, renderDocument,
  type LbRenderMeta, type LbRenderMode,
} from './lb-render-kit.js'

const CSS = `
.rt-sum{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.rt-sum .lb-chip{border-color:var(--lb-accent);color:var(--lb-accent-dark)}

.rt-comp{margin-top:18px}
.rt-comp h2{font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:var(--lb-muted)}
.rt-comp ol{margin:8px 0 0;padding-left:20px}

.rt-facts{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-top:4px}
.rt-fact b{display:block;font-size:10.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--lb-muted)}
.rt-fact p{margin:4px 0 0;font-size:14.5px}

.rt-mod{border-top:4px solid var(--lb-accent)}
.rt-mod-top{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.rt-num{display:grid;place-items:center;width:30px;height:30px;border-radius:999px;
  background:var(--lb-accent);color:#fff;font-weight:800;font-size:14px;flex:none}
.rt-mod h3{font-size:21px}
.rt-weeks{margin-left:auto}
.rt-out{margin-top:10px;border-left:3px solid var(--lb-accent);padding-left:14px;font-size:14.5px}
.rt-out b{font-size:10.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--lb-muted);display:block}

table.rt{width:100%;border-collapse:collapse;margin-top:14px;font-size:14px;table-layout:fixed}
table.rt th{text-align:left;font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  color:var(--lb-muted);border-bottom:2px solid var(--lb-line);padding:6px 10px 6px 0}
table.rt td{border-bottom:1px solid var(--lb-line);padding:10px 10px 10px 0;vertical-align:top;
  overflow-wrap:anywhere}
table.rt td:last-child,table.rt th:last-child{padding-right:0}
.rt-act b{display:block;font-family:var(--lb-heading);font-size:14.5px}
.rt-act span{color:var(--lb-muted);font-size:13px}
.rt-ev{color:var(--lb-muted);font-size:13px}
.rt-hours{white-space:nowrap;font-variant-numeric:tabular-nums}
.rt-code{display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;
  background:color-mix(in srgb, var(--lb-accent) 12%, transparent);color:var(--lb-accent-dark);
  border-radius:6px;padding:2px 7px;font-weight:700;overflow-wrap:anywhere}
.rt-todo{font-size:11.5px;color:var(--lb-muted)}
.rt-total{font-weight:800}

/*
 * Seis columnas no caben en un teléfono ni en el marco estrecho de la vista
 * previa, y dejarlas desbordar arrastra la página entera de lado. Por debajo
 * de 760 px cada actividad pasa a ser una ficha apilada y cada celda lleva su
 * rótulo delante, que es la misma información sin el desbordamiento.
 */
@media (max-width:760px){
  table.rt,table.rt tbody,table.rt tfoot,table.rt tr,table.rt td{display:block;width:auto}
  table.rt thead{display:none}
  table.rt tr{border-bottom:1px solid var(--lb-line);padding:12px 0}
  table.rt tbody tr:last-child{border-bottom:0}
  table.rt td{border:0;padding:2px 0}
  table.rt td:empty{display:none}
  table.rt td[data-label]::before{content:attr(data-label) " · ";font-size:10.5px;font-weight:800;
    letter-spacing:.1em;text-transform:uppercase;color:var(--lb-muted)}
  table.rt tfoot td{padding-top:10px}
  table.rt tfoot td:not(.rt-total){display:none}
}
`

export function renderRouteHtml(options: {
  meta: LbRenderMeta
  content: LbRouteContent
  directives: LbDirectives
  mode: LbRenderMode
}): string {
  const { meta, content, directives, mode } = options
  const cover = content.cover || {}
  const docTitle = cover.title || meta.title
  const hours = routeHours(content)
  const coverage = routeCoverage(content)

  const summary = `<div class="rt-sum">
    <span class="lb-chip">${content.modules.length} módulo(s)</span>
    <span class="lb-chip">${hours} hora(s) de dedicación</span>
    ${coverage.total ? `<span class="lb-chip">${coverage.linked} de ${coverage.total} recursos producidos</span>` : ''}
  </div>
  ${content.competencies.length
    ? `<div class="rt-comp"><h2>Competencias del curso</h2><ol>${content.competencies
        .map((row) => `<li>${inline(row)}</li>`)
        .join('')}</ol></div>`
    : ''}`

  const facts = [
    content.audience ? { label: 'A quién va dirigido', value: content.audience } : null,
    content.prerequisites ? { label: 'De qué se parte', value: content.prerequisites } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  const factsCard = facts.length
    ? `<section class="lb-card"><div class="rt-facts">${facts
        .map((fact) => `<div class="rt-fact"><b>${escapeHtml(fact.label)}</b><p>${inline(fact.value)}</p></div>`)
        .join('')}</div></section>`
    : ''

  const modules = content.modules
    .map((item, index) => {
      const moduleHours = item.activities.reduce((total, activity) => total + activity.hours, 0)
      const rows = item.activities
        .map(
          (activity) => `<tr>
            <td class="rt-act">
              <b>${inline(activity.title)}</b>
              ${activity.description ? `<span>${inline(activity.description)}</span>` : ''}
            </td>
            <td data-label="Tipo">${escapeHtml(LB_ACTIVITY_LABEL[activity.kind])}</td>
            <td data-label="Modalidad">${escapeHtml(LB_ACTIVITY_MODE_LABEL[activity.mode])}</td>
            <td class="rt-hours" data-label="Horas">${activity.hours} h</td>
            <td class="rt-ev" data-label="Evidencia">${activity.evidence ? inline(activity.evidence) : '—'}</td>
            <td data-label="Recurso">${activity.resourceCode
              ? `<span class="rt-code">${escapeHtml(activity.resourceCode)}</span>`
              : '<span class="rt-todo">Por producir</span>'}</td>
          </tr>`
        )
        .join('')

      return `<section class="lb-card rt-mod">
        <div class="rt-mod-top">
          <span class="rt-num">${index + 1}</span>
          <h3>${inline(item.title)}</h3>
          ${item.weeks ? `<span class="lb-chip rt-weeks">${item.weeks} semana(s)</span>` : ''}
        </div>
        ${item.summary ? prose(item.summary) : ''}
        ${item.outcome ? `<div class="rt-out"><b>Al terminar</b>${inline(item.outcome)}</div>` : ''}
        ${item.activities.length
          ? `<table class="rt">
              <thead><tr><th>Actividad</th><th>Tipo</th><th>Modalidad</th><th>Horas</th><th>Evidencia</th><th>Recurso</th></tr></thead>
              <tbody>${rows}</tbody>
              <tfoot><tr><td colspan="3"></td><td class="rt-hours rt-total" data-label="Total">${moduleHours} h</td><td colspan="2"></td></tr></tfoot>
            </table>`
          : '<p style="color:var(--lb-muted)">Sin actividades todavía.</p>'}
      </section>`
    })
    .join('')

  const assessment = content.assessment
    ? `<section class="lb-card"><h2 class="lb-h">Evaluación del curso</h2>${prose(content.assessment)}</section>`
    : ''

  const body = `
${coverHtml(cover, meta, summary)}
${factsCard}
${modules || '<section class="lb-card"><p style="color:var(--lb-muted)">La ruta no tiene módulos todavía.</p></section>'}
${assessment}`

  return renderDocument({
    meta,
    directives,
    mode,
    docTitle,
    description: cover.summary || '',
    css: CSS,
    body,
    // La ruta no se recorre: se lee entera, así que se da por cubierta al abrirla.
    script: completionScript(directives, 0),
  })
}
