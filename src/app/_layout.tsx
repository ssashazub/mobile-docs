import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ThemePreferenceProvider } from '@/contexts/theme-preference-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { t } from '@/i18n';

function RootNavigator() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

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
        <Stack.Screen name="explore" options={{ title: 'Explore' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <RootNavigator />
    </ThemePreferenceProvider>
  );
}
