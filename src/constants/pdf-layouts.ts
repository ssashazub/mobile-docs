import type { PdfLayout } from '@/types/template';

export const PDF_LAYOUTS: PdfLayout[] = ['classic', 'minimal', 'formal', 'compact'];

export const DEFAULT_PDF_STYLE = {
  layout: 'classic' as PdfLayout,
  showFooter: true,
  showDate: true,
};

export const BUILTIN_PDF_STYLES: Record<string, Partial<typeof DEFAULT_PDF_STYLE>> = {
  contract: { layout: 'formal' },
  invoice: { layout: 'formal' },
  report: { layout: 'minimal' },
  act: { layout: 'classic' },
};
