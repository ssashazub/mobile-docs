export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatFieldValue(
  value: string | undefined,
  multiline?: boolean,
  fallback = '-'
): string {
  const text = value?.trim() || fallback;
  const escaped = escapeHtml(text);
  return multiline ? escaped.replace(/\n/g, '<br/>') : escaped;
}

export function fontStack(fontFamily: 'sans' | 'serif' | 'mono'): string {
  if (fontFamily === 'serif') {
    return "Georgia, 'Times New Roman', 'Noto Serif', serif";
  }

  if (fontFamily === 'mono') {
    return "'SF Mono', 'Cascadia Code', Consolas, 'Courier New', monospace";
  }

  return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
}

export function wrapPdfPage(content: string, styles: string, locale: string): string {
  return `
    <!DOCTYPE html>
    <html lang="${locale}">
      <head>
        <meta charset="utf-8" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="color-scheme" content="light" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no"
        />
        <style>
          :root { color-scheme: light only; }
          ${styles}
        </style>
      </head>
      <body>
        <table class="page-shell" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
          <tr>
            <td width="100%" valign="top" style="width:100%;">
              <div class="page">${content}</div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
