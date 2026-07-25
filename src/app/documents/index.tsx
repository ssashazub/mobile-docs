import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ui/action-sheet';
import { DocumentCard } from '@/components/document-card';
import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { resolveTemplateForDocument } from '@/lib/document-display';
import { deleteDocument as deleteStoredDocument, getDocuments } from '@/lib/document-storage';
import { getTemplates } from '@/lib/template-storage';
import type { Document } from '@/types/document';
import type { DocumentTemplate } from '@/types/template';

function sortDocumentsNewestFirst(documents: Document[]): Document[] {
  return [...documents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export default function DocumentsScreen() {
  const { t, pluralDocuments } = useI18n();
  const colors = useTheme();
  const layout = useLayout();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const templatesMap = useMemo(
    () => Object.fromEntries(templates.map((template) => [template.id, template])),
    [templates]
  );

  const loadData = useCallback(async () => {
    const [savedDocuments, loadedTemplates] = await Promise.all([
      getDocuments(),
      getTemplates(),
    ]);

    setTemplates(loadedTemplates);
    setDocuments(sortDocumentsNewestFirst(savedDocuments));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const deleteDocument = async (id: number) => {
    await deleteStoredDocument(id);
    setDocuments((current) => current.filter((doc) => doc.id !== id));
  };

  const selectedTemplate = selectedDocument
    ? resolveTemplateForDocument(selectedDocument, templatesMap)
    : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen options={{ title: t('home.listTitle') }} />
      <ScrollView
        contentContainerStyle={[styles.container, layout.listContentStyle]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          {documents.length} {pluralDocuments(documents.length)}
        </Text>

        {documents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('home.emptyText')}</Text>
          </View>
        ) : (
          <View style={[styles.list, layout.gridStyle]}>
            {documents.map((doc) => {
              const template = resolveTemplateForDocument(doc, templatesMap);

              return (
                <View key={doc.id} style={layout.gridItemStyle}>
                  <DocumentCard
                    document={doc}
                    template={template}
                    onPress={() => router.push(`/document/${doc.id}`)}
                    onLongPress={() => setSelectedDocument(doc)}
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <ActionSheet
        visible={!!selectedDocument}
        title={selectedDocument?.title ?? ''}
        subtitle={
          selectedDocument && selectedTemplate
            ? `${selectedTemplate.title} · ${selectedDocument.client || t('common.noClient')}`
            : undefined
        }
        accentColor={selectedTemplate?.accentColor}
        onClose={() => setSelectedDocument(null)}
        items={
          selectedDocument
            ? [
                {
                  key: 'open',
                  label: t('common.open'),
                  symbol: { ios: 'eye.fill', android: 'visibility', web: 'visibility' },
                  onPress: () => router.push(`/document/${selectedDocument.id}`),
                },
                {
                  key: 'edit',
                  label: t('common.edit'),
                  symbol: { ios: 'pencil', android: 'edit', web: 'edit' },
                  onPress: () => router.push(`/document/edit/${selectedDocument.id}`),
                },
                {
                  key: 'delete',
                  label: t('common.delete'),
                  symbol: { ios: 'trash.fill', android: 'delete', web: 'delete' },
                  tone: 'danger',
                  onPress: () => {
                    void deleteDocument(selectedDocument.id);
                  },
                },
              ]
            : []
        }
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      padding: 20,
      gap: 14,
      paddingBottom: 40,
      flexGrow: 1,
    },
    subtitle: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
      paddingHorizontal: 2,
    },
    list: {
      gap: 10,
    },
    emptyState: {
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 28,
      alignItems: 'center',
      gap: 8,
      ...AppDesign.cardShadow,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    emptyText: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}
