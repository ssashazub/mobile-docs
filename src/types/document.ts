import type { PdfStyle } from '@/types/template';

export type Document = {
  id: number;
  title: string;
  templateId: string;
  client: string;
  description: string;
  fields: Record<string, string>;
  pdfStyle?: PdfStyle;
  createdAt: string;
};
