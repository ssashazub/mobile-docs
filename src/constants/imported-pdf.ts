import type { DocumentTemplate } from '@/types/template';

export const IMPORTED_FORM_TEMPLATE_ID = 'imported_form';

export const IMPORTED_FORM_DISPLAY: Pick<
  DocumentTemplate,
  'id' | 'title' | 'emoji' | 'accentColor' | 'gradientEnd'
> = {
  id: IMPORTED_FORM_TEMPLATE_ID,
  title: 'PDF форма',
  emoji: '📥',
  accentColor: '#0f766e',
  gradientEnd: '#14b8a6',
};
