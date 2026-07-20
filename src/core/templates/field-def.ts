import type { AppLocale } from '@/i18n/types';
import type { TemplateField } from '@/types/template';
import type { LocalizedFieldText, TemplateFieldDefinition } from '@/core/templates/types';

const FALLBACK_LOCALE: AppLocale = 'en';

export function defineField(
  key: string,
  locales: Record<AppLocale, LocalizedFieldText>,
  options?: Omit<TemplateFieldDefinition, 'key' | 'locales'>
): TemplateFieldDefinition {
  return { key, locales, ...options };
}

export function resolveTemplateFields(
  definitions: TemplateFieldDefinition[],
  locale: AppLocale
): TemplateField[] {
  return definitions.map((definition) => {
    const text =
      definition.locales[locale] ??
      definition.locales[FALLBACK_LOCALE] ??
      Object.values(definition.locales)[0];

    return {
      key: definition.key,
      label: text.label,
      placeholder: text.placeholder,
      required: definition.required,
      multiline: definition.multiline,
      kind: definition.kind,
    };
  });
}

/** Частые ключи полей - используйте для единообразия между шаблонами. */
export const CommonFieldKeys = {
  title: 'title',
  client: 'client',
  amount: 'amount',
  startDate: 'startDate',
  endDate: 'endDate',
  dueDate: 'dueDate',
  provider: 'provider',
  subject: 'subject',
  terms: 'terms',
} as const;
