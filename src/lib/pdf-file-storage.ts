import * as FileSystem from 'expo-file-system/legacy';

import { writePdfBytes } from '@/lib/pdf-bytes';

const PDF_DIR = `${FileSystem.documentDirectory}pdfs/`;
const TEMPLATE_PDF_DIR = `${PDF_DIR}templates/`;

async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

export function getPdfPathForDocument(documentId: number): string {
  return `${PDF_DIR}${documentId}.pdf`;
}

export function getPdfPathForTemplate(templateId: string): string {
  return `${TEMPLATE_PDF_DIR}${templateId}.pdf`;
}

export async function savePdfBytesForDocument(
  documentId: number,
  bytes: Uint8Array
): Promise<string> {
  await ensureDir(PDF_DIR);
  const destination = getPdfPathForDocument(documentId);
  await writePdfBytes(destination, bytes);
  return destination;
}

export async function savePdfBytesForTemplate(
  templateId: string,
  bytes: Uint8Array
): Promise<string> {
  await ensureDir(TEMPLATE_PDF_DIR);
  const destination = getPdfPathForTemplate(templateId);
  await writePdfBytes(destination, bytes);
  return destination;
}

export async function copyPdfToDocument(
  sourceUri: string,
  documentId: number
): Promise<string> {
  await ensureDir(PDF_DIR);
  const destination = getPdfPathForDocument(documentId);
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}

export async function deletePdfForDocument(documentId: number): Promise<void> {
  const path = getPdfPathForDocument(documentId);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}

export async function deletePdfForTemplate(templateId: string): Promise<void> {
  const path = getPdfPathForTemplate(templateId);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}
