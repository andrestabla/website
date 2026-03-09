/**
 * AlgoritmoT - Styled HTML Email Templates
 */

export const ALGORITMOT_BRAND_COLOR = '#2563eb'; // Brand Blue
export const ALGORITMOT_DARK = '#0f172a'; // Slate 900

export interface EmailTemplateProps {
    title: string;
    preheader?: string;
    contentHtml: string;
    footerHtml?: string;
}

export function generateStyledEmail({
    title,
    preheader,
    contentHtml,
    footerHtml = '<p>© 2026 AlgoritmoT. Todos los derechos reservados.</p>'
}: EmailTemplateProps): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }
        .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #f8fafc;
            padding-bottom: 40px;
        }
        .main {
            background-color: #ffffff;
            margin: 0 auto;
            width: 100%;
            max-width: 600px;
            border-spacing: 0;
            color: #334155;
            border: 1px solid #e2e8f0;
        }
        .header {
            background-color: ${ALGORITMOT_DARK};
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 900;
            margin: 0;
            letter-spacing: -0.02em;
            text-transform: uppercase;
        }
        .content {
            padding: 40px;
            line-height: 1.6;
            font-size: 16px;
        }
        .footer {
            padding: 24px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            background-color: #f8fafc;
        }
        .button {
            display: inline-block;
            background-color: ${ALGORITMOT_BRAND_COLOR};
            color: #ffffff !important;
            padding: 14px 28px;
            text-decoration: none;
            font-weight: bold;
            border-radius: 0;
            margin-top: 20px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-size: 14px;
        }
        .accent-text {
            color: ${ALGORITMOT_BRAND_COLOR};
            font-weight: bold;
        }
        .data-table {
            width: 100%;
            margin-top: 24px;
            border-collapse: collapse;
        }
        .data-table td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        .data-table td.label {
            font-weight: bold;
            color: #64748b;
            width: 140px;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
        }
        .preheader {
            display: none !important;
            visibility: hidden;
            opacity: 0;
            color: transparent;
            height: 0;
            width: 0;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        ${preheader ? `<span class="preheader">${preheader}</span>` : ''}
        <table class="main" width="100%">
            <tr>
                <td class="header">
                    <h1>ALGORITMOT</h1>
                </td>
            </tr>
            <tr>
                <td class="content">
                    ${contentHtml}
                </td>
            </tr>
            <tr>
                <td class="footer">
                    ${footerHtml}
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
    `.trim();
}
