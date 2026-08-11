import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type Href, Stack, router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentTypeCard } from '@/components/document-type-card';
import { EditorOverflowMenu } from '@/components/ui/editor-overflow-menu';
import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { getTemplates } from '@/lib/template-storage';
import type { DocumentTemplate } from '@/types/template';

export default function CreateDocumentTypeScreen() {
  const { t } = useI18n();
  const colors = useTheme();
  const layout = useLayout();
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
      <Stack.Screen
        options={{
          title: t('create.screenTitle'),
          headerRight: () => (
            <EditorOverflowMenu onGoHome={() => router.dismissAll()} />
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={[styles.container, layout.listContentStyle]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>{t('create.chooseTemplate')}</Text>
          <Text style={styles.subheading}>{t('create.chooseSubtitle')}</Text>

          <Pressable
            style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}
            onPress={() => router.push('/templates' as Href)}
          >
            <View style={styles.manageIconWrap}>
              <SymbolView
                name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }}
                size={18}
                tintColor={colors.onSecondaryContainer}
                weight="semibold"
              />
            </View>
            <View style={styles.manageTextWrap}>
              <Text style={styles.manageTitle}>{t('create.manageTemplates')}</Text>
              <Text style={styles.manageSubtitle}>{t('create.manageSubtitle')}</Text>
            </View>
            <View style={styles.manageCount}>
              <Text style={styles.manageCountText}>{templates.length}</Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={16}
              tintColor={colors.textMuted}
            />
          </Pressable>

          <View style={[styles.list, layout.gridStyle]}>
            {templates.map((template) => (
              <View key={template.id} style={layout.gridItemStyle}>
                <DocumentTypeCard
                  template={template}
                  onPress={() => router.push(`/create/${template.id}` as Href)}
                  onEdit={() => router.push(`/templates/edit/${template.id}` as Href)}
                />
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
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      marginBottom: 2,
    },
    manageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: AppDesign.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      ...AppDesign.softShadow,
    },
    manageIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondaryContainer,
      flexShrink: 0,
    },
    manageTextWrap: {
      flex: 1,
      gap: 2,
    },
    manageTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    manageSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    manageCount: {
      minWidth: 26,
      height: 26,
      paddingHorizontal: 6,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceContainer,
    },
    manageCountText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
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
