import { getAppLocale, getDateLocale, t } from '@/i18n';
import { wrapPdfPage } from '@/core/pdf/html';
import { renderPdfFooter } from '@/core/pdf/parts/footer';
import { renderPdfFields } from '@/core/pdf/parts/fields';
import { renderPdfHeader } from '@/core/pdf/parts/header';
import { buildPdfStyles } from '@/core/pdf/styles';
import { resolvePdfDesign } from '@/lib/pdf-style-resolver';
import { normalizePdfStyle } from '@/lib/template-helpers';
import type { Document } from '@/types/document';
import type { DocumentTemplate } from '@/types/template';

/**
 * Собирает HTML документа из частей: стили → заголовок → поля → подвал.
 */
export function renderDocumentPdfHtml(document: Document, template: DocumentTemplate): string {
  const pdfStyle = normalizePdfStyle(document.pdfStyle ?? template.pdfStyle, template.id);
  const design = resolvePdfDesign(pdfStyle, template.accentColor, template.gradientEnd);
  const created = new Date(document.createdAt).toLocaleDateString(getDateLocale());
  const titleValue = document.fields.title?.trim() || document.title;

  const header = renderPdfHeader(design, template, titleValue, created, pdfStyle.showDate);
  const fields = renderPdfFields(design, template.fields, document);
  const footer = pdfStyle.showFooter
    ? renderPdfFooter(t('pdf.footer'), created, pdfStyle.showDate)
    : '';

  return wrapPdfPage(`${header}${fields}${footer}`, buildPdfStyles(design), getAppLocale());
}
