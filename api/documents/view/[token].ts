import { prisma } from '../../_lib/prisma.js'

type VercelRequest = any
type VercelResponse = any

function buildViewerHtml(opts: {
  title: string
  documentUrl: string
  mimeType: string
  senderName: string
  pixelUrl: string
}) {
  const { title, documentUrl, mimeType, senderName, pixelUrl } = opts
  const isImage = mimeType.startsWith('image/')
  const isPdf = mimeType === 'application/pdf'
  const embedBlock = isPdf
    ? `<iframe src="${documentUrl}" class="viewer" title="${title}" allowfullscreen></iframe>`
    : isImage
    ? `<div class="viewer" style="display:flex;align-items:center;justify-content:center;background:#1a1a1a"><img src="${documentUrl}" alt="${title}" style="max-width:100%;max-height:100%;object-fit:contain"></div>`
    : `<div class="viewer no-preview"><div class="no-preview-inner">
        <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="#6b7280" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
        <p>Vista previa no disponible para este tipo de archivo.</p>
        <a href="${documentUrl}" download class="btn-download">Descargar documento</a>
      </div></div>`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#111;color:#fff;height:100vh;display:flex;flex-direction:column}
    .topbar{background:#18181b;border-bottom:1px solid #27272a;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:12px}
    .doc-title{font-size:14px;font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60vw}
    .sender{font-size:12px;color:#a1a1aa}
    .btn-download{display:inline-flex;align-items:center;gap:6px;background:#3f3f46;color:#fff;text-decoration:none;padding:7px 14px;border-radius:6px;font-size:13px;font-weight:500;flex-shrink:0;transition:background .15s}
    .btn-download:hover{background:#52525b}
    .viewer{flex:1;width:100%;border:none;display:block}
    .no-preview{flex:1;display:flex;align-items:center;justify-content:center;background:#0f0f0f}
    .no-preview-inner{text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px}
    .no-preview-inner p{color:#a1a1aa;font-size:14px}
    .no-preview-inner .btn-download{margin-top:8px;background:#18181b;border:1px solid #27272a;padding:10px 20px;font-size:14px}
    .expired{flex:1;display:flex;align-items:center;justify-content:center;font-size:16px;color:#a1a1aa}
  </style>
</head>
<body>
  <div class="topbar">
    <div>
      <p class="doc-title">${title}</p>
      <p class="sender">Compartido por ${senderName}</p>
    </div>
    <a href="${documentUrl}" download="${title}" class="btn-download">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
      Descargar
    </a>
  </div>
  ${embedBlock}
  <img src="${pixelUrl}" width="1" height="1" style="position:absolute;opacity:0" alt="">
  <script>
    setTimeout(function(){
      var img=new Image();img.src="${pixelUrl}?t="+Date.now();
    },1500);
  </script>
</body>
</html>`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = String(req.query?.token || req.params?.token || '')
    if (!token) return res.status(400).send('Invalid link')

    const share = await prisma.docShare.findUnique({
      where: { shareToken: token },
      include: { document: true },
    })

    if (!share) return res.status(404).send('Link not found')

    if (share.expiresAt && share.expiresAt < new Date()) {
      return res.status(410).send('This link has expired')
    }

    if (share.maxViews && share.viewCount >= share.maxViews) {
      return res.status(410).send('This link has reached its maximum number of views')
    }

    const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
    const userAgent = String(req.headers?.['user-agent'] || '')
    const country = String(req.headers?.['x-vercel-ip-country'] || '')

    await Promise.all([
      prisma.docShareEvent.create({
        data: { shareId: share.id, eventType: 'DOCUMENT_VIEWED', ipAddress: ip, userAgent, country },
      }),
      prisma.docShare.update({
        where: { id: share.id },
        data: { viewCount: { increment: 1 } },
      }),
    ])

    if (!share.document.publicUrl) {
      return res.status(400).send('Document is not publicly accessible')
    }

    const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'localhost:3000'
    const proto = req.headers?.['x-forwarded-proto'] || 'https'
    const pixelUrl = `${proto}://${host}/api/documents/pixel/${token}`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('X-Robots-Tag', 'noindex,nofollow')
    return res.status(200).send(
      buildViewerHtml({
        title: share.document.title,
        documentUrl: share.document.publicUrl,
        mimeType: share.document.mimeType,
        senderName: share.sentByName || 'Sistema',
        pixelUrl,
      })
    )
  } catch (error) {
    console.error('api/documents/view/[token] error', error)
    return res.status(500).send('Server error')
  }
}
