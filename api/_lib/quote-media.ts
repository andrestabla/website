/**
 * Cotizador — imágenes y esquemas que la IA inserta en una propuesta.
 *
 * Tres fuentes, todas rehospedadas en R2 para que el documento no dependa de
 * terceros:
 *  - search: fotografías con licencia abierta (Openverse, sin llave).
 *  - generate: imagen generada con el modelo de imágenes de OpenAI.
 *  - diagram: un esquema en SVG que dibuja el propio modelo de texto.
 */
import { prisma } from './prisma.js'
import { INTEGRATIONS_SNAPSHOT_ID, sanitizeIntegrations, applyServerEnv } from './integrations.js'
import { uploadImageToR2 } from './r2.js'

export type MediaRequest = {
  kind: 'search' | 'generate' | 'diagram'
  /** búsqueda o descripción de la imagen; en diagram, el título del esquema */
  prompt: string
  caption?: string
  svg?: string
}

export type MediaResult = { url: string; caption: string; kind: MediaRequest['kind'] }

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
const MAX_DOWNLOAD = 4 * 1024 * 1024

async function openAiKey(): Promise<string> {
  const snapshot = await (prisma as any).cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } })
  const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data ?? {}))
  return integrations.openai.enabled ? integrations.openai.config.apiKey || '' : ''
}

/** Foto con licencia abierta, rehospedada. Devuelve null si no hay resultado utilizable. */
export async function searchImage(query: string, uploadedBy?: string): Promise<MediaResult | null> {
  const url = new URL('https://api.openverse.org/v1/images/')
  url.searchParams.set('q', query.slice(0, 200))
  url.searchParams.set('license_type', 'commercial,modification')
  url.searchParams.set('page_size', '8')
  url.searchParams.set('mature', 'false')
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'AlgoritmoT-Cotizador/1.0' }, signal: AbortSignal.timeout(12_000) })
  if (!res.ok) throw new Error(`Openverse respondió ${res.status}`)
  const json: any = await res.json().catch(() => null)
  const results: any[] = Array.isArray(json?.results) ? json.results : []
  for (const hit of results) {
    const src = String(hit?.url || '')
    if (!/^https?:\/\//.test(src)) continue
    try {
      const img = await fetch(src, { signal: AbortSignal.timeout(12_000), headers: { 'User-Agent': 'AlgoritmoT-Cotizador/1.0' } })
      if (!img.ok) continue
      const type = String(img.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) continue
      const buffer = Buffer.from(await img.arrayBuffer())
      if (!buffer.length || buffer.length > MAX_DOWNLOAD) continue
      const { url: hosted } = await uploadImageToR2({ buffer, contentType: type, filename: `foto-${query}`, folder: 'cotizador/media', uploadedBy })
      const credit = [hit?.creator ? `Foto: ${hit.creator}` : 'Foto: Openverse', hit?.license ? String(hit.license).toUpperCase() : '']
        .filter(Boolean).join(' · ')
      return { url: hosted, caption: credit, kind: 'search' }
    } catch {
      continue
    }
  }
  return null
}

/** Imagen generada con OpenAI y subida a R2. */
export async function generateImage(prompt: string, uploadedBy?: string): Promise<MediaResult> {
  const apiKey = await openAiKey()
  if (!apiKey) throw new Error('OpenAI no está configurado para generar imágenes')
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: `${prompt.slice(0, 1500)}\n\nEstilo: ilustración editorial limpia para una propuesta comercial de una consultora de transformación digital y educación; sin texto incrustado; paleta sobria (azul marino, cian, dorado, blanco).`,
      size: '1536x1024',
      quality: 'medium',
      n: 1,
    }),
    signal: AbortSignal.timeout(50_000),
  })
  const json: any = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error?.message || `OpenAI imágenes respondió ${res.status}`)
  const b64 = String(json?.data?.[0]?.b64_json || '')
  if (!b64) throw new Error('OpenAI no devolvió la imagen')
  const { url } = await uploadImageToR2({ buffer: Buffer.from(b64, 'base64'), contentType: 'image/png', filename: `ilustracion-${prompt.slice(0, 40)}`, folder: 'cotizador/media', uploadedBy })
  return { url, caption: '', kind: 'generate' }
}

/**
 * Esquema SVG dibujado por el modelo. Se limpia de todo lo ejecutable antes
 * de subirlo; el visor lo muestra como imagen, así que nunca corre código.
 */
export function sanitizeSvg(svg: string): string | null {
  let s = String(svg || '').trim()
  const start = s.indexOf('<svg')
  const end = s.lastIndexOf('</svg>')
  if (start === -1 || end === -1) return null
  s = s.slice(start, end + 6)
  s = s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<(iframe|object|embed|use)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|xlink:href)\s*=\s*("[^"]*"|'[^']*')/gi, (m, attr, val) => (/^["']#/.test(val) ? m : ''))
    .replace(/url\(\s*(?!#)[^)]*\)/gi, 'none')
  if (!/xmlns=/.test(s)) s = s.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"')
  if (s.length > 200_000) return null
  return s
}

export async function uploadDiagram(svg: string, title: string, uploadedBy?: string): Promise<MediaResult> {
  const clean = sanitizeSvg(svg)
  if (!clean) throw new Error('El esquema SVG no es válido')
  const { url } = await uploadImageToR2({ buffer: Buffer.from(clean, 'utf8'), contentType: 'image/svg+xml', filename: `esquema-${title.slice(0, 40)}`, folder: 'cotizador/media', uploadedBy })
  return { url, caption: '', kind: 'diagram' }
}

/** Resuelve una petición de la IA. Lanza si la fuente no puede cumplirla. */
export async function resolveMedia(req: MediaRequest, uploadedBy?: string): Promise<MediaResult | null> {
  if (req.kind === 'generate') return generateImage(req.prompt, uploadedBy)
  if (req.kind === 'diagram') return uploadDiagram(req.svg || '', req.prompt, uploadedBy)
  return searchImage(req.prompt, uploadedBy)
}
