import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { t } from '@/i18n';
import { isImportedFormDocument } from '@/lib/document-display';
import { applyFormFieldValues } from '@/lib/pdf-form';
import { buildExportMetadata, embedMetadataInPdfBytes } from '@/lib/pdf-metadata';
import { base64ToUint8Array, readPdfBytes, uint8ArrayToBase64 } from '@/lib/pdf-bytes';
import { renderDocumentPdfHtml } from '@/lib/pdf-templates';
import { getTemplateById } from '@/lib/template-storage';
import type { Document } from '@/types/document';

function sanitizeFileName(title: string): string {
  return title.replace(/[^a-zA-Z0-9а-яА-ЯёЁіїєґІЇЄҐ_-]/g, '_');
}

async function sharePdfFile(fileUri: string, dialogTitle: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(t('pdf.sharingUnavailable'));
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    dialogTitle,
    UTI: 'com.adobe.pdf',
  });
}

async function exportTemplateDocumentPdf(document: Document): Promise<void> {
  const template = await getTemplateById(document.templateId);

  if (!template) {
    throw new Error(t('pdf.templateNotFound'));
  }

  const html = renderDocumentPdfHtml(document, template);

  const { base64 } = await Print.printToFileAsync({
    html,
    base64: true,
  });

  if (!base64) {
    throw new Error(t('pdf.generateFailed'));
  }

  let pdfBytes = base64ToUint8Array(base64);
  pdfBytes = await embedMetadataInPdfBytes(
    pdfBytes,
    buildExportMetadata(
      document.templateId,
      document.fields,
      document.pdfStyle,
      document.title
    )
  );

  const fileUri = `${FileSystem.cacheDirectory}${sanitizeFileName(document.title)}.pdf`;
  await FileSystem.writeAsStringAsync(fileUri, uint8ArrayToBase64(pdfBytes), {
    encoding: FileSystem.EncodingType.Base64,
  });

  await sharePdfFile(fileUri, t('pdf.exportDialog'));
}

async function exportImportedFormPdf(document: Document): Promise<void> {
  if (!document.originalPdfUri) {
    throw new Error(t('import.missingOriginalPdf'));
  }

  const sourceBytes = await readPdfBytes(document.originalPdfUri);
  const updatedBytes = await applyFormFieldValues(sourceBytes, document.fields);
  const fileName = sanitizeFileName(document.title || document.importedFileName || 'document');
  const fileUri = `${FileSystem.cacheDirectory}${fileName}.pdf`;

  await FileSystem.writeAsStringAsync(fileUri, uint8ArrayToBase64(updatedBytes), {
    encoding: FileSystem.EncodingType.Base64,
  });

  await sharePdfFile(fileUri, t('pdf.exportDialog'));
}

export async function exportDocumentPdf(document: Document): Promise<void> {
  if (isImportedFormDocument(document)) {
    await exportImportedFormPdf(document);
    return;
  }

  await exportTemplateDocumentPdf(document);
}
