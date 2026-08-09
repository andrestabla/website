/**
 * Editor de las páginas del documento (content.pages): permite componer una
 * cotización página por página, con bloques tipados, cuando la propuesta debe
 * replicar exactamente una pieza diagramada.
 *
 * Vive dentro del editor de contenido y trabaja sobre la misma copia local:
 * recibe el arreglo y devuelve el nuevo arreglo en cada cambio.
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'

export type Block = Record<string, any> & { type: string }
export type Page = { id: string; num?: string; kicker?: string; title?: string; blocks: Block[] }

const inputCls = 'w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-indigo-500'
const labelCls = 'mb-1 mt-2 block text-[10px] font-bold uppercase tracking-wide text-slate-400'
const miniBtn = 'grid h-6 w-6 place-items-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-slate-600'

const BLOCK_TYPES: Array<[string, string]> = [
  ['lede', 'Entradilla'],
  ['p', 'Párrafos'],
  ['h3', 'Subtítulo'],
  ['list', 'Viñetas'],
  ['box', 'Caja destacada'],
  ['note', 'Nota al pie'],
  ['table', 'Tabla'],
  ['cards', 'Tarjetas'],
  ['phase', 'Fase del plan'],
  ['img', 'Imagen'],
  ['invoice', 'Tabla de inversión'],
  ['payments', 'Plan de pagos'],
  ['toc', 'Tabla de contenido'],
  ['team', 'Equipo'],
  ['letterhead', 'Encabezado de carta'],
]
const BLOCK_LABEL: Record<string, string> = Object.fromEntries(BLOCK_TYPES)

const EMPTY: Record<string, Block> = {
  lede: { type: 'lede', text: '' },
  p: { type: 'p', text: '' },
  h3: { type: 'h3', text: '' },
  list: { type: 'list', items: [''] },
  box: { type: 'box', title: '', body: '' },
  note: { type: 'note', text: '' },
  table: { type: 'table', headers: ['', ''], rows: [['', '']] },
  cards: { type: 'cards', cols: 2, items: [{ tag: '', title: '', body: '', foot: '' }] },
  phase: { type: 'phase', id: 'FASE 0', name: '', when: '', defs: [{ term: 'Objetivo', desc: '' }] },
  img: { type: 'img', url: '', caption: '', wide: false },
  invoice: { type: 'invoice', note: '' },
  payments: { type: 'payments', items: [{ pct: '30 %', label: '' }] },
  toc: { type: 'toc', note: '' },
  team: { type: 'team', items: [{ role: '', dedication: '', functions: [''] }] },
  letterhead: { type: 'letterhead', date: '', addressee: '', subject: '', salutation: 'Reciban un cordial saludo,' },
}

/**
 * Plantillas de página: el compositor arranca con la estructura típica de cada
 * tipo de página y desde ahí se edita. Las cotizaciones difieren, así que
 * cualquier plantilla se puede vaciar, ampliar o combinar.
 */
