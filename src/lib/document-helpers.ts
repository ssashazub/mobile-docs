import { t } from '@/i18n';
import { getTemplateById } from '@/lib/template-storage';
import { normalizePdfStyle } from '@/lib/template-helpers';
import type { Document } from '@/types/document';
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
  createdAt: string;
};

export function normalizeDocument(raw: LegacyDocument): Document {
  const templateId = raw.templateId ?? raw.type ?? 'report';

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
    createdAt: new Date().toISOString(),
  };
}

export async function getDocumentTemplateLabel(templateId: string): Promise<string> {
  const template = await getTemplateById(templateId);
  return template?.title ?? t('document.title');
}
