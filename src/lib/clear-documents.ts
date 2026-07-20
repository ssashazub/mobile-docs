import * as FileSystem from 'expo-file-system/legacy';

import { getDocuments, saveDocuments } from '@/lib/document-storage';
import { deletePdfForDocument } from '@/lib/pdf-file-storage';

export async function clearAllDocuments(): Promise<number> {
  const documents = await getDocuments();

  await Promise.all(
    documents
      .filter((document) => document.source === 'imported-form')
      .map((document) => deletePdfForDocument(document.id))
  );

  await saveDocuments([]);

  const pdfDir = `${FileSystem.documentDirectory}pdfs/`;
  const info = await FileSystem.getInfoAsync(pdfDir);
  if (info.exists) {
    await FileSystem.deleteAsync(pdfDir, { idempotent: true });
  }

  return documents.length;
}
