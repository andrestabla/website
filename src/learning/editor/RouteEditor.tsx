/**
 * Learning Builder — editor de la ruta de aprendizaje.
 *
 * La ruta es lo primero que se firma con el cliente y lo último que se
 * revisa, así que aquí importan dos cosas por encima del resto: que las horas
 * cuadren y que se vea qué está producido y qué no.
 *
 * Las horas se suman a la vista —por módulo y en total—, de modo que un curso
 * que se pasa de la dedicación pactada se nota mientras se escribe, no cuando
 * el cliente lo cuenta. Y cada actividad puede apuntar al código del recurso
 * que la realiza, con lo que el mismo documento hace de propuesta y de
 * tablero de producción.
 */
import { useState } from 'react'
import {
  AlertTriangle, ChevronDown, ChevronUp, Copy, GraduationCap, Layers, MessageSquare, Plus, Trash2,
} from 'lucide-react'
import type { LbIssue } from '../lib/blocks'
import type { LbDirectives } from '../lib/directives'
import {
  LB_ACTIVITY_KINDS, LB_ACTIVITY_LABEL, LB_ACTIVITY_MODES, LB_ACTIVITY_MODE_LABEL,
  routeCoverage, routeHours,
  type LbActivity, type LbRouteContent, type LbRouteModule,
} from '../lib/route'
import { newLbId } from '../lib/common'
import { CoverFields } from './CoverFields'
import { addCls, eyebrowCls, fieldCls, move, sideItemCls, textareaCls } from './ui'

export function RouteEditor({
  content,
  directives,
  issues,
  onChange,
  commentsByAnchor,
  onOpenComments,
}: {
  content: LbRouteContent
  directives: LbDirectives
  issues: LbIssue[]
  onChange: (next: LbRouteContent) => void
  commentsByAnchor?: Map<string, { total: number; open: number }>
  onOpenComments?: (anchor: string) => void
}) {
  const [selected, setSelected] = useState<string>(content.modules[0]?.id || 'cover')

  const issuesByModule = new Map<string, number>()
  for (const issue of issues) {
    if (issue.level !== 'error' || !issue.lessonId) continue
    issuesByModule.set(issue.lessonId, (issuesByModule.get(issue.lessonId) || 0) + 1)
  }

  const item = content.modules.find((row) => row.id === selected) || null
  const setModules = (modules: LbRouteModule[]) => onChange({ ...content, modules })
  const patchModule = (id: string, patch: Partial<LbRouteModule>) =>
    setModules(content.modules.map((row) => (row.id === id ? { ...row, ...patch } : row)))

  const addModule = () => {
    const created: LbRouteModule = {
      id: newLbId('m'),
      title: `Módulo ${content.modules.length + 1}`,
      weeks: 2,
      activities: [],
    }
    setModules([...content.modules, created])
    setSelected(created.id)
  }

  const hours = routeHours(content)
  const coverage = routeCoverage(content)

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-slate-200 bg-slate-50 p-3 md:border-b-0 md:border-r">
        <button
          onClick={() => setSelected('cover')}
          className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold ${
            selected === 'cover' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white'
          }`}
        >
          <GraduationCap size={14} /> El curso
        </button>

        <div className={`mb-1 mt-3 px-3 ${eyebrowCls}`}>Módulos</div>
        {content.modules.map((row, index) => {
          const errors = issuesByModule.get(row.id) || 0
          const moduleHours = row.activities.reduce((sum, activity) => sum + activity.hours, 0)
          return (
            <div key={row.id} className="group flex items-center gap-1">
              <button onClick={() => setSelected(row.id)} className={sideItemCls(selected === row.id)}>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10.5px] font-bold ${
                  selected === row.id ? 'bg-white/20' : 'bg-slate-200 text-slate-500'
                }`}>{index + 1}</span>
                <span className="truncate">{row.title}</span>
                {errors > 0 && <AlertTriangle size={13} className={selected === row.id ? 'text-amber-200' : 'text-amber-500'} />}
                <span className={`ml-auto shrink-0 text-[11px] ${selected === row.id ? 'text-white/70' : 'text-slate-400'}`}>
                  {moduleHours} h
                </span>
              </button>
              <div className="flex shrink-0 opacity-0 transition group-hover:opacity-100">
                <button onClick={() => setModules(move(content.modules, index, index - 1))} className="grid h-6 w-5 place-items-center text-slate-400 hover:text-slate-700" aria-label="Subir"><ChevronUp size={13} /></button>
                <button onClick={() => setModules(move(content.modules, index, index + 1))} className="grid h-6 w-5 place-items-center text-slate-400 hover:text-slate-700" aria-label="Bajar"><ChevronDown size={13} /></button>
                <button
                  onClick={() => {
                    const rest = content.modules.filter((candidate) => candidate.id !== row.id)
                    setModules(rest)
                    setSelected(rest[0]?.id || 'cover')
                  }}
                  className="grid h-6 w-5 place-items-center text-slate-400 hover:text-rose-600"
                  aria-label="Eliminar"
                ><Trash2 size={12} /></button>
              </div>
            </div>
          )
        })}

        <button onClick={addModule} className={`${addCls} mt-2 w-full justify-center`}>
          <Plus size={13} /> Añadir módulo
        </button>

        <div className="mt-4 space-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px]">
          <div className="flex justify-between"><span className="text-slate-500">Dedicación</span><b>{hours} h</b></div>
          <div className="flex justify-between">
            <span className="text-slate-500">Producido</span>
            <b className={coverage.linked === coverage.total ? 'text-emerald-600' : ''}>
              {coverage.linked} / {coverage.total}
            </b>
          </div>
        </div>
      </aside>

      <div className="min-w-0 overflow-y-auto p-4 sm:p-6">
        {selected === 'cover' ? (
          <CoursePanel content={content} directives={directives} onChange={onChange} />
        ) : !item ? (
          <div className="grid h-40 place-items-center text-[13px] text-slate-400">Elige un módulo.</div>
        ) : (
          <ModulePanel
            item={item}
            comments={commentsByAnchor}
            onOpenComments={onOpenComments}
            onChange={(patch) => patchModule(item.id, patch)}
          />
        )}
      </div>
    </div>
  )
}

