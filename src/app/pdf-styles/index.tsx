import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppDesign } from '@/constants/app-design';
import { useI18n } from '@/hooks/use-i18n';
import { deletePdfStyle, getSavedPdfStyles } from '@/lib/pdf-style-storage';
import { getPdfLayoutLabelKey } from '@/lib/pdf-layout-labels';
import type { SavedPdfStyle } from '@/types/pdf-style-design';

export default function PdfStylesScreen() {
  const { t } = useI18n();
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
    Alert.alert(
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
        <ScrollView contentContainerStyle={stylesScreen.container} showsVerticalScrollIndicator={false}>
          <Text style={stylesScreen.heading}>{t('pdfStyle.manageHeading')}</Text>
          <Text style={stylesScreen.subheading}>{t('pdfStyle.manageSubtitle')}</Text>

          {styles.length === 0 ? (
            <View style={stylesScreen.empty}>
              <Text style={stylesScreen.emptyTitle}>{t('pdfStyle.emptyTitle')}</Text>
              <Text style={stylesScreen.emptyText}>{t('pdfStyle.emptyText')}</Text>
            </View>
          ) : (
            <View style={stylesScreen.list}>
              {styles.map((style) => (
                <View key={style.id} style={stylesScreen.card}>
                  <View style={stylesScreen.cardHeader}>
                    <View
                      style={[
                        stylesScreen.swatch,
                        { backgroundColor: style.design.accentColor ?? AppDesign.primary },
                      ]}
                    />
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

const stylesScreen = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppDesign.background },
  container: { padding: 24, gap: 14 },
  heading: { fontSize: 28, fontWeight: '800', color: AppDesign.text },
  subheading: { fontSize: 15, lineHeight: 22, color: AppDesign.textSecondary },
  empty: {
    backgroundColor: AppDesign.surface,
    borderRadius: AppDesign.radius.md,
    borderWidth: 1,
    borderColor: AppDesign.border,
    padding: 20,
    gap: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: AppDesign.text },
  emptyText: { fontSize: 14, lineHeight: 20, color: AppDesign.textSecondary },
  list: { gap: 12 },
  card: {
    backgroundColor: AppDesign.surface,
    borderRadius: AppDesign.radius.md,
    borderWidth: 1,
    borderColor: AppDesign.border,
    padding: 16,
    gap: 10,
    ...AppDesign.cardShadow,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 42, height: 42, borderRadius: 21 },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: AppDesign.text },
  cardMeta: { fontSize: 13, color: AppDesign.textSecondary },
  deleteLink: { alignSelf: 'flex-end' },
  deleteLinkText: { color: AppDesign.danger, fontWeight: '700', fontSize: 13 },
  pressed: { opacity: 0.9 },
});
