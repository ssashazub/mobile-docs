import { getAppLocale, getDateLocale, t } from '@/i18n';
import { normalizePdfStyle } from '@/lib/template-helpers';
import type { Document } from '@/types/document';
import type { DocumentTemplate, PdfLayout, TemplateField } from '@/types/template';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatFieldValue(value: string | undefined, multiline?: boolean, fallback = '—'): string {
  const text = value?.trim() || fallback;
  const escaped = escapeHtml(text);
  return multiline ? escaped.replace(/\n/g, '<br/>') : escaped;
}

function layoutStyles(layout: PdfLayout, accent: string, gradientEnd: string): string {
  const shared = `
    @page { margin: 28px; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #fff;
    }
    .page { max-width: 760px; margin: 0 auto; padding: 8px; }
    .footer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 11px;
      text-align: center;
    }
  `;

  if (layout === 'minimal') {
    return `
      ${shared}
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        line-height: 1.5;
        font-size: 13px;
      }
      .header { margin-bottom: 28px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
      .header-title { font-size: 26px; font-weight: 700; margin: 0 0 6px; color: #0f172a; }
      .header-meta { font-size: 12px; color: #64748b; }
      .field { margin-bottom: 14px; page-break-inside: avoid; }
      .field-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
        margin-bottom: 4px;
        font-weight: 700;
      }
      .field-value { font-size: 14px; color: #334155; line-height: 1.55; }
    `;
  }

  if (layout === 'formal') {
    return `
      ${shared}
      body {
        font-family: Georgia, 'Times New Roman', 'Noto Serif', serif;
        line-height: 1.45;
        font-size: 13px;
      }
      .header {
        text-align: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 2px solid #0f172a;
      }
      .header-title { font-size: 24px; font-weight: 700; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.04em; }
      .header-meta { font-size: 12px; color: #475569; }
      .fields-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      .fields-table tr { page-break-inside: avoid; }
      .fields-table td {
        border: 1px solid #cbd5e1;
        padding: 10px 12px;
        vertical-align: top;
      }
      .fields-table .label {
        width: 34%;
        background: #f8fafc;
        font-weight: 700;
        color: #334155;
        font-size: 12px;
      }
      .fields-table .value { color: #0f172a; font-size: 13px; }
      .fields-table .wide .label { border-bottom: none; }
      .fields-table .wide .value { border-top: none; }
    `;
  }

  if (layout === 'compact') {
    return `
      ${shared}
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        line-height: 1.4;
        font-size: 12px;
      }
      .hero {
        background: ${accent};
        color: #fff;
        border-radius: 10px;
        padding: 16px 18px;
        margin-bottom: 16px;
      }
      .hero-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
      .hero-meta { font-size: 11px; opacity: 0.9; }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .grid-item {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px;
        page-break-inside: avoid;
      }
      .grid-item.wide { grid-column: 1 / -1; }
      .grid-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: ${accent};
        font-weight: 800;
        margin-bottom: 4px;
      }
      .grid-value { font-size: 12px; color: #334155; line-height: 1.45; }
    `;
  }

  return `
    ${shared}
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', 'Noto Sans Ukrainian', 'Noto Sans Cyrillic', Arial, sans-serif;
      line-height: 1.55;
      font-size: 13px;
    }
    .hero {
      background: linear-gradient(135deg, ${accent} 0%, ${gradientEnd} 100%);
      color: #fff;
      border-radius: 18px;
      padding: 28px 30px;
      margin-bottom: 24px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
    }
    .hero-kicker {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      opacity: 0.88;
      margin-bottom: 8px;
    }
    .hero-title { font-size: 28px; font-weight: 700; margin: 0 0 8px; line-height: 1.2; }
    .hero-meta { font-size: 13px; opacity: 0.92; }
    .badge {
      display: inline-block;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.28);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      margin-right: 8px;
    }
    .section { margin-bottom: 18px; page-break-inside: avoid; }
    .section-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: ${accent};
      font-weight: 800;
      margin: 0 0 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .section-body { color: #334155; font-size: 14px; }
  `;
}

function wrapPage(content: string, layout: PdfLayout, accent: string, gradientEnd: string): string {
  return `
    <!DOCTYPE html>
    <html lang="${getAppLocale()}">
      <head>
        <meta charset="utf-8" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>${layoutStyles(layout, accent, gradientEnd)}</style>
      </head>
      <body>
        <div class="page">${content}</div>
      </body>
    </html>
  `;
}

function renderClassicHeader(
  template: DocumentTemplate,
  titleValue: string,
  created: string,
  showDate: boolean
): string {
  const dateBadge = showDate ? `<span class="badge">${created}</span>` : '';

  return `
    <div class="hero">
      <div class="hero-kicker">${escapeHtml(template.title)}</div>
      <h1 class="hero-title">${escapeHtml(titleValue)}</h1>
      <div class="hero-meta">
        <span class="badge">${escapeHtml(template.emoji)} ${escapeHtml(template.title)}</span>
        ${dateBadge}
      </div>
    </div>
  `;
}

