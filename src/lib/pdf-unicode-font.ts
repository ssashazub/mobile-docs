import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import fontkit from '@pdf-lib/fontkit';
import { type PDFDocument, type PDFFont } from 'pdf-lib';

import { base64ToUint8Array } from '@/lib/pdf-bytes';

let fontBytesPromise: Promise<Uint8Array> | null = null;

/**
 * Load bundled Unicode font bytes (Cyrillic-capable Noto Sans).
 */
export async function loadUnicodeFontBytes(): Promise<Uint8Array> {
  if (!fontBytesPromise) {
    fontBytesPromise = (async () => {
      const asset = Asset.fromModule(require('../../assets/fonts/NotoSans-Regular.ttf'));
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
      fontBytesPromise = null;
      throw error;
    });
  }

  return fontBytesPromise;
}

/**
 * Embed a Cyrillic-safe font into a PDF document (StandardFonts cannot encode Ukrainian/Russian).
 */
export async function embedUnicodeFont(pdfDoc: PDFDocument): Promise<PDFFont> {
  pdfDoc.registerFontkit(fontkit);
  const bytes = await loadUnicodeFontBytes();
  return pdfDoc.embedFont(bytes, { subset: true });
}
