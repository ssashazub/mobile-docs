import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, Stack, useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';

import {
  CollapsingSearchBody,
  CollapsingSearchHeaderBtn,
  useCollapsingSearchMorph,
} from '@/components/collapsing-field-search';
import {
  ScrollEdgeFab,
  type ScrollEdgeFabHandle,
} from '@/components/ui/scroll-edge-fab';
import { AppKeyboardAvoiding } from '@/components/ui/app-keyboard-avoiding';
import { TemplateIconBadge } from '@/components/template-icon-view';
import { PdfFormFieldInput } from '@/components/pdf-form-field';
import { ValidatedFormField } from '@/components/validated-form-field';
import { PdfLayoutPicker } from '@/components/pdf-layout-picker';
import { LoadingState } from '@/components/ui/loading-state';
import { showAppAlert } from '@/components/ui/app-alert';
import { EditorOverflowMenu } from '@/components/ui/editor-overflow-menu';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppDesign } from '@/constants/app-design';
import { IMPORTED_FORM_TEMPLATE_ID } from '@/constants/imported-pdf';
import { getDocumentDisplayInfo, isExternalPdfImport, isImportedFormDocument } from '@/lib/document-display';
import {
  canFillOnDocument,
  ensurePdfBackedForOnDocumentFill,
} from '@/lib/document-fill-mode';
import { filterByFieldSearchQuery } from '@/lib/document-search';
import { getDocuments, updateDocument } from '@/lib/document-storage';
import { buildDocumentFromFields } from '@/lib/document-helpers';
import { getFieldValidationAlert } from '@/lib/field-validation-alert';
import { validatePdfFormFields, validateTemplateFields } from '@/lib/field-validation';
import { normalizePdfStyle } from '@/lib/template-helpers';
import { getTemplateById } from '@/lib/template-storage';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useFieldFocusOnError } from '@/hooks/use-field-focus-on-error';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { useLayout } from '@/hooks/use-layout';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import * as Haptics from '@/lib/haptics';
import type { Document, PdfFormField } from '@/types/document';
import type { DocumentTemplate, PdfStyle, TemplateField } from '@/types/template';
import type { FieldValidationError } from '@/types/field-validation';

function parseDocumentId(id: string | string[] | undefined): number | null {
  const rawId = Array.isArray(id) ? id[0] : id;
  const parsedId = Number(rawId);

  if (!rawId || Number.isNaN(parsedId)) {
    return null;
  }

  return parsedId;
}

type EditorRow =
  | { key: string; kind: 'pdf'; field: PdfFormField }
  | { key: string; kind: 'template'; field: TemplateField }
  | { key: string; kind: 'empty-import' };

function ListSeparator() {
  return <View style={{ height: Spacing.three }} />;
}

const PdfEditorRow = memo(function PdfEditorRow({
  field,
  value,
  error,
  shakeToken,
  onChangeField,
}: {
  field: PdfFormField;
  value: string;
  error: boolean;
  shakeToken: number;
  onChangeField: (name: string, value: string) => void;
}) {
  const onChange = useCallback(
    (next: string) => onChangeField(field.name, next),
    [field.name, onChangeField]
  );

  return (
    <PdfFormFieldInput
      field={field}
      value={value}
      onChange={onChange}
      error={error}
      shakeToken={shakeToken}
    />
  );
});

