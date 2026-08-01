import { IMPORTED_FORM_DISPLAY, IMPORTED_FORM_TEMPLATE_ID } from '@/constants/imported-pdf';
import { DEFAULT_TEMPLATE_ICON, type TemplateIcon } from '@/constants/template-icons';
import { normalizeTemplateIcon } from '@/lib/template-icon';
import type { Document } from '@/types/document';
import type { DocumentTemplate, TemplateField } from '@/types/template';

export function isImportedFormDocument(document: Document): boolean {
  return document.source === 'imported-form';
}

/** Document is tied to an in-app template (created or restored), not a plain external PDF. */
export function isAppTemplateDocument(document: Document): boolean {
  return (
    Boolean(document.templateId) && document.templateId !== IMPORTED_FORM_TEMPLATE_ID
  );
}

/** External PDF import without an app template (flat / AcroForm file). */
export function isExternalPdfImport(document: Document): boolean {
  return isImportedFormDocument(document) && !isAppTemplateDocument(document);
}

export function getDocumentDisplayInfo(
  document: Document,
  template: DocumentTemplate | null | undefined
): {
  icon: TemplateIcon;
  title: string;
  accentColor: string;
  gradientEnd: string;
  fields: TemplateField[];
} {
  // PDF-backed / restored app templates keep their template branding.
  if (
    isImportedFormDocument(document) &&
    template &&
    document.templateId !== IMPORTED_FORM_TEMPLATE_ID
  ) {
    const icon = normalizeTemplateIcon(template);
    return {
      icon,
      title: template.title,
      accentColor: template.accentColor,
      gradientEnd: template.gradientEnd,
      fields: template.fields,
    };
  }

  if (isImportedFormDocument(document) && document.formFields) {
    return {
      icon: IMPORTED_FORM_DISPLAY.icon,
      title: IMPORTED_FORM_DISPLAY.title,
      accentColor: IMPORTED_FORM_DISPLAY.accentColor,
      gradientEnd: IMPORTED_FORM_DISPLAY.gradientEnd,
      fields: document.formFields.map((field) => ({
        key: field.name,
        label: field.label,
        multiline: field.type === 'text' && (field.value?.length ?? 0) > 80,
      })),
    };
  }

  if (!template) {
    return {
      icon: DEFAULT_TEMPLATE_ICON,
      title: document.templateId,
      accentColor: '#4f46e5',
      gradientEnd: '#6366f1',
      fields: Object.keys(document.fields).map((key) => ({
        key,
        label: key,
      })),
    };
  }

  const icon = normalizeTemplateIcon(template);

  return {
    icon,
    title: template.title,
    accentColor: template.accentColor,
    gradientEnd: template.gradientEnd,
    fields: template.fields,
  };
}

export function resolveTemplateForDocument(
  document: Document,
  templatesMap: Record<string, DocumentTemplate>
): DocumentTemplate | null {
  if (document.templateId === IMPORTED_FORM_TEMPLATE_ID) {
    return null;
  }
  return templatesMap[document.templateId] ?? null;
}
