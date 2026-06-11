import type { FieldInputKind } from '@/types/field-validation';

export type TemplateField = {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  kind?: FieldInputKind;
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
  emoji: string;
  accentColor: string;
  gradientEnd: string;
  fields: TemplateField[];
  pdfStyle?: PdfStyle;
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt: string;
};
