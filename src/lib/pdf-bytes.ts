import * as FileSystem from 'expo-file-system/legacy';

import { t } from '@/i18n';

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function readViaFetch(uri: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(uri);
    if (!response.ok) {
      return null;
    }
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

async function readViaFileSystem(uri: string): Promise<Uint8Array | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64ToUint8Array(base64);
  } catch {
    return null;
  }
}

async function readViaCopy(uri: string): Promise<Uint8Array | null> {
  const tempUri = `${FileSystem.cacheDirectory}pdf-read-${Date.now()}.pdf`;

  try {
    await FileSystem.copyAsync({ from: uri, to: tempUri });
    const bytes = await readViaFileSystem(tempUri);
    await FileSystem.deleteAsync(tempUri, { idempotent: true });
    return bytes;
  } catch {
    await FileSystem.deleteAsync(tempUri, { idempotent: true });
    return null;
  }
}

export async function readPdfBytes(uri: string): Promise<Uint8Array> {
  const strategies = [readViaFetch, readViaFileSystem, readViaCopy];

  for (const strategy of strategies) {
    const bytes = await strategy(uri);
    if (bytes && bytes.length > 0) {
      return bytes;
    }
  }

  throw new Error(t('import.readFailed'));
}

export async function writePdfBytes(uri: string, bytes: Uint8Array): Promise<void> {
  await FileSystem.writeAsStringAsync(uri, uint8ArrayToBase64(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
}
