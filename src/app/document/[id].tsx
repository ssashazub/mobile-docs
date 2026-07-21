import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, Stack, useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TemplateIconView } from '@/components/template-icon-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LoadingState } from '@/components/ui/loading-state';
import { showAppAlert } from '@/components/ui/app-alert';
import { AppDesign } from '@/constants/app-design';
import { getDocumentDisplayInfo, isImportedFormDocument } from '@/lib/document-display';
import { formatFormFieldDisplayValue } from '@/lib/pdf-form';
import { getDocuments } from '@/lib/document-storage';
import { exportDocumentPdf } from '@/lib/export-pdf';
import { getTemplateById } from '@/lib/template-storage';
import { Spacing, type ThemeColors } from '@/constants/theme';
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
  const rowStyles = useMemo(() => createDetailRowStyles(colors), [colors]);

  return (
    <View style={rowStyles.detailRow}>
      <ThemedText type="small" themeColor="textSecondary" style={rowStyles.detailLabel}>
        {label}
      </ThemedText>
      <ThemedText style={rowStyles.detailValue}>{value || '-'}</ThemedText>
    </View>
  );
}

function createDetailRowStyles(colors: ThemeColors) {
  return StyleSheet.create({
    detailRow: {
      borderRadius: AppDesign.radius.md,
      padding: Spacing.three,
      gap: Spacing.one,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundElement,
    },
    detailLabel: {
      fontWeight: '700',
    },
    detailValue: {
      fontSize: 16,
      lineHeight: 24,
    },
  });
}

export default function DocumentDetailsScreen() {
  const { t, dateLocale } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = parseDocumentId(id);
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

      if (isImportedFormDocument(foundDocument)) {
        setDocument(foundDocument);
        setTemplate(null);
        return;
      }

      const loadedTemplate = await getTemplateById(foundDocument.templateId);
      setDocument(foundDocument);
      setTemplate(loadedTemplate ?? null);
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

    // Imported PDFs: skip in-app preview for now (WebView can't show the file reliably).
    if (isImportedFormDocument(document)) {
      setExporting(true);
      try {
        await exportDocumentPdf(document);
      } catch (error) {
        showAppAlert(
          t('document.exportError'),
          error instanceof Error ? error.message : t('pdf.generateFailed')
        );
      } finally {
        setExporting(false);
      }
      return;
    }

    router.push(`/document/preview/${document.id}` as Href);
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <LoadingState />
      </ThemedView>
    );
  }

  if (notFound || !document) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: t('document.title') }} />
        <ThemedText type="subtitle">{t('document.notFound')}</ThemedText>
      </ThemedView>
    );
  }

  const display = getDocumentDisplayInfo(document, template);

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
            colors={[display.accentColor, display.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.typeHero}
          >
            <TemplateIconView
              icon={display.icon}
              size={30}
              color="#ffffff"
              textStyle={styles.typeHeroEmoji}
            />
            <ThemedText style={styles.typeHeroTitle}>{document.title}</ThemedText>
            <ThemedText style={styles.typeHeroSubtitle}>{display.title}</ThemedText>
            <ThemedText style={styles.typeHeroDate}>
              {t('document.created')} {new Date(document.createdAt).toLocaleDateString(dateLocale)}
            </ThemedText>
          </LinearGradient>

          <View style={styles.details}>
            {isImportedFormDocument(document) && document.formFields
              ? document.formFields.map((field) => (
                  <DetailRow
                    key={field.name}
                    label={field.label}
                    value={formatFormFieldDisplayValue(field, document.fields[field.name] ?? '')}
                  />
                ))
              : display.fields.map((field) => (
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
              { backgroundColor: display.accentColor },
              (pressed || exporting) && styles.pdfButtonPressed,
            ]}
          >
            <ThemedText style={styles.pdfButtonText}>
              {exporting ? t('document.exportingPdf') : t('document.exportPdf')}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </ThemedView>
    </>
  );
}

function createStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
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
}
