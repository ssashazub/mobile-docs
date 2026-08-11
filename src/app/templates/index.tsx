import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type Href, Stack, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentTypeCard } from '@/components/document-type-card';
import { showAppAlert } from '@/components/ui/app-alert';
import { AppDesign, AppGradients } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { deleteTemplate, getTemplates } from '@/lib/template-storage';
import type { DocumentTemplate } from '@/types/template';

export default function TemplatesScreen() {
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

  const handleDelete = (template: DocumentTemplate) => {
    showAppAlert(
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

  const customCount = templates.filter((template) => !template.isBuiltIn).length;

  return (
    <>
      <Stack.Screen options={{ title: t('templates.title') }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={[styles.container, layout.listContentStyle]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headingRow}>
            <View style={styles.headingText}>
              <Text style={styles.heading}>{t('templates.heading')}</Text>
              <Text style={styles.subheading}>{t('templates.subtitle')}</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeValue}>{templates.length}</Text>
              <Text style={styles.countBadgeLabel}>{t('common.fields')}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statPill, { backgroundColor: colors.primaryContainer }]}>
              <SymbolView
                name={{ ios: 'square.grid.2x2.fill', android: 'apps', web: 'apps' }}
                size={14}
                tintColor={colors.onPrimaryContainer}
              />
              <Text style={[styles.statPillText, { color: colors.onPrimaryContainer }]}>
                {templates.length - customCount} {t('templates.title')}
              </Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: colors.secondaryContainer }]}>
              <SymbolView
                name={{ ios: 'person.fill', android: 'person', web: 'person' }}
                size={14}
                tintColor={colors.onSecondaryContainer}
              />
              <Text style={[styles.statPillText, { color: colors.onSecondaryContainer }]}>
                {customCount} {t('templates.createTemplate')}
              </Text>
            </View>
          </View>

          <View style={[styles.actionsRow, layout.isTablet && styles.actionsRowTablet]}>
            <Pressable
              style={({ pressed }) => [
                styles.createShell,
                layout.isTablet && styles.actionHalf,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push('/templates/create' as Href)}
            >
              <LinearGradient
                colors={AppGradients.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createButton}
              >
                <View style={styles.createIconWrap}>
                  <SymbolView
                    name={{ ios: 'plus', android: 'add', web: 'add' }}
                    size={18}
                    tintColor="#ffffff"
                    weight="semibold"
                  />
                </View>
                <View style={styles.createTextWrap}>
                  <Text style={styles.createTitle}>{t('templates.createTemplate')}</Text>
                  <Text style={styles.createSubtitle}>{t('templates.createSubtitle')}</Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                layout.isTablet && styles.actionHalf,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push('/pdf-styles' as Href)}
            >
              <View style={[styles.createIconWrap, styles.secondaryIconWrap]}>
                <SymbolView
                  name={{ ios: 'paintbrush.fill', android: 'brush', web: 'brush' }}
                  size={18}
                  tintColor={colors.primary}
                  weight="semibold"
                />
              </View>
              <View style={styles.createTextWrap}>
                <Text style={styles.secondaryTitle}>{t('pdfStyle.manageTitle')}</Text>
                <Text style={styles.secondarySubtitle}>{t('pdfStyle.manageSubtitle')}</Text>
              </View>
            </Pressable>
          </View>

          <View style={[styles.list, layout.gridStyle]}>
            {templates.map((template) => (
              <View key={template.id} style={[styles.itemWrap, layout.gridItemStyle]}>
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
      gap: 16,
    },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    headingText: {
      flex: 1,
      gap: 4,
    },
    heading: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
    },
    subheading: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    countBadge: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 52,
      paddingVertical: 8,
      borderRadius: AppDesign.radius.lg,
      backgroundColor: colors.surfaceContainer,
    },
    countBadgeValue: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    countBadgeLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    statPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: AppDesign.radius.pill,
    },
    statPillText: {
      fontSize: 12,
      fontWeight: '700',
    },
    createShell: {
      borderRadius: AppDesign.radius.lg,
      overflow: 'hidden',
      ...AppDesign.shadow,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
    },
    createIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      flexShrink: 0,
    },
    secondaryIconWrap: {
      backgroundColor: colors.primaryContainer,
    },
    createTextWrap: {
      flex: 1,
      gap: 2,
    },
    actionsRow: {
      gap: 12,
    },
    actionsRowTablet: {
      flexDirection: 'row',
    },
    actionHalf: {
      flex: 1,
    },
    createTitle: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
    },
    createSubtitle: {
      color: 'rgba(255,255,255,0.88)',
      fontSize: 12.5,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: AppDesign.radius.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      ...AppDesign.softShadow,
    },
    secondaryTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    secondarySubtitle: {
      color: colors.textSecondary,
      fontSize: 12.5,
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
