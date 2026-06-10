import { useMemo } from 'react';

import {
  getAppLocale,
  getDateLocale,
  getTranslations,
  pluralDocuments,
  t,
} from '@/i18n';
import type { AppLocale } from '@/i18n/types';

export function useI18n() {
  const locale = getAppLocale();

  return useMemo(
    () => ({
      locale,
      t: (key: Parameters<typeof t>[0], params?: Record<string, string>) => t(key, params, locale),
      strings: getTranslations(locale),
      dateLocale: getDateLocale(locale),
      pluralDocuments: (count: number) => pluralDocuments(count, locale),
    }),
    [locale]
  );
}

export type I18n = ReturnType<typeof useI18n> & { locale: AppLocale };
