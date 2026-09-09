/**
 * Cotizador — PDF generado en el servidor.
 *
 * Abre la vista pública en un Chromium sin cabeza y la imprime en A4 con los
 * mismos estilos de impresión del visor: todos reciben la misma hoja, sin
 * depender del navegador del lector. Cotizaciones publicadas: acceso por el
 * publicId; borradores: solo el dueño (se reenvía su cookie de sesión al
 * navegador interno).
 *
 * GET /api/quotes/pdf?id=<publicId>&d=<token de destinatario opcional>
 */
import { prisma } from '../_lib/prisma.js'
import { quoteSessionState } from '../_lib/quotes.js'

type VercelRequest = any
type VercelResponse = any

export const maxDuration = 60

const db = () => (prisma as any).quote

function publicOrigin(req: VercelRequest) {
  const configured = process.env.PUBLIC_SITE_ORIGIN || ''
  if (configured) return configured.replace(/\/$/, '')
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || 'www.algoritmot.com')
  const proto = String(req.headers?.['x-forwarded-proto'] || (host.startsWith('localhost') ? 'http' : 'https'))
  return `${proto}://${host}`
}

async function launchBrowser() {
  const puppeteer: any = await import('puppeteer-core')
  const local = process.env.PUPPETEER_EXECUTABLE_PATH
  if (local) {
    return puppeteer.launch({ executablePath: local, headless: true, protocolTimeout: 50_000, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  }
  const chromium: any = (await import('@sparticuz/chromium')).default
  return puppeteer.launch({
    args: [...chromium.args, '--font-render-hinting=none'],
    defaultViewport: { width: 1200, height: 1600, deviceScaleFactor: 1 },
    executablePath: await chromium.executablePath(),
    headless: true,
    protocolTimeout: 50_000,
  })
}

const slug = (t: string) => String(t || 'cotizacion').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'cotizacion'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const publicId = String(req.query?.id || '').slice(0, 40)
  const recipientToken = String(req.query?.d || '').slice(0, 60)
  if (!publicId) return res.status(400).json({ ok: false, error: 'id requerido' })

  let browser: any = null
  try {
    const quote = await db().findUnique({ where: { publicId }, select: { id: true, ownerId: true, status: true, title: true, clientName: true } })
    if (!quote) return res.status(404).json({ ok: false, error: 'Cotización no encontrada' })

    // borrador: solo el dueño o un admin
    let sessionCookie = ''
    if (quote.status !== 'PUBLISHED') {
      const { session, allowed } = await quoteSessionState(req)
      const isOwner = !!session && (session.userId === quote.ownerId || session.role === 'SUPERADMIN' || session.role === 'ADMIN')
      if (!allowed || !isOwner) return res.status(404).json({ ok: false, error: 'Cotización no disponible' })
      const raw = String(req.headers?.cookie || '')
      const match = /(?:^|;\s*)admin_session=([^;]+)/.exec(raw)
      sessionCookie = match ? match[1] : ''
    }

    const origin = publicOrigin(req)
    const url = `${origin}/c/${publicId}?print=1${recipientToken ? `&d=${encodeURIComponent(recipientToken)}` : ''}`

    browser = await launchBrowser()
    const page = await browser.newPage()
    if (sessionCookie) {
      const host = new URL(origin).hostname
      await page.setCookie({ name: 'admin_session', value: sessionCookie, domain: host, path: '/', httpOnly: true })
    }
    await page.emulateMediaType('print')
    // 'load' y no 'networkidle': un websocket abierto (analítica, HMR) no debe bloquear el PDF
    await page.goto(url, { waitUntil: 'load', timeout: 40_000 })
    // el visor ajusta cada hoja al alto A4 y las imágenes cargan en diferido
    await page.waitForSelector('.qv .qv-page, .qv-status', { timeout: 25_000 })
    const missing: number = await page.evaluate(async () => {
      // las imágenes con carga diferida no entran nunca en pantalla en un navegador sin cabeza:
      // se fuerzan y se espera de verdad a que carguen (las de la propuesta pueden pesar varios MB);
      // el tope evita que un recurso caído bloquee el PDF
      const imgs = Array.from(document.images)
      // con la imagen en cache, Chrome la da por «completa» sin haberla decodificado para
      // imprimir y el PDF sale con el recuadro vacio: se recarga y se decodifica cada una
      const ready = async (img: HTMLImageElement) => {
        img.removeAttribute('loading')
        const src = img.currentSrc || img.src
        if (!src) return
        await new Promise<void>((r) => { img.addEventListener('load', () => r(), { once: true }); img.addEventListener('error', () => r(), { once: true }); img.src = ''; img.src = src })
        await img.decode().catch(() => undefined)
      }
      window.scrollTo(0, document.body.scrollHeight)
      await Promise.race([Promise.all(imgs.map(ready)), new Promise((r) => setTimeout(r, 30000))])
      // las que fallaron (red, tiempo) reciben un segundo intento corto
      const failed = imgs.filter((img) => !img.complete || img.naturalWidth === 0)
      if (failed.length) await Promise.race([Promise.all(failed.map(ready)), new Promise((r) => setTimeout(r, 8000))])
      window.scrollTo(0, 0)
      await Promise.race([(document as any).fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 3000))])
      return imgs.filter((img) => img.naturalWidth === 0).length
    })
    await new Promise((r) => setTimeout(r, 900))
    const pdf: Buffer = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('X-Images-Missing', String(missing))
    res.setHeader('Content-Disposition', `inline; filename="${slug(quote.title)}-${slug(quote.clientName)}.pdf"`)
    res.setHeader('Cache-Control', quote.status === 'PUBLISHED' ? 'private, max-age=60' : 'no-store')
    return res.status(200).send(Buffer.from(pdf))
  } catch (error: any) {
    console.error('quotes/pdf error:', error)
    return res.status(500).json({ ok: false, error: error?.message || 'No se pudo generar el PDF' })
  } finally {
    if (browser) await browser.close().catch(() => undefined)
  }
}
