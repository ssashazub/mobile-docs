import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';

import { t } from '@/i18n';
import { PDF_A4 } from '@/constants/pdf-page';
import { getAppSettings } from '@/lib/app-settings-storage';
import { isAppTemplateDocument, isImportedFormDocument } from '@/lib/document-display';
import { buildExportFileBaseName } from '@/lib/export-file-name';
import { writeExportPdfBytes } from '@/lib/export-folder';
import { applyFormFieldValues } from '@/lib/pdf-form';
import { drawDocumentOverlays } from '@/lib/pdf-draw-overlays';
import { buildExportMetadata, embedMetadataInPdfBytes } from '@/lib/pdf-metadata';
import { base64ToUint8Array, readPdfBytes, uint8ArrayToBase64 } from '@/lib/pdf-bytes';
import { renderDocumentPdfHtml } from '@/lib/pdf-templates';
import { getTemplateById } from '@/lib/template-storage';
import type { Document } from '@/types/document';

export type PreparedPdfExport = {
  uri: string;
  base64: string;
  fileBaseName: string;
  /** HTML used for on-screen preview (template documents). */
  previewHtml?: string;
};

/**
 * Rendering HTML to PDF happens in an offscreen native WebView that can silently
 * stall (most often when the window is resized mid-render on tablets), leaving the
 * promise unsettled forever. Time it out and retry with a fresh renderer instead.
 */
const RENDER_TIMEOUT_MS = 15000;
const RENDER_TIMEOUT_MARKER = Symbol('pdf-render-timeout');

function raceWithTimeout<T>(task: Promise<T>): Promise<T | typeof RENDER_TIMEOUT_MARKER> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(RENDER_TIMEOUT_MARKER), RENDER_TIMEOUT_MS);

    task.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (taskError) => {
        clearTimeout(timer);
        reject(taskError);
      }
    );
  });
}

async function renderHtmlToPdfBase64(html: string): Promise<string> {
  const render = () =>
    Print.printToFileAsync({
      html,
      base64: true,
      width: PDF_A4.widthPx,
      height: PDF_A4.heightPx,
      // Keep Android text metrics stable; layout width is fixed via CSS zoom.
      textZoom: 100,
    });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await raceWithTimeout(render());

    if (result === RENDER_TIMEOUT_MARKER) {
      continue;
    }

    if (!result.base64) {
      throw new Error(t('pdf.generateFailed'));
    }

    return result.base64;
  }

  throw new Error(t('pdf.generateTimeout'));
}

async function sharePdfFile(
  fileUri: string,
  dialogTitle: string,
  base64Fallback?: string
): Promise<void> {
  let shareUri = fileUri;

  if (fileUri.startsWith('content://') && FileSystem.cacheDirectory && base64Fallback) {
    shareUri = `${FileSystem.cacheDirectory}share-${Date.now()}.pdf`;
    await FileSystem.writeAsStringAsync(shareUri, base64Fallback, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(t('pdf.sharingUnavailable'));
  }

  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    dialogTitle,
    UTI: 'com.adobe.pdf',
  });
}

async function writePreviewCachePdf(fileBaseName: string, base64: string): Promise<string> {
  if (!FileSystem.cacheDirectory) {
    throw new Error(t('pdf.generateFailed'));
  }

  const uri = `${FileSystem.cacheDirectory}preview-${fileBaseName}-${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

async function buildTemplatePdf(document: Document): Promise<{
  pdfBytes: Uint8Array;
  previewHtml: string;
}> {
  const template = await getTemplateById(document.templateId);

  if (!template) {
    throw new Error(t('pdf.templateNotFound'));
  }

  const previewHtml = renderDocumentPdfHtml(document, template);
  const base64 = await renderHtmlToPdfBase64(previewHtml);

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

  return { pdfBytes, previewHtml };
}

/** Render a template-based document to PDF bytes (with Mobile Docs metadata). */
export async function renderTemplateDocumentPdfBytes(document: Document): Promise<Uint8Array> {
  const built = await buildTemplatePdf(document);
  return built.pdfBytes;
}

async function buildImportedFormPdf(document: Document): Promise<Uint8Array> {
  if (!document.originalPdfUri) {
    throw new Error(t('import.missingOriginalPdf'));
  }

  const sourceBytes = await readPdfBytes(document.originalPdfUri);
  let pdfBytes = sourceBytes;

  if (document.hasNativeAcroForm) {
    pdfBytes = await applyFormFieldValues(pdfBytes, document.fields);
  }

  pdfBytes = await drawDocumentOverlays(pdfBytes, document);
  return pdfBytes;
}

/** Prepare PDF for preview / print / share without opening the share sheet yet. */
export async function prepareDocumentPdf(document: Document): Promise<PreparedPdfExport> {
  const settings = await getAppSettings();
  const fileBaseName = buildExportFileBaseName(document, settings.fileNameFormat);

  let pdfBytes: Uint8Array;
  let previewHtml: string | undefined;

  if (isImportedFormDocument(document) && !isAppTemplateDocument(document)) {
    pdfBytes = await buildImportedFormPdf(document);
  } else {
    const built = await buildTemplatePdf(document);
    pdfBytes = built.pdfBytes;
    previewHtml = built.previewHtml;
  }

  const base64 = uint8ArrayToBase64(pdfBytes);
  const uri = await writePreviewCachePdf(fileBaseName, base64);

  return {
    uri,
    base64,
    fileBaseName,
    previewHtml,
  };
}

export async function sharePreparedPdf(prepared: PreparedPdfExport): Promise<void> {
  const settings = await getAppSettings();
  const fileUri = await writeExportPdfBytes(prepared.fileBaseName, prepared.base64, settings);
  await sharePdfFile(fileUri, t('pdf.exportDialog'), prepared.base64);
}

export async function printPreparedPdf(prepared: PreparedPdfExport): Promise<void> {
  await Print.printAsync({ uri: prepared.uri });
}

/** @deprecated Prefer prepare → preview → share/print. Kept for callers that need one-shot export. */
export async function exportDocumentPdf(document: Document): Promise<void> {
  const prepared = await prepareDocumentPdf(document);
  await sharePreparedPdf(prepared);
}
