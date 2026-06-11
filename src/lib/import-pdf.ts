import * as DocumentPicker from 'expo-document-picker';
import { PDFDocument } from 'pdf-lib';

import { IMPORTED_FORM_TEMPLATE_ID } from '@/constants/imported-pdf';
import { t } from '@/i18n';
import { addDocument, getDocuments } from '@/lib/document-storage';
import {
  buildDocumentFromFields,
  buildImportedFormDocument,
  getNextDocumentId,
} from '@/lib/document-helpers';
import { extractFormFields } from '@/lib/pdf-form';
import { savePdfBytesForDocument } from '@/lib/pdf-file-storage';
import { parseMetadataFromPdf, parseMetadataFromPdfBytes, type PdfExportMetadata } from '@/lib/pdf-metadata';
import { readPdfBytes } from '@/lib/pdf-bytes';
import { getTemplateById } from '@/lib/template-storage';
import type { Document } from '@/types/document';

export class ImportCancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'ImportCancelledError';
  }
}

export async function pickAndImportPdf(): Promise<Document> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    throw new ImportCancelledError();
  }

  const asset = result.assets[0];
  const fileName = asset.name ?? 'document.pdf';
  const pdfBytes = await readPdfBytes(asset.uri);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const documents = await getDocuments();
  const nextId = getNextDocumentId(documents);

  let metadata: PdfExportMetadata | null = null;
  try {
    metadata = parseMetadataFromPdf(pdfDoc) ?? parseMetadataFromPdfBytes(pdfBytes);
  } catch {
    metadata = null;
  }

  if (metadata) {
    const template = await getTemplateById(metadata.templateId);
    if (!template) {
      throw new Error(t('import.templateMissing'));
    }

    const document = buildDocumentFromFields(
      template,
      metadata.fields,
      nextId,
      metadata.pdfStyle
    );

    if (metadata.title?.trim()) {
      document.title = metadata.title.trim();
    }

    document.source = 'template';
    await addDocument(document);
    return document;
  }

  const formFields = extractFormFields(pdfDoc);
  if (formFields.length === 0) {
    throw new Error(t('import.noFormFields'));
  }

  const storedUri = await savePdfBytesForDocument(nextId, pdfBytes);
  const fields = Object.fromEntries(formFields.map((field) => [field.name, field.value]));
  const document = buildImportedFormDocument(nextId, fileName, formFields, fields, storedUri);

  await addDocument(document);
  return document;
}

export function isRestoredAppPdf(document: Document): boolean {
  return document.source === 'template' && document.templateId !== IMPORTED_FORM_TEMPLATE_ID;
}
