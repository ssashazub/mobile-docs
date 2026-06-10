export type TemplateField = {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
};

export type PdfLayout = 'classic' | 'minimal' | 'formal' | 'compact';

export type PdfStyle = {
  layout: PdfLayout;
  showFooter: boolean;
  showDate: boolean;
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
