/**
 * Learning Builder — las clases que comparten los editores.
 *
 * Cada formato tiene su editor, pero los campos deben verse y comportarse
 * igual en todos: misma altura, mismo foco, mismo gris. Estaban copiadas en
 * cada archivo y se iban separando; aquí se escriben una vez.
 */

export const fieldCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px] focus:border-indigo-500 focus:outline-none'

export const textareaCls = `${fieldCls} leading-relaxed`

/** Rótulo de sección dentro de un panel. */
export const eyebrowCls = 'text-[10.5px] font-black uppercase tracking-[0.14em] text-slate-400'

/** Botón discreto de añadir, con su borde punteado. */
export const addCls =
  'inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-50'

/** Elemento de una lista lateral: pantalla, escena, módulo, página. */
export function sideItemCls(active: boolean): string {
  return `flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] ${
    active ? 'bg-indigo-600 font-semibold text-white' : 'text-slate-600 hover:bg-white'
  }`
}

/** Mueve un elemento de sitio dentro de una lista, sin mutarla. */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const copy = [...list]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}