const TEMPLATES: Array<{ id: string; label: string; make: (n: number) => Page }> = [
  {
    id: 'contenido', label: 'Contenido libre',
    make: (n) => ({ id: `pag-${n}`, num: String(n).padStart(2, '0'), kicker: '', title: 'Nueva página', blocks: [{ type: 'p', text: '' }] }),
  },
  {
    id: 'toc', label: 'Tabla de contenido',
    make: () => ({ id: 'indice', num: '—', kicker: 'Índice', title: 'Tabla de contenido', blocks: [{ type: 'toc', note: '' }] }),
  },
  {
    id: 'carta', label: 'Presentación (carta)',
    make: (n) => ({
      id: 'carta', num: String(n).padStart(2, '0'), kicker: 'Presentación', title: 'Carta de presentación',
      blocks: [
        { type: 'letterhead', date: '', addressee: 'Señores\n', subject: '', salutation: 'Reciban un cordial saludo,' },
        { type: 'p', text: '' },
      ],
    }),
  },
  {
    id: 'cronograma', label: 'Cronograma (fases)',
    make: (n) => ({
      id: `plan-${n}`, num: String(n).padStart(2, '0'), kicker: 'Cómo se ejecuta', title: 'Plan de trabajo',
      blocks: [
        { type: 'p', text: '' },
        { type: 'phase', id: 'FASE 1', name: '', when: '', defs: [{ term: 'Objetivo', desc: '' }, { term: 'Actividades', desc: '' }, { term: 'Entregables', desc: '' }] },
      ],
    }),
  },
  {
    id: 'inversion', label: 'Inversión',
    make: (n) => ({
      id: 'inversion', num: String(n).padStart(2, '0'), kicker: 'Propuesta económica', title: 'Inversión',
      blocks: [{ type: 'invoice', note: '' }, { type: 'box', title: '', body: '' }],
    }),
  },
  {
    id: 'pagos', label: 'Términos y plan de pagos',
    make: (n) => ({
      id: 'terminos', num: String(n).padStart(2, '0'), kicker: 'Condiciones', title: 'Términos comerciales',
      blocks: [
        { type: 'h3', text: 'Forma de pago' },
        { type: 'payments', items: [{ pct: '30 %', label: '' }, { pct: '30 %', label: '' }, { pct: '40 %', label: '' }] },
        { type: 'note', text: '' },
      ],
    }),
  },
  {
    id: 'equipo', label: 'Equipo',
    make: (n) => ({
      id: 'equipo', num: String(n).padStart(2, '0'), kicker: 'Talento', title: 'Equipo consultor',
      blocks: [{ type: 'lede', text: '' }, { type: 'team', items: [{ role: '', dedication: '', functions: [''] }] }],
    }),
  },
  {
    id: 'galeria', label: 'Capturas / galería',
    make: (n) => ({
      id: `vistas-${n}`, num: String(n).padStart(2, '0'), kicker: 'En pantalla', title: 'Así se ve funcionando',
      blocks: [{ type: 'p', text: '' }, { type: 'img', url: '', caption: '', wide: true }],
    }),
  },
  {
    id: 'anexo', label: 'Anexo',
    make: (n) => ({
      id: `anexo-${n}`, num: String(n).padStart(2, '0'), kicker: 'Anexo', title: 'Anexo',
      blocks: [{ type: 'lede', text: '' }, { type: 'h3', text: '' }, { type: 'p', text: '' }],
    }),
  },
]

/** Resumen de una línea para el encabezado plegado del bloque. */
function preview(block: Block): string {
  const raw =
    block.text ??
    block.body ??
    block.caption ??
    block.name ??
    (Array.isArray(block.items) ? (typeof block.items[0] === 'string' ? block.items[0] : block.items[0]?.title || block.items[0]?.label) : '') ??
    (Array.isArray(block.rows) ? block.rows[0]?.[0] : '')
  return String(raw || '').slice(0, 70)
}

