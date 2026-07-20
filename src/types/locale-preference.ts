import type { AppLocale } from '@/i18n/types';

export type LocalePreference = 'system' | AppLocale;

export const LOCALE_PREFERENCES: LocalePreference[] = ['system', 'en', 'ru', 'uk'];

export const APP_LOCALES: AppLocale[] = ['en', 'ru', 'uk'];
