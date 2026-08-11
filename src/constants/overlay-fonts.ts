import { Platform } from 'react-native';

/** Fonts available when filling text onto an imported PDF. */
export type PdfOverlayFontId = 'times' | 'arial' | 'georgia' | 'courier';

export const DEFAULT_OVERLAY_FONT: PdfOverlayFontId = 'times';

export type OverlayFontOption = {
  id: PdfOverlayFontId;
  /** User-facing name (Times New Roman, Arial, …). */
  label: string;
  /** Embedded PDF font bucket. */
  pdfKind: 'sans' | 'serif';
};

export const OVERLAY_FONT_OPTIONS: OverlayFontOption[] = [
  { id: 'times', label: 'Times New Roman', pdfKind: 'serif' },
  { id: 'arial', label: 'Arial', pdfKind: 'sans' },
  { id: 'georgia', label: 'Georgia', pdfKind: 'serif' },
  { id: 'courier', label: 'Courier New', pdfKind: 'sans' },
];

export function isPdfOverlayFontId(value: unknown): value is PdfOverlayFontId {
  return (
    value === 'times' || value === 'arial' || value === 'georgia' || value === 'courier'
  );
}

export function normalizeOverlayFontId(value: unknown): PdfOverlayFontId {
  return isPdfOverlayFontId(value) ? value : DEFAULT_OVERLAY_FONT;
}

/** React Native `fontFamily` for on-screen overlay text. */
export function resolveOverlayRnFontFamily(id: PdfOverlayFontId): string {
  if (Platform.OS === 'ios') {
    switch (id) {
      case 'times':
        return 'Times New Roman';
      case 'arial':
        // Helvetica is closer to printed Ukrainian form digits than Arial MT.
        return 'Helvetica';
      case 'georgia':
        return 'Georgia';
      case 'courier':
        return 'Courier New';
    }
  }

  // Android / web: bundled Unicode faces (Cyrillic-safe).
  switch (id) {
    case 'times':
    case 'georgia':
      return 'NotoSerif';
    case 'courier':
      return Platform.OS === 'android' ? 'monospace' : 'Courier New';
    case 'arial':
    default:
      return 'NotoSans';
  }
}

export function overlayFontPdfKind(id: PdfOverlayFontId): 'sans' | 'serif' {
  return OVERLAY_FONT_OPTIONS.find((option) => option.id === id)?.pdfKind ?? 'serif';
}

export function overlayFontLabel(id: PdfOverlayFontId): string {
  return OVERLAY_FONT_OPTIONS.find((option) => option.id === id)?.label ?? 'Times New Roman';
}
