import { BUILTIN_PDF_STYLES, DEFAULT_PDF_STYLE } from '@/constants/pdf-layouts';
import type { AppLocale } from '@/i18n/types';
import { getAppLocale } from '@/i18n';
import { normalizeTemplate, normalizePdfStyle } from '@/lib/template-helpers';
import type { DocumentTemplate } from '@/types/template';
import { resolveTemplateFields } from '@/core/templates/field-def';
import type { BuiltinTemplateDefinition } from '@/core/templates/types';
import { BUILTIN_TEMPLATE_DEFINITIONS } from '@/core/templates/definitions';

export function buildBuiltinTemplate(
  definition: BuiltinTemplateDefinition,
  locale: AppLocale
): DocumentTemplate {
  const now = new Date().toISOString();
  const localized = definition.locales[locale] ?? definition.locales.en;

  return normalizeTemplate({
    id: definition.id,
    title: localized.title,
    icon: definition.icon,
    accentColor: definition.accentColor,
    gradientEnd: definition.gradientEnd,
    pdfStyle: normalizePdfStyle(BUILTIN_PDF_STYLES[definition.id] ?? DEFAULT_PDF_STYLE, definition.id),
    isBuiltIn: true,
    createdAt: now,
    updatedAt: now,
    fields: resolveTemplateFields(definition.fields, locale),
  });
}

export function getBuiltinTemplates(locale: AppLocale = getAppLocale()): DocumentTemplate[] {
  return BUILTIN_TEMPLATE_DEFINITIONS.map((definition) => buildBuiltinTemplate(definition, locale));
}

export function getBuiltinTemplateDefinition(templateId: string): BuiltinTemplateDefinition | null {
  return BUILTIN_TEMPLATE_DEFINITIONS.find((definition) => definition.id === templateId) ?? null;
}
