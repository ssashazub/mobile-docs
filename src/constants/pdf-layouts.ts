import type { PdfLayout } from '@/types/template';
import type { PdfStyleDesign } from '@/types/pdf-style-design';

export const PDF_LAYOUTS: PdfLayout[] = [
  'classic',
  'minimal',
  'formal',
  'compact',
  'modern',
  'elegant',
  'bold',
  'sidebar',
];

export const DEFAULT_PDF_STYLE = {
  layout: 'classic' as PdfLayout,
  showFooter: true,
  showDate: true,
};

export const DEFAULT_PDF_DESIGN: PdfStyleDesign = {
  headerStyle: 'gradient',
  fieldsStyle: 'sections',
  fontFamily: 'sans',
  showEmoji: true,
  showFieldBorders: false,
  denseSpacing: false,
};

export const LAYOUT_DESIGN_PRESETS: Record<PdfLayout, PdfStyleDesign> = {
  classic: {
    headerStyle: 'gradient',
    fieldsStyle: 'sections',
    fontFamily: 'sans',
    showEmoji: true,
    showFieldBorders: false,
    denseSpacing: false,
  },
  minimal: {
    headerStyle: 'line',
    fieldsStyle: 'list',
    fontFamily: 'sans',
    showEmoji: true,
    showFieldBorders: false,
    denseSpacing: false,
  },
  formal: {
    headerStyle: 'line',
    fieldsStyle: 'table',
    fontFamily: 'serif',
    showEmoji: false,
    showFieldBorders: true,
    denseSpacing: false,
  },
  compact: {
    headerStyle: 'banner',
    fieldsStyle: 'cards',
    fontFamily: 'sans',
    showEmoji: true,
    showFieldBorders: true,
    denseSpacing: true,
  },
  modern: {
    headerStyle: 'gradient',
    fieldsStyle: 'cards',
    fontFamily: 'sans',
    showEmoji: true,
    showFieldBorders: true,
    denseSpacing: false,
  },
  elegant: {
    headerStyle: 'minimal',
    fieldsStyle: 'list',
    fontFamily: 'serif',
    showEmoji: true,
    showFieldBorders: false,
    denseSpacing: false,
  },
  bold: {
    headerStyle: 'solid',
    fieldsStyle: 'sections',
    fontFamily: 'sans',
    showEmoji: true,
    showFieldBorders: false,
    denseSpacing: false,
  },
  sidebar: {
    headerStyle: 'sidebar',
    fieldsStyle: 'columns',
    fontFamily: 'sans',
    showEmoji: true,
    showFieldBorders: true,
    denseSpacing: true,
  },
};

export const BUILTIN_PDF_STYLES: Record<string, Partial<typeof DEFAULT_PDF_STYLE>> = {
  contract: { layout: 'formal' },
  invoice: { layout: 'formal' },
  report: { layout: 'minimal' },
  act: { layout: 'classic' },
};
