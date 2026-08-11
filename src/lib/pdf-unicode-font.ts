import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import fontkit from '@pdf-lib/fontkit';
import { type PDFDocument, type PDFFont } from 'pdf-lib';

import { base64ToUint8Array } from '@/lib/pdf-bytes';

type UnicodeFontKind = 'sans' | 'serif';

const fontBytesPromises: Partial<Record<UnicodeFontKind, Promise<Uint8Array>>> = {};

function fontModule(kind: UnicodeFontKind) {
  return kind === 'serif'
    ? require('../../assets/fonts/NotoSerif-Regular.ttf')
    : require('../../assets/fonts/NotoSans-Regular.ttf');
}

/**
 * Load bundled Unicode font bytes (Cyrillic-capable Noto Sans / Noto Serif).
 */
export async function loadUnicodeFontBytes(
  kind: UnicodeFontKind = 'sans'
): Promise<Uint8Array> {
  const existing = fontBytesPromises[kind];
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const asset = Asset.fromModule(fontModule(kind));
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (!uri) {
      throw new Error('Unicode font asset is unavailable');
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64ToUint8Array(base64);
  })().catch((error) => {
    delete fontBytesPromises[kind];
    throw error;
  });

  fontBytesPromises[kind] = promise;
  return promise;
}

/**
 * Embed a Cyrillic-safe font into a PDF document (StandardFonts cannot encode Ukrainian/Russian).
 */
export async function embedUnicodeFont(
  pdfDoc: PDFDocument,
  kind: UnicodeFontKind = 'sans'
): Promise<PDFFont> {
  pdfDoc.registerFontkit(fontkit);
  const bytes = await loadUnicodeFontBytes(kind);
  return pdfDoc.embedFont(bytes, { subset: true });
}
