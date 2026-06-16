import { getAppLocale } from '@/i18n';
import type { AppLocale } from '@/i18n/types';
import { getBuiltinTemplates } from '@/core/templates/registry';
import type { DocumentTemplate } from '@/types/template';

/**
 * @deprecated Используйте getBuiltinTemplates() из @/core/templates
 */
export function getDefaultTemplates(locale: AppLocale = getAppLocale()): DocumentTemplate[] {
  return getBuiltinTemplates(locale);
}

/** @deprecated Use getDefaultTemplates() */
export const DEFAULT_TEMPLATES = getDefaultTemplates();