export function PagesEditor({ pages, onChange }: { pages: Page[]; onChange: (next: Page[]) => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [openBlock, setOpenBlock] = useState<Record<string, boolean>>({})

  const setPage = (pi: number, patch: Partial<Page>) =>
    onChange(pages.map((p, i) => (i === pi ? { ...p, ...patch } : p)))

  const movePage = (pi: number, dir: -1 | 1) => {
    const j = pi + dir
    if (j < 0 || j >= pages.length) return
    const next = [...pages]
    ;[next[pi], next[j]] = [next[j], next[pi]]
    onChange(next)
  }

  const removePage = (pi: number) => {
    if (!confirm(`¿Eliminar la página «${pages[pi].title || pages[pi].id}»?`)) return
    onChange(pages.filter((_, i) => i !== pi))
  }

  const addPage = (templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]
    const page = tpl.make(pages.length + 1)
    // id único aunque la plantilla proponga uno fijo
    const id = pages.some((p) => p.id === page.id) ? `${page.id}-${Date.now().toString(36).slice(-4)}` : page.id
    onChange([...pages, { ...page, id }])
  }

  const setBlock = (pi: number, bi: number, patch: Block) =>
    setPage(pi, { blocks: pages[pi].blocks.map((b, i) => (i === bi ? { ...b, ...patch } : b)) })

  const moveBlock = (pi: number, bi: number, dir: -1 | 1) => {
    const blocks = [...pages[pi].blocks]
    const j = bi + dir
    if (j < 0 || j >= blocks.length) return
    ;[blocks[bi], blocks[j]] = [blocks[j], blocks[bi]]
    setPage(pi, { blocks })
  }

  const removeBlock = (pi: number, bi: number) =>
    setPage(pi, { blocks: pages[pi].blocks.filter((_, i) => i !== bi) })

  const addBlock = (pi: number, type: string) =>
    setPage(pi, { blocks: [...pages[pi].blocks, structuredClone(EMPTY[type])] })

  return (
    <div className="space-y-2">
      <p className="text-[12px] text-slate-500">
        Esta cotización se compone página por página, igual que el documento diagramado.
        Cada página es una hoja de la vista pública y sus bloques definen el contenido.
      </p>

      {pages.map((page, pi) => {
        const isOpen = open[page.id] === true
        return (
          <div key={page.id} className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 px-3 py-2">
              <button onClick={() => setOpen((p) => ({ ...p, [page.id]: !isOpen }))} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                {isOpen ? <ChevronDown size={14} className="shrink-0 text-indigo-500" /> : <ChevronRight size={14} className="shrink-0 text-slate-300" />}
                <span className="shrink-0 font-mono text-[11px] font-bold text-amber-600">{page.num || '—'}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-slate-700">{page.title || page.id}</span>
                <span className="shrink-0 text-[10.5px] text-slate-400">{page.blocks.length} bloques</span>
              </button>
              <button onClick={() => movePage(pi, -1)} className={miniBtn} title="Subir"><ArrowUp size={12} /></button>
              <button onClick={() => movePage(pi, 1)} className={miniBtn} title="Bajar"><ArrowDown size={12} /></button>
              <button onClick={() => removePage(pi)} className={`${miniBtn} hover:text-rose-600`} title="Eliminar"><Trash2 size={12} /></button>
            </div>

            {isOpen && (
              <div className="border-t border-slate-100 px-3 pb-3">
                <div className="grid gap-2 sm:grid-cols-[80px_1fr]">
                  <div>
                    <label className={labelCls}>N.º</label>
                    <input value={page.num || ''} onChange={(e) => setPage(pi, { num: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Antetítulo (kicker)</label>
                    <input value={page.kicker || ''} onChange={(e) => setPage(pi, { kicker: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <label className={labelCls}>Título de la página</label>
                <input value={page.title || ''} onChange={(e) => setPage(pi, { title: e.target.value })} className={inputCls} />

                <div className="mt-3 space-y-1.5">
                  {page.blocks.map((block, bi) => {
                    const key = `${page.id}-${bi}`
                    const bOpen = openBlock[key] === true
                    return (
                      <div key={bi} className="rounded-lg border border-slate-200 bg-slate-50/60">
                        <div className="flex items-center gap-2 px-2.5 py-1.5">
                          <button onClick={() => setOpenBlock((p) => ({ ...p, [key]: !bOpen }))} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                            {bOpen ? <ChevronDown size={12} className="shrink-0 text-indigo-500" /> : <ChevronRight size={12} className="shrink-0 text-slate-300" />}
                            <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-500">
                              {BLOCK_LABEL[block.type] || block.type}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[11.5px] text-slate-500">{preview(block)}</span>
                          </button>
                          <button onClick={() => moveBlock(pi, bi, -1)} className={miniBtn}><ArrowUp size={11} /></button>
                          <button onClick={() => moveBlock(pi, bi, 1)} className={miniBtn}><ArrowDown size={11} /></button>
                          <button onClick={() => removeBlock(pi, bi)} className={`${miniBtn} hover:text-rose-600`}><Trash2 size={11} /></button>
                        </div>
                        {bOpen && (
                          <div className="border-t border-slate-200 px-2.5 pb-2.5">
                            <BlockFields block={block} onChange={(patch) => setBlock(pi, bi, patch)} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {BLOCK_TYPES.map(([type, label]) => (
                    <button key={type} onClick={() => addBlock(pi, type)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-[10.5px] font-semibold text-slate-500 hover:border-indigo-300 hover:text-indigo-600">
                      + {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <div className="rounded-xl border border-dashed border-slate-300 p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          <Plus size={12} /> Agregar página
        </div>
        <div className="flex flex-wrap gap-1">
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => addPage(t.id)}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-slate-600 hover:border-indigo-400 hover:text-indigo-600">
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Campos según el tipo de bloque. */
function BlockFields({ block, onChange }: { block: Block; onChange: (patch: Block) => void }) {
  const set = (key: string, value: unknown) => onChange({ ...block, [key]: value } as Block)

  const StrList = ({ field }: { field: string }) => {
    const list: string[] = Array.isArray(block[field]) ? block[field] : []
    return (
      <div className="space-y-1.5">
        {list.map((v, i) => (
          <div className="flex items-start gap-1" key={i}>
            <textarea rows={2} value={v}
              onChange={(e) => set(field, list.map((x, k) => (k === i ? e.target.value : x)))}
              className={inputCls} />
            <button onClick={() => set(field, list.filter((_, k) => k !== i))} className={`${miniBtn} hover:text-rose-600`}><Trash2 size={11} /></button>
          </div>
        ))}
        <button onClick={() => set(field, [...list, ''])} className="text-[11px] font-semibold text-indigo-600 hover:underline">+ Agregar</button>
      </div>
    )
  }

  switch (block.type) {
    case 'lede':
    case 'p':
      return (
        <>
          <label className={labelCls}>Texto — línea en blanco separa párrafos</label>
          <textarea rows={5} value={block.text || ''} onChange={(e) => set('text', e.target.value)} className={inputCls} />
        </>
      )

    case 'h3':
    case 'note':
      return (
        <>
          <label className={labelCls}>{block.type === 'h3' ? 'Subtítulo' : 'Nota'}</label>
          <textarea rows={2} value={block.text || ''} onChange={(e) => set('text', e.target.value)} className={inputCls} />
        </>
      )

    case 'list':
      return (<><label className={labelCls}>Viñetas</label><StrList field="items" /></>)

    case 'box':
      return (
        <>
          <label className={labelCls}>Título de la caja</label>
          <input value={block.title || ''} onChange={(e) => set('title', e.target.value)} className={inputCls} />
          <label className={labelCls}>Texto</label>
          <textarea rows={4} value={block.body || ''} onChange={(e) => set('body', e.target.value)} className={inputCls} />
        </>
      )

    case 'img':
      return (
        <>
          <label className={labelCls}>URL de la imagen</label>
          <input value={block.url || ''} onChange={(e) => set('url', e.target.value)} className={`${inputCls} font-mono text-[11.5px]`} />
          <label className={labelCls}>Pie de figura</label>
          <textarea rows={2} value={block.caption || ''} onChange={(e) => set('caption', e.target.value)} className={inputCls} />
          <label className="mt-2 flex items-center gap-2 text-[11.5px] font-semibold text-slate-500">
            <input type="checkbox" checked={!!block.wide} onChange={(e) => set('wide', e.target.checked)} /> Ancho completo
          </label>
        </>
      )

    case 'invoice':
      return (
        <>
          <p className="mt-2 text-[11.5px] text-slate-400">Se arma con los conceptos de la pestaña Propuesta.</p>
          <label className={labelCls}>Nota bajo la tabla</label>
          <textarea rows={3} value={block.note || ''} onChange={(e) => set('note', e.target.value)} className={inputCls} />
        </>
      )

    case 'table': {
      const headers: string[] = Array.isArray(block.headers) ? block.headers : []
      const rows: string[][] = Array.isArray(block.rows) ? block.rows : []
      const cols = Math.max(headers.length, ...rows.map((r) => r.length), 1)
      const setCell = (ri: number, ci: number, v: string) =>
        set('rows', rows.map((r, i) => (i === ri ? r.map((c, k) => (k === ci ? v : c)) : r)))
      return (
        <>
          <label className={labelCls}>Encabezados</label>
          <div className="flex flex-wrap gap-1">
            {headers.map((h, i) => (
              <input key={i} value={h} onChange={(e) => set('headers', headers.map((x, k) => (k === i ? e.target.value : x)))}
                className={`${inputCls} w-40`} />
            ))}
            <button onClick={() => { set('headers', [...headers, '']); }} className="text-[11px] font-semibold text-indigo-600 hover:underline">+ columna</button>
          </div>
          <label className={labelCls}>Filas</label>
          <div className="space-y-1">
            {rows.map((row, ri) => (
              <div key={ri} className="flex flex-wrap items-start gap-1">
                {Array.from({ length: cols }, (_, ci) => (
                  <textarea key={ci} rows={2} value={row[ci] ?? ''} onChange={(e) => setCell(ri, ci, e.target.value)} className={`${inputCls} w-40`} />
                ))}
                <button onClick={() => set('rows', rows.filter((_, k) => k !== ri))} className={`${miniBtn} hover:text-rose-600`}><Trash2 size={11} /></button>
              </div>
            ))}
            <button onClick={() => set('rows', [...rows, Array.from({ length: cols }, () => '')])}
              className="text-[11px] font-semibold text-indigo-600 hover:underline">+ fila</button>
          </div>
        </>
      )
    }

    case 'cards': {
      const cards: any[] = Array.isArray(block.items) ? block.items : []
      const setCard = (i: number, key: string, v: string) =>
        set('items', cards.map((c, k) => (k === i ? { ...c, [key]: v } : c)))
      return (
        <>
          <label className={labelCls}>Columnas</label>
          <select value={block.cols || 2} onChange={(e) => set('cols', Number(e.target.value))} className={`${inputCls} w-24`}>
            <option value={2}>2</option><option value={3}>3</option>
          </select>
          {cards.map((card, i) => (
            <div key={i} className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tarjeta {i + 1}</span>
                <button onClick={() => set('items', cards.filter((_, k) => k !== i))} className={`${miniBtn} hover:text-rose-600`}><Trash2 size={11} /></button>
              </div>
              <input placeholder="Etiqueta" value={card.tag || ''} onChange={(e) => setCard(i, 'tag', e.target.value)} className={`${inputCls} mb-1`} />
              <input placeholder="Título" value={card.title || ''} onChange={(e) => setCard(i, 'title', e.target.value)} className={`${inputCls} mb-1`} />
              <textarea rows={3} placeholder="Texto" value={card.body || ''} onChange={(e) => setCard(i, 'body', e.target.value)} className={`${inputCls} mb-1`} />
              <input placeholder="Pie (opcional)" value={card.foot || ''} onChange={(e) => setCard(i, 'foot', e.target.value)} className={inputCls} />
            </div>
          ))}
          <button onClick={() => set('items', [...cards, { tag: '', title: '', body: '', foot: '' }])}
            className="mt-1 text-[11px] font-semibold text-indigo-600 hover:underline">+ tarjeta</button>
        </>
      )
    }

    case 'phase': {
      const defs: any[] = Array.isArray(block.defs) ? block.defs : []
      const setDef = (i: number, key: string, v: unknown) =>
        set('defs', defs.map((d, k) => (k === i ? { ...d, [key]: v } : d)))
      return (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            <div><label className={labelCls}>Etiqueta</label><input value={block.id || ''} onChange={(e) => set('id', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Nombre</label><input value={block.name || ''} onChange={(e) => set('name', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Cuándo</label><input value={block.when || ''} onChange={(e) => set('when', e.target.value)} className={inputCls} /></div>
          </div>
          <label className={labelCls}>Filas (término / descripción)</label>
          {defs.map((d, i) => (
            <div key={i} className="mb-1 flex items-start gap-1">
              <input value={d.term || ''} onChange={(e) => setDef(i, 'term', e.target.value)} className={`${inputCls} w-36 shrink-0`} />
              <textarea rows={2} value={d.desc || ''} onChange={(e) => setDef(i, 'desc', e.target.value)} className={inputCls} />
              <label className="flex shrink-0 items-center gap-1 pt-1.5 text-[10px] text-slate-400" title="Destacar en color">
                <input type="checkbox" checked={!!d.strong} onChange={(e) => setDef(i, 'strong', e.target.checked)} />
              </label>
              <button onClick={() => set('defs', defs.filter((_, k) => k !== i))} className={`${miniBtn} hover:text-rose-600`}><Trash2 size={11} /></button>
            </div>
          ))}
          <button onClick={() => set('defs', [...defs, { term: '', desc: '' }])} className="text-[11px] font-semibold text-indigo-600 hover:underline">+ fila</button>
        </>
      )
    }

    case 'payments': {
      const pays: any[] = Array.isArray(block.items) ? block.items : []
      const setPay = (i: number, key: string, v: string) =>
        set('items', pays.map((p, k) => (k === i ? { ...p, [key]: v } : p)))
      return (
        <>
          {pays.map((p, i) => (
            <div key={i} className="mb-1 flex items-start gap-1">
              <input value={p.pct || ''} onChange={(e) => setPay(i, 'pct', e.target.value)} className={`${inputCls} w-20 shrink-0`} />
              <textarea rows={2} value={p.label || ''} onChange={(e) => setPay(i, 'label', e.target.value)} className={inputCls} />
              <button onClick={() => set('items', pays.filter((_, k) => k !== i))} className={`${miniBtn} hover:text-rose-600`}><Trash2 size={11} /></button>
            </div>
          ))}
          <button onClick={() => set('items', [...pays, { pct: '', label: '' }])} className="text-[11px] font-semibold text-indigo-600 hover:underline">+ pago</button>
        </>
      )
    }

    case 'toc':
      return (
        <>
          <p className="mt-2 text-[11.5px] text-slate-400">El índice se arma solo con las páginas que tengan título; se actualiza al agregar, mover o renombrar páginas.</p>
          <label className={labelCls}>Nota bajo el índice</label>
          <textarea rows={2} value={block.note || ''} onChange={(e) => set('note', e.target.value)} className={inputCls} />
        </>
      )

    case 'letterhead':
      return (
        <>
          <label className={labelCls}>Fecha</label>
          <input value={block.date || ''} onChange={(e) => set('date', e.target.value)} className={inputCls} />
          <label className={labelCls}>Destinatario — una línea por renglón</label>
          <textarea rows={4} value={block.addressee || ''} onChange={(e) => set('addressee', e.target.value)} className={inputCls} />
          <label className={labelCls}>Asunto — sin el prefijo «Asunto:»</label>
          <textarea rows={2} value={block.subject || ''} onChange={(e) => set('subject', e.target.value)} className={inputCls} />
          <label className={labelCls}>Saludo</label>
          <input value={block.salutation || ''} onChange={(e) => set('salutation', e.target.value)} className={inputCls} />
        </>
      )

    case 'team': {
      const members: any[] = Array.isArray(block.items) ? block.items : []
      const setMember = (i: number, key: string, v: unknown) =>
        set('items', members.map((m, k) => (k === i ? { ...m, [key]: v } : m)))
      return (
        <>
          {members.map((m, i) => (
            <div key={i} className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Rol {i + 1}</span>
                <button onClick={() => set('items', members.filter((_, k) => k !== i))} className={`${miniBtn} hover:text-rose-600`}><Trash2 size={11} /></button>
              </div>
              <input placeholder="Rol" value={m.role || ''} onChange={(e) => setMember(i, 'role', e.target.value)} className={`${inputCls} mb-1`} />
              <input placeholder="Dedicación / fases" value={m.dedication || ''} onChange={(e) => setMember(i, 'dedication', e.target.value)} className={`${inputCls} mb-1`} />
              {(m.functions || []).map((f: string, k: number) => (
                <div key={k} className="mb-1 flex items-start gap-1">
                  <textarea rows={2} value={f}
                    onChange={(e) => setMember(i, 'functions', (m.functions || []).map((x: string, j: number) => (j === k ? e.target.value : x)))}
                    className={inputCls} />
                  <button onClick={() => setMember(i, 'functions', (m.functions || []).filter((_: string, j: number) => j !== k))} className={`${miniBtn} hover:text-rose-600`}><Trash2 size={11} /></button>
                </div>
              ))}
              <button onClick={() => setMember(i, 'functions', [...(m.functions || []), ''])} className="text-[11px] font-semibold text-indigo-600 hover:underline">+ responsabilidad</button>
            </div>
          ))}
          <button onClick={() => set('items', [...members, { role: '', dedication: '', functions: [''] }])}
            className="mt-1 text-[11px] font-semibold text-indigo-600 hover:underline">+ rol</button>
        </>
      )
    }

    default:
      return <p className="mt-2 text-[11.5px] text-slate-400">Este bloque no tiene campos editables.</p>
  }
}
