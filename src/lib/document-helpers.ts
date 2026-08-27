import { IMPORTED_FORM_TEMPLATE_ID } from '@/constants/imported-pdf';
import { DEFAULT_OVERLAY_FONT, normalizeOverlayFontId } from '@/constants/overlay-fonts';
import { isCheckboxChecked } from '@/lib/pdf-form';
import { normalizePdfStyle } from '@/lib/template-helpers';
import type { Document, DocumentSource, PdfFormField } from '@/types/document';
import type { DocumentTemplate, PdfStyle } from '@/types/template';

type LegacyDocument = {
  id: number;
  title: string;
  client?: string;
  description?: string;
  templateId?: string;
  type?: string;
  fields?: Record<string, string>;
  pdfStyle?: Partial<PdfStyle>;
  source?: DocumentSource;
  originalPdfUri?: string;
  formFields?: PdfFormField[];
  overlays?: Document['overlays'];
  hasNativeAcroForm?: boolean;
  importedFileName?: string;
  overlayFontFamily?: Document['overlayFontFamily'];
  createdAt: string;
};

export function normalizeDocument(raw: LegacyDocument): Document {
  const templateId = raw.templateId ?? raw.type ?? 'report';
  const formFields = raw.formFields?.map((field) => ({
    ...field,
    value:
      field.type === 'checkbox'
        ? isCheckboxChecked(field.value)
          ? 'true'
          : 'false'
        : field.value,
  }));

  return {
    id: raw.id,
    title: raw.title,
    templateId,
    client: raw.client ?? raw.fields?.client ?? '',
    description: raw.description ?? '',
    fields: raw.fields ?? {
      title: raw.title,
      client: raw.client ?? '',
    },
    pdfStyle: raw.pdfStyle ? normalizePdfStyle(raw.pdfStyle, templateId) : undefined,
    source: raw.source ?? 'template',
    originalPdfUri: raw.originalPdfUri,
    formFields,
    overlays: raw.overlays ?? [],
    hasNativeAcroForm:
      raw.hasNativeAcroForm ??
      (raw.source === 'imported-form' && (formFields?.length ?? 0) > 0),
    importedFileName: raw.importedFileName,
    overlayFontFamily:
      raw.source === 'imported-form' || raw.overlayFontFamily
        ? normalizeOverlayFontId(raw.overlayFontFamily)
        : undefined,
    createdAt: raw.createdAt,
  };
}

export function getNextDocumentId(documents: Document[]): number {
  if (documents.length === 0) {
    return 1;
  }

  return Math.max(...documents.map((document) => document.id)) + 1;
}

export function buildDocumentFromFields(
  template: DocumentTemplate,
  fields: Record<string, string>,
  id: number,
  pdfStyle?: PdfStyle
): Document {
  const title = fields.title?.trim() || template.title;
  const client = fields.client?.trim() || '';
  const firstMultiline = template.fields.find((field) => field.multiline && fields[field.key]?.trim());
  const description =
    (firstMultiline ? fields[firstMultiline.key] : fields[template.fields[1]?.key])?.trim().slice(0, 120) ||
    template.title;

  return {
    id,
    title,
    templateId: template.id,
    client,
    description,
    fields,
    pdfStyle,
    source: 'template',
    createdAt: new Date().toISOString(),
  };
}

export function buildImportedFormDocument(
  id: number,
  fileName: string,
  formFields: PdfFormField[],
  fields: Record<string, string>,
  originalPdfUri: string,
  options?: {
    hasNativeAcroForm?: boolean;
    templateId?: string;
    overlays?: Document['overlays'];
  }
): Document {
  const firstValue = formFields.map((field) => fields[field.name]?.trim()).find(Boolean);
  const title = firstValue || fileName.replace(/\.pdf$/i, '') || fileName;
  const hasNativeAcroForm = options?.hasNativeAcroForm ?? formFields.length > 0;

  return {
    id,
    title,
    templateId: options?.templateId ?? IMPORTED_FORM_TEMPLATE_ID,
    client: fields.client?.trim() ?? '',
    description: fileName,
    fields,
    formFields,
    overlays: options?.overlays ?? [],
    hasNativeAcroForm,
    source: 'imported-form',
    originalPdfUri,
    importedFileName: fileName,
    overlayFontFamily: DEFAULT_OVERLAY_FONT,
    createdAt: new Date().toISOString(),
  };
}

export function buildDocumentFromPdfBackedTemplate(
  template: DocumentTemplate,
  fields: Record<string, string>,
  id: number,
  originalPdfUri: string,
  fileName?: string
): Document {
  const formFields: PdfFormField[] = template.fields.map((field) => ({
    name: field.key,
    label: field.label,
    type: 'text',
    value: fields[field.key] ?? '',
    inputKind: field.kind,
    rect: field.rect,
    origin: 'custom',
    fontFamily: DEFAULT_OVERLAY_FONT,
  }));

  return buildImportedFormDocument(
    id,
    fileName ?? `${template.title}.pdf`,
    formFields,
    fields,
    originalPdfUri,
    {
      hasNativeAcroForm: false,
      templateId: template.id,
    }
  );
}
