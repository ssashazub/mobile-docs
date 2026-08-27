import * as DocumentPicker from 'expo-document-picker';
import { PDFDocument } from 'pdf-lib';

import { t } from '@/i18n';
import { addDocument, getDocuments } from '@/lib/document-storage';
import {
  buildDocumentFromPdfBackedTemplate,
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

    // Keep the exported PDF so both field-list and on-document fill work.
    const storedUri = await savePdfBytesForDocument(nextId, pdfBytes);
    const document = buildDocumentFromPdfBackedTemplate(
      template,
      metadata.fields,
      nextId,
      storedUri,
      metadata.title?.trim() || fileName
    );

    if (metadata.pdfStyle) {
      document.pdfStyle = metadata.pdfStyle;
    }
    if (metadata.title?.trim()) {
      document.title = metadata.title.trim();
    }

    await addDocument(document);
    return document;
  }

  const formFields = extractFormFields(pdfDoc);
  const storedUri = await savePdfBytesForDocument(nextId, pdfBytes);
  const fields = Object.fromEntries(formFields.map((field) => [field.name, field.value]));
  const document = buildImportedFormDocument(
    nextId,
    fileName,
    formFields,
    fields,
    storedUri,
    { hasNativeAcroForm: formFields.length > 0 }
  );

  await addDocument(document);
  return document;
}
