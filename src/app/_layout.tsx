import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { t } from '@/i18n';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
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
