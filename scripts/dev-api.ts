/**
 * Puente de desarrollo local: sirve las funciones de /api (formato Vercel) y
 * reenvía todo lo demás al dev server de Vite. Permite probar el sitio completo
 * en un solo puerto sin depender de `vercel dev`.
 *
 *   1) npm run dev            (Vite en 5173)
 *   2) npx tsx scripts/dev-api.ts   (puente en 4400)
 */
import { config } from 'dotenv'
import http from 'node:http'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Rutas absolutas: el puente puede lanzarse desde cualquier directorio.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(ROOT, '.env') })
config({ path: path.join(ROOT, '.env.local'), override: true })

const PORT = Number(process.env.DEV_API_PORT || 4400)
const VITE = process.env.DEV_VITE_ORIGIN || 'http://localhost:5173'

/** /api/quotes/chat → api/quotes/chat.ts · /api/documents/view/abc → api/documents/view/[token].ts */
function resolveHandler(pathname: string): { file: string; params: Record<string, string> } | null {
  const segments = pathname.replace(/^\/api\//, '').split('/').filter(Boolean)
  if (!segments.length) return null

  const direct = path.join(ROOT, 'api', ...segments) + '.ts'
  if (existsSync(direct)) return { file: direct, params: {} }

  const index = path.join(ROOT, 'api', ...segments, 'index.ts')
  if (existsSync(index)) return { file: index, params: {} }

  // Rutas dinámicas de un nivel: última carpeta con [param].ts
  if (segments.length >= 2) {
    const dir = path.join(ROOT, 'api', ...segments.slice(0, -1))
    const candidates = ['[token]', '[id]', '[slug]']
    for (const candidate of candidates) {
      const file = path.join(dir, `${candidate}.ts`)
      if (existsSync(file)) {
        return { file, params: { [candidate.slice(1, -1)]: segments[segments.length - 1] } }
      }
    }
  }
  return null
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', () => resolve(''))
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)

  if (url.pathname.startsWith('/api/')) {
    const resolved = resolveHandler(url.pathname)
    if (!resolved) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ ok: false, error: `Sin handler para ${url.pathname}` }))
    }
    try {
      const mod = await import(pathToFileURL(resolved.file).href)
      const handler = mod.default
      const raw = await readBody(req)
      let body: unknown = raw
      const contentType = String(req.headers['content-type'] || '')
      if (raw && contentType.includes('application/json')) {
        try { body = JSON.parse(raw) } catch { body = raw }
      }
      const query: Record<string, string> = { ...resolved.params }
      url.searchParams.forEach((value, key) => { query[key] = value })

      const vercelReq: any = req
      vercelReq.query = query
      vercelReq.body = body
      vercelReq.cookies = Object.fromEntries(
        String(req.headers.cookie || '').split(';').map((pair) => {
          const [k, ...rest] = pair.trim().split('=')
          return [k, decodeURIComponent(rest.join('='))]
        }).filter(([k]) => k)
      )

      const vercelRes: any = res
      vercelRes.status = (code: number) => { res.statusCode = code; return vercelRes }
      vercelRes.json = (payload: unknown) => {
        if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(payload))
        return vercelRes
      }
      vercelRes.send = (payload: unknown) => {
        res.end(typeof payload === 'string' || Buffer.isBuffer(payload) ? payload : JSON.stringify(payload))
        return vercelRes
      }
      vercelRes.redirect = (codeOrUrl: number | string, maybeUrl?: string) => {
        const code = typeof codeOrUrl === 'number' ? codeOrUrl : 302
        const target = typeof codeOrUrl === 'string' ? codeOrUrl : String(maybeUrl)
        res.writeHead(code, { Location: target })
        res.end()
        return vercelRes
      }

      await handler(vercelReq, vercelRes)
      if (!res.writableEnded) res.end()
    } catch (error: any) {
      console.error(`[dev-api] ${url.pathname}:`, error?.message || error)
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' })
      if (!res.writableEnded) res.end(JSON.stringify({ ok: false, error: error?.message || 'Handler error' }))
    }
    return
  }

  // Todo lo demás va a Vite (HTML, assets, HMR por http).
  try {
    const target = new URL(url.pathname + url.search, VITE)
    const upstream = await fetch(target, {
      method: req.method,
      headers: { ...(req.headers as Record<string, string>), host: new URL(VITE).host },
      body: req.method && !['GET', 'HEAD'].includes(req.method) ? await readBody(req) : undefined,
      redirect: 'manual',
    })
    res.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()))
    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.end(buffer)
  } catch {
    res.writeHead(502, { 'Content-Type': 'text/plain' })
    res.end(`Vite no responde en ${VITE}. Arranca \`npm run dev\` primero.`)
  }
})

server.listen(PORT, () => {
  console.log(`[dev-api] API + proxy Vite en http://localhost:${PORT} (Vite: ${VITE})`)
  console.log(`[dev-api] env: OPENAI=${(process.env.OPENAI_API_KEY || '').length} chars · DATABASE_URL=${process.env.DATABASE_URL ? 'sí' : 'no'}`)
})
