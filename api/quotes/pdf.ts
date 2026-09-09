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
    // Las imágenes de otros dominios (R2, S3) se sirven al navegador interno con cabecera CORS:
    // así la página puede reducirlas en un canvas antes de imprimir (PDF liviano, imagen ya decodificada).
    await page.setRequestInterception(true)
    page.on('request', async (req: any) => {
      const u: string = req.url()
      if (req.resourceType() === 'image' && /^https?:/.test(u) && !u.startsWith(origin)) {
        try {
          const r = await fetch(u, { signal: AbortSignal.timeout(25_000) })
          const body = Buffer.from(await r.arrayBuffer())
          await req.respond({ status: r.status, headers: { 'Content-Type': r.headers.get('content-type') || 'image/png', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }, body })
          return
        } catch { /* sin CORS: la imagen se imprime como venga */ }
      }
      await req.continue().catch(() => undefined)
    })
    await page.emulateMediaType('print')
    // 'load' y no 'networkidle': un websocket abierto (analítica, HMR) no debe bloquear el PDF
    await page.goto(url, { waitUntil: 'load', timeout: 40_000 })
    // el documento se pinta cuando llega la cotización: se espera a las hojas (o a un estado final), no al «Cargando…»
    await page.waitForFunction(
      () => !!document.querySelector('.qv .qv-page') || /no está disponible|problema/i.test(document.querySelector('.qv-status')?.textContent || ''),
      { timeout: 30_000 },
    )
    const diag = String(req.query?.diag || '') === '1'
    const missing: number = await page.evaluate(async () => {
      // cada imagen se recarga sin carga diferida y, si es grande, se reduce a 1600 px como JPEG ya
      // decodificado (en caché, Chromium la daba por completa sin decodificarla y salía en blanco)
      const imgs = Array.from(document.images)
      const wait = (img: HTMLImageElement, set: () => void) => new Promise<void>((r) => { img.addEventListener('load', () => r(), { once: true }); img.addEventListener('error', () => r(), { once: true }); set() })
      const one = async (img: HTMLImageElement) => {
        img.removeAttribute('loading')
        const src = img.currentSrc || img.src
        if (!src || /\.svg(\?|$)/i.test(src) || src.startsWith('data:')) return
        img.crossOrigin = 'anonymous'
        await wait(img, () => { img.src = ''; img.src = src })
        if (!img.naturalWidth) { img.removeAttribute('crossorigin'); await wait(img, () => { img.src = ''; img.src = src }); return }
        const MAX = 1600
        if (Math.max(img.naturalWidth, img.naturalHeight) <= MAX) { await img.decode().catch(() => undefined); return }
        try {
          const k = MAX / Math.max(img.naturalWidth, img.naturalHeight)
          const c = document.createElement('canvas')
          c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
          c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
          const data = c.toDataURL('image/jpeg', 0.86)
          await wait(img, () => { img.src = data })
        } catch { /* canvas contaminado (sin CORS): se deja la original */ }
        await img.decode().catch(() => undefined)
      }
      window.scrollTo(0, document.body.scrollHeight)
      await Promise.race([Promise.all(imgs.map(one)), new Promise((r) => setTimeout(r, 35000))])
      window.scrollTo(0, 0)
      await Promise.race([(document as any).fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 3000))])
      ;(window as any).__pdfImages = imgs.map((img) => ({ src: (img.currentSrc || img.src).startsWith('data:') ? `data:${Math.round((img.currentSrc || img.src).length * 0.75 / 1024)}kb` : (img.currentSrc || img.src).slice(-48), w: img.naturalWidth, h: img.naturalHeight, box: `${Math.round(img.getBoundingClientRect().width)}x${Math.round(img.getBoundingClientRect().height)}` }))
      return imgs.filter((img) => img.naturalWidth === 0).length
    })
    await new Promise((r) => setTimeout(r, 900))
    const pdf: Buffer = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } })

    // diagnóstico ligero (?diag=1): qué imágenes quedaron y cuánto pesa el PDF, sin transferirlo
    if (diag) {
      const images = await page.evaluate(() => (window as any).__pdfImages || [])
      return res.status(200).json({ ok: true, missing, pdfBytes: pdf.length, pages: (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length, images })
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('X-Images-Missing', String(missing))
    res.setHeader('X-Pdf-Bytes', String(pdf.length))
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
