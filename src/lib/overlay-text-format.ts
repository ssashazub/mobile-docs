import type { PdfOverlayFontId } from '@/constants/overlay-fonts';
import type { PdfFormField } from '@/types/document';

/** Dash placeholders used in Ukrainian/Russian financial tables. */
const DASH_PLACEHOLDER = /^[-–—−]$/;

/**
 * True for plain numeric cell values (amounts, quantities) including
 * space-grouped forms like "226 694" and dash placeholders.
 */
export function looksLikeNumericValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (DASH_PLACEHOLDER.test(trimmed)) {
    return true;
  }
  // Digits with optional spaces / decimal separators / leading minus.
  return /^-?[\d\s]+([.,]\d+)?$/.test(trimmed) && /\d/.test(trimmed);
}

/** Strip grouping spaces for equality / parsing. */
export function stripNumberGrouping(value: string): string {
  return value.trim().replace(/\s/g, '');
}

export function numericValuesEqual(a: string, b: string): boolean {
  const left = a.trim();
  const right = b.trim();
  if (left === right) {
    return true;
  }
  if (!looksLikeNumericValue(left) || !looksLikeNumericValue(right)) {
    return false;
  }
  return stripNumberGrouping(left) === stripNumberGrouping(right);
}

/**
 * Format amounts like the printed tables: spaces as thousands separators
 * ("65465465" → "65 465 465"). Leaves non-numeric text unchanged.
 */
export function formatGroupedNumber(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || DASH_PLACEHOLDER.test(trimmed)) {
    return trimmed;
  }

  const compact = stripNumberGrouping(trimmed);
  const negative = compact.startsWith('-');
  const raw = negative ? compact.slice(1) : compact;
  const match = raw.match(/^(\d+)([.,]\d+)?$/);
  if (!match) {
    return trimmed;
  }

  const grouped = match[1].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${negative ? '-' : ''}${grouped}${match[2] ?? ''}`;
}

/** 3–4 digit integers are usually row codes ("Код рядка"), not amounts. */
export function looksLikeRowCode(value: string): boolean {
  const compact = stripNumberGrouping(value);
  return /^\d{3,4}$/.test(compact);
}

/**
 * Thousands spaces belong in amount columns (typically right-aligned),
 * not in centered row-code cells (1101 must not become "1 101").
 */
export function shouldGroupThousands(
  value: string,
  options?: { align?: PdfFormField['align']; sourceText?: string }
): boolean {
  if (!looksLikeNumericValue(value) || !/\d/.test(value)) {
    return false;
  }
  if (options?.align === 'center') {
    return false;
  }
  const source = options?.sourceText?.trim() ?? '';
  if (source && looksLikeRowCode(source)) {
    return false;
  }
  if (looksLikeRowCode(value) && options?.align !== 'right') {
    return false;
  }
  const compact = stripNumberGrouping(value).replace(/^-/, '');
  const intPart = compact.split(/[.,]/)[0] ?? '';
  // Right-aligned amounts: group from 4+ digits ("6 506").
  if (options?.align === 'right') {
    return intPart.length >= 4;
  }
  // Unknown align: only group larger figures to avoid row codes.
  return intPart.length >= 5;
}

/**
 * Normalize a field value for on-page display / PDF burn-in so it matches
 * neighboring printed glyphs (grouping spaces for amounts only).
 */
export function formatOverlayDisplayValue(
  value: string,
  options?: { align?: PdfFormField['align']; sourceText?: string }
): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (!looksLikeNumericValue(trimmed) || !/\d/.test(trimmed)) {
    return trimmed;
  }
  // Centered codes: strip accidental grouping ("1 101" → "1101").
  if (options?.align === 'center' || looksLikeRowCode(options?.sourceText ?? '')) {
    return stripNumberGrouping(trimmed);
  }
  if (shouldGroupThousands(trimmed, options)) {
    return formatGroupedNumber(trimmed);
  }
  return stripNumberGrouping(trimmed);
}

/**
 * Cap overlay font size to the field box without shrinking text-run fields.
 * Free-text detections set height ≈ glyph size; applying height*0.62 there
 * made titles visibly smaller than the printed original.
 */
export function capOverlayFontSize(fontSize: number, rectHeight: number): number {
  const height = Math.max(1, rectHeight);
  let size = Math.max(5, fontSize);
  const ratio = size / height;

  // Recover values previously capped with height*0.58–0.62 on tight text boxes.
  if (height < 20 && ratio >= 0.54 && ratio <= 0.66) {
    size = Math.max(size, height * 0.95);
  }

  // Tight text-run / underline value boxes — keep detected size as-is.
  if (height <= size * 1.45) {
    return size;
  }
  // Tall table rows: stay inside the cell, but allow up to ~85% of row height.
  return Math.min(size, Math.max(5, height * 0.85));
}

/**
 * Amount cells sometimes share a PDF font id with bold row codes, which used
 * to cause every numeric value to be forced non-bold. That over-corrected:
 * bold total/subtotal rows in financial tables are common and legitimately
 * bold in BOTH columns — suppressing it made the edited cell visibly lighter
 * than its untouched neighbor. Only short row-code-shaped numbers (the actual
 * false-positive case) get de-bolded now; real amounts keep the detected weight.
 * Long form values (enterprise names, addresses) are also regular weight.
 */
export function resolveOverlayBold(
  field: Pick<PdfFormField, 'bold' | 'sourceText'>,
  value: string
): boolean {
  if (!field.bold) {
    return false;
  }
  const sample = (value || field.sourceText || '').trim();
  if (looksLikeNumericValue(sample) && looksLikeRowCode(sample)) {
    return false;
  }
  // Body lines / titles — not short section headers.
  if (!looksLikeNumericValue(sample) && sample.length > 24) {
    return false;
  }
  return true;
}

/** Map PDF.js font family / name → overlay font id. */
export function inferOverlayFontIdFromPdfName(
  fontName?: string,
  fontFamily?: string
): PdfOverlayFontId {
  const haystack = `${fontFamily ?? ''} ${fontName ?? ''}`.toLowerCase();

  if (/courier|mono|consolas|menlo|lucida.?console/.test(haystack)) {
    return 'courier';
  }
  if (/georgia/.test(haystack)) {
    return 'georgia';
  }
  if (
    /arial|helvetica|calibri|verdana|tahoma|trebuchet|noto.?sans|dejavu.?sans|liberation.?sans|roboto|segoe|sans/.test(
      haystack
    )
  ) {
    return 'arial';
  }
  if (/times|serif|cambria|georgia|noto.?serif|liberation.?serif|cyrillic/.test(haystack)) {
    return 'times';
  }

  // Government form body text is usually serif; amounts use Helvetica separately.
  return 'times';
}
