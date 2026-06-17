import { useCallback, useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Alert, StyleSheet, Text, Pressable, View, ScrollView } from 'react-native';
import { type Href, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ui/action-sheet';
import { DocumentCard } from '@/components/document-card';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { resolveTemplateForDocument } from '@/lib/document-display';
import { deleteDocument as deleteStoredDocument, getDocuments } from '@/lib/document-storage';
import { ImportCancelledError, pickAndImportPdf } from '@/lib/import-pdf';
import { getTemplates } from '@/lib/template-storage';
import type { Document } from '@/types/document';
import type { DocumentTemplate } from '@/types/template';

export default function HomeScreen() {
    const { t, pluralDocuments } = useI18n();
    const colors = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [importing, setImporting] = useState(false);

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
        setDocuments(savedDocuments);
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

    const handleImportPdf = async () => {
        try {
            setImporting(true);
            const document = await pickAndImportPdf();
            await loadData();
            router.push(`/document/edit/${document.id}`);
        } catch (error) {
            if (error instanceof ImportCancelledError) {
                return;
            }
            Alert.alert(
                t('import.errorTitle'),
                error instanceof Error ? error.message : t('import.errorTitle')
            );
        } finally {
            setImporting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.hero}>
                    <View style={styles.heroTopRow}>
                        <Text style={styles.heroKicker}>Mobile Docs</Text>
                        <ThemeSwitcher compact />
                    </View>
                    <Text style={styles.heading}>{t('home.title')}</Text>
                    <Text style={styles.subheading}>
                        {documents.length} {pluralDocuments(documents.length)}
                    </Text>
                </View>

                <Pressable
                    style={({ pressed }) => [styles.createButton, pressed && styles.createButtonPressed]}
                    onPress={() => router.push('/create' as Href)}
                >
                    <LinearGradient
                        colors={['#6366f1', '#4f46e5', '#4338ca']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.createGradient}
                    >
                        <Text style={styles.createEmoji}>✨</Text>
                        <View style={styles.createTextWrap}>
                            <Text style={styles.createButtonTitle}>{t('home.createDocument')}</Text>
                            <Text style={styles.createButtonSubtitle}>{t('home.createSubtitle')}</Text>
                        </View>
                        <Text style={styles.createArrow}>→</Text>
                    </LinearGradient>
                </Pressable>

                <Pressable
                    style={({ pressed }) => [styles.importButton, pressed && styles.createButtonPressed]}
                    onPress={handleImportPdf}
                    disabled={importing}
                >
                    {importing ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        <>
                            <Text style={styles.importTitle}>📥 {t('home.importPdf')}</Text>
                            <Text style={styles.importSubtitle}>{t('home.importPdfSubtitle')}</Text>
                        </>
                    )}
                </Pressable>

                <Pressable
                    style={({ pressed }) => [styles.templatesButton, pressed && styles.createButtonPressed]}
                    onPress={() => router.push('/templates' as Href)}
                >
                    <Text style={styles.templatesTitle}>⚙️ {t('home.templatesTitle')}</Text>
                    <Text style={styles.templatesSubtitle}>{t('home.templatesSubtitle')}</Text>
                </Pressable>

                {documents.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>📁</Text>
                        <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
                        <Text style={styles.emptyText}>{t('home.emptyText')}</Text>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {documents.map((doc) => {
                            const template = resolveTemplateForDocument(doc, templatesMap);

                            return (
                                <DocumentCard
                                    key={doc.id}
                                    document={doc}
                                    template={template}
                                    onPress={() => router.push(`/document/${doc.id}`)}
                                    onLongPress={() => setSelectedDocument(doc)}
                                />
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
                                  icon: '👁️',
                                  onPress: () => router.push(`/document/${selectedDocument.id}`),
                              },
                              {
                                  key: 'edit',
                                  label: t('common.edit'),
                                  icon: '✏️',
                                  onPress: () => router.push(`/document/edit/${selectedDocument.id}`),
                              },
                              {
                                  key: 'delete',
                                  label: t('common.delete'),
                                  icon: '🗑️',
                                  tone: 'danger',
                                  onPress: () => deleteDocument(selectedDocument.id),
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
            flexGrow: 1,
            padding: 24,
            gap: 14,
        },
        hero: {
            gap: 6,
            paddingTop: 4,
        },
        heroTopRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
        },
        heroKicker: {
            fontSize: 12,
            fontWeight: '800',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: colors.hint,
            flex: 1,
        },
        heading: {
            fontSize: 34,
            fontWeight: '800',
            color: colors.text,
            lineHeight: 40,
        },
        subheading: {
            fontSize: 15,
            color: colors.textSecondary,
        },
        createButton: {
            borderRadius: AppDesign.radius.lg,
            overflow: 'hidden',
            ...AppDesign.shadow,
        },
        createButtonPressed: {
            opacity: 0.94,
            transform: [{ scale: 0.985 }],
        },
        createGradient: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            padding: 20,
        },
        createEmoji: {
            fontSize: 28,
        },
        createTextWrap: {
            flex: 1,
            gap: 2,
        },
        createButtonTitle: {
            color: '#fff',
            fontSize: 18,
            fontWeight: '800',
        },
        createButtonSubtitle: {
            color: 'rgba(255,255,255,0.88)',
            fontSize: 13,
        },
        createArrow: {
            color: '#fff',
            fontSize: 24,
            fontWeight: '800',
        },
        importButton: {
            backgroundColor: colors.surface,
            borderRadius: AppDesign.radius.lg,
            borderWidth: 1,
            borderColor: colors.importBorder,
            padding: 16,
            gap: 4,
            minHeight: 72,
            justifyContent: 'center',
        },
        importTitle: {
            fontSize: 15,
            fontWeight: '800',
            color: colors.importTitle,
        },
        importSubtitle: {
            fontSize: 13,
            color: colors.textSecondary,
        },
        templatesButton: {
            backgroundColor: colors.surface,
            borderRadius: AppDesign.radius.lg,
            borderWidth: 1,
            borderColor: colors.templatesBorder,
            padding: 16,
            gap: 4,
        },
        templatesTitle: {
            fontSize: 15,
            fontWeight: '800',
            color: colors.primary,
        },
        templatesSubtitle: {
            fontSize: 13,
            color: colors.textSecondary,
        },
        emptyState: {
            backgroundColor: colors.surface,
            borderRadius: AppDesign.radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 28,
            alignItems: 'center',
            gap: 8,
            ...AppDesign.cardShadow,
        },
        emptyEmoji: {
            fontSize: 36,
            marginBottom: 4,
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
        list: {
            gap: 14,
        },
    });
}
