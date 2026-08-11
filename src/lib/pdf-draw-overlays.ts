import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

import {
  DEFAULT_OVERLAY_FONT,
  normalizeOverlayFontId,
  overlayFontPdfKind,
  type PdfOverlayFontId,
} from '@/constants/overlay-fonts';
import {
  formatOverlayDisplayValue,
  looksLikeNumericValue,
  numericValuesEqual,
  resolveOverlayBold,
  capOverlayFontSize,
} from '@/lib/overlay-text-format';
import { coverPdfRectInsideCell } from '@/lib/glyph-cover';
import { isCheckboxChecked } from '@/lib/pdf-form';
import { embedUnicodeFont } from '@/lib/pdf-unicode-font';
import type { Document, PdfFieldRect, PdfFormField, PdfOverlayItem } from '@/types/document';

/** Amounts / dashes use only WinAnsi glyphs — Helvetica matches printed forms. */
function isLatinAmountText(text: string): boolean {
  return looksLikeNumericValue(text) && /^[-–—−\d\s.,]+$/.test(text.trim());
}

function resolveFontSize(rect: PdfFieldRect, preferred?: number): number {
  if (preferred != null && preferred > 0) {
    return capOverlayFontSize(preferred, rect.height);
  }
  return capOverlayFontSize(rect.height * 0.7, rect.height);
}

function whiteoutRect(
  page: ReturnType<PDFDocument['getPages']>[number],
  rect: PdfFieldRect,
  source: string,
  align: PdfFormField['align'],
  fontSize?: number
): void {
  const dash = /^[-–—−]$/.test(source.trim());
  if (dash) {
    // Small wipe for dash only — stay inside the cell.
    const inner = coverPdfRectInsideCell(rect);
    const wipeW = Math.min(Math.max(10, rect.width * 0.28), inner.width);
    const wipeH = Math.min(inner.height, Math.max(6, (fontSize ?? rect.height) * 0.95));
    let x = inner.x + (inner.width - wipeW) / 2;
    if (align === 'right') {
      x = inner.x + inner.width - wipeW;
    } else if (align === 'left') {
      x = inner.x;
    }
    page.drawRectangle({
      x,
      y: inner.y + (inner.height - wipeH) / 2,
      width: wipeW,
      height: wipeH,
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });
    return;
  }

  // Full replace: hug the cell; enlarge slightly when source has descenders.
  const cover = coverPdfRectInsideCell(rect, {
    text: source,
    fontSizePt: fontSize ?? rect.height * 0.7,
  });
  page.drawRectangle({
    x: cover.x,
    y: cover.y,
    width: cover.width,
    height: cover.height,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  });
}

function drawTextInRect(
  pdfDoc: PDFDocument,
  font: PDFFont,
  rect: PdfFieldRect,
  text: string,
  options?: {
    whiteout?: boolean;
    sourceText?: string;
    fontSize?: number;
    align?: PdfFormField['align'];
    bold?: boolean;
  }
): void {
  const trimmed = text.trim();
  if (!trimmed && !options?.whiteout) {
    return;
  }

  const pages = pdfDoc.getPages();
  const page = pages[rect.pageIndex];
  if (!page) {
    return;
  }

  const align = options?.align ?? 'left';

  if (options?.whiteout) {
    whiteoutRect(page, rect, options.sourceText ?? '', align, options.fontSize);
  }

  if (!trimmed) {
    return;
  }

  const size = resolveFontSize(rect, options?.fontSize);
  const textWidth = font.widthOfTextAtSize(trimmed, size);
  const rightPad = 1.6;
  const leftPad = 1.4;

  let x = rect.x + leftPad;
  if (align === 'right') {
    x = rect.x + rect.width - rightPad - textWidth;
  } else if (align === 'center') {
    x = rect.x + (rect.width - textWidth) / 2;
  }

  // Allow slight overflow rather than shrinking (clipped by cell visually in viewers).
  const drawX = x;
  // Match typical table baseline (slightly below optical center).
  const drawY = rect.y + Math.max(0.6, (rect.height - size) * 0.42);
  const color = rgb(0, 0, 0);

  page.drawText(trimmed, {
    x: drawX,
    y: drawY,
    size,
    font,
    color,
  });

  if (options?.bold) {
    const stroke = Math.max(0.18, size * 0.028);
    page.drawText(trimmed, {
      x: drawX + stroke,
      y: drawY,
      size,
      font,
      color,
    });
  }
}