export default function EditDocumentScreen() {
  const { t } = useI18n();
  const colors = useTheme();
  const layout = useLayout();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id, view } = useLocalSearchParams<{ id: string; view?: string }>();
  const documentId = parseDocumentId(id);
  const designView = view === 'design';
  const insets = useSafeAreaInsets();

  const [document, setDocument] = useState<Document | null>(null);
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pdfStyle, setPdfStyle] = useState<PdfStyle>(normalizePdfStyle(undefined));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [jumpingToEnd, setJumpingToEnd] = useState(false);
  const [menuHintPulseKey, setMenuHintPulseKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [headerSearchExpanded, setHeaderSearchExpanded] = useState(false);
  const scrollY = useSharedValue(0);
  const searchMorph = useCollapsingSearchMorph(scrollY);
  const scrollFabRef = useRef<ScrollEdgeFabHandle>(null);
  const offsetYRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const jumpGenerationRef = useRef(0);
  const rowsLengthRef = useRef(0);
  const pendingFocusRef = useRef<FieldValidationError | null>(null);
  const {
    listRef,
    errorFieldKey,
    shakeToken,
    setFieldIndexes,
    clearFieldError,
    focusInvalidField,
  } = useFieldFocusOnError();

  const revealAndFocusInvalidField = useCallback(
    (error: FieldValidationError) => {
      if (searchQuery.trim()) {
        pendingFocusRef.current = error;
        setSearchQuery('');
        return;
      }
      focusInvalidField(error);
    },
    [focusInvalidField, searchQuery]
  );

  useEffect(() => {
    if (searchQuery.trim() || !pendingFocusRef.current) {
      return;
    }
    const error = pendingFocusRef.current;
    pendingFocusRef.current = null;
    const frame = requestAnimationFrame(() => {
      focusInvalidField(error);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusInvalidField, searchQuery]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    offsetYRef.current = contentOffset.y;
    viewportHeightRef.current = layoutMeasurement.height;
    contentHeightRef.current = contentSize.height;
    scrollY.value = contentOffset.y;
    // Body search visible again — fold the header field back to the circle.
    if (headerSearchExpanded && contentOffset.y < searchMorph.searchOffset.value - 12) {
      setHeaderSearchExpanded(false);
    }
    scrollFabRef.current?.setMetrics(
      contentOffset.y,
      layoutMeasurement.height,
      contentSize.height
    );
  }, [headerSearchExpanded, scrollY, searchMorph.searchOffset]);

  const scrollToTop = useCallback(() => {
    jumpGenerationRef.current += 1;
    setJumpingToEnd(false);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [listRef]);

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const isNearBottom = useCallback(() => {
    const content = contentHeightRef.current;
    const viewport = viewportHeightRef.current;
    const offset = offsetYRef.current;
    if (content <= 0 || viewport <= 0) {
      return false;
    }
    return content - (offset + viewport) <= 28;
  }, []);

  const jumpToLastItem = useCallback(
    (animated: boolean) => {
      const lastIndex = Math.max(0, rowsLengthRef.current - 1);
      try {
        listRef.current?.scrollToIndex({
          index: lastIndex,
          animated,
          viewPosition: 1,
        });
      } catch {
        listRef.current?.scrollToEnd({ animated });
      }
    },
    [listRef]
  );

  const scrollToBottom = useCallback(async () => {
    if (jumpingToEnd) {
      return;
    }

    const totalRows = rowsLengthRef.current;
    const isLargeDocument = totalRows >= 80;
    const generation = ++jumpGenerationRef.current;

    // Short lists are already mounted — normal smooth scroll is enough.
    if (!isLargeDocument) {
      jumpToLastItem(true);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
      return;
    }

    setJumpingToEnd(true);
    const startedAt = Date.now();

    try {
      let previousContentHeight = -1;
      let stablePasses = 0;

      for (let attempt = 0; attempt < 60; attempt++) {
        if (jumpGenerationRef.current !== generation) {
          return;
        }

        jumpToLastItem(false);
        await wait(40);
        if (jumpGenerationRef.current !== generation) {
          return;
        }

        listRef.current?.scrollToEnd({ animated: false });
        await wait(24);

        const contentHeight = contentHeightRef.current;
        if (Math.abs(contentHeight - previousContentHeight) < 2) {
          stablePasses += 1;
        } else {
          stablePasses = 0;
        }
        previousContentHeight = contentHeight;

        if (isNearBottom() && stablePasses >= 2) {
          break;
        }

        listRef.current?.scrollToOffset({
          offset: Math.max(
            contentHeightRef.current,
            (attempt + 1) * Math.max(viewportHeightRef.current, 500)
          ),
          animated: false,
        });
      }

      if (jumpGenerationRef.current !== generation) {
        return;
      }

      // Land at the bottom before the loader disappears — no visible scroll.
      listRef.current?.scrollToEnd({ animated: false });
      scrollFabRef.current?.setMetrics(
        offsetYRef.current,
        viewportHeightRef.current,
        contentHeightRef.current
      );

      const elapsed = Date.now() - startedAt;
      if (elapsed < 550) {
        await wait(550 - elapsed);
      }
    } finally {
      if (jumpGenerationRef.current === generation) {
        // Final snap in case layout settled during the min loader time.
        listRef.current?.scrollToEnd({ animated: false });
        setJumpingToEnd(false);
        requestAnimationFrame(() => {
          listRef.current?.scrollToEnd({ animated: false });
          scrollFabRef.current?.setMetrics(
            offsetYRef.current,
            viewportHeightRef.current,
            contentHeightRef.current
          );
        });
      }
    }
  }, [isNearBottom, jumpToLastItem, jumpingToEnd, listRef]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadDocument = async () => {
        if (documentId === null) {
          if (isActive) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        setLoading(true);
        setNotFound(false);

        try {
          const documents = await getDocuments();
          const foundDocument = documents.find((doc) => doc.id === documentId);

          if (!foundDocument) {
            if (isActive) {
              setNotFound(true);
            }
            return;
          }

          if (isImportedFormDocument(foundDocument)) {
            if (isActive) {
              setDocument(foundDocument);
              setFields(foundDocument.fields);
              if (
                foundDocument.templateId &&
                foundDocument.templateId !== IMPORTED_FORM_TEMPLATE_ID
              ) {
                const loadedTemplate = await getTemplateById(foundDocument.templateId);
                setTemplate(loadedTemplate ?? null);
                if (loadedTemplate) {
                  setPdfStyle(
                    normalizePdfStyle(
                      foundDocument.pdfStyle ?? loadedTemplate.pdfStyle,
                      loadedTemplate.id
                    )
                  );
                }
              } else {
                setTemplate(null);
              }
            }
            return;
          }

          const loadedTemplate = await getTemplateById(foundDocument.templateId);

          if (!loadedTemplate) {
            if (isActive) {
              setNotFound(true);
            }
            return;
          }

          if (isActive) {
            setDocument(foundDocument);
            setTemplate(loadedTemplate);
            setFields(foundDocument.fields);
            setPdfStyle(
              normalizePdfStyle(
                foundDocument.pdfStyle ?? loadedTemplate.pdfStyle,
                loadedTemplate.id
              )
            );
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      loadDocument();

      return () => {
        isActive = false;
      };
    }, [documentId])
  );

  const display = document ? getDocumentDisplayInfo(document, template) : null;
  const isFormImport = document ? isImportedFormDocument(document) : false;
  const formFieldCount = document?.formFields?.length ?? 0;
  /** Full document editor: layout picker + template fields (not AcroForm list). */
  const useDesignEditor = Boolean(template) && (!isFormImport || designView);
  const showFillOnDocument = Boolean(
    document && (isFormImport || canFillOnDocument(document))
  );

  const updateField = useCallback(
    (key: string, value: string) => {
      clearFieldError(key);
      setFields((current) => ({ ...current, [key]: value }));
    },
    [clearFieldError]
  );

  const navigateAfterExit = (destination: 'home' | 'library') => {
    if (destination === 'home') {
      router.dismissAll();
      return;
    }

    router.replace('/documents' as Href);
  };

  const saveDocument = async (
    destination: 'default' | 'home' | 'library' | 'none' = 'default'
  ): Promise<boolean> => {
    if (documentId === null || !document) {
      return false;
    }

    if (useDesignEditor && template) {
      const validationError = validateTemplateFields(template.fields, fields);

      if (validationError) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        revealAndFocusInvalidField(validationError);

        if (validationError.messageKey !== 'required') {
          const alert = getFieldValidationAlert(validationError, t);
          showAppAlert(alert.title, alert.message);
        }

        return false;
      }
    } else if (
      isImportedFormDocument(document) &&
      document.formFields &&
      !isExternalPdfImport(document)
    ) {
      const validationError = validatePdfFormFields(document.formFields, fields);

      if (validationError) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        revealAndFocusInvalidField(validationError);

        if (validationError.messageKey !== 'required') {
          const alert = getFieldValidationAlert(validationError, t);
          showAppAlert(alert.title, alert.message);
        }

        return false;
      }
    } else if (!isExternalPdfImport(document) && template) {
      const validationError = validateTemplateFields(template.fields, fields);

      if (validationError) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        revealAndFocusInvalidField(validationError);

        if (validationError.messageKey !== 'required') {
          const alert = getFieldValidationAlert(validationError, t);
          showAppAlert(alert.title, alert.message);
        }

        return false;
      }
    }

    setSaving(true);

    try {
      if (useDesignEditor && template && isImportedFormDocument(document)) {
        const nextFields = Object.fromEntries(
          Object.entries(fields).map(([key, value]) => [key, value.trim()])
        );
        const firstValue = Object.values(nextFields).find((value) => value.length > 0);

        await updateDocument({
          ...document,
          fields: nextFields,
          pdfStyle,
          formFields: template.fields.map((field) => {
            const existing = document.formFields?.find((item) => item.name === field.key);
            return {
              name: field.key,
              label: field.label,
              type: 'text' as const,
              value: nextFields[field.key] ?? '',
              inputKind: field.kind,
              rect: existing?.rect ?? field.rect,
              origin: existing?.origin ?? 'custom',
              sourceText: existing?.sourceText,
              fontSize: existing?.fontSize,
              align: existing?.align,
            };
          }),
          title: nextFields.title?.trim() || firstValue || document.title,
        });
        if (destination === 'default') {
          allowNavigation();
          router.replace(`/document/${documentId}`);
        } else if (destination !== 'none') {
          navigateAfterExit(destination);
        }
        return true;
      }

      if (isImportedFormDocument(document)) {
        const nextFields = Object.fromEntries(
          Object.entries(fields).map(([key, value]) => [key, value.trim()])
        );
        const firstValue = Object.values(nextFields).find((value) => value.length > 0);

        await updateDocument({
          ...document,
          fields: nextFields,
          formFields: document.formFields?.map((field) => ({
            ...field,
            value: nextFields[field.name] ?? '',
          })),
          title: firstValue || document.title,
        });
        if (destination === 'default') {
          allowNavigation();
          router.replace(`/document/${documentId}`);
        } else if (destination !== 'none') {
          navigateAfterExit(destination);
        }
        return true;
      }

      if (!template || !fields.title?.trim()) {
        return false;
      }

      const updatedDocument = buildDocumentFromFields(template, fields, documentId, pdfStyle);
      await updateDocument({ ...updatedDocument, createdAt: document.createdAt });
      if (destination === 'default') {
        allowNavigation();
        router.back();
      } else if (destination !== 'none') {
        navigateAfterExit(destination);
      }
      return true;
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    if (!document) {
      return false;
    }

    const fieldsChanged = Object.keys({ ...document.fields, ...fields }).some(
      (key) => (document.fields[key] ?? '') !== (fields[key] ?? '')
    );
    if (fieldsChanged) {
      return true;
    }

    if (isImportedFormDocument(document) && !useDesignEditor) {
      return false;
    }

    const initialStyle = normalizePdfStyle(
      document.pdfStyle ?? template?.pdfStyle,
      template?.id
    );
    return JSON.stringify(pdfStyle) !== JSON.stringify(initialStyle);
  }, [document, fields, pdfStyle, template, useDesignEditor]);

  const allowNavigation = useUnsavedChangesGuard({
    hasChanges,
    onSave: () => saveDocument('none'),
  });

  // Pulse ⋮ once the editor is ready (not on focus alone — loading unmounts the header).
  useEffect(() => {
    if (loading || !showFillOnDocument || documentId === null) {
      return;
    }
    setMenuHintPulseKey((key) => key + 1);
  }, [documentId, loading, showFillOnDocument]);

  const openFillOnDocument = useCallback(() => {
    if (!document) {
      return;
    }
    allowNavigation();
    void (async () => {
      try {
        const ready = await ensurePdfBackedForOnDocumentFill(document);
        router.push(`/document/fill-on-page/${ready.id}` as Href);
      } catch (error) {
        showAppAlert(
          t('import.errorTitle'),
          error instanceof Error ? error.message : t('import.errorTitle')
        );
      }
    })();
  }, [allowNavigation, document, t]);

  const openFillOnDocumentRef = useRef(openFillOnDocument);
  openFillOnDocumentRef.current = openFillOnDocument;
  const navigateAfterExitRef = useRef(navigateAfterExit);
  navigateAfterExitRef.current = navigateAfterExit;

  const canOpenDesignEditor = Boolean(
    isFormImport && template && !designView
  );

  const openDocumentEditor = useCallback(() => {
    router.setParams({ view: 'design' });
  }, []);

  const openDocumentEditorRef = useRef(openDocumentEditor);
  openDocumentEditorRef.current = openDocumentEditor;

  const handleOverflowFillOnDocument = useCallback(() => {
    openFillOnDocumentRef.current();
  }, []);

  const handleOverflowOpenDocumentEditor = useCallback(() => {
    openDocumentEditorRef.current();
  }, []);

  const saveDocumentRef = useRef(saveDocument);
  saveDocumentRef.current = saveDocument;

  const handleOverflowSave = useCallback(() => {
    void saveDocumentRef.current();
  }, []);

  const rows = useMemo<EditorRow[]>(() => {
    if (!document || !display) {
      return [];
    }

    if (useDesignEditor && template) {
      return template.fields.map((field) => ({
        key: field.key,
        kind: 'template' as const,
        field,
      }));
    }

    if (isFormImport && formFieldCount > 0) {
      return document.formFields!.map((field) => ({
        key: field.name,
        kind: 'pdf' as const,
        field,
      }));
    }

    if (isFormImport) {
      return [{ key: 'empty-import', kind: 'empty-import' as const }];
    }

    return display.fields.map((field) => ({
      key: field.key,
      kind: 'template' as const,
      field,
    }));
  }, [display, document, formFieldCount, isFormImport, template, useDesignEditor]);

  const canSearchFields = useMemo(
    () => rows.some((row) => row.kind === 'pdf' || row.kind === 'template'),
    [rows]
  );

  const headerRight = useCallback(
    () => (
      <View style={styles.headerRightRow}>
        {canSearchFields ? (
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
        <EditorOverflowMenu
          onGoHome={() => navigateAfterExitRef.current('home')}
          onOpenLibrary={() => navigateAfterExitRef.current('library')}
          onOpenDocumentEditor={
            canOpenDesignEditor ? handleOverflowOpenDocumentEditor : undefined
          }
          onFillOnDocument={
            showFillOnDocument ? handleOverflowFillOnDocument : undefined
          }
          onSave={handleOverflowSave}
          hintPulseKey={showFillOnDocument ? menuHintPulseKey : -1}
        />
      </View>
    ),
    [
      canOpenDesignEditor,
      canSearchFields,
      handleOverflowFillOnDocument,
      handleOverflowOpenDocumentEditor,
      handleOverflowSave,
      headerSearchExpanded,
      menuHintPulseKey,
      searchMorph,
      searchQuery,
      showFillOnDocument,
      styles.headerRightRow,
      t,
    ]
  );

  const filteredRows = useMemo(() => {
    if (!canSearchFields) {
      return rows;
    }

    return filterByFieldSearchQuery(rows, searchQuery, (row) => {
      if (row.kind === 'pdf') {
        return {
          label: row.field.label,
          id: row.field.name,
          value: fields[row.field.name] ?? row.field.value ?? '',
        };
      }
      if (row.kind === 'template') {
        return {
          label: row.field.label,
          id: row.field.key,
          value: fields[row.field.key] ?? '',
        };
      }
      return {};
    });
  }, [canSearchFields, fields, rows, searchQuery]);

  const isSearchingFields = canSearchFields && searchQuery.trim().length > 0;

  useEffect(() => {
    rowsLengthRef.current = filteredRows.length;
    setFieldIndexes(rows.map((row, index) => ({ key: row.key, index })));
  }, [filteredRows.length, rows, setFieldIndexes]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<EditorRow>) => {
      if (item.kind === 'empty-import' && document) {
        return (
          <PrimaryButton
            label={t('import.createTemplate')}
            variant="secondary"
            onPress={() => {
              allowNavigation();
              router.push(`/document/markup/${document.id}` as Href);
            }}
          />
        );
      }

      if (item.kind === 'pdf') {
        return (
          <PdfEditorRow
            field={item.field}
            value={fields[item.field.name] ?? ''}
            onChangeField={updateField}
            error={errorFieldKey === item.field.name}
            shakeToken={errorFieldKey === item.field.name ? shakeToken : 0}
          />
        );
      }

      if (item.kind === 'template') {
        return (
          <ValidatedFormField
            fieldKey={item.field.key}
            kind={item.field.kind}
            label={item.field.label}
            value={fields[item.field.key] ?? ''}
            required={item.field.required}
            error={errorFieldKey === item.field.key}
            shakeToken={errorFieldKey === item.field.key ? shakeToken : 0}
            onChangeText={(value) => updateField(item.field.key, value)}
            placeholder={item.field.placeholder}
            multiline
            textAlignVertical={item.field.multiline ? 'top' : undefined}
            style={item.field.multiline ? styles.descriptionInput : undefined}
          />
        );
      }

      return null;
    },
    [
      allowNavigation,
      document,
      errorFieldKey,
      fields,
      shakeToken,
      styles.descriptionInput,
      t,
      updateField,
    ]
  );

  const listHeader = useMemo(() => {
    if (!document || !display) {
      return null;
    }

    const editHint = useDesignEditor
      ? t('document.editHint')
      : document.hasNativeAcroForm
        ? t('import.formHint')
        : formFieldCount > 0
          ? t('import.detectedFieldsHint')
          : t('import.flatMessage');

    return (
      <View style={styles.headerBlock}>
        <LinearGradient
          colors={[display.accentColor, display.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.typeBanner}
        >
          <TemplateIconBadge
            icon={display.icon}
            title={display.title}
            size={15}
            color="#ffffff"
            titleStyle={styles.typeBannerText}
          />
        </LinearGradient>

        <ThemedText themeColor="textSecondary" style={styles.hint}>
          {editHint}
        </ThemedText>

        {useDesignEditor && template ? (
          <PdfLayoutPicker
            value={pdfStyle}
            accentColor={template.accentColor}
            gradientEnd={template.gradientEnd}
            onChange={setPdfStyle}
          />
        ) : null}

        {canSearchFields ? (
          <CollapsingSearchBody
            morph={searchMorph}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('document.searchFieldsPlaceholder')}
          />
        ) : null}
      </View>
    );
  }, [
    canSearchFields,
    display,
    document,
    formFieldCount,
    pdfStyle,
    searchMorph,
    searchQuery,
    styles.headerBlock,
    styles.hint,
    styles.typeBanner,
    styles.typeBannerText,
    t,
    template,
    useDesignEditor,
  ]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <LoadingState />
      </ThemedView>
    );
  }

  if (notFound || !document || !display) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">{t('document.notFound')}</ThemedText>
        <PrimaryButton label={t('common.back')} variant="secondary" onPress={() => router.back()} />
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${t('document.editTitle')} · ${display.title}`,
          headerRight,
        }}
      />

      <ThemedView style={styles.screen}>
        <AppKeyboardAvoiding>
          <View style={styles.flex}>
            <View style={styles.flex}>
              <FlatList
                ref={listRef as RefObject<FlatList<EditorRow>>}
                data={filteredRows}
                keyExtractor={(item) => item.key}
                renderItem={renderItem}
                ListHeaderComponent={listHeader}
                ListEmptyComponent={
                  isSearchingFields ? (
                    <View style={styles.searchEmpty}>
                      <ThemedText type="subtitle" style={styles.searchEmptyTitle}>
                        {t('document.searchFieldsEmptyTitle')}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" style={styles.searchEmptyText}>
                        {t('document.searchFieldsEmptyText')}
                      </ThemedText>
                    </View>
                  ) : null
                }
                contentContainerStyle={[
                  styles.content,
                  layout.contentStyle,
                  { paddingBottom: Spacing.four },
                ]}
                ItemSeparatorComponent={ListSeparator}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onContentSizeChange={(_width, height) => {
                  contentHeightRef.current = height;
                }}
                onLayout={(event) => {
                  viewportHeightRef.current = event.nativeEvent.layout.height;
                }}
                removeClippedSubviews
                initialNumToRender={12}
                maxToRenderPerBatch={10}
                windowSize={9}
                updateCellsBatchingPeriod={50}
                extraData={`${errorFieldKey}:${shakeToken}:${searchQuery}`}
                onScrollToIndexFailed={(info) => {
                  listRef.current?.scrollToOffset({
                    offset: Math.max(0, info.averageItemLength * info.index),
                    animated: false,
                  });
                }}
              />

              {jumpingToEnd ? (
                <View style={styles.jumpOverlay} pointerEvents="auto">
                  <LoadingState />
                </View>
              ) : null}

              {!jumpingToEnd ? (
                <ScrollEdgeFab
                  ref={scrollFabRef}
                  colors={colors}
                  onScrollToTop={scrollToTop}
                  onScrollToBottom={() => {
                    void scrollToBottom();
                  }}
                  topLabel={t('common.scrollToTop')}
                  bottomLabel={t('common.scrollToBottom')}
                />
              ) : null}
            </View>

            <View
              style={[
                styles.footer,
                {
                  paddingBottom: Math.max(insets.bottom, 12),
                  borderTopColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            >
              <PrimaryButton
                label={t('common.save')}
                onPress={() => void saveDocument()}
                loading={saving}
              />
              <PrimaryButton
                label={t('common.cancel')}
                variant="secondary"
                onPress={() => router.back()}
                disabled={saving}
              />
            </View>
          </View>
        </AppKeyboardAvoiding>
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
    },
    headerBlock: {
      gap: Spacing.four,
      marginBottom: Spacing.three,
    },
    headerRightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexShrink: 0,
    },
    typeBanner: {
      borderRadius: AppDesign.radius.md,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignSelf: 'flex-start',
    },
    typeBannerText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 15,
    },
    hint: {
      lineHeight: 22,
    },
    descriptionInput: {
      minHeight: 120,
      paddingTop: Spacing.two + 2,
    },
    searchEmpty: {
      paddingVertical: Spacing.five,
      paddingHorizontal: Spacing.three,
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
    footer: {
      gap: Spacing.two,
      paddingHorizontal: Spacing.four,
      paddingTop: Spacing.three,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    jumpOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 8,
      backgroundColor: 'transparent',
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.four,
      gap: Spacing.three,
    },
  });
}