function renderMinimalHeader(
  template: DocumentTemplate,
  titleValue: string,
  created: string,
  showDate: boolean
): string {
  const meta = showDate
    ? `${escapeHtml(template.emoji)} ${escapeHtml(template.title)} · ${created}`
    : `${escapeHtml(template.emoji)} ${escapeHtml(template.title)}`;

  return `
    <div class="header">
      <h1 class="header-title">${escapeHtml(titleValue)}</h1>
      <div class="header-meta">${meta}</div>
    </div>
  `;
}

function renderFormalHeader(
  template: DocumentTemplate,
  titleValue: string,
  created: string,
  showDate: boolean
): string {
  const meta = showDate
    ? `${escapeHtml(template.title)} · ${created}`
    : escapeHtml(template.title);

  return `
    <div class="header">
      <h1 class="header-title">${escapeHtml(titleValue)}</h1>
      <div class="header-meta">${meta}</div>
    </div>
  `;
}

function renderCompactHeader(
  template: DocumentTemplate,
  titleValue: string,
  created: string,
  showDate: boolean
): string {
  const meta = showDate ? created : escapeHtml(template.title);

  return `
    <div class="hero">
      <h1 class="hero-title">${escapeHtml(titleValue)}</h1>
      <div class="hero-meta">${escapeHtml(template.emoji)} ${meta}</div>
    </div>
  `;
}

function renderClassicFields(fields: TemplateField[], document: Document): string {
  return fields
    .map(
      (field) => `
        <div class="section">
          <h2 class="section-title">${escapeHtml(field.label)}</h2>
          <div class="section-body">${formatFieldValue(document.fields[field.key], field.multiline)}</div>
        </div>
      `
    )
    .join('');
}

function renderMinimalFields(fields: TemplateField[], document: Document): string {
  return fields
    .map(
      (field) => `
        <div class="field">
          <div class="field-label">${escapeHtml(field.label)}</div>
          <div class="field-value">${formatFieldValue(document.fields[field.key], field.multiline)}</div>
        </div>
      `
    )
    .join('');
}

function renderFormalFields(fields: TemplateField[], document: Document): string {
  const rows = fields
    .map((field) => {
      const value = formatFieldValue(document.fields[field.key], field.multiline);
      const rowClass = field.multiline ? 'wide' : '';

      if (field.multiline) {
        return `
          <tr class="${rowClass}">
            <td class="label" colspan="2">${escapeHtml(field.label)}</td>
          </tr>
          <tr class="${rowClass}">
            <td class="value" colspan="2">${value}</td>
          </tr>
        `;
      }

      return `
        <tr>
          <td class="label">${escapeHtml(field.label)}</td>
          <td class="value">${value}</td>
        </tr>
      `;
    })
    .join('');

  return `<table class="fields-table">${rows}</table>`;
}

function renderCompactFields(fields: TemplateField[], document: Document): string {
  const items = fields
    .map(
      (field) => `
        <div class="grid-item${field.multiline ? ' wide' : ''}">
          <div class="grid-label">${escapeHtml(field.label)}</div>
          <div class="grid-value">${formatFieldValue(document.fields[field.key], field.multiline)}</div>
        </div>
      `
    )
    .join('');

  return `<div class="grid">${items}</div>`;
}

export function renderDocumentPdfHtml(document: Document, template: DocumentTemplate): string {
  const pdfStyle = normalizePdfStyle(document.pdfStyle ?? template.pdfStyle, template.id);
  const created = new Date(document.createdAt).toLocaleDateString(getDateLocale());
  const titleValue = document.fields.title?.trim() || document.title;

  const headers: Record<PdfLayout, string> = {
    classic: renderClassicHeader(template, titleValue, created, pdfStyle.showDate),
    minimal: renderMinimalHeader(template, titleValue, created, pdfStyle.showDate),
    formal: renderFormalHeader(template, titleValue, created, pdfStyle.showDate),
    compact: renderCompactHeader(template, titleValue, created, pdfStyle.showDate),
  };

  const fieldRenderers: Record<PdfLayout, string> = {
    classic: renderClassicFields(template.fields, document),
    minimal: renderMinimalFields(template.fields, document),
    formal: renderFormalFields(template.fields, document),
    compact: renderCompactFields(template.fields, document),
  };

  const footer = pdfStyle.showFooter
    ? `<div class="footer">${escapeHtml(t('pdf.footer'))}${pdfStyle.showDate ? ` · ${created}` : ''}</div>`
    : '';

  return wrapPage(
    `${headers[pdfStyle.layout]}${fieldRenderers[pdfStyle.layout]}${footer}`,
    pdfStyle.layout,
    template.accentColor,
    template.gradientEnd
  );
}
