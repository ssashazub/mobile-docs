import AsyncStorage from '@react-native-async-storage/async-storage';

import { DOCUMENTS_STORAGE_KEY } from '@/constants/storage';
import { normalizeDocument } from '@/lib/document-helpers';
import type { Document } from '@/types/document';

export async function getDocuments(): Promise<Document[]> {
  const raw = await AsyncStorage.getItem(DOCUMENTS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  return (JSON.parse(raw) as Document[]).map(normalizeDocument);
}

export async function saveDocuments(documents: Document[]): Promise<void> {
  await AsyncStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(documents));
}

export async function addDocument(document: Document): Promise<void> {
  const documents = await getDocuments();
  await saveDocuments([...documents, document]);
}

export async function updateDocument(document: Document): Promise<void> {
  const documents = await getDocuments();
  await saveDocuments(documents.map((item) => (item.id === document.id ? document : item)));
}

export async function deleteDocument(documentId: number): Promise<void> {
  const documents = await getDocuments();
  await saveDocuments(documents.filter((item) => item.id !== documentId));
}
