import { useEffect, type ReactNode } from 'react';
import { Dimensions, Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { NavigationBar } from 'expo-navigation-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { MupdfPdfProcessor } from '@/components/mupdf-pdf-processor';
import { AppAlertProvider } from '@/components/ui/app-alert';
import { AppSettingsProvider, useAppSettings } from '@/contexts/app-settings-context';
import { LocalePreferenceProvider, useLocalePreference } from '@/contexts/locale-preference-context';
import { ThemePreferenceProvider, useThemePreference } from '@/contexts/theme-preference-context';
import { Layout } from '@/constants/layout';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import { useLayout } from '@/hooks/use-layout';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden in some environments (web / fast refresh).
});

function isTabletWindow(width: number, height: number): boolean {
  const shortest = Math.min(width, height);
  return shortest >= Layout.tabletMinWidth;
}

async function applyDeviceOrientationLock(isTablet: boolean): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    if (isTablet) {
      await ScreenOrientation.unlockAsync();
      return;
    }

    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch {
    // Orientation lock can fail on unsupported embeds; ignore.
  }
}

const initialWindow = Dimensions.get('window');
void applyDeviceOrientationLock(isTabletWindow(initialWindow.width, initialWindow.height));

function RootNavigator() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { t } = useI18n();
  const layout = useLayout();

  useEffect(() => {
    void applyDeviceOrientationLock(layout.isTablet);
  }, [layout.isTablet]);

  useEffect(() => {
    // Root/window chrome behind status & home-indicator areas — keep in sync with theme.
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {Platform.OS === 'android' ? (
        <NavigationBar style={colorScheme === 'dark' ? 'dark' : 'light'} />
      ) : null}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          orientation: layout.isTablet ? 'default' : 'portrait',
        }}
      >
        <Stack.Screen name="index" options={{ title: t('home.title'), headerShown: false }} />
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
    </View>
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
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent preserveEdgeToEdge>
      <ThemePreferenceProvider>
        <LocalePreferenceProvider>
          <AppSettingsProvider>
            <AppBootstrap>
              <AppAlertProvider>
                <MupdfPdfProcessor />
                <RootNavigator />
              </AppAlertProvider>
            </AppBootstrap>
          </AppSettingsProvider>
        </LocalePreferenceProvider>
      </ThemePreferenceProvider>
    </KeyboardProvider>
  );
}
