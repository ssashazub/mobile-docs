import type { DocumentTemplate } from '@/types/template';
import type { TemplateIcon } from '@/constants/template-icons';

export const IMPORTED_FORM_TEMPLATE_ID = 'imported_form';

export const IMPORTED_FORM_DISPLAY: Pick<
  DocumentTemplate,
  'id' | 'title' | 'icon' | 'accentColor' | 'gradientEnd'
> = {
  id: IMPORTED_FORM_TEMPLATE_ID,
  title: 'PDF форма',
  icon: { kind: 'symbol', value: 'tray.and.arrow.down' },
  accentColor: '#0f766e',
  gradientEnd: '#14b8a6',
};
