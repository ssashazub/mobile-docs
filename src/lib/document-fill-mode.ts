import { IMPORTED_FORM_TEMPLATE_ID } from '@/constants/imported-pdf';
import { t } from '@/i18n';
import { isImportedFormDocument } from '@/lib/document-display';
import {
  buildDocumentFromPdfBackedTemplate,
} from '@/lib/document-helpers';
import { updateDocument } from '@/lib/document-storage';
import { renderTemplateDocumentPdfBytes } from '@/lib/export-pdf';
import { savePdfBytesForDocument } from '@/lib/pdf-file-storage';
import { getTemplateById } from '@/lib/template-storage';
import type { Document } from '@/types/document';

/** Document can be filled via the field list editor. */
export function supportsFillByFields(document: Document): boolean {
  if ((document.formFields?.length ?? 0) > 0) {
    return true;
  }

  return (
    document.source !== 'imported-form' &&
    Boolean(document.templateId) &&
    document.templateId !== IMPORTED_FORM_TEMPLATE_ID
  );
}

/** Document already has a PDF file, or can generate one from a template. */
export function canFillOnDocument(document: Document): boolean {
  if (document.originalPdfUri) {
    return true;
  }

  return (
    document.source !== 'imported-form' &&
    Boolean(document.templateId) &&
    document.templateId !== IMPORTED_FORM_TEMPLATE_ID
  );
}

/**
 * Ensure the document is PDF-backed (imported-form + originalPdfUri) so fill-on-page works.
 * Template documents are rendered to PDF once and converted.
 */
export async function ensurePdfBackedForOnDocumentFill(document: Document): Promise<Document> {
  if (isImportedFormDocument(document) && document.originalPdfUri) {
    return document;
  }

  if (document.originalPdfUri && !isImportedFormDocument(document)) {
    const template = await getTemplateById(document.templateId);
    if (!template) {
      throw new Error(t('import.templateMissing'));
    }

    const next = buildDocumentFromPdfBackedTemplate(
      template,
      document.fields,
      document.id,
      document.originalPdfUri,
      document.title
    );
    next.createdAt = document.createdAt;
    next.title = document.title;
    next.pdfStyle = document.pdfStyle;
    await updateDocument(next);
    return next;
  }

  const template = await getTemplateById(document.templateId);
  if (!template) {
    throw new Error(t('import.templateMissing'));
  }

  const pdfBytes = await renderTemplateDocumentPdfBytes(document);
  const storedUri = await savePdfBytesForDocument(document.id, pdfBytes);
  const next = buildDocumentFromPdfBackedTemplate(
    template,
    document.fields,
    document.id,
    storedUri,
    document.title
  );
  next.createdAt = document.createdAt;
  next.title = document.title;
  next.pdfStyle = document.pdfStyle;
  await updateDocument(next);
  return next;
}
