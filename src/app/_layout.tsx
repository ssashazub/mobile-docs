import { useEffect, type ReactNode } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { AppAlertProvider } from '@/components/ui/app-alert';
import { AppSettingsProvider, useAppSettings } from '@/contexts/app-settings-context';
import { LocalePreferenceProvider, useLocalePreference } from '@/contexts/locale-preference-context';
import { ThemePreferenceProvider, useThemePreference } from '@/contexts/theme-preference-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden in some environments (web / fast refresh).
});

function RootNavigator() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { t } = useI18n();

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: t('home.title') }} />
        <Stack.Screen name="create/index" options={{ title: t('create.screenTitle') }} />
        <Stack.Screen name="templates/index" options={{ title: t('templates.title') }} />
        <Stack.Screen name="pdf-styles/index" options={{ title: t('pdfStyle.manageTitle') }} />
        <Stack.Screen name="documents/index" options={{ title: t('home.listTitle') }} />
        <Stack.Screen name="document/preview/[id]" options={{ title: t('document.previewTitle') }} />
        <Stack.Screen name="settings/index" options={{ title: t('settings.title') }} />
        <Stack.Screen name="settings/privacy" options={{ title: t('settings.privacy') }} />
        <Stack.Screen name="settings/terms" options={{ title: t('settings.terms') }} />
        <Stack.Screen name="explore" options={{ title: 'Explore' }} />
      </Stack>
    </>
  );
}

function AppBootstrap({ children }: { children: ReactNode }) {
  const { isHydrated: themeReady } = useThemePreference();
  const { isHydrated: localeReady } = useLocalePreference();
  const { isHydrated: settingsReady } = useAppSettings();
  const ready = themeReady && localeReady && settingsReady;

  useEffect(() => {
    if (!ready) {
      return;
    }

    void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) {
    return null;
  }

  return children;
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <LocalePreferenceProvider>
        <AppSettingsProvider>
          <AppBootstrap>
            <AppAlertProvider>
              <RootNavigator />
            </AppAlertProvider>
          </AppBootstrap>
        </AppSettingsProvider>
      </LocalePreferenceProvider>
    </ThemePreferenceProvider>
  );
}
