import { coverPdfRectInsideCell } from '@/lib/glyph-cover';
import {
  formatOverlayDisplayValue,
  looksLikeNumericValue,
  numericValuesEqual,
} from '@/lib/overlay-text-format';
import { isCheckboxChecked } from '@/lib/pdf-form';
import type { Document, PdfFieldRect, PdfFormField } from '@/types/document';

/** MuPDF page rect: [x0, y0, x1, y1] in PDF user space (origin bottom-left). */
export type MupdfRedactRect = {
  pageIndex: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Prefer searching this string on the page and redacting hit quads. */
  searchText?: string;
};

function isLatinAmountText(text: string): boolean {
  return looksLikeNumericValue(text) && /^[-–—−\d\s.,]+$/.test(text.trim());
}

function fieldNeedsRedact(field: PdfFormField, value: string, document: Document): boolean {
  if (field.origin === 'acroform') {
    return false;
  }
  if (!field.origin && document.hasNativeAcroForm) {
    return false;
  }
  if (!field.rect) {
    return false;
  }

  const source = field.sourceText?.trim() ?? '';
  if (!source) {
    return false;
  }

  const trimmed = value.trim();

  if (field.type === 'checkbox') {
    return isCheckboxChecked(value);
  }

  return trimmed !== source && !numericValuesEqual(trimmed, source);
}

function dashWipeRect(
  rect: PdfFieldRect,
  align: PdfFormField['align'],
  fontSize?: number
): Omit<MupdfRedactRect, 'searchText'> {
  const inner = coverPdfRectInsideCell(rect);
  const wipeW = Math.min(Math.max(10, rect.width * 0.28), inner.width);
  const wipeH = Math.min(inner.height, Math.max(6, (fontSize ?? rect.height) * 0.95));
  let x = inner.x + (inner.width - wipeW) / 2;
  if (align === 'right') {
    x = inner.x + inner.width - wipeW;
  } else if (align === 'left') {
    x = inner.x;
  }
  const y = inner.y + (inner.height - wipeH) / 2;
  return {
    pageIndex: rect.pageIndex,
    x0: x,
    y0: y,
    x1: x + wipeW,
    y1: y + wipeH,
  };
}

/** Prefer almost the full cell so MuPDF / whiteout actually hit glyph ink + AA. */
function fullCellWipeRect(rect: PdfFieldRect): Omit<MupdfRedactRect, 'searchText'> {
  const cover = coverPdfRectInsideCell(rect, { insetPt: 0.2 });
  return {
    pageIndex: rect.pageIndex,
    x0: cover.x,
    y0: cover.y,
    x1: cover.x + cover.width,
    y1: cover.y + cover.height,
  };
}

/**
 * Tight glyph covers for fields whose printed sourceText is being replaced or cleared.
 * Used by MuPDF WASM redaction so original Tj/TJ operators are removed from the stream.
 */
export function collectMupdfRedactRects(document: Document): MupdfRedactRect[] {
  const fields = document.fields ?? {};
  const formFields = document.formFields ?? [];
  const rects: MupdfRedactRect[] = [];

  for (const field of formFields) {
    const value = fields[field.name] ?? field.value ?? '';
    if (!fieldNeedsRedact(field, value, document) || !field.rect) {
      continue;
    }

    const source = field.sourceText?.trim() ?? '';
    const trimmed = value.trim();
    const display = formatOverlayDisplayValue(trimmed, {
      align: field.align,
      sourceText: source,
    });
    const amountLike = isLatinAmountText(display || source);
    const align = field.align ?? (amountLike ? 'right' : 'left');

    const box = /^[-–—−]$/.test(source)
      ? dashWipeRect(field.rect, align, field.fontSize)
      : fullCellWipeRect(field.rect);

    rects.push({
      ...box,
      searchText: source,
    });
  }

  return rects;
}
