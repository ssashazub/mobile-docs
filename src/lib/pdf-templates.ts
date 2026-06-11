import { getAppLocale, getDateLocale, t } from '@/i18n';
import { resolvePdfDesign } from '@/lib/pdf-style-resolver';
import { normalizePdfStyle } from '@/lib/template-helpers';
import type { Document } from '@/types/document';
import type { DocumentTemplate, TemplateField } from '@/types/template';
import type { PdfFieldsStyle, PdfHeaderStyle, ResolvedPdfDesign } from '@/types/pdf-style-design';

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

function fontStack(fontFamily: ResolvedPdfDesign['fontFamily']): string {
  if (fontFamily === 'serif') {
    return "Georgia, 'Times New Roman', 'Noto Serif', serif";
  }

  if (fontFamily === 'mono') {
    return "'SF Mono', 'Cascadia Code', Consolas, 'Courier New', monospace";
  }

  return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
}

function buildStyles(design: ResolvedPdfDesign): string {
  const spacing = design.denseSpacing ? '12px' : '18px';
  const fieldGap = design.denseSpacing ? '10px' : '14px';
  const borderStyle = design.showFieldBorders ? '1px solid #e2e8f0' : 'none';
  const cardRadius = design.showFieldBorders ? '10px' : '0';

  return `
    @page { margin: 28px; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #fff;
      font-family: ${fontStack(design.fontFamily)};
      line-height: ${design.denseSpacing ? 1.4 : 1.55};
      font-size: ${design.denseSpacing ? '12px' : '13px'};
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
    .hero-gradient {
      background: linear-gradient(135deg, ${design.accent} 0%, ${design.gradientEnd} 100%);
      color: #fff;
      border-radius: 18px;
      padding: 28px 30px;
      margin-bottom: ${spacing};
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
    }
    .hero-solid {
      background: ${design.accent};
      color: #fff;
      border-radius: 14px;
      padding: 24px 26px;
      margin-bottom: ${spacing};
    }
    .hero-banner {
      background: ${design.accent};
      color: #fff;
      border-radius: 10px;
      padding: 16px 18px;
      margin-bottom: ${spacing};
    }
    .hero-sidebar {
      display: flex;
      gap: 16px;
      margin-bottom: ${spacing};
      border: ${borderStyle};
      border-radius: ${cardRadius};
      overflow: hidden;
    }
    .hero-sidebar-accent {
      width: 8px;
      background: linear-gradient(180deg, ${design.accent}, ${design.gradientEnd});
      flex-shrink: 0;
    }
    .hero-sidebar-body { padding: 18px 20px 18px 0; flex: 1; }
    .header-line, .header-minimal {
      margin-bottom: ${spacing};
      padding-bottom: 16px;
      border-bottom: ${design.headerStyle === 'line' ? '2px solid #0f172a' : '1px solid #e2e8f0'};
    }
    .header-line { text-align: center; }
    .hero-kicker {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      opacity: 0.88;
      margin-bottom: 8px;
    }
    .hero-title, .header-title {
      font-size: ${design.headerStyle === 'banner' ? '18px' : '26px'};
      font-weight: 700;
      margin: 0 0 8px;
      line-height: 1.2;
      color: inherit;
    }
    .header-title { color: #0f172a; }
    .hero-meta, .header-meta {
      font-size: ${design.denseSpacing ? '11px' : '12px'};
      opacity: 0.92;
      color: inherit;
    }
    .header-meta { color: #64748b; opacity: 1; }
    .badge {
      display: inline-block;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.28);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      margin-right: 8px;
    }
    .section { margin-bottom: ${spacing}; page-break-inside: avoid; }
    .section-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: ${design.accent};
      font-weight: 800;
      margin: 0 0 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .section-body { color: #334155; font-size: 14px; }
    .field { margin-bottom: ${fieldGap}; page-break-inside: avoid; }
    .field-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-bottom: 4px;
      font-weight: 700;
    }
    .field-value {
      font-size: 14px;
      color: #334155;
      line-height: 1.55;
      ${design.showFieldBorders ? 'border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;' : ''}
    }
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
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: ${design.denseSpacing ? '8px' : '10px'};
    }
    .grid-item, .card-item, .column-item {
      border: ${borderStyle};
      border-radius: ${cardRadius};
      padding: ${design.denseSpacing ? '8px' : '10px'};
      page-break-inside: avoid;
      background: ${design.showFieldBorders ? '#fff' : 'transparent'};
    }
    .grid-item.wide, .card-item.wide, .column-item.wide { grid-column: 1 / -1; }
    .grid-label, .card-label, .column-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${design.accent};
      font-weight: 800;
      margin-bottom: 4px;
    }
    .grid-value, .card-value, .column-value {
      font-size: 12px;
      color: #334155;
      line-height: 1.45;
    }
  `;
}

