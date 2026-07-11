import { emitBiUnauthorized } from './auth-events'

export type BiDatasetKey =
  | 'insights'
  | 'prospectiva'
  | 'ole'
  | 'oit'
  | 'pertinencia'
  | 'puente'
  | 'recomendaciones'
  | 'cohortes'

export type BiDatasetResponse = {
  ok: boolean
  key: string
  title: string
  category: string
  version: string
  meta: unknown
  data: unknown
}

const cache = new Map<string, Promise<BiDatasetResponse>>()

/** Carga un dataset BI desde Postgres vía /api/bi/dataset (con caché en memoria). */
export function fetchDataset(key: BiDatasetKey): Promise<BiDatasetResponse> {
  if (cache.has(key)) return cache.get(key)!
  const p = (async () => {
    const res = await fetch(`/api/bi/dataset?key=${encodeURIComponent(key)}`)
    if (!res.ok) {
      cache.delete(key)
      if (res.status === 401) emitBiUnauthorized()
      throw new Error(`No se pudo cargar el dataset "${key}" (${res.status})`)
    }
    return (await res.json()) as BiDatasetResponse
  })()
  cache.set(key, p)
  return p
}

export type BiDatasetSummary = {
  key: string
  title: string
  description: string | null
  category: string | null
  version: string
  updatedAt: string
}

export async function fetchDatasetList(): Promise<BiDatasetSummary[]> {
  const res = await fetch('/api/bi/datasets')
  if (!res.ok) throw new Error('No se pudo listar los datasets BI')
  const payload = await res.json()
  return (payload?.datasets ?? []) as BiDatasetSummary[]
}
