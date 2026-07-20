import { Dimensions, Platform } from 'react-native';

/** A4 page metrics for expo-print (72 PPI) and CSS. */
export const PDF_A4 = {
  /** Print raster width in px @ 72 PPI */
  widthPx: 595,
  /** Print raster height in px @ 72 PPI */
  heightPx: 842,
  widthMm: 210,
  heightMm: 297,
  /** Outer page margin in mm */
  marginMm: 12,
  /** Same margin in px @ 72 PPI (~12mm) */
  marginPx: 34,
} as const;

/**
 * Android expo-print lays out an unattached WebView at screen width, then
 * paints that narrow layout onto an A4 page - content sits left at ~60%.
 * Scale HTML so the screen-width layout fills the A4 print width.
 */
export function getAndroidPdfPrintZoom(): number {
  if (Platform.OS !== 'android') {
    return 1;
  }

  const layoutWidth = Dimensions.get('window').width;
  if (!layoutWidth || layoutWidth <= 0) {
    return 1;
  }

  return PDF_A4.widthPx / layoutWidth;
}