function renderHeader(
  design: ResolvedPdfDesign,
  template: DocumentTemplate,
  titleValue: string,
  created: string,
  showDate: boolean
): string {
  const emojiPart = design.showEmoji ? `${escapeHtml(template.emoji)} ` : '';
  const dateBadge = showDate ? `<span class="badge">${created}</span>` : '';
  const metaWithDate = showDate
    ? `${emojiPart}${escapeHtml(template.title)} · ${created}`
    : `${emojiPart}${escapeHtml(template.title)}`;

  const headerStyles: Record<PdfHeaderStyle, string> = {
    gradient: `
      <div class="hero-gradient">
        <div class="hero-kicker">${escapeHtml(template.title)}</div>
        <h1 class="hero-title">${escapeHtml(titleValue)}</h1>
        <div class="hero-meta">
          ${design.showEmoji ? `<span class="badge">${escapeHtml(template.emoji)} ${escapeHtml(template.title)}</span>` : ''}
          ${dateBadge}
        </div>
      </div>
    `,
    solid: `
      <div class="hero-solid">
        <h1 class="hero-title">${escapeHtml(titleValue)}</h1>
        <div class="hero-meta">${metaWithDate}</div>
      </div>
    `,
    banner: `
      <div class="hero-banner">
        <h1 class="hero-title">${escapeHtml(titleValue)}</h1>
        <div class="hero-meta">${metaWithDate}</div>
      </div>
    `,
    sidebar: `
      <div class="hero-sidebar">
        <div class="hero-sidebar-accent"></div>
        <div class="hero-sidebar-body">
          <h1 class="hero-title" style="color:#0f172a">${escapeHtml(titleValue)}</h1>
          <div class="header-meta">${metaWithDate}</div>
        </div>
      </div>
    `,
    line: `
      <div class="header-line">
        <h1 class="header-title">${escapeHtml(titleValue)}</h1>
        <div class="header-meta">${metaWithDate}</div>
      </div>
    `,
    minimal: `
      <div class="header-minimal">
        <h1 class="header-title">${escapeHtml(titleValue)}</h1>
        <div class="header-meta">${metaWithDate}</div>
      </div>
    `,
  };

  return headerStyles[design.headerStyle];
}

function renderFields(
  design: ResolvedPdfDesign,
  fields: TemplateField[],
  document: Document
): string {
  const style = design.fieldsStyle;

  if (style === 'sections') {
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

  if (style === 'list') {
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

  if (style === 'table') {
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

  const itemClass = style === 'cards' ? 'card-item' : style === 'columns' ? 'column-item' : 'grid-item';
  const labelClass = style === 'cards' ? 'card-label' : style === 'columns' ? 'column-label' : 'grid-label';
  const valueClass = style === 'cards' ? 'card-value' : style === 'columns' ? 'column-value' : 'grid-value';

  const items = fields
    .map(
      (field) => `
        <div class="${itemClass}${field.multiline ? ' wide' : ''}">
          <div class="${labelClass}">${escapeHtml(field.label)}</div>
          <div class="${valueClass}">${formatFieldValue(document.fields[field.key], field.multiline)}</div>
        </div>
      `
    )
    .join('');

  return `<div class="grid">${items}</div>`;
}

function wrapPage(content: string, design: ResolvedPdfDesign): string {
  return `
    <!DOCTYPE html>
    <html lang="${getAppLocale()}">
      <head>
        <meta charset="utf-8" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>${buildStyles(design)}</style>
      </head>
      <body>
        <div class="page">${content}</div>
      </body>
    </html>
  `;
}

export function renderDocumentPdfHtml(document: Document, template: DocumentTemplate): string {
  const pdfStyle = normalizePdfStyle(document.pdfStyle ?? template.pdfStyle, template.id);
  const design = resolvePdfDesign(pdfStyle, template.accentColor, template.gradientEnd);
  const created = new Date(document.createdAt).toLocaleDateString(getDateLocale());
  const titleValue = document.fields.title?.trim() || document.title;

  const header = renderHeader(design, template, titleValue, created, pdfStyle.showDate);
  const fields = renderFields(design, template.fields, document);
  const footer = pdfStyle.showFooter
    ? `<div class="footer">${escapeHtml(t('pdf.footer'))}${pdfStyle.showDate ? ` · ${created}` : ''}</div>`
    : '';

  return wrapPage(`${header}${fields}${footer}`, design);
}
