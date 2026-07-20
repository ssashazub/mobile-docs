import AsyncStorage from '@react-native-async-storage/async-storage';

import { LOCALE_PREFERENCE_STORAGE_KEY } from '@/constants/storage';
import type { LocalePreference } from '@/types/locale-preference';
import { LOCALE_PREFERENCES } from '@/types/locale-preference';

function isLocalePreference(value: string): value is LocalePreference {
  return (LOCALE_PREFERENCES as string[]).includes(value);
}

export async function getStoredLocalePreference(): Promise<LocalePreference | null> {
  const raw = await AsyncStorage.getItem(LOCALE_PREFERENCE_STORAGE_KEY);

  if (!raw || !isLocalePreference(raw)) {
    return null;
  }

  return raw;
}

export async function setStoredLocalePreference(preference: LocalePreference): Promise<void> {
  await AsyncStorage.setItem(LOCALE_PREFERENCE_STORAGE_KEY, preference);
}