/**
 * Draw custom/overlay field values and free overlays onto a PDF.
 * Native AcroForm values should be applied separately via applyFormFieldValues.
 */
export async function drawDocumentOverlays(
  pdfBytes: Uint8Array,
  document: Document
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const defaultFontId = normalizeOverlayFontId(
    document.overlayFontFamily ?? DEFAULT_OVERLAY_FONT
  );
  const fontCache = new Map<'sans' | 'serif' | 'helvetica', PDFFont>();

  const fontFor = async (id: PdfOverlayFontId | 'helvetica'): Promise<PDFFont> => {
    if (id === 'helvetica') {
      const cached = fontCache.get('helvetica');
      if (cached) {
        return cached;
      }
      const embedded = await pdfDoc.embedFont(StandardFonts.Helvetica);
      fontCache.set('helvetica', embedded);
      return embedded;
    }

    const kind = overlayFontPdfKind(id);
    const cached = fontCache.get(kind);
    if (cached) {
      return cached;
    }
    const embedded = await embedUnicodeFont(pdfDoc, kind);
    fontCache.set(kind, embedded);
    return embedded;
  };

  const fields = document.fields ?? {};
  const formFields = document.formFields ?? [];

  for (const field of formFields) {
    if (field.origin === 'acroform') {
      continue;
    }

    // Legacy imports without origin: treat as acroform when flag is set.
    if (!field.origin && document.hasNativeAcroForm) {
      continue;
    }

    const rect = field.rect;
    if (!rect) {
      continue;
    }

    const value = fields[field.name] ?? field.value ?? '';
    const source = field.sourceText?.trim() ?? '';
    const trimmed = value.trim();
    const display = formatOverlayDisplayValue(trimmed, {
      align: field.align,
      sourceText: source,
    });

    // Unchanged PDF text — nothing to redraw.
    if (source && (trimmed === source || numericValuesEqual(trimmed, source))) {
      continue;
    }

    const amountLike = isLatinAmountText(display || source);
    const font = amountLike
      ? await fontFor('helvetica')
      : await fontFor(
          normalizeOverlayFontId(
            field.fontFamily ?? document.overlayFontFamily ?? DEFAULT_OVERLAY_FONT
          )
        );

    if (field.type === 'checkbox') {
      if (isCheckboxChecked(value)) {
        drawTextInRect(pdfDoc, font, rect, 'X', {
          whiteout: Boolean(source),
          sourceText: source,
          fontSize: field.fontSize ?? rect.height * 0.7,
          align: 'center',
        });
      }
      continue;
    }

    drawTextInRect(pdfDoc, font, rect, display, {
      // Only cover when replacing existing printed glyphs (dash / old value).
      whiteout: Boolean(source) && !numericValuesEqual(trimmed, source),
      sourceText: source,
      fontSize: field.fontSize,
      align: field.align ?? (amountLike ? 'right' : 'left'),
      bold: resolveOverlayBold(field, display || source),
    });
  }

  const overlays: PdfOverlayItem[] = document.overlays ?? [];
  const overlayFont = await fontFor(defaultFontId);
  for (const overlay of overlays) {
    const linkedField = overlay.fieldName
      ? formFields.find((field) => field.name === overlay.fieldName)
      : undefined;

    // Field-backed overlays with custom geometry are drawn above via formFields.
    if (linkedField?.rect && linkedField.origin !== 'acroform') {
      continue;
    }

    if (linkedField?.origin === 'acroform') {
      continue;
    }

    const text =
      overlay.fieldName != null ? (fields[overlay.fieldName] ?? overlay.text) : overlay.text;

    drawTextInRect(
      pdfDoc,
      overlayFont,
      {
        pageIndex: overlay.pageIndex,
        x: overlay.x,
        y: overlay.y,
        width: overlay.width,
        height: overlay.height,
      },
      text,
      { fontSize: overlay.fontSize }
    );
  }

  return pdfDoc.save();
}
