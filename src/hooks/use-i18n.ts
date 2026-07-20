import { useMemo } from 'react';

import { useLocalePreference } from '@/contexts/locale-preference-context';
import {
  getDateLocale,
  getTranslations,
  pluralDocuments,
  resolveAppLocale,
  t,
} from '@/i18n';
import type { AppLocale } from '@/i18n/types';

export function useI18n() {
  const { preference } = useLocalePreference();
  const locale = resolveAppLocale(preference);

  return useMemo(
    () => ({
      locale,
      preference,
      t: (key: Parameters<typeof t>[0], params?: Record<string, string>) => t(key, params, locale),
      strings: getTranslations(locale),
      dateLocale: getDateLocale(locale),
      pluralDocuments: (count: number) => pluralDocuments(count, locale),
    }),
    [locale, preference]
  );
}

export type I18n = ReturnType<typeof useI18n> & { locale: AppLocale };
