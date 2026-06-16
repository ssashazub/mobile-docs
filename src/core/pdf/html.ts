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
  fallback = '—'
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
        <style>${styles}</style>
      </head>
      <body>
        <div class="page">${content}</div>
      </body>
    </html>
  `;
}
