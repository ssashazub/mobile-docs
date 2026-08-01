import type { FieldInputKind } from '@/types/field-validation';
import type { TemplateIcon } from '@/constants/template-icons';
import type { PdfFieldRect } from '@/types/document';

export type { TemplateIcon, TemplateIconKind, TemplateSymbolId } from '@/constants/template-icons';

export type TemplateKind = 'html' | 'pdf-backed';

export type TemplateField = {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  kind?: FieldInputKind;
  rect?: PdfFieldRect;
};

import type { PdfStyleDesign } from '@/types/pdf-style-design';

export type PdfLayout =
  | 'classic'
  | 'minimal'
  | 'formal'
  | 'compact'
  | 'modern'
  | 'elegant'
  | 'bold'
  | 'sidebar';

export type PdfStyle = {
  layout: PdfLayout | 'custom';
  showFooter: boolean;
  showDate: boolean;
  design?: Partial<PdfStyleDesign>;
  savedStyleId?: string;
  savedStyleName?: string;
};

export type DocumentTemplate = {
  id: string;
  title: string;
  icon: TemplateIcon;
  /** @deprecated Synced from `icon` for PDF export compatibility */
  emoji?: string;
  accentColor: string;
  gradientEnd: string;
  fields: TemplateField[];
  pdfStyle?: PdfStyle;
  kind?: TemplateKind;
  sourcePdfUri?: string;
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt: string;
};
