import type { PdfFieldRect, PdfFormField } from '@/types/document';

export type UiRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Convert PDF user-space rect (origin bottom-left) to UI rect (origin top-left). */
export function pdfRectToUi(
  rect: Pick<PdfFieldRect, 'x' | 'y' | 'width' | 'height'>,
  pageHeightPt: number,
  scale: number
): UiRect {
  return {
    left: rect.x * scale,
    top: (pageHeightPt - rect.y - rect.height) * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

/** Convert UI rect (origin top-left) to PDF user-space rect (origin bottom-left). */
export function uiRectToPdf(
  rect: UiRect,
  pageIndex: number,
  pageHeightPt: number,
  scale: number
): PdfFieldRect {
  const width = rect.width / scale;
  const height = rect.height / scale;
  const x = rect.left / scale;
  const y = pageHeightPt - rect.top / scale - height;

  return {
    pageIndex,
    x,
    y,
    width,
    height,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pointInRect(x: number, y: number, rect: UiRect, pad = 0): boolean {
  return (
    x >= rect.left - pad &&
    x <= rect.left + rect.width + pad &&
    y >= rect.top - pad &&
    y <= rect.top + rect.height + pad
  );
}

/**
 * Pick the field under a tap. Prefers the smallest containing rect so dense
 * table cells hit the right row instead of a neighbour with a larger box.
 */
export function pickPdfFieldAtPoint(
  fields: PdfFormField[],
  pageHeightPt: number,
  scale: number,
  x: number,
  y: number
): PdfFormField | null {
  const withUi: { field: PdfFormField; rect: UiRect; area: number }[] = [];

  for (const field of fields) {
    if (!field.rect) {
      continue;
    }
    const rect = pdfRectToUi(field.rect, pageHeightPt, scale);
    withUi.push({
      field,
      rect,
      area: Math.max(1, rect.width) * Math.max(1, rect.height),
    });
  }

  const containing = withUi.filter((item) => pointInRect(x, y, item.rect));
  if (containing.length === 1) {
    return containing[0].field;
  }
  if (containing.length > 1) {
    containing.sort((a, b) => {
      if (a.area !== b.area) {
        return a.area - b.area;
      }
      // Same size: prefer the one whose vertical center is closer to the tap.
      const aCy = a.rect.top + a.rect.height / 2;
      const bCy = b.rect.top + b.rect.height / 2;
      return Math.abs(aCy - y) - Math.abs(bCy - y);
    });
    return containing[0].field;
  }

  // Tiny pad only — dense table rows must not steal a neighbour via large snap.
  const near = withUi
    .filter((item) => pointInRect(x, y, item.rect, 3))
    .sort((a, b) => {
      const aCy = a.rect.top + a.rect.height / 2;
      const bCy = b.rect.top + b.rect.height / 2;
      const aDist = Math.abs(aCy - y) * 2 + Math.abs(a.rect.left + a.rect.width / 2 - x);
      const bDist = Math.abs(bCy - y) * 2 + Math.abs(b.rect.left + b.rect.width / 2 - x);
      if (aDist !== bDist) {
        return aDist - bDist;
      }
      return a.area - b.area;
    });

  return near[0]?.field ?? null;
}
