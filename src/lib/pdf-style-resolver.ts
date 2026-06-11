import {
  DEFAULT_PDF_DESIGN,
  LAYOUT_DESIGN_PRESETS,
} from '@/constants/pdf-layouts';
import type { PdfStyle } from '@/types/template';
import type { PdfStyleDesign, ResolvedPdfDesign } from '@/types/pdf-style-design';

export function mergePdfDesign(
  base: PdfStyleDesign,
  overrides?: Partial<PdfStyleDesign>
): PdfStyleDesign {
  if (!overrides) {
    return { ...base };
  }

  return {
    headerStyle: overrides.headerStyle ?? base.headerStyle,
    fieldsStyle: overrides.fieldsStyle ?? base.fieldsStyle,
    fontFamily: overrides.fontFamily ?? base.fontFamily,
    accentColor: overrides.accentColor ?? base.accentColor,
    gradientEnd: overrides.gradientEnd ?? base.gradientEnd,
    showEmoji: overrides.showEmoji ?? base.showEmoji,
    showFieldBorders: overrides.showFieldBorders ?? base.showFieldBorders,
    denseSpacing: overrides.denseSpacing ?? base.denseSpacing,
  };
}

export function resolvePdfDesign(
  pdfStyle: PdfStyle,
  templateAccent: string,
  templateGradient: string
): ResolvedPdfDesign {
  const preset =
    pdfStyle.layout === 'custom'
      ? DEFAULT_PDF_DESIGN
      : LAYOUT_DESIGN_PRESETS[pdfStyle.layout];

  const merged = mergePdfDesign(preset, pdfStyle.design);

  return {
    ...merged,
    accent: merged.accentColor ?? templateAccent,
    gradientEnd: merged.gradientEnd ?? templateGradient,
  };
}

export function pdfStyleFromSavedStyle(saved: {
  layout: PdfStyle['layout'];
  showFooter: boolean;
  showDate: boolean;
  design: PdfStyleDesign;
  id: string;
  name: string;
}): PdfStyle {
  return {
    layout: saved.layout,
    showFooter: saved.showFooter,
    showDate: saved.showDate,
    design: saved.design,
    savedStyleId: saved.id,
    savedStyleName: saved.name,
  };
}

export function createDefaultCustomDesign(): PdfStyleDesign {
  return { ...DEFAULT_PDF_DESIGN };
}
