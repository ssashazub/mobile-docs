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
    },
    cards: () => renderGridFields(design, fields, document, 'card'),
    columns: () => renderGridFields(design, fields, document, 'column'),
  };

  return renderers[design.fieldsStyle]();
}

function renderGridFields(
  _design: ResolvedPdfDesign,
  fields: TemplateField[],
  document: Document,
  mode: 'card' | 'column' | 'grid'
): string {
  const itemClass = mode === 'card' ? 'card-item' : mode === 'column' ? 'column-item' : 'grid-item';
  const labelClass = mode === 'card' ? 'card-label' : mode === 'column' ? 'column-label' : 'grid-label';
  const valueClass = mode === 'card' ? 'card-value' : mode === 'column' ? 'column-value' : 'grid-value';

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
