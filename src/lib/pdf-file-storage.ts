import * as FileSystem from 'expo-file-system/legacy';

import { writePdfBytes } from '@/lib/pdf-bytes';

const PDF_DIR = `${FileSystem.documentDirectory}pdfs/`;

async function ensurePdfDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PDF_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PDF_DIR, { intermediates: true });
  }
}

export function getPdfPathForDocument(documentId: number): string {
  return `${PDF_DIR}${documentId}.pdf`;
}

export async function savePdfBytesForDocument(
  documentId: number,
  bytes: Uint8Array
): Promise<string> {
  await ensurePdfDir();
  const destination = getPdfPathForDocument(documentId);
  await writePdfBytes(destination, bytes);
  return destination;
}

export async function deletePdfForDocument(documentId: number): Promise<void> {
  const path = getPdfPathForDocument(documentId);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}
