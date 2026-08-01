import type { PdfStyle } from '@/types/template';
import type { FieldInputKind } from '@/types/field-validation';

export type DocumentSource = 'template' | 'imported-form';

export type PdfFormFieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'other';

export type PdfFieldOrigin = 'acroform' | 'custom' | 'overlay' | 'detected';

/** PDF user-space rectangle (origin bottom-left, units in points). */
export type PdfFieldRect = {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfFormField = {
  name: string;
  label: string;
  type: PdfFormFieldType;
  value: string;
  options?: string[];
  inputKind?: FieldInputKind;
  rect?: PdfFieldRect;
  origin?: PdfFieldOrigin;
  /** Text already present in the PDF at this rect (edit-in-place seed). */
  sourceText?: string;
  /** PDF font size in points for in-cell rendering (Smallpdf-like). */
  fontSize?: number;
  /** Original PDF text was bold — keep weight when editing/exporting. */
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
};

export type PdfOverlayItem = {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  /** When set, text is read/written via `document.fields[fieldName]`. */
  fieldName?: string;
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
  overlays?: PdfOverlayItem[];
  hasNativeAcroForm?: boolean;
  importedFileName?: string;
  createdAt: string;
};
