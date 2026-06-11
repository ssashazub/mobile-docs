import type { PdfLayout } from '@/types/template';
import type { t } from '@/i18n';

type TranslationKey = Parameters<typeof t>[0];

const PDF_LAYOUT_LABEL_KEYS: Record<PdfLayout, TranslationKey> = {
  classic: 'templates.pdfLayoutClassic',
  minimal: 'templates.pdfLayoutMinimal',
  formal: 'templates.pdfLayoutFormal',
  compact: 'templates.pdfLayoutCompact',
  modern: 'templates.pdfLayoutModern',
  elegant: 'templates.pdfLayoutElegant',
  bold: 'templates.pdfLayoutBold',
  sidebar: 'templates.pdfLayoutSidebar',
};

export function getPdfLayoutLabelKey(layout: PdfLayout): TranslationKey {
  return PDF_LAYOUT_LABEL_KEYS[layout];
}
