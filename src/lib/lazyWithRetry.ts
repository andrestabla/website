import { lazy, type ComponentType } from 'react'

const RELOAD_KEY = 'algoritmot:chunk-reload-ts'
const RELOAD_WINDOW_MS = 10_000

/**
 * Detecta fallos típicos de carga de un chunk lazy. Ocurre cuando un deploy nuevo
 * invalida los archivos con hash viejo mientras el navegador aún tiene cacheado el
 * index.html anterior: el import() dinámico falla y, sin recuperación, la pantalla
 * queda en blanco.
 */
export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  const name = err instanceof Error ? err.name : ''
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Loading CSS chunk/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg)
  )
}

/**
 * Fuerza una recarga única (dentro de una ventana de tiempo) para traer el index.html
 * nuevo y, con él, los chunks con hash vigente. El guard en sessionStorage evita
 * bucles de recarga si el problema no es un deploy. Devuelve true si disparó la recarga.
 */
export function reloadOnceForChunkError(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) || '0')
    const now = Date.now()
    if (now - last > RELOAD_WINDOW_MS) {
      window.sessionStorage.setItem(RELOAD_KEY, String(now))
      window.location.reload()
      return true
    }
    return false
  } catch {
    // sessionStorage puede fallar (modo privado / cookies bloqueadas): recarga directa.
    window.location.reload()
    return true
  }
}

/**
 * React.lazy con recuperación automática: si el import() falla por un chunk obsoleto,
 * recarga la página una vez para restaurar la app. Reemplaza a `lazy()` en las rutas.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (err) {
      if (isChunkLoadError(err) && reloadOnceForChunkError()) {
        // Recarga en curso: devolvemos una promesa que nunca resuelve para no
        // renderizar un estado de error transitorio antes de que la página recargue.
        return await new Promise<{ default: T }>(() => {})
      }
      throw err
    }
  })
}
