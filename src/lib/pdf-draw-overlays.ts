import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';

import { isCheckboxChecked } from '@/lib/pdf-form';
import { embedUnicodeFont } from '@/lib/pdf-unicode-font';
import type { Document, PdfFieldRect, PdfFormField, PdfOverlayItem } from '@/types/document';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Pick a font size that fits both the cell height and the text width. */
function fitFontSizeToRect(
  font: PDFFont,
  text: string,
  rect: PdfFieldRect,
  preferred?: number
): number {
  const maxByHeight = clamp(rect.height * 0.62, 5, 12);
  let size = clamp(preferred ?? maxByHeight, 5, maxByHeight);
  const maxWidth = Math.max(4, rect.width - 3);

  while (size > 5 && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.25;
  }

  return size;
}

function drawTextInRect(
  pdfDoc: PDFDocument,
  font: PDFFont,
  rect: PdfFieldRect,
  text: string,
  options?: {
    whiteout?: boolean;
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

  if (options?.whiteout) {
    page.drawRectangle({
      x: rect.x + 0.4,
      y: rect.y + 0.4,
      width: Math.max(1, rect.width - 0.8),
      height: Math.max(1, rect.height - 0.8),
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });
  }

  if (!trimmed) {
    return;
  }

  const size = fitFontSizeToRect(font, trimmed, rect, options?.fontSize);
  const textWidth = font.widthOfTextAtSize(trimmed, size);
  const maxWidth = Math.max(4, rect.width - 3);
  const align = options?.align ?? 'left';

  let x = rect.x + 1.5;
  if (align === 'right') {
    x = rect.x + rect.width - 1.5 - Math.min(textWidth, maxWidth);
  } else if (align === 'center') {
    x = rect.x + (rect.width - Math.min(textWidth, maxWidth)) / 2;
  }

  const drawX = Math.max(rect.x + 0.5, x);
  const drawY = rect.y + Math.max(0.8, (rect.height - size) / 2);
  const color = rgb(0.05, 0.05, 0.05);

  page.drawText(trimmed, {
    x: drawX,
    y: drawY,
    size,
    font,
    color,
    maxWidth,
  });

  // Faux-bold: second pass with a slight offset (no separate bold TTF required).
  if (options?.bold) {
    const stroke = Math.max(0.22, size * 0.035);
    page.drawText(trimmed, {
      x: drawX + stroke,
      y: drawY,
      size,
      font,
      color,
      maxWidth,
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
  const font = await embedUnicodeFont(pdfDoc);
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

    // Unchanged PDF text — nothing to redraw.
    if (source && trimmed === source) {
      continue;
    }

    if (field.type === 'checkbox') {
      if (isCheckboxChecked(value)) {
        drawTextInRect(pdfDoc, font, rect, 'X', {
          whiteout: Boolean(source),
          fontSize: field.fontSize ?? rect.height * 0.7,
          align: 'center',
        });
      }
      continue;
    }

    drawTextInRect(pdfDoc, font, rect, value, {
      // Cover original PDF glyphs when replaced OR explicitly cleared.
      whiteout: Boolean(source) ? trimmed !== source : trimmed.length > 0,
      fontSize: field.fontSize,
      align: field.align,
      bold: field.bold,
    });
  }

  const overlays: PdfOverlayItem[] = document.overlays ?? [];
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
      font,
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
