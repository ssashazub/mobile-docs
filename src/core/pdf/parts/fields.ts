import { escapeHtml, formatFieldValue } from '@/core/pdf/html';
import type { Document } from '@/types/document';
import type { TemplateField } from '@/types/template';
import type { PdfFieldsStyle, ResolvedPdfDesign } from '@/types/pdf-style-design';

export function renderPdfFields(
  design: ResolvedPdfDesign,
  fields: TemplateField[],
  document: Document
): string {
  const renderers: Record<PdfFieldsStyle, () => string> = {
    sections: () =>
      fields
        .map(
          (field) => `
            <div class="section">
              <h2 class="section-title">${escapeHtml(field.label)}</h2>
              <div class="section-body">${formatFieldValue(document.fields[field.key], field.multiline)}</div>
            </div>
          `
        )
        .join(''),
    list: () =>
      fields
        .map(
          (field) => `
            <div class="field">
              <div class="field-label">${escapeHtml(field.label)}</div>
              <div class="field-value">${formatFieldValue(document.fields[field.key], field.multiline)}</div>
            </div>
          `
        )
        .join(''),
    table: () => {
      const rows = fields
        .map((field) => {
          const value = formatFieldValue(document.fields[field.key], field.multiline);

          if (field.multiline) {
            return `
              <tr>
                <td class="label" colspan="2">${escapeHtml(field.label)}</td>
              </tr>
              <tr>
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

      return `<table class="fields-table" width="100%">${rows}</table>`;
    },
    cards: () => renderGridFields(fields, document, 'card'),
    columns: () => renderGridFields(fields, document, 'column'),
  };

  return renderers[design.fieldsStyle]();
}

/**
 * Use HTML tables instead of CSS grid - Android WebView print often
 * ignores grid and leaves content left-aligned / narrow on A4.
 */
function renderGridFields(
  fields: TemplateField[],
  document: Document,
  mode: 'card' | 'column'
): string {
  const itemClass = mode === 'card' ? 'card-item' : 'column-item';
  const labelClass = mode === 'card' ? 'card-label' : 'column-label';
  const valueClass = mode === 'card' ? 'card-value' : 'column-value';

  const cell = (field: TemplateField) => `
    <td class="${itemClass}" width="50%" valign="top">
      <div class="${labelClass}">${escapeHtml(field.label)}</div>
      <div class="${valueClass}">${formatFieldValue(document.fields[field.key], field.multiline)}</div>
    </td>
  `;

  const rows: string[] = [];
  let index = 0;

  while (index < fields.length) {
    const current = fields[index]!;

    if (current.multiline) {
      rows.push(`
        <tr>
          <td class="${itemClass}" colspan="2" width="100%" valign="top">
            <div class="${labelClass}">${escapeHtml(current.label)}</div>
            <div class="${valueClass}">${formatFieldValue(document.fields[current.key], true)}</div>
          </td>
        </tr>
      `);
      index += 1;
      continue;
    }

    const next = fields[index + 1];
    if (next && !next.multiline) {
      rows.push(`<tr>${cell(current)}${cell(next)}</tr>`);
      index += 2;
      continue;
    }

    rows.push(`
      <tr>
        <td class="${itemClass}" colspan="2" width="100%" valign="top">
          <div class="${labelClass}">${escapeHtml(current.label)}</div>
          <div class="${valueClass}">${formatFieldValue(document.fields[current.key], false)}</div>
        </td>
      </tr>
    `);
    index += 1;
  }

  return `<table class="fields-grid" width="100%" cellspacing="0" cellpadding="0">${rows.join('')}</table>`;
}
