import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type Href, Stack, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentTypeCard } from '@/components/document-type-card';
import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { getTemplates } from '@/lib/template-storage';
import type { DocumentTemplate } from '@/types/template';

export default function CreateDocumentTypeScreen() {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);

  const loadTemplates = useCallback(async () => {
    setTemplates(await getTemplates());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [loadTemplates])
  );

  return (
    <>
      <Stack.Screen options={{ title: t('create.screenTitle') }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.heading}>{t('create.chooseTemplate')}</Text>
          <Text style={styles.subheading}>{t('create.chooseSubtitle')}</Text>

          <Pressable
            style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}
            onPress={() => router.push('/templates' as Href)}
          >
            <Text style={styles.manageTitle}>⚙️ {t('create.manageTemplates')}</Text>
            <Text style={styles.manageSubtitle}>{t('create.manageSubtitle')}</Text>
          </Pressable>

          <View style={styles.list}>
            {templates.map((template) => (
              <DocumentTypeCard
                key={template.id}
                template={template}
                onPress={() => router.push(`/create/${template.id}` as Href)}
                onEdit={() => router.push(`/templates/edit/${template.id}` as Href)}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      padding: 24,
      gap: 14,
    },
    kicker: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: colors.hint,
    },
    heading: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
    },
    subheading: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    manageButton: {
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.lg,
      borderWidth: 1,
      borderColor: colors.templatesBorder,
      padding: 16,
      gap: 4,
    },
    manageTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primary,
    },
    manageSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    list: {
      gap: 14,
      marginTop: 4,
    },
    pressed: {
      opacity: 0.9,
    },
  });
}
