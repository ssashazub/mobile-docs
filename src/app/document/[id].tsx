import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppDesign } from '@/constants/app-design';
import { getDocuments } from '@/lib/document-storage';
import { exportDocumentPdf } from '@/lib/export-pdf';
import { getTemplateById } from '@/lib/template-storage';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import type { Document } from '@/types/document';
import type { DocumentTemplate } from '@/types/template';

function parseDocumentId(id: string | string[] | undefined): number | null {
  const rawId = Array.isArray(id) ? id[0] : id;
  const parsedId = Number(rawId);

  if (!rawId || Number.isNaN(parsedId)) {
    return null;
  }

  return parsedId;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const colors = useTheme();

  return (
    <View style={[styles.detailRow, { backgroundColor: colors.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.detailLabel}>
        {label}
      </ThemedText>
      <ThemedText style={styles.detailValue}>{value || '—'}</ThemedText>
    </View>
  );
}

export default function DocumentDetailsScreen() {
  const { t, dateLocale } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = parseDocumentId(id);
  const insets = useSafeAreaInsets();
  const colors = useTheme();

  const [document, setDocument] = useState<Document | null>(null);
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadDocument = useCallback(async () => {
    if (documentId === null) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);

    try {
      const documents = await getDocuments();

      if (documents.length === 0) {
        setDocument(null);
        setNotFound(true);
        return;
      }
      const foundDocument = documents.find((doc) => doc.id === documentId);

      if (!foundDocument) {
        setDocument(null);
        setNotFound(true);
        return;
      }

      const loadedTemplate = await getTemplateById(foundDocument.templateId);

      setDocument(foundDocument);
      setTemplate(loadedTemplate);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useFocusEffect(
    useCallback(() => {
      loadDocument();
    }, [loadDocument])
  );

  const handleExportPdf = async () => {
    if (!document) {
      return;
    }

    setExporting(true);

    try {
      await exportDocumentPdf(document);
    } catch (error) {
      Alert.alert(
        t('document.exportError'),
        error instanceof Error ? error.message : t('pdf.generateFailed')
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (notFound || !document || !template) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: t('document.title') }} />
        <ThemedText type="subtitle">{t('document.notFound')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: document.title,
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/document/edit/${document.id}`)}
              style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}
            >
              <ThemedText style={{ color: colors.text, fontWeight: '700' }}>{t('common.edit')}</ThemedText>
            </Pressable>
          ),
        }}
      />

      <ThemedView style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + Spacing.four },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[template.accentColor, template.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.typeHero}
          >
            <ThemedText style={styles.typeHeroEmoji}>{template.emoji}</ThemedText>
            <ThemedText style={styles.typeHeroTitle}>{document.title}</ThemedText>
            <ThemedText style={styles.typeHeroSubtitle}>{template.title}</ThemedText>
            <ThemedText style={styles.typeHeroDate}>
              {t('document.created')} {new Date(document.createdAt).toLocaleDateString(dateLocale)}
            </ThemedText>
          </LinearGradient>

          <View style={styles.details}>
            {template.fields.map((field) => (
              <DetailRow
                key={field.key}
                label={field.label}
                value={document.fields[field.key] ?? ''}
              />
            ))}
          </View>

          <Pressable
            onPress={handleExportPdf}
            disabled={exporting}
            style={({ pressed }) => [
              styles.pdfButton,
              { backgroundColor: template.accentColor },
              (pressed || exporting) && styles.pdfButtonPressed,
            ]}
          >
            <ThemedText style={styles.pdfButtonText}>
              {exporting ? t('document.exportingPdf') : `📄 ${t('document.exportPdf')}`}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppDesign.background,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  typeHero: {
    borderRadius: AppDesign.radius.lg,
    padding: 22,
    gap: 6,
    ...AppDesign.shadow,
  },
  typeHeroEmoji: {
    fontSize: 30,
    color: '#fff',
  },
  typeHeroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  typeHeroSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    fontWeight: '600',
  },
  typeHeroDate: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    marginTop: 4,
  },
  details: {
    gap: Spacing.two,
  },
  detailRow: {
    borderRadius: AppDesign.radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: AppDesign.border,
  },
  detailLabel: {
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 16,
    lineHeight: 24,
  },
  editButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    marginRight: Spacing.one,
  },
  editButtonPressed: {
    opacity: 0.6,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  pdfButton: {
    borderRadius: AppDesign.radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    ...AppDesign.shadow,
  },
  pdfButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  pdfButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
