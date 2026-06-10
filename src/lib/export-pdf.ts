import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { t } from '@/i18n';
import { renderDocumentPdfHtml } from '@/lib/pdf-templates';
import { getTemplateById } from '@/lib/template-storage';
import type { Document } from '@/types/document';

function sanitizeFileName(title: string): string {
  return title.replace(/[^a-zA-Z0-9а-яА-ЯёЁіїєґІЇЄҐ_-]/g, '_');
}

export async function exportDocumentPdf(document: Document): Promise<void> {
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

  const fileUri = `${FileSystem.cacheDirectory}${sanitizeFileName(document.title)}.pdf`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(t('pdf.sharingUnavailable'));
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    dialogTitle: t('pdf.exportDialog'),
    UTI: 'com.adobe.pdf',
  });
}
