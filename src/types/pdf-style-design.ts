export type PdfHeaderStyle = 'gradient' | 'solid' | 'line' | 'minimal' | 'banner' | 'sidebar';

export type PdfFieldsStyle = 'sections' | 'list' | 'table' | 'cards' | 'columns';

export type PdfFontFamily = 'sans' | 'serif' | 'mono';

export type PdfStyleDesign = {
  headerStyle: PdfHeaderStyle;
  fieldsStyle: PdfFieldsStyle;
  fontFamily: PdfFontFamily;
  accentColor?: string;
  gradientEnd?: string;
  showEmoji: boolean;
  showFieldBorders: boolean;
  denseSpacing: boolean;
};

export type SavedPdfStyle = {
  id: string;
  name: string;
  layout: import('@/types/template').PdfLayout | 'custom';
  showFooter: boolean;
  showDate: boolean;
  design: PdfStyleDesign;
  createdAt: string;
  updatedAt: string;
};

export type ResolvedPdfDesign = PdfStyleDesign & {
  accent: string;
  gradientEnd: string;
};
