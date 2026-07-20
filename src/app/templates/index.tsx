import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type Href, Stack, router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentTypeCard } from '@/components/document-type-card';
import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { deleteTemplate, getTemplates } from '@/lib/template-storage';
import type { DocumentTemplate } from '@/types/template';

export default function TemplatesScreen() {
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

  const handleDelete = (template: DocumentTemplate) => {
    Alert.alert(
      t('templates.deleteConfirmTitle'),
      t('templates.deleteConfirmText', { title: template.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(template.id);
            loadTemplates();
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: t('templates.title') }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.heading}>{t('templates.heading')}</Text>
          <Text style={styles.subheading}>{t('templates.subtitle')}</Text>

          <Pressable
            style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
            onPress={() => router.push('/templates/create' as Href)}
          >
            <View style={styles.createTitleRow}>
              <SymbolView
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                size={18}
                tintColor="#ffffff"
                weight="semibold"
              />
              <Text style={styles.createTitle}>{t('templates.createTemplate')}</Text>
            </View>
            <Text style={styles.createSubtitle}>{t('templates.createSubtitle')}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.createButton, styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => router.push('/pdf-styles' as Href)}
          >
            <Text style={styles.secondaryTitle}>{t('pdfStyle.manageTitle')}</Text>
            <Text style={styles.secondarySubtitle}>{t('pdfStyle.manageSubtitle')}</Text>
          </Pressable>

          <View style={styles.list}>
            {templates.map((template) => (
              <View key={template.id} style={styles.itemWrap}>
                <DocumentTypeCard
                  template={template}
                  onPress={() => router.push(`/templates/edit/${template.id}` as Href)}
                  onEdit={() => router.push(`/templates/edit/${template.id}` as Href)}
                />
                {!template.isBuiltIn ? (
                  <Pressable
                    onPress={() => handleDelete(template)}
                    style={({ pressed }) => [styles.deleteLink, pressed && styles.pressed]}
                  >
                    <Text style={styles.deleteLinkText}>{t('templates.deleteTemplate')}</Text>
                  </Pressable>
                ) : null}
              </View>
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
    heading: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
    },
    subheading: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    createButton: {
      backgroundColor: colors.primary,
      borderRadius: AppDesign.radius.lg,
      padding: 18,
      gap: 4,
      ...AppDesign.shadow,
    },
    createTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    createTitle: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '800',
    },
    createSubtitle: {
      color: 'rgba(255,255,255,0.88)',
      fontSize: 13,
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      ...AppDesign.cardShadow,
      shadowOpacity: 0.06,
      elevation: 1,
    },
    secondaryTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    secondarySubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    list: {
      gap: 14,
      marginTop: 4,
    },
    itemWrap: {
      gap: 6,
    },
    deleteLink: {
      alignSelf: 'flex-end',
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    deleteLinkText: {
      color: colors.danger,
      fontWeight: '700',
      fontSize: 13,
    },
    pressed: {
      opacity: 0.9,
    },
  });
}
