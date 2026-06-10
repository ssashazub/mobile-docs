import { getLocales } from 'expo-localization';

import { ru } from '@/i18n/locales/ru';
import { uk } from '@/i18n/locales/uk';
import type { AppLocale, TranslationSchema } from '@/i18n/types';

const translations: Record<AppLocale, TranslationSchema> = {
  uk,
  ru,
};

export function getAppLocale(): AppLocale {
  const languageCode = getLocales()[0]?.languageCode?.toLowerCase();

  if (languageCode === 'ru') {
    return 'ru';
  }

  return 'uk';
}

export function getDateLocale(locale: AppLocale = getAppLocale()): string {
  return locale === 'ru' ? 'ru-RU' : 'uk-UA';
}

export function getTranslations(locale: AppLocale = getAppLocale()): TranslationSchema {
  return translations[locale];
}

type Path = keyof TranslationSchema | `${keyof TranslationSchema}.${string}`;

function getNestedValue(object: Record<string, unknown>, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, object);

  return typeof value === 'string' ? value : undefined;
}

export function t(
  key: Path,
  params?: Record<string, string>,
  locale: AppLocale = getAppLocale()
): string {
  const dictionary = translations[locale] as unknown as Record<string, unknown>;
  let value = getNestedValue(dictionary, key) ?? key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(`{{${paramKey}}}`, paramValue);
    }
  }

  return value;
}

export function pluralDocuments(count: number, locale: AppLocale = getAppLocale()): string {
  const dict = translations[locale].home;
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (locale === 'ru') {
    if (mod10 === 1 && mod100 !== 11) return dict.documentsOne;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return dict.documentsFew;
    return dict.documentsMany;
  }

  if (count === 1) return dict.documentsOne;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return dict.documentsFew;
  return dict.documentsMany;
}
