import type { PdfFieldRect } from '@/types/document';

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