function CoursePanel({
  content,
  directives,
  onChange,
}: {
  content: LbRouteContent
  directives: LbDirectives
  onChange: (next: LbRouteContent) => void
}) {
  const competencies = content.competencies

  return (
    <div className="space-y-6">
      <CoverFields
        cover={content.cover}
        directives={directives}
        onChange={(cover) => onChange({ ...content, cover })}
        title="El curso"
      />

      <div className="max-w-2xl space-y-4 border-t border-slate-200 pt-5">
        <div className="text-[13px]">
          <span className="mb-1 block font-semibold text-slate-600">Competencias del curso</span>
          <div className="space-y-2">
            {competencies.map((row, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={row}
                  onChange={(event) =>
                    onChange({ ...content, competencies: competencies.map((old, i) => (i === index ? event.target.value : old)) })
                  }
                  className={fieldCls}
                />
                <button
                  onClick={() => onChange({ ...content, competencies: competencies.filter((_, i) => i !== index) })}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Quitar competencia"
                ><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={() => onChange({ ...content, competencies: [...competencies, ''] })} className={addCls}>
              <Plus size={13} /> Añadir competencia
            </button>
          </div>
        </div>

        <label className="block text-[13px]">
          <span className="mb-1 block font-semibold text-slate-600">A quién va dirigido</span>
          <textarea
            value={content.audience || ''}
            onChange={(event) => onChange({ ...content, audience: event.target.value })}
            rows={2}
            className={textareaCls}
          />
        </label>
        <label className="block text-[13px]">
          <span className="mb-1 block font-semibold text-slate-600">De qué se parte</span>
          <textarea
            value={content.prerequisites || ''}
            onChange={(event) => onChange({ ...content, prerequisites: event.target.value })}
            rows={2}
            className={textareaCls}
          />
        </label>
        <label className="block text-[13px]">
          <span className="mb-1 block font-semibold text-slate-600">Cómo se evalúa el curso</span>
          <textarea
            value={content.assessment || ''}
            onChange={(event) => onChange({ ...content, assessment: event.target.value })}
            rows={3}
            className={textareaCls}
          />
        </label>
      </div>
    </div>
  )
}

function ModulePanel({
  item,
  comments,
  onOpenComments,
  onChange,
}: {
  item: LbRouteModule
  comments?: Map<string, { total: number; open: number }>
  onOpenComments?: (anchor: string) => void
  onChange: (patch: Partial<LbRouteModule>) => void
}) {
  const setActivities = (activities: LbActivity[]) => onChange({ activities })
  const patchActivity = (id: string, patch: Partial<LbActivity>) =>
    setActivities(item.activities.map((row) => (row.id === id ? { ...row, ...patch } : row)))

  const moduleHours = item.activities.reduce((sum, activity) => sum + activity.hours, 0)

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
        <label className="text-[13px]">
          <span className="mb-1 block font-semibold text-slate-600">Título del módulo</span>
          <input value={item.title} onChange={(event) => onChange({ title: event.target.value })} className={fieldCls} />
        </label>
        <label className="text-[13px]">
          <span className="mb-1 block font-semibold text-slate-600">Semanas</span>
          <input
            type="number"
            min={0}
            max={60}
            value={item.weeks ?? 0}
            onChange={(event) => onChange({ weeks: Math.max(0, Number(event.target.value) || 0) })}
            className={fieldCls}
          />
        </label>
      </div>

      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">De qué trata</span>
        <textarea value={item.summary || ''} onChange={(event) => onChange({ summary: event.target.value })} rows={2} className={textareaCls} />
      </label>
      <label className="block text-[13px]">
        <span className="mb-1 block font-semibold text-slate-600">Qué sabrá hacer al terminarlo</span>
        <textarea value={item.outcome || ''} onChange={(event) => onChange({ outcome: event.target.value })} rows={2} className={textareaCls} />
      </label>

      <div className="flex items-center gap-2 border-t border-slate-200 pt-4">
        <Layers size={14} className="text-slate-400" />
        <span className={eyebrowCls}>Actividades</span>
        <div className="flex-1" />
        <span className="text-[12px] font-bold text-slate-600">{moduleHours} h en total</span>
      </div>

      {item.activities.map((activity, index) => {
        const counts = comments?.get(`block:${activity.id}`)
        return (
          <div key={activity.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <select
                value={activity.kind}
                onChange={(event) => patchActivity(activity.id, { kind: event.target.value as LbActivity['kind'] })}
                className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[12px] font-semibold text-slate-700"
              >
                {LB_ACTIVITY_KINDS.map((kind) => <option key={kind} value={kind}>{LB_ACTIVITY_LABEL[kind]}</option>)}
              </select>
              <select
                value={activity.mode}
                onChange={(event) => patchActivity(activity.id, { mode: event.target.value as LbActivity['mode'] })}
                className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11.5px] text-slate-600"
              >
                {LB_ACTIVITY_MODES.map((mode) => <option key={mode} value={mode}>{LB_ACTIVITY_MODE_LABEL[mode]}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={activity.hours}
                  onChange={(event) => patchActivity(activity.id, { hours: Math.max(0, Number(event.target.value) || 0) })}
                  className="w-14 rounded-md border border-slate-200 px-1.5 py-0.5 text-[12.5px]"
                  aria-label="Horas"
                />
                <span className="text-[11.5px] text-slate-400">h</span>
              </div>

              <div className="flex-1" />

              {!!counts?.total && (
                <button
                  onClick={() => onOpenComments?.(`block:${activity.id}`)}
                  className={`inline-flex items-center gap-0.5 text-[11px] font-bold hover:underline ${
                    counts.open ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                ><MessageSquare size={11} /> {counts.total}</button>
              )}
              <button onClick={() => setActivities(move(item.activities, index, index - 1))} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100" aria-label="Subir"><ChevronUp size={14} /></button>
              <button onClick={() => setActivities(move(item.activities, index, index + 1))} className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100" aria-label="Bajar"><ChevronDown size={14} /></button>
              <button
                onClick={() => {
                  const copy: LbActivity = { ...structuredClone(activity), id: newLbId('a') }
                  const next = [...item.activities]
                  next.splice(index + 1, 0, copy)
                  setActivities(next)
                }}
                className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-100" aria-label="Duplicar"
              ><Copy size={14} /></button>
              <button
                onClick={() => setActivities(item.activities.filter((row) => row.id !== activity.id))}
                className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Eliminar"
              ><Trash2 size={14} /></button>
            </div>

            <input
              value={activity.title}
              onChange={(event) => patchActivity(activity.id, { title: event.target.value })}
              className={`${fieldCls} mb-2 font-semibold`}
              placeholder="Qué hace el estudiante"
            />
            <textarea
              value={activity.description || ''}
              onChange={(event) => patchActivity(activity.id, { description: event.target.value })}
              rows={2}
              className={`${textareaCls} mb-2`}
              placeholder="En qué consiste."
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={activity.evidence || ''}
                onChange={(event) => patchActivity(activity.id, { evidence: event.target.value })}
                className={fieldCls}
                placeholder="Qué entrega o demuestra"
              />
              <input
                value={activity.resourceCode || ''}
                onChange={(event) => patchActivity(activity.id, { resourceCode: event.target.value.toUpperCase() })}
                className={`${fieldCls} font-mono`}
                placeholder="Código del recurso · UNICAFAM-OVA-001"
              />
            </div>
          </div>
        )
      })}

      <button
        onClick={() =>
          setActivities([
            ...item.activities,
            { id: newLbId('a'), title: '', kind: 'LECTURA', mode: 'autonomo', hours: 2 },
          ])
        }
        className={`${addCls} w-full justify-center py-2.5`}
      >
        <Plus size={14} /> Añadir actividad
      </button>
    </div>
  )
}
