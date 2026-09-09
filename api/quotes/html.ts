/**
 * Cotizador — versión HTML estática de una propuesta.
 *
 * Abre la vista pública en un Chromium sin cabeza, deja que el visor pinte
 * el documento (hojas A4 ajustadas, imágenes cargadas, índice, totales) y
 * devuelve un único archivo .html autocontenido: los estilos van en línea,
 * las rutas quedan absolutas hacia el sitio, sin scripts. Sirve para subir
 * tal cual a un bucket S3 (o cualquier hosting estático) y compartir la
 * propuesta con su misma apariencia. Lo interactivo (activar líneas, chat,
 * edición) no viaja: es una foto del documento tal como se ve.
 *
 * GET /api/quotes/html?id=<publicId>&d=<token de destinatario opcional>
 * Cotizaciones publicadas: por publicId; borradores: solo el dueño.
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
    defaultViewport: { width: 1280, height: 1600, deviceScaleFactor: 1 },
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

    // la exportación es del dueño (o de un admin), publicada o no: la cookie viaja al navegador interno
    const { session, allowed } = await quoteSessionState(req)
    const isOwner = !!session && (session.userId === quote.ownerId || session.role === 'SUPERADMIN' || session.role === 'ADMIN')
    if (!allowed || !isOwner) return res.status(404).json({ ok: false, error: 'Cotización no disponible' })
    const rawCookie = String(req.headers?.cookie || '')
    const match = /(?:^|;\s*)admin_session=([^;]+)/.exec(rawCookie)
    const sessionCookie = match ? match[1] : ''

    const origin = publicOrigin(req)
    const url = `${origin}/c/${publicId}?static=1${recipientToken ? `&d=${encodeURIComponent(recipientToken)}` : ''}`

    browser = await launchBrowser()
    const page = await browser.newPage()
    if (sessionCookie) {
      await page.setCookie({ name: 'admin_session', value: sessionCookie, domain: new URL(origin).hostname, path: '/', httpOnly: true })
    }
    await page.goto(url, { waitUntil: 'load', timeout: 40_000 })
    await page.waitForSelector('.qv .qv-page, .qv-status', { timeout: 25_000 })

    const html: string = await page.evaluate(async (site: string) => {
      // imágenes en diferido: se fuerzan y se espera con tope
      const imgs = Array.from(document.images)
      for (const img of imgs) { img.loading = 'eager'; if (!img.complete && img.src) { const src = img.src; img.src = ''; img.src = src } }
      window.scrollTo(0, document.body.scrollHeight)
      await Promise.race([
        Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise<void>((r) => { img.addEventListener('load', () => r(), { once: true }); img.addEventListener('error', () => r(), { once: true }) })))),
        new Promise((r) => setTimeout(r, 8000)),
      ])
      window.scrollTo(0, 0)
      await Promise.race([(document as any).fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 3000))])
      await new Promise((r) => setTimeout(r, 900))

      const abs = (u: string) => (u.startsWith('/') && !u.startsWith('//') ? `${site}${u}` : u)
      // 1. estilos: las hojas del mismo origen se vuelcan en línea; las externas (fuentes) siguen enlazadas
      const css: string[] = []
      for (const sheet of Array.from(document.styleSheets)) {
        try { css.push(Array.from((sheet as CSSStyleSheet).cssRules).map((r) => r.cssText).join('\n')) } catch { /* hoja de otro origen: se conserva su <link> */ }
      }
      const cssText = css.join('\n').replace(/url\((['"]?)\/(?!\/)/g, `url($1${site}/`)

      // 2. el documento: solo el visor, sin scripts ni interfaz del editor
      const clone = document.documentElement.cloneNode(true) as HTMLElement
      clone.querySelectorAll('script, noscript, link[rel="modulepreload"], link[rel="stylesheet"][href^="/"], style, .qv-editor, .qv-side, .qv-side-fab, .qv-blockbar, .qv-ctx, .qv-modal-wrap, .qv-addmenu-wrap, .qv-draft-offer, [data-static-hide]').forEach((n) => n.remove())
      clone.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'))
      clone.querySelectorAll<HTMLElement>('[src], [href], [srcset], [poster]').forEach((el) => {
        for (const attr of ['src', 'href', 'poster']) { const v = el.getAttribute(attr); if (v) el.setAttribute(attr, abs(v)) }
        const ss = el.getAttribute('srcset'); if (ss) el.setAttribute('srcset', ss.split(',').map((p) => { const [u, d] = p.trim().split(/\s+/); return [abs(u), d].filter(Boolean).join(' ') }).join(', '))
      })
      clone.querySelectorAll('img').forEach((img) => { img.removeAttribute('loading'); img.setAttribute('src', (img as HTMLImageElement).currentSrc || img.getAttribute('src') || '') })
      // los enlaces del índice quedan internos; el resto abre en pestaña nueva
      clone.querySelectorAll('a[href]').forEach((a) => { const h = a.getAttribute('href') || ''; if (!h.startsWith('#')) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noreferrer') } })
      const head = clone.querySelector('head')!
      const style = document.createElement('style')
      style.textContent = cssText
      head.appendChild(style)
      const meta = document.createElement('meta'); meta.setAttribute('name', 'generator'); meta.setAttribute('content', 'Algoritmo T · Cotizador · exportación estática')
      head.appendChild(meta)
      const robots = document.createElement('meta'); robots.setAttribute('name', 'robots'); robots.setAttribute('content', 'noindex')
      head.appendChild(robots)
      return `<!doctype html>\n${clone.outerHTML}`
    }, origin)

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${slug(quote.title)}-${slug(quote.clientName)}.html"`)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(html)
  } catch (error: any) {
    console.error('quotes/html error:', error)
    return res.status(500).json({ ok: false, error: error?.message || 'No se pudo generar el HTML' })
  } finally {
    if (browser) await browser.close().catch(() => undefined)
  }
}
