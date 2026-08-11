import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, Stack, useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue } from 'react-native-reanimated';

import {
  CollapsingSearchBody,
  CollapsingSearchHeaderBtn,
  useCollapsingSearchMorph,
} from '@/components/collapsing-field-search';
import { TemplateIconView } from '@/components/template-icon-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LoadingState } from '@/components/ui/loading-state';
import { showAppAlert } from '@/components/ui/app-alert';
import { AppDesign } from '@/constants/app-design';
import { IMPORTED_FORM_TEMPLATE_ID } from '@/constants/imported-pdf';
import {
  getDocumentDisplayInfo,
  isExternalPdfImport,
  isImportedFormDocument,
} from '@/lib/document-display';
import { filterByFieldSearchQuery } from '@/lib/document-search';
import { formatFormFieldDisplayValue } from '@/lib/pdf-form';
import { getDocuments } from '@/lib/document-storage';
import { exportDocumentPdf } from '@/lib/export-pdf';
import { getTemplateById } from '@/lib/template-storage';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { useLayout } from '@/hooks/use-layout';
import { useScrollEdgeControls } from '@/hooks/use-scroll-edge-controls';
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
      backgroundColor: colors.surfaceContainerLow,
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
  const layout = useLayout();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [document, setDocument] = useState<Document | null>(null);
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [headerSearchExpanded, setHeaderSearchExpanded] = useState(false);
  const scrollY = useSharedValue(0);
  const searchMorph = useCollapsingSearchMorph(scrollY);

  const detailRows = useMemo(() => {
    if (!document) {
      return [] as Array<{ key: string; label: string; value: string; id?: string }>;
    }

    if (isExternalPdfImport(document) && document.formFields && document.formFields.length > 0) {
      return document.formFields.map((field) => ({
        key: field.name,
        id: field.name,
        label: field.label,
        value: formatFormFieldDisplayValue(field, document.fields[field.name] ?? ''),
      }));
    }

    if (isExternalPdfImport(document)) {
      return (document.overlays ?? [])
        .filter((overlay) => overlay.text.trim())
        .map((overlay) => ({
          key: overlay.id,
          label: t('import.overlayPlaceholder'),
          value: overlay.text,
        }));
    }

    const display = getDocumentDisplayInfo(document, template);
    return display.fields.map((field) => ({
      key: field.key,
      id: field.key,
      label: field.label,
      value: document.fields[field.key] ?? '',
    }));
  }, [document, t, template]);

  const filteredDetailRows = useMemo(
    () =>
      filterByFieldSearchQuery(detailRows, searchQuery, (row) => ({
        label: row.label,
        id: row.id,
        value: row.value,
      })),
    [detailRows, searchQuery]
  );

  const isSearchingFields = searchQuery.trim().length > 0;
  const fieldCount = detailRows.length;
  const visibleFieldCount = isSearchingFields ? filteredDetailRows.length : fieldCount;

  const {
    scrollRef,
    onScroll: onEdgeScroll,
    onContentSizeChange,
    onLayout,
    overlay: scrollOverlay,
    fab: scrollFab,
  } = useScrollEdgeControls({ itemCount: visibleFieldCount });

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onEdgeScroll(event);
      scrollY.value = event.nativeEvent.contentOffset.y;
      if (
        headerSearchExpanded &&
        event.nativeEvent.contentOffset.y < searchMorph.searchOffset.value - 12
      ) {
        setHeaderSearchExpanded(false);
      }
    },
    [headerSearchExpanded, onEdgeScroll, scrollY, searchMorph.searchOffset]
  );

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
        if (
          foundDocument.templateId &&
          foundDocument.templateId !== IMPORTED_FORM_TEMPLATE_ID
        ) {
          const loadedTemplate = await getTemplateById(foundDocument.templateId);
          setTemplate(loadedTemplate ?? null);
        } else {
          setTemplate(null);
        }
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

    // Plain external PDFs: share the file directly (no HTML preview).
    // App-template docs keep the usual preview → save / more flow.
    if (isExternalPdfImport(document)) {
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

  const openEditor = useCallback(() => {
    if (!document) {
      return;
    }
    router.push(`/document/edit/${document.id}` as Href);
  }, [document]);

  const headerRight = useCallback(() => {
    return (
      <View style={styles.headerRightRow}>
        {fieldCount > 0 ? (
          <CollapsingSearchHeaderBtn
            morph={searchMorph}
            hasQuery={searchQuery.trim().length > 0}
            expanded={headerSearchExpanded}
            onExpand={() => setHeaderSearchExpanded(true)}
            onCollapse={() => setHeaderSearchExpanded(false)}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('document.searchFieldsPlaceholder')}
            accessibilityLabel={t('document.searchFieldsPlaceholder')}
          />
        ) : null}
        <Pressable
          onPress={openEditor}
          style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}
        >
          <ThemedText style={{ color: colors.text, fontWeight: '700' }}>{t('common.edit')}</ThemedText>
        </Pressable>
      </View>
    );
  }, [
    colors.text,
    fieldCount,
    headerSearchExpanded,
    openEditor,
    searchMorph,
    searchQuery,
    styles.editButton,
    styles.editButtonPressed,
    styles.headerRightRow,
    t,
  ]);

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
          headerRight,
        }}
      />

      <ThemedView style={styles.screen}>
        <View style={styles.flex}>
          <Animated.ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.content,
              layout.contentStyle,
              { paddingBottom: insets.bottom + Spacing.four },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={onContentSizeChange}
            onLayout={onLayout}
          >
          <LinearGradient
            colors={[display.accentColor, display.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.typeHero}
          >
            <View style={styles.typeHeroWatermark} pointerEvents="none">
              <TemplateIconView icon={display.icon} size={110} color="#ffffff" />
            </View>
            <View style={styles.typeHeroIconWrap}>
              <TemplateIconView
                icon={display.icon}
                size={26}
                color="#ffffff"
                textStyle={styles.typeHeroEmoji}
              />
            </View>
            <ThemedText style={styles.typeHeroTitle}>{document.title}</ThemedText>
            <View style={styles.typeHeroMetaRow}>
              <View style={styles.typeHeroChip}>
                <ThemedText style={styles.typeHeroSubtitle}>{display.title}</ThemedText>
              </View>
              <ThemedText style={styles.typeHeroDate}>
                {t('document.created')} {new Date(document.createdAt).toLocaleDateString(dateLocale)}
              </ThemedText>
            </View>
          </LinearGradient>

          <View style={styles.sectionHeaderRow}>
            <ThemedText style={styles.sectionHeaderText}>{t('common.fields')}</ThemedText>
            <View style={styles.sectionCountBadge}>
              <ThemedText style={styles.sectionCountText}>
                {isSearchingFields ? `${visibleFieldCount}/${fieldCount}` : fieldCount}
              </ThemedText>
            </View>
          </View>

          {fieldCount > 0 ? (
            <CollapsingSearchBody
              morph={searchMorph}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('document.searchFieldsPlaceholder')}
            />
          ) : null}

          <View style={styles.details}>
            {filteredDetailRows.length > 0 ? (
              filteredDetailRows.map((row) => (
                <DetailRow key={row.key} label={row.label} value={row.value} />
              ))
            ) : isSearchingFields ? (
              <View style={styles.searchEmpty}>
                <ThemedText type="subtitle" style={styles.searchEmptyTitle}>
                  {t('document.searchFieldsEmptyTitle')}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.searchEmptyText}>
                  {t('document.searchFieldsEmptyText')}
                </ThemedText>
              </View>
            ) : null}
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
          </Animated.ScrollView>
          {scrollOverlay}
          {scrollFab}
        </View>
      </ThemedView>
    </>
  );
}

function createStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: Spacing.four,
      gap: Spacing.four,
    },
    typeHero: {
      borderRadius: AppDesign.radius.xl,
      padding: 22,
      gap: 10,
      overflow: 'hidden',
      ...AppDesign.heroShadow,
    },
    typeHeroWatermark: {
      position: 'absolute',
      right: -20,
      bottom: -30,
      opacity: 0.14,
      transform: [{ rotate: '-14deg' }],
    },
    typeHeroIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    typeHeroEmoji: {
      fontSize: 26,
      color: '#fff',
    },
    typeHeroTitle: {
      color: '#fff',
      fontSize: 26,
      fontWeight: '800',
      lineHeight: 32,
    },
    typeHeroMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    typeHeroChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: AppDesign.radius.pill,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    typeHeroSubtitle: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
    },
    typeHeroDate: {
      color: 'rgba(255,255,255,0.78)',
      fontSize: 13,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    sectionHeaderText: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: _colors.textMuted,
    },
    sectionCountBadge: {
      minWidth: 24,
      height: 24,
      paddingHorizontal: 6,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: _colors.surfaceContainer,
    },
    sectionCountText: {
      fontSize: 12,
      fontWeight: '800',
      color: _colors.text,
    },
    details: {
      gap: Spacing.two,
    },
    searchEmpty: {
      paddingVertical: Spacing.four,
      paddingHorizontal: Spacing.two,
      alignItems: 'center',
      gap: Spacing.two,
    },
    searchEmptyTitle: {
      textAlign: 'center',
    },
    searchEmptyText: {
      textAlign: 'center',
      lineHeight: 20,
    },
    editButton: {
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.one,
      marginRight: Spacing.one,
    },
    editButtonPressed: {
      opacity: 0.6,
    },
    headerRightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginRight: 2,
      flexShrink: 0,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.four,
    },
    pdfButton: {
      borderRadius: AppDesign.radius.pill,
      paddingVertical: Spacing.three,
      alignItems: 'center',
      ...AppDesign.heroShadow,
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
