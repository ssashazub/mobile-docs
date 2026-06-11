import { PDFDocument } from 'pdf-lib';

import { base64ToUint8Array, uint8ArrayToBase64 } from '@/lib/pdf-bytes';
import type { PdfStyle } from '@/types/template';

export const MOBILE_DOCS_PRODUCER = 'Mobile Docs';
export const MOBILE_DOCS_APP_ID = 'mobile-docs';
export const MOBILE_DOCS_MARKER = 'mobile-docs:v1:';

export type PdfExportMetadata = {
  v: 1;
  app: typeof MOBILE_DOCS_APP_ID;
  templateId: string;
  fields: Record<string, string>;
  pdfStyle?: PdfStyle;
  title?: string;
};

export function buildExportMetadata(
  templateId: string,
  fields: Record<string, string>,
  pdfStyle?: PdfStyle,
  title?: string
): PdfExportMetadata {
  return {
    v: 1,
    app: MOBILE_DOCS_APP_ID,
    templateId,
    fields,
    pdfStyle,
    title,
  };
}

function validateMetadata(parsed: unknown): PdfExportMetadata | null {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const candidate = parsed as Partial<PdfExportMetadata>;

  if (
    candidate.app !== MOBILE_DOCS_APP_ID ||
    candidate.v !== 1 ||
    typeof candidate.templateId !== 'string' ||
    !candidate.fields ||
    typeof candidate.fields !== 'object'
  ) {
    return null;
  }

  return candidate as PdfExportMetadata;
}

function decodeUtf8Base64Payload(encoded: string): PdfExportMetadata | null {
  try {
    const json = new TextDecoder().decode(base64ToUint8Array(encoded));
    return validateMetadata(JSON.parse(json));
  } catch {
    return null;
  }
}

export function decodeMetadataPayload(raw: string): PdfExportMetadata | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  const markerIndex = trimmed.indexOf(MOBILE_DOCS_MARKER);
  if (markerIndex >= 0) {
    const encoded = trimmed.slice(markerIndex + MOBILE_DOCS_MARKER.length);
    const parsed = decodeUtf8Base64Payload(encoded);
    if (parsed) {
      return parsed;
    }
  }

  if (trimmed.startsWith('{')) {
    try {
      return validateMetadata(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }

  return null;
}

export function parseMetadataFromPdf(pdfDoc: PDFDocument): PdfExportMetadata | null {
  const sources = [
    pdfDoc.getSubject(),
    pdfDoc.getCreator(),
    pdfDoc.getKeywords(),
    pdfDoc.getProducer(),
  ].filter((value): value is string => Boolean(value));

  for (const source of sources) {
    const parsed = decodeMetadataPayload(source);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  if (needle.length === 0 || haystack.length < needle.length) {
    return -1;
  }

  for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    let matches = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return i;
    }
  }

  return -1;
}

function bytesToAsciiString(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 1) {
    result += String.fromCharCode(bytes[i]);
  }
  return result;
}

export function scanPdfBytesForMetadata(pdfBytes: Uint8Array): PdfExportMetadata | null {
  try {
    const markerBytes = new TextEncoder().encode(MOBILE_DOCS_MARKER);
    const markerIndex = indexOfBytes(pdfBytes, markerBytes);

    if (markerIndex < 0) {
      return null;
    }

    const tailLength = Math.min(8192, pdfBytes.length - markerIndex);
    const tail = bytesToAsciiString(pdfBytes.subarray(markerIndex, markerIndex + tailLength));
    return decodeMetadataPayload(tail);
  } catch {
    return null;
  }
}

export function encodeMetadataPayload(metadata: PdfExportMetadata): string {
  const json = JSON.stringify(metadata);
  return `${MOBILE_DOCS_MARKER}${uint8ArrayToBase64(new TextEncoder().encode(json))}`;
}

export async function embedMetadataInPdfBytes(
  pdfBytes: Uint8Array,
  metadata: PdfExportMetadata
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const payload = encodeMetadataPayload(metadata);

  pdfDoc.setProducer(MOBILE_DOCS_PRODUCER);
  pdfDoc.setCreator(MOBILE_DOCS_APP_ID);
  pdfDoc.setSubject(payload);
  pdfDoc.setKeywords([payload]);

  return pdfDoc.save();
}

export function parseMetadataFromPdfBytes(pdfBytes: Uint8Array): PdfExportMetadata | null {
  try {
    return scanPdfBytesForMetadata(pdfBytes);
  } catch {
    return null;
  }
}
