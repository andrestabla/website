export type MarketingEmailTemplateId = 'executive' | 'minimal' | 'spotlight'

type BuildMarketingEmailHtmlInput = {
  templateId: MarketingEmailTemplateId
  logoUrl: string
  siteName: string
  campaignName: string
  subject: string
  preheader?: string
  bodyText: string
  ctaLabel: string
  ctaUrl: string
}

type LogoVariant = 'default' | 'white' | 'dark'

function escapeHtml(input: string) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function bodyToParagraphs(bodyText: string) {
  const segments = String(bodyText || '')
    .split(/\n{2,}/g)
    .map((item) => item.trim())
    .filter(Boolean)

  if (!segments.length) return '<p>Gracias por tu interés.</p>'
  return segments.map((segment) => `<p>${escapeHtml(segment).replace(/\n/g, '<br/>')}</p>`).join('')
}

const emailMotionStyles = `
  <style>
    @keyframes logoFloat {
      0% { transform: translateY(0); opacity: 0.98; }
      50% { transform: translateY(-2px); opacity: 1; }
      100% { transform: translateY(0); opacity: 0.98; }
    }
  </style>
`

function renderLogo(
  logoUrl: string,
  siteName: string,
  options?: { variant?: LogoVariant; animated?: boolean }
) {
  const safeSiteName = escapeHtml(siteName || 'AlgoritmoT')
  const variant = options?.variant || 'default'
  const animated = options?.animated !== false
  const logoFilter =
    variant === 'white'
      ? 'filter:brightness(0) invert(1);'
      : variant === 'dark'
        ? 'filter:brightness(0) saturate(100%);'
        : ''
  const animation = animated ? 'animation:logoFloat 6s ease-in-out infinite;' : ''
  const logoStyle = `max-width:180px;max-height:56px;height:auto;width:auto;display:block;margin:0 auto;${logoFilter}${animation}`
  if (logoUrl) {
    const safeLogoUrl = escapeHtml(logoUrl)
    return `<img src="${safeLogoUrl}" alt="${safeSiteName}" style="${logoStyle}" />`
  }
  const textColor = variant === 'white' ? '#f8fafc' : '#0f172a'
  return `<div style="font-size:24px;font-weight:900;letter-spacing:-0.02em;color:${textColor};text-transform:uppercase;${animation}">${safeSiteName}</div>`
}

export function buildMarketingEmailHtml(input: BuildMarketingEmailHtmlInput) {
  const subject = escapeHtml(input.subject || input.campaignName || 'Campaña')
  const preheader = escapeHtml(input.preheader || '')
  const ctaLabel = escapeHtml(input.ctaLabel || 'Conocer más')
  const ctaUrl = escapeHtml(input.ctaUrl || '/')
  const campaignName = escapeHtml(input.campaignName || input.subject || 'Campaña')
  const bodyHtml = bodyToParagraphs(input.bodyText)
  const logoVariant: LogoVariant = input.templateId === 'minimal' ? 'dark' : 'white'
  const logoHtml = renderLogo(input.logoUrl, input.siteName, { variant: logoVariant, animated: true })

  if (input.templateId === 'minimal') {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${emailMotionStyles}
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;">
  ${preheader ? `<div style="display:none;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:28px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:28px 28px 10px 28px;text-align:center;">${logoHtml}</td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0 28px;font-size:13px;letter-spacing:0.08em;color:#64748b;text-transform:uppercase;font-weight:700;">${campaignName}</td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0 28px;font-size:30px;line-height:1.15;font-weight:900;color:#0f172a;">${subject}</td>
          </tr>
          <tr>
            <td style="padding:16px 28px 8px 28px;font-size:16px;line-height:1.7;color:#334155;">${bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding:16px 28px 32px 28px;">
              <a href="${ctaUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:800;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;padding:14px 20px;">${ctaLabel}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 26px 28px;font-size:12px;color:#94a3b8;">© 2026 ${escapeHtml(input.siteName || 'AlgoritmoT')}.</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
  }

  if (input.templateId === 'spotlight') {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${emailMotionStyles}
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,Arial,sans-serif;color:#0f172a;">
  ${preheader ? `<div style="display:none;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:28px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;background:#ffffff;border:1px solid #dbeafe;">
          <tr>
            <td style="padding:30px 32px;background:linear-gradient(120deg,#0f172a 0%,#1d4ed8 100%);text-align:center;">${logoHtml}</td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0 32px;">
              <span style="display:inline-block;font-size:11px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;padding:6px 10px;">${campaignName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 0 32px;font-size:33px;line-height:1.1;font-weight:900;color:#0f172a;">${subject}</td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px 32px;font-size:16px;line-height:1.75;color:#334155;">${bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding:18px 32px 32px 32px;">
              <a href="${ctaUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:900;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;padding:14px 22px;">${ctaLabel}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px 32px;font-size:12px;color:#94a3b8;">Enviado por ${escapeHtml(input.siteName || 'AlgoritmoT')}.</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
  }

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${emailMotionStyles}
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#020617;font-family:Inter,Arial,sans-serif;color:#e2e8f0;">
  ${preheader ? `<div style="display:none;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020617;padding:30px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;background:#0b1223;border:1px solid #1e293b;">
          <tr>
            <td style="padding:30px 32px 16px 32px;text-align:center;border-bottom:1px solid #1e293b;">${logoHtml}</td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0 32px;font-size:11px;font-weight:900;letter-spacing:0.16em;color:#38bdf8;text-transform:uppercase;">${campaignName}</td>
          </tr>
          <tr>
            <td style="padding:10px 32px 0 32px;font-size:34px;line-height:1.08;font-weight:900;color:#f8fafc;">${subject}</td>
          </tr>
          <tr>
            <td style="padding:18px 32px 8px 32px;font-size:16px;line-height:1.75;color:#cbd5e1;">${bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding:18px 32px 34px 32px;">
              <a href="${ctaUrl}" style="display:inline-block;background:#22d3ee;color:#0f172a;text-decoration:none;font-weight:900;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;padding:14px 22px;">${ctaLabel}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 26px 32px;font-size:12px;color:#64748b;">© 2026 ${escapeHtml(input.siteName || 'AlgoritmoT')} · Executive mailing</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}
