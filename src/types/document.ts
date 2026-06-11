import type { PdfStyle } from '@/types/template';
import type { FieldInputKind } from '@/types/field-validation';

export type DocumentSource = 'template' | 'imported-form';

export type PdfFormFieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'other';

export type PdfFormField = {
  name: string;
  label: string;
  type: PdfFormFieldType;
  value: string;
  options?: string[];
  inputKind?: FieldInputKind;
};

export type Document = {
  id: number;
  title: string;
  templateId: string;
  client: string;
  description: string;
  fields: Record<string, string>;
  pdfStyle?: PdfStyle;
  source?: DocumentSource;
  originalPdfUri?: string;
  formFields?: PdfFormField[];
  importedFileName?: string;
  createdAt: string;
};
