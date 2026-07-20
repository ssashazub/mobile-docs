import { getLocales } from 'expo-localization';

import { ru } from '@/i18n/locales/ru';
import { uk } from '@/i18n/locales/uk';
import { en } from '@/i18n/locales/en';
import type { AppLocale, TranslationSchema } from '@/i18n/types';
import type { LocalePreference } from '@/types/locale-preference';

const translations: { ru: TranslationSchema; uk: TranslationSchema; en: TranslationSchema } = {
  uk,
  ru,
  en,
};

let localeOverride: LocalePreference = 'system';

export function setLocalePreferenceOverride(preference: LocalePreference): void {
  localeOverride = preference;
}

export function getLocalePreferenceOverride(): LocalePreference {
  return localeOverride;
}

export function getDeviceLocale(): AppLocale {
  const languageCode = getLocales()[0]?.languageCode?.toLowerCase();

  if (languageCode === 'ru') {
    return 'ru';
  }
  if (languageCode === 'uk') {
    return 'uk';
  }

  return 'en';
}

export function resolveAppLocale(preference: LocalePreference = localeOverride): AppLocale {
  if (preference === 'system') {
    return getDeviceLocale();
  }

  return preference;
}

export function getAppLocale(): AppLocale {
  return resolveAppLocale(localeOverride);
}

export function getDateLocale(locale: AppLocale = getAppLocale()): string {
  return locale === 'ru' ? 'ru-RU' : locale === 'uk' ? 'uk-UA' : 'en-US';
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

  if (locale === 'ru' || locale === 'uk') {
    if (mod10 === 1 && mod100 !== 11) return dict.documentsOne;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return dict.documentsFew;
    return dict.documentsMany;
  }

  return count === 1 ? dict.documentsOne : dict.documentsMany;
}
