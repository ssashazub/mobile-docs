import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppDesign } from '@/constants/app-design';
import { showAppAlert } from '@/components/ui/app-alert';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { useLayout } from '@/hooks/use-layout';
import { deletePdfStyle, getSavedPdfStyles } from '@/lib/pdf-style-storage';
import { getPdfLayoutLabelKey } from '@/lib/pdf-layout-labels';
import type { SavedPdfStyle } from '@/types/pdf-style-design';

export default function PdfStylesScreen() {
  const { t } = useI18n();
  const colors = useTheme();
  const layout = useLayout();
  const stylesScreen = useMemo(() => createStyles(colors), [colors]);
  const [styles, setStyles] = useState<SavedPdfStyle[]>([]);

  const loadStyles = useCallback(async () => {
    setStyles(await getSavedPdfStyles());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStyles();
    }, [loadStyles])
  );

  const handleDelete = (style: SavedPdfStyle) => {
    showAppAlert(
      t('pdfStyle.deleteTitle'),
      t('pdfStyle.deleteText', { name: style.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deletePdfStyle(style.id);
            loadStyles();
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: t('pdfStyle.manageTitle') }} />
      <SafeAreaView style={stylesScreen.safeArea} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={[stylesScreen.container, layout.listContentStyle]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={stylesScreen.heading}>{t('pdfStyle.manageHeading')}</Text>
          <Text style={stylesScreen.subheading}>{t('pdfStyle.manageSubtitle')}</Text>

          {styles.length === 0 ? (
            <View style={stylesScreen.empty}>
              <View style={stylesScreen.emptyIconWrap}>
                <SymbolView
                  name={{ ios: 'paintpalette.fill', android: 'palette', web: 'palette' }}
                  size={26}
                  tintColor={colors.onSecondaryContainer}
                />
              </View>
              <Text style={stylesScreen.emptyTitle}>{t('pdfStyle.emptyTitle')}</Text>
              <Text style={stylesScreen.emptyText}>{t('pdfStyle.emptyText')}</Text>
            </View>
          ) : (
            <View style={[stylesScreen.list, layout.gridStyle]}>
              {styles.map((style) => (
                <View key={style.id} style={[stylesScreen.card, layout.gridItemStyle]}>
                  <View style={stylesScreen.cardHeader}>
                    <View
                      style={[
                        stylesScreen.swatch,
                        { backgroundColor: `${style.design.accentColor ?? colors.primary}22` },
                      ]}
                    >
                      <View
                        style={[
                          stylesScreen.swatchDot,
                          { backgroundColor: style.design.accentColor ?? colors.primary },
                        ]}
                      />
                    </View>
                    <View style={stylesScreen.cardText}>
                      <Text style={stylesScreen.cardTitle}>{style.name}</Text>
                      <Text style={stylesScreen.cardMeta}>
                        {style.layout === 'custom'
                          ? t('pdfStyle.customLayout')
                          : t(getPdfLayoutLabelKey(style.layout))}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleDelete(style)}
                    style={({ pressed }) => [stylesScreen.deleteLink, pressed && stylesScreen.pressed]}
                  >
                    <Text style={stylesScreen.deleteLinkText}>{t('common.delete')}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { padding: 24, gap: 14 },
    heading: { fontSize: 28, fontWeight: '800', color: colors.text },
    subheading: { fontSize: 15, lineHeight: 22, color: colors.textSecondary },
    empty: {
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: AppDesign.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: 'center',
      gap: 6,
      ...AppDesign.cardShadow,
    },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondaryContainer,
      marginBottom: 4,
    },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    emptyText: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
    list: { gap: 12 },
    card: {
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: AppDesign.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 10,
      ...AppDesign.cardShadow,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    swatch: {
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchDot: { width: 16, height: 16, borderRadius: 8 },
    cardText: { flex: 1, gap: 2 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    cardMeta: { fontSize: 13, color: colors.textSecondary },
    deleteLink: { alignSelf: 'flex-end' },
    deleteLinkText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
    pressed: { opacity: 0.9 },
  });
}
