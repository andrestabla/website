/**
 * Cotizador — editor de todo el contenido de la propuesta (todas las páginas
 * del visor público): portada, carta, diagnóstico, arquitectura, capturas,
 * cronograma, hitos, servicio, equipo, condiciones y cierre.
 *
 * Trabaja sobre una copia local y guarda con un solo botón; las capturas se
 * suben a R2 mediante /api/quotes/upload.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, UploadCloud, Loader2, Save, ArrowUp, ArrowDown } from 'lucide-react'
import { quotesApi } from './api'
import { PagesEditor, type Page } from './PagesEditor'

// ── helpers de ruta (a.b.c) ─────────────────────────────────────────────────
function getPath(obj: any, path: string) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}
function setPath(obj: any, path: string, value: unknown) {
  const keys = path.split('.')
  const clone = structuredClone(obj ?? {})
  let cursor = clone
  for (let i = 0; i < keys.length - 1; i++) {
    if (cursor[keys[i]] == null || typeof cursor[keys[i]] !== 'object') cursor[keys[i]] = {}
    cursor = cursor[keys[i]]
  }
  cursor[keys[keys.length - 1]] = value
  return clone
}

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] outline-none focus:border-indigo-500'
const labelCls = 'mb-1 mt-3 block text-[11px] font-bold uppercase tracking-wide text-slate-400'
const miniBtn = 'grid h-7 w-7 place-items-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-slate-600'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

// ── componentes estables (fuera del render: si se definen adentro, React los
//    remonta en cada tecla y el campo pierde el foco) ─────────────────────────
type ListOps = {
  list: any[]
  add: () => void
  remove: (i: number) => void
  move: (i: number, dir: -1 | 1) => void
  set: (i: number, field: string | null, value: unknown) => void
}

function StrListEditor({ ops, placeholder }: { ops: ListOps; placeholder: string }) {
  return (
    <div className="space-y-2">
      {ops.list.map((text, i) => (
        <div className="flex items-start gap-1.5" key={i}>
          <textarea rows={2} value={text} onChange={(e) => ops.set(i, null, e.target.value)} className={inputCls} />
          <div className="flex flex-col">
            <button onClick={() => ops.move(i, -1)} className={miniBtn}><ArrowUp size={12} /></button>
            <button onClick={() => ops.remove(i)} className={`${miniBtn} hover:text-rose-600`}><Trash2 size={12} /></button>
          </div>
        </div>
      ))}
      <button onClick={ops.add} className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:underline">
        <Plus size={13} /> {placeholder}
      </button>
    </div>
  )
}

function ObjListEditor({
  ops,
  fields,
  itemLabel,
}: {
  ops: ListOps
  fields: Array<{ key: string; label: string; area?: boolean; rows?: number }>
  itemLabel: string
}) {
  return (
    <div className="space-y-3">
      {ops.list.map((item, i) => (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3" key={i}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{itemLabel} {i + 1}</span>
            <div className="flex">
              <button onClick={() => ops.move(i, -1)} className={miniBtn}><ArrowUp size={12} /></button>
              <button onClick={() => ops.move(i, 1)} className={miniBtn}><ArrowDown size={12} /></button>
              <button onClick={() => ops.remove(i)} className={`${miniBtn} hover:text-rose-600`}><Trash2 size={12} /></button>
            </div>
          </div>
          {fields.map((field) => (
            <div key={field.key} className="mt-1.5">
              <label className="mb-0.5 block text-[10.5px] font-semibold text-slate-400">{field.label}</label>
              {field.area ? (
                <textarea rows={field.rows ?? 2} value={item?.[field.key] ?? ''} onChange={(e) => ops.set(i, field.key, e.target.value)} className={inputCls} />
              ) : (
                <input value={item?.[field.key] ?? ''} onChange={(e) => ops.set(i, field.key, e.target.value)} className={inputCls} />
              )}
            </div>
          ))}
        </div>
      ))}
      <button onClick={ops.add} className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:underline">
        <Plus size={13} /> Agregar {itemLabel.toLowerCase()}
      </button>
    </div>
  )
}

function Section({
  id,
  title,
  open,
  setOpen,
  children,
}: {
  id: string
  title: string
  open: Record<string, boolean>
  setOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  children: ReactNode
}) {
  const isOpen = open[id] === true
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen((prev) => ({ ...prev, [id]: !isOpen }))}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-bold text-slate-700"
      >
        {isOpen ? <ChevronDown size={15} className="text-indigo-500" /> : <ChevronRight size={15} className="text-slate-300" />}
        {title}
      </button>
      {isOpen && <div className="border-t border-slate-100 px-4 pb-4">{children}</div>}
    </div>
  )
}

// ── editor ──────────────────────────────────────────────────────────────────
export function ContentEditor({
  quoteId,
  quote,
  onSaved,
}: {
  quoteId: string
  quote: any
  onSaved: (quote: any) => void
}) {
  const [meta, setMeta] = useState({
    title: quote.title || '',
    subtitle: quote.subtitle || '',
    clientName: quote.clientName || '',
    sector: quote.sector || '',
    clientContact: quote.clientContact || '',
    clientEmail: quote.clientEmail || '',
    validDays: quote.validDays ?? 45,
  })
  const setMetaField = (key: string, value: unknown) => {
    setMeta((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }
  const [content, setContent] = useState<any>(() => structuredClone(quote.content ?? {}))
  const [dirty, setDirty] = useState(false)
  const [showLegacy, setShowLegacy] = useState(false)
  // sello del contenido con el que se abrió el editor: si el servidor tiene uno
  // más nuevo, guardar pisaría cambios hechos en otra pestaña o por un script.
  const loadedAt = useRef<string>(quote.updatedAt)
  const [stale, setStale] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>(
    Array.isArray(quote.content?.pages) && quote.content.pages.length ? { paginas: true } : { portada: true },
  )
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingShotIndex = useRef<number | null>(null)
  const [uploadingShot, setUploadingShot] = useState<number | null>(null)

  const patch = (path: string, value: unknown) => {
    setContent((prev: any) => setPath(prev, path, value))
    setDirty(true)
  }
  const val = (path: string, fallback: any = '') => getPath(content, path) ?? fallback
  const pages: Page[] = Array.isArray(content?.pages) ? content.pages : []

  // vigila si la cotización cambió en el servidor mientras se edita
  useEffect(() => {
    const id = window.setInterval(async () => {
      try {
        const payload = await quotesApi.get(quoteId)
        if (payload?.quote?.updatedAt && payload.quote.updatedAt !== loadedAt.current) setStale(true)
      } catch { /* sin red: se reintenta en el siguiente ciclo */ }
    }, 20000)
    return () => window.clearInterval(id)
  }, [quoteId])

  const save = async () => {
    if (stale && !confirm('La cotización cambió en otro lugar desde que abriste el editor. Si guardas, tus cambios reemplazan los del servidor. ¿Continuar?')) return
    setSaving(true)
    setError('')
    try {
      if (!meta.clientName.trim()) throw new Error('El nombre del cliente es obligatorio')
      const payload = await quotesApi.update(quoteId, {
        title: meta.title,
        subtitle: meta.subtitle,
        clientName: meta.clientName,
        sector: meta.sector,
        clientContact: meta.clientContact,
        clientEmail: meta.clientEmail,
        validDays: meta.validDays,
        content,
      })
      onSaved(payload.quote)
      loadedAt.current = payload.quote.updatedAt
      setStale(false)
      setDirty(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── listas genéricas ──
  const listOps = (path: string, empty: any) => {
    const list: any[] = Array.isArray(val(path, [])) ? val(path, []) : []
    return {
      list,
      add: () => patch(path, [...list, structuredClone(empty)]),
      remove: (i: number) => patch(path, list.filter((_, idx) => idx !== i)),
      move: (i: number, dir: -1 | 1) => {
        const j = i + dir
        if (j < 0 || j >= list.length) return
        const next = [...list]
        ;[next[i], next[j]] = [next[j], next[i]]
        patch(path, next)
      },
      set: (i: number, field: string | null, value: unknown) => {
        const next = [...list]
        next[i] = field === null ? value : { ...next[i], [field]: value }
        patch(path, next)
      },
    }
  }

  // ── capturas (R2) ──
  const uploadShot = async (file: File, index: number | null) => {
    setUploadingShot(index ?? -1)
    setError('')
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/quotes/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, filename: file.name, contentType: file.type }),
      })
      const payload = await res.json()
      if (!res.ok || !payload.ok) throw new Error(payload?.error || 'Error al subir')
      const items: any[] = Array.isArray(val('screens.items', [])) ? [...val('screens.items', [])] : []
      if (index === null) items.push({ url: payload.url, caption: '', wide: items.length === 0 })
      else items[index] = { ...items[index], url: payload.url }
      patch('screens.items', items)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploadingShot(null)
    }
  }

  const shots: any[] = Array.isArray(val('screens.items', [])) ? val('screens.items', []) : []

  return (
    <div className="space-y-3">
      {/* barra de guardado */}
      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur">
        <span className="text-[12px] text-slate-500">
          {dirty ? 'Cambios sin guardar' : 'Todo guardado'}
        </span>
        <div className="flex-1" />
        {error && <span className="text-[12px] text-rose-600">{error}</span>}
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar contenido
        </button>
      </div>

      <Section open={open} setOpen={setOpen} id="paginas"
        title={`Páginas del documento${pages.length ? ` · ${pages.length}` : ''}`}>
        {pages.length === 0 && (
          <p className="mb-2 mt-2 text-[12px] text-slate-500">
            Esta cotización usa el esquema clásico de secciones (abajo). Si la propuesta debe
            replicar un documento propio, compón sus páginas aquí: al agregar la primera, la
            vista pública pasa a renderizar estas páginas.
          </p>
        )}
        <PagesEditor pages={pages} onChange={(next) => patch('pages', next)} />
      </Section>

      {stale && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] text-rose-700">
          <b>La cotización cambió en otro lugar</b> desde que abriste el editor. Si guardas ahora,
          tus cambios reemplazan los del servidor; recarga la página si prefieres conservar los otros.
        </div>
      )}

      {pages.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5">
          <div className="text-[12px] font-semibold text-amber-800">
            Este documento se compone por páginas (arriba).
          </div>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-amber-700">
            Las secciones del esquema clásico quedan ocultas porque no se muestran en la vista
            pública de este documento.{' '}
            <button onClick={() => setShowLegacy((v) => !v)} className="font-semibold underline">
              {showLegacy ? 'Ocultarlas de nuevo' : 'Mostrarlas de todos modos'}
            </button>
          </p>
        </div>
      )}

      {(pages.length === 0 || showLegacy) && (
      <>
      <Section open={open} setOpen={setOpen} id="portada" title="Portada y datos del cliente">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cliente *"><input value={meta.clientName} onChange={(e) => setMetaField('clientName', e.target.value)} className={inputCls} /></Field>
          <Field label="Sector"><input value={meta.sector} onChange={(e) => setMetaField('sector', e.target.value)} className={inputCls} /></Field>
          <Field label="Contacto"><input value={meta.clientContact} onChange={(e) => setMetaField('clientContact', e.target.value)} className={inputCls} /></Field>
          <Field label="Correo del contacto"><input value={meta.clientEmail} onChange={(e) => setMetaField('clientEmail', e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Título"><textarea rows={2} value={meta.title} onChange={(e) => setMetaField('title', e.target.value)} className={inputCls} /></Field>
        <Field label="Bajada (subtítulo)"><textarea rows={3} value={meta.subtitle} onChange={(e) => setMetaField('subtitle', e.target.value)} className={inputCls} /></Field>
        <Field label="Documento Word para descarga (URL, opcional)">
          <input
            value={val('docxUrl')}
            onChange={(e) => patch('docxUrl', e.target.value)}
            placeholder="/cotizaciones/…/propuesta.docx"
            className={`${inputCls} font-mono text-[12px]`}
          />
        </Field>
        <Field label="Validez de la propuesta (días)">
          <input
            type="number" min={1} max={365} value={meta.validDays}
            onChange={(e) => setMetaField('validDays', Math.min(365, Math.max(1, parseInt(e.target.value, 10) || 45)))}
            className={`${inputCls} w-32`}
          />
        </Field>
      </Section>

      <Section open={open} setOpen={setOpen} id="presentacion" title="01 · Presentación (carta)">
        <Field label="Fecha — p. ej. «Bogotá D.C., 5 de agosto de 2026» (vacío = no se muestra)">
          <input value={val('letterhead.date')} onChange={(e) => patch('letterhead.date', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Destinatario — una línea por renglón (incluye «Señores» si aplica)">
          <textarea rows={4} value={val('letterhead.addressee')} onChange={(e) => patch('letterhead.addressee', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Asunto — sin el prefijo «Asunto:», se agrega solo">
          <textarea rows={2} value={val('letterhead.subject')} onChange={(e) => patch('letterhead.subject', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Saludo — p. ej. «Reciban un cordial saludo,»">
          <input value={val('letterhead.salutation')} onChange={(e) => patch('letterhead.salutation', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Carta — párrafos separados por línea en blanco">
          <textarea rows={10} value={val('intro')} onChange={(e) => patch('intro', e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section open={open} setOpen={setOpen} id="diagnostico" title="02 · Diagnóstico y frentes">
        <Field label="Entradilla"><textarea rows={3} value={val('diagnosis.lede')} onChange={(e) => patch('diagnosis.lede', e.target.value)} className={inputCls} /></Field>
        <label className={labelCls}>Frentes</label>
        <ObjListEditor
          ops={listOps('diagnosis.fronts', { title: '', body: '', needs: '' })}
          itemLabel="Frente"
          fields={[
            { key: 'title', label: 'Título' },
            { key: 'body', label: 'Descripción', area: true, rows: 3 },
            { key: 'needs', label: 'Necesita (remate)' },
          ]}
        />
        <Field label="Caja «Por qué a la medida» — título"><input value={val('diagnosis.note.title')} onChange={(e) => patch('diagnosis.note.title', e.target.value)} className={inputCls} /></Field>
        <Field label="Caja — texto"><textarea rows={4} value={val('diagnosis.note.body')} onChange={(e) => patch('diagnosis.note.body', e.target.value)} className={inputCls} /></Field>
      </Section>

      <Section open={open} setOpen={setOpen} id="arquitectura" title="03 · Arquitectura y base tecnológica">
        <Field label="Entradilla"><textarea rows={3} value={val('architecture.lede')} onChange={(e) => patch('architecture.lede', e.target.value)} className={inputCls} /></Field>
        <label className={labelCls}>Capas</label>
        <ObjListEditor
          ops={listOps('architecture.layers', { name: 'Capa', title: '', desc: '' })}
          itemLabel="Capa"
          fields={[
            { key: 'name', label: 'Etiqueta (Capa 01…)' },
            { key: 'title', label: 'Título' },
            { key: 'desc', label: 'Descripción', area: true },
          ]}
        />
        <Field label="Nota previa a la tabla"><textarea rows={2} value={val('architecture.stackNote')} onChange={(e) => patch('architecture.stackNote', e.target.value)} className={inputCls} /></Field>
        <label className={labelCls}>Base tecnológica</label>
        <ObjListEditor
          ops={listOps('architecture.stack', { component: '', tech: '', what: '' })}
          itemLabel="Componente"
          fields={[
            { key: 'component', label: 'Componente' },
            { key: 'tech', label: 'Tecnología' },
            { key: 'what', label: 'Qué aporta', area: true },
          ]}
        />
        <Field label="Caja «Propiedad y continuidad» — título"><input value={val('architecture.ownership.title')} onChange={(e) => patch('architecture.ownership.title', e.target.value)} className={inputCls} /></Field>
        <Field label="Caja — texto"><textarea rows={4} value={val('architecture.ownership.body')} onChange={(e) => patch('architecture.ownership.body', e.target.value)} className={inputCls} /></Field>
      </Section>

      <Section open={open} setOpen={setOpen} id="pantallas" title="04 · La plataforma en pantalla (capturas)">
        <Field label="Introducción"><textarea rows={3} value={val('screens.intro')} onChange={(e) => patch('screens.intro', e.target.value)} className={inputCls} /></Field>
        <label className={labelCls}>Capturas (se suben a R2)</label>
        <div className="space-y-3">
          {shots.map((shot, i) => (
            <div className="rounded-xl border border-slate-200 p-3" key={i}>
              <div className="flex items-start gap-3">
                {shot.url ? (
                  <img src={shot.url} alt="" className="h-20 w-32 shrink-0 rounded-lg border border-slate-200 object-cover object-top" />
                ) : (
                  <div className="grid h-20 w-32 shrink-0 place-items-center rounded-lg border border-dashed border-slate-300 text-[10px] text-slate-400">sin imagen</div>
                )}
                <div className="min-w-0 flex-1">
                  <textarea
                    rows={2}
                    placeholder="Pie de imagen"
                    value={shot.caption ?? ''}
                    onChange={(e) => { const next = [...shots]; next[i] = { ...next[i], caption: e.target.value }; patch('screens.items', next) }}
                    className={inputCls}
                  />
                  <div className="mt-1.5 flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
                      <input
                        type="checkbox"
                        checked={shot.wide === true}
                        onChange={(e) => { const next = [...shots]; next[i] = { ...next[i], wide: e.target.checked }; patch('screens.items', next) }}
                      />
                      Ancho completo
                    </label>
                    <button
                      onClick={() => { pendingShotIndex.current = i; fileRef.current?.click() }}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:underline"
                    >
                      {uploadingShot === i ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />} Reemplazar
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => { const next = shots.filter((_, idx) => idx !== i); patch('screens.items', next) }} className={`${miniBtn} hover:text-rose-600`}><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={() => { pendingShotIndex.current = null; fileRef.current?.click() }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            {uploadingShot === -1 ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />} Subir captura
          </button>
          <input
            ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadShot(f, pendingShotIndex.current); e.target.value = '' }}
          />
        </div>
        <Field label="Nota al pie de la sección"><textarea rows={2} value={val('screens.note')} onChange={(e) => patch('screens.note', e.target.value)} className={inputCls} /></Field>
      </Section>

      <Section open={open} setOpen={setOpen} id="nucleo" title="05 · Núcleo y notas de alcance">
        <Field label="Caja «Lectura de la cifra» — título"><input value={val('coreNote.title')} onChange={(e) => patch('coreNote.title', e.target.value)} className={inputCls} /></Field>
        <Field label="Caja — texto"><textarea rows={4} value={val('coreNote.body')} onChange={(e) => patch('coreNote.body', e.target.value)} className={inputCls} /></Field>
        <Field label="Nota de alcance (scopeNote)"><textarea rows={3} value={val('scopeNote')} onChange={(e) => patch('scopeNote', e.target.value)} className={inputCls} /></Field>
        <Field label="Cómo leer el plazo (timelineNote)"><textarea rows={3} value={val('timelineNote')} onChange={(e) => patch('timelineNote', e.target.value)} className={inputCls} /></Field>
      </Section>

      <Section open={open} setOpen={setOpen} id="cronograma" title="06 · Cronograma (semana a semana)">
        <Field label="Introducción"><textarea rows={3} value={val('schedule.intro')} onChange={(e) => patch('schedule.intro', e.target.value)} className={inputCls} /></Field>
        <p className="mt-2 text-[11.5px] text-slate-400">
          Las semanas se escriben como números separados por coma (p. ej. «3,4»). «Hito» marca la semana de entrega en dorado.
          Si la actividad empieza con un código de módulo («M03 · …»), la fila se atenúa cuando ese módulo esté apagado.
        </p>
        {(val('schedule.groups', []) as any[]).map((group: any, gi: number) => (
          <div className="mt-3 rounded-xl border border-slate-200 p-3" key={gi}>
            <div className="flex items-center gap-2">
              <input
                value={group.name ?? ''}
                onChange={(e) => { const groups = [...val('schedule.groups', [])]; groups[gi] = { ...groups[gi], name: e.target.value }; patch('schedule.groups', groups) }}
                className={`${inputCls} font-semibold`}
                placeholder="Nombre del bloque"
              />
              <button onClick={() => { const groups = (val('schedule.groups', []) as any[]).filter((_: any, idx: number) => idx !== gi); patch('schedule.groups', groups) }} className={`${miniBtn} hover:text-rose-600`}><Trash2 size={13} /></button>
            </div>
            <div className="mt-2 space-y-1.5">
              {(group.rows ?? []).map((row: any, ri: number) => (
                <div className="flex items-center gap-1.5" key={ri}>
                  <input
                    value={row.label ?? ''} placeholder="Actividad"
                    onChange={(e) => { const groups = structuredClone(val('schedule.groups', [])); groups[gi].rows[ri].label = e.target.value; patch('schedule.groups', groups) }}
                    className={inputCls}
                  />
                  <input
                    value={(row.on ?? []).join(',')} placeholder="Sem."
                    onChange={(e) => { const groups = structuredClone(val('schedule.groups', [])); groups[gi].rows[ri].on = e.target.value.split(',').map((x: string) => parseInt(x, 10)).filter((n: number) => n > 0); patch('schedule.groups', groups) }}
                    className={`${inputCls} w-24 shrink-0 text-center font-mono`}
                    title="Semanas de ejecución, p. ej. 3,4"
                  />
                  <input
                    value={(row.hito ?? []).join(',')} placeholder="Hito"
                    onChange={(e) => { const groups = structuredClone(val('schedule.groups', [])); groups[gi].rows[ri].hito = e.target.value.split(',').map((x: string) => parseInt(x, 10)).filter((n: number) => n > 0); patch('schedule.groups', groups) }}
                    className={`${inputCls} w-20 shrink-0 text-center font-mono`}
                    title="Semanas con hito, p. ej. 8"
                  />
                  <button onClick={() => { const groups = structuredClone(val('schedule.groups', [])); groups[gi].rows.splice(ri, 1); patch('schedule.groups', groups) }} className={`${miniBtn} hover:text-rose-600`}><Trash2 size={12} /></button>
                </div>
              ))}
              <button
                onClick={() => { const groups = structuredClone(val('schedule.groups', [])); groups[gi].rows = [...(groups[gi].rows ?? []), { label: '', on: [], hito: [] }]; patch('schedule.groups', groups) }}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:underline"
              >
                <Plus size={12} /> Actividad
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => patch('schedule.groups', [...val('schedule.groups', []), { name: '', rows: [] }])}
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:underline"
        >
          <Plus size={13} /> Agregar bloque
        </button>
        <Field label="Leyenda adicional"><input value={val('schedule.legend')} onChange={(e) => patch('schedule.legend', e.target.value)} className={inputCls} /></Field>
      </Section>

      <Section open={open} setOpen={setOpen} id="inversion" title="07 · Inversión, hitos y plan de pagos">
        <Field label="Nota bajo la tabla de inversión"><textarea rows={3} value={val('investmentNote')} onChange={(e) => patch('investmentNote', e.target.value)} className={inputCls} /></Field>
        <label className={labelCls}>Qué se aprueba en cada hito</label>
        <ObjListEditor
          ops={listOps('milestones', { name: 'Hito', week: '', criterion: '' })}
          itemLabel="Hito"
          fields={[
            { key: 'name', label: 'Nombre (Hito 01…)' },
            { key: 'week', label: 'Semana (Fin S2…)' },
            { key: 'criterion', label: 'Criterio de aprobación', area: true },
          ]}
        />
        <Field label="Nota del plan de pagos"><textarea rows={2} value={val('paymentsNote')} onChange={(e) => patch('paymentsNote', e.target.value)} className={inputCls} /></Field>
      </Section>

      <Section open={open} setOpen={setOpen} id="servicio" title="08 · Servicio, soporte y renovación">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Meses incluidos"><input type="number" value={val('service.includedMonths', 12)} onChange={(e) => patch('service.includedMonths', parseInt(e.target.value, 10) || 0)} className={inputCls} /></Field>
          <Field label="Renovación anual"><input type="number" value={val('service.renewalPrice', 0)} onChange={(e) => patch('service.renewalPrice', parseInt(e.target.value, 10) || 0)} className={inputCls} /></Field>
          <Field label="Salida del servicio"><input type="number" value={val('service.exitPrice', 0)} onChange={(e) => patch('service.exitPrice', parseInt(e.target.value, 10) || 0)} className={inputCls} /></Field>
        </div>
        <Field label="Intro de niveles de soporte"><textarea rows={2} value={val('service.levelsIntro')} onChange={(e) => patch('service.levelsIntro', e.target.value)} className={inputCls} /></Field>
        <label className={labelCls}>Niveles de soporte</label>
        <ObjListEditor
          ops={listOps('service.levels', { name: '', desc: '' })}
          itemLabel="Nivel"
          fields={[
            { key: 'name', label: 'Nombre (Nivel 2 · Atención funcional)' },
            { key: 'desc', label: 'Descripción', area: true },
          ]}
        />
        <Field label="Caja «Qué implica para el presupuesto» — título"><input value={val('service.budgetNote.title')} onChange={(e) => patch('service.budgetNote.title', e.target.value)} className={inputCls} /></Field>
        <Field label="Caja — texto"><textarea rows={3} value={val('service.budgetNote.body')} onChange={(e) => patch('service.budgetNote.body', e.target.value)} className={inputCls} /></Field>
        <Field label="Nota final de servicio"><textarea rows={2} value={val('service.note')} onChange={(e) => patch('service.note', e.target.value)} className={inputCls} /></Field>
      </Section>

      <Section open={open} setOpen={setOpen} id="equipo" title="09 · Equipo y forma de trabajo">
        <Field label="Entradilla"><textarea rows={2} value={val('teamIntro')} onChange={(e) => patch('teamIntro', e.target.value)} className={inputCls} /></Field>
        <label className={labelCls}>Roles (funciones: una por línea)</label>
        <div className="space-y-3">
          {(val('team', []) as any[]).map((member: any, i: number) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3" key={i}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Rol {i + 1}</span>
                <button onClick={() => patch('team', (val('team', []) as any[]).filter((_: any, idx: number) => idx !== i))} className={`${miniBtn} hover:text-rose-600`}><Trash2 size={12} /></button>
              </div>
              <input
                value={member.role ?? ''} placeholder="Rol"
                onChange={(e) => { const team = structuredClone(val('team', [])); team[i].role = e.target.value; patch('team', team) }}
                className={inputCls}
              />
              <input
                value={member.dedication ?? ''} placeholder="Dedicación"
                onChange={(e) => { const team = structuredClone(val('team', [])); team[i].dedication = e.target.value; patch('team', team) }}
                className={`${inputCls} mt-1.5`}
              />
              <textarea
                rows={3}
                value={(member.functions ?? []).join('\n')}
                placeholder={'Función 1\nFunción 2'}
                onChange={(e) => { const team = structuredClone(val('team', [])); team[i].functions = e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean); patch('team', team) }}
                className={`${inputCls} mt-1.5`}
              />
            </div>
          ))}
          <button
            onClick={() => patch('team', [...val('team', []), { role: '', dedication: '', functions: [] }])}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:underline"
          >
            <Plus size={13} /> Agregar rol
          </button>
        </div>
        <Field label="Caja «Ritmo de trabajo» — título"><input value={val('workRhythm.title')} onChange={(e) => patch('workRhythm.title', e.target.value)} className={inputCls} /></Field>
        <Field label="Caja — texto"><textarea rows={3} value={val('workRhythm.body')} onChange={(e) => patch('workRhythm.body', e.target.value)} className={inputCls} /></Field>
      </Section>

      <Section open={open} setOpen={setOpen} id="condiciones" title="10 · Supuestos, exclusiones y garantías">
        <label className={labelCls}>Lo que asumimos</label>
        <StrListEditor ops={listOps('assumptions', '')} placeholder="Agregar supuesto" />
        <label className={labelCls}>Lo que queda fuera</label>
        <StrListEditor ops={listOps('exclusions', '')} placeholder="Agregar exclusión" />
        <label className={labelCls}>Garantía, propiedad y ampliación</label>
        <ObjListEditor
          ops={listOps('guarantees', { concept: '', text: '' })}
          itemLabel="Concepto"
          fields={[
            { key: 'concept', label: 'Concepto (Garantía, Propiedad…)' },
            { key: 'text', label: 'Alcance', area: true },
          ]}
        />
        <Field label="Nota final (validez, alcance contractual)"><textarea rows={2} value={val('finalNote')} onChange={(e) => patch('finalNote', e.target.value)} className={inputCls} /></Field>
      </Section>

      <Section open={open} setOpen={setOpen} id="cierre" title="11 · Contraportada y firma">
        <Field label="Frase de cierre"><textarea rows={2} value={val('backQuote')} onChange={(e) => patch('backQuote', e.target.value)} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre"><input value={val('signature.name')} onChange={(e) => patch('signature.name', e.target.value)} className={inputCls} /></Field>
          <Field label="Cargo"><input value={val('signature.role')} onChange={(e) => patch('signature.role', e.target.value)} className={inputCls} /></Field>
          <Field label="Correo"><input value={val('signature.email')} onChange={(e) => patch('signature.email', e.target.value)} className={inputCls} /></Field>
          <Field label="Teléfono"><input value={val('signature.phone')} onChange={(e) => patch('signature.phone', e.target.value)} className={inputCls} /></Field>
        </div>
      </Section>
      </>
      )}
    </div>
  )
}
