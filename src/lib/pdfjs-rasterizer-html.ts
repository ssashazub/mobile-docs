export type RasterPageMessage =
  | { type: 'ready' }
  | { type: 'progress'; pageIndex: number; total: number }
  | {
      type: 'page';
      pageIndex: number;
      total: number;
      widthPt: number;
      heightPt: number;
      imageWidth?: number;
      imageHeight?: number;
      dataUri: string;
    }
  | {
      type: 'detectedFields';
      fields: Array<{
        pageIndex: number;
        x: number;
        y: number;
        width: number;
        height: number;
        label: string;
        value?: string;
        fontSize?: number;
        bold?: boolean;
        align?: 'left' | 'center' | 'right';
      }>;
    }
  | { type: 'done'; total: number }
  | { type: 'error'; message: string };

export type DetectedPdfField = {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  /** Existing text already drawn in the cell (for edit-in-place). */
  value?: string;
  /** PDF font size in points. */
  fontSize?: number;
  /** Source glyphs used a bold face. */
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
};
