/**
 * Enrutado del módulo BI según el host.
 *
 * - En el subdominio (bi.algoritmot.com o bi.*): el módulo se monta en la RAÍZ,
 *   con rutas limpias (bi.algoritmot.com/oferta). BI_BASE = ''.
 * - En el dominio principal (algoritmot.com): el módulo vive bajo /bi. BI_BASE = '/bi'.
 *
 * Nota: un rewrite de Vercel no cambia la URL que ve react-router, por eso la
 * decisión se toma en el cliente a partir del hostname.
 */
export const BI_HOST_MODE =
  typeof window !== 'undefined' && /^bi\./i.test(window.location.hostname)

export const BI_BASE = BI_HOST_MODE ? '' : '/bi'

/** Ruta de inicio del BI (hub). */
export const BI_HOME = BI_BASE || '/'

/** Construye una ruta absoluta del BI respetando el host. */
export function biPath(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${BI_BASE}${clean}` || '/'
}
