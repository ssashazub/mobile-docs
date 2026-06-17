import AsyncStorage from '@react-native-async-storage/async-storage';

import { THEME_PREFERENCE_STORAGE_KEY } from '@/constants/storage';
import type { ThemePreference } from '@/types/theme-preference';
import { THEME_PREFERENCES } from '@/types/theme-preference';

function isThemePreference(value: string): value is ThemePreference {
  return (THEME_PREFERENCES as string[]).includes(value);
}

export async function getStoredThemePreference(): Promise<ThemePreference | null> {
  const raw = await AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);

  if (!raw || !isThemePreference(raw)) {
    return null;
  }

  return raw;
}

export async function setStoredThemePreference(preference: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
}
