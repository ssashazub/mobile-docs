import { useCallback, useMemo, useRef, useState } from 'react';
import {
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, type Href, useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PdfDrawFieldLayer } from '@/components/pdf-draw-field-layer';
import { PdfFieldHighlight } from '@/components/pdf-field-highlight';
import { PdfFieldInputSheet } from '@/components/pdf-field-input-sheet';
import { PdfPageCanvas } from '@/components/pdf-page-canvas';
import {
  PdfPageRasterizer,
  type RasterizedPage,
} from '@/components/pdf-page-rasterizer';
import { EditorOverflowMenu } from '@/components/ui/editor-overflow-menu';
import { LoadingState } from '@/components/ui/loading-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { showAppAlert } from '@/components/ui/app-alert';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppDesign } from '@/constants/app-design';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { isImportedFormDocument } from '@/lib/document-display';
import { getDocuments, updateDocument } from '@/lib/document-storage';
import { detectedFieldsToFormFields } from '@/lib/pdf-detect-fields';
import { createFieldName } from '@/lib/pdf-overlay-state';
import { pdfRectToUi } from '@/lib/pdf-coords';
import { inferPdfFormFieldInputKind } from '@/lib/field-validation';
import { isCheckboxChecked } from '@/lib/pdf-form';
import type { DetectedPdfField } from '@/lib/pdfjs-rasterizer-html';
import type { Document, PdfFieldRect, PdfFormField } from '@/types/document';

function parseDocumentId(id: string | string[] | undefined): number | null {
  const rawId = Array.isArray(id) ? id[0] : id;
  const parsedId = Number(rawId);
  if (!rawId || Number.isNaN(parsedId)) {
    return null;
  }
  return parsedId;
}

function fieldOverlayState(
  field: PdfFormField,
  value: string
): { text: string; cover: boolean } {
  if (field.type === 'checkbox') {
    return {
      text: isCheckboxChecked(value) ? '✓' : '',
      cover: false,
    };
  }

  const trimmed = value.trim();
  const source = field.sourceText?.trim() ?? '';

  // Unchanged PDF text — let the raster show through.
  if (source && trimmed === source) {
    return { text: '', cover: false };
  }

  // Cleared or replaced — cover the original glyphs (empty = erase).
  if (source && trimmed !== source) {
    return { text: trimmed, cover: true };
  }

  return { text: trimmed, cover: trimmed.length > 0 };
}

export default function FillOnPageScreen() {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = parseDocumentId(id);

  const [document, setDocument] = useState<Document | null>(null);
  const [draft, setDraft] = useState<Document | null>(null);
  const [pages, setPages] = useState<RasterizedPage[]>([]);
  const [contentWidth, setContentWidth] = useState(0);
  const [activeFieldName, setActiveFieldName] = useState<string | null>(null);
  const [sheetValue, setSheetValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [rasterizing, setRasterizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [pendingRect, setPendingRect] = useState<PdfFieldRect | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const promptedNoFieldsRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      promptedNoFieldsRef.current = false;

      const load = async () => {
        if (documentId === null) {
          if (active) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        setLoading(true);
        try {
          const documents = await getDocuments();
          const found = documents.find((doc) => doc.id === documentId);
          if (!active) {
            return;
          }
          if (!found || !isImportedFormDocument(found) || !found.originalPdfUri) {
            setNotFound(true);
            setDocument(null);
            setDraft(null);
          } else {
            setDocument(found);
            setDraft(found);
            setNotFound(false);
            setPages([]);
            setRasterizing(true);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void load();
      return () => {
        active = false;
      };
    }, [documentId])
  );

  const activeField =
    draft?.formFields?.find((field) => field.name === activeFieldName) ?? null;

  const openField = (field: PdfFormField) => {
    if (drawMode) {
      return;
    }

    if (field.type === 'checkbox') {
      setDraft((current) => {
        if (!current) {
          return current;
        }
        const currentValue = current.fields[field.name] ?? '';
        const next = isCheckboxChecked(currentValue) ? 'false' : 'true';
        return {
          ...current,
          fields: { ...current.fields, [field.name]: next },
          formFields: current.formFields?.map((item) =>
            item.name === field.name ? { ...item, value: next } : item
          ),
        };
      });
      return;
    }

    setActiveFieldName(field.name);
    setSheetValue(draft?.fields[field.name] ?? field.value ?? '');
  };

  const confirmField = (value: string) => {
    if (!activeFieldName) {
      return;
    }

    setDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        fields: { ...current.fields, [activeFieldName]: value },
        formFields: current.formFields?.map((field) =>
          field.name === activeFieldName ? { ...field, value } : field
        ),
      };
    });
    setSheetValue(value);
    setActiveFieldName(null);
  };

  const addManualField = () => {
    if (!pendingRect || !draft) {
      return;
    }

    const label = newFieldLabel.trim() || t('common.newField');
    const existingNames = (draft.formFields ?? []).map((field) => field.name);
    const name = createFieldName(label, existingNames);
    const field: PdfFormField = {
      name,
      label,
      type: 'text',
      value: '',
      inputKind: inferPdfFormFieldInputKind(name, label),
      rect: pendingRect,
      origin: 'custom',
    };

    const nextDocument: Document = {
      ...draft,
      formFields: [...(draft.formFields ?? []), field],
      fields: { ...draft.fields, [name]: '' },
    };
    setDraft(nextDocument);
    void updateDocument(nextDocument);

    setPendingRect(null);
    setNewFieldLabel('');
    setDrawMode(false);
    setActiveFieldName(name);
    setSheetValue('');
  };

  const promptCreateTemplate = useCallback(() => {
    if (!document || promptedNoFieldsRef.current) {
      return;
    }
    promptedNoFieldsRef.current = true;
    showAppAlert(t('import.noDetectedFieldsTitle'), t('import.noDetectedFieldsText'), [
      {
        text: t('import.createTemplate'),
        onPress: () => router.replace(`/document/markup/${document.id}` as Href),
      },
      {
        text: t('import.addFieldManual'),
        onPress: () => setDrawMode(true),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [document, t]);

  const handleDetectedFields = useCallback(
    async (detected: DetectedPdfField[]) => {
      let nextDocument: Document | null = null;
      let shouldPrompt = false;

      setDraft((current) => {
        if (!current) {
          return current;
        }

        const preserved = (current.formFields ?? []).filter(
          (field) => field.origin === 'acroform' || field.origin === 'custom'
        );
        const autoFields = detectedFieldsToFormFields(
          detected,
          current.formFields ?? [],
          current.fields
        );
        const formFields = [...preserved, ...autoFields];
        const fields = {
          ...current.fields,
          ...Object.fromEntries(
            formFields.map((field) => [field.name, current.fields[field.name] ?? field.value ?? ''])
          ),
        };

        nextDocument = {
          ...current,
          formFields,
          fields,
        };
        shouldPrompt = detected.length === 0 && !formFields.some((field) => field.rect);
        return nextDocument;
      });

      if (nextDocument) {
        void updateDocument(nextDocument);
      }

      if (shouldPrompt) {
        queueMicrotask(() => {
          promptCreateTemplate();
        });
      }
    },
    [promptCreateTemplate]
  );

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    setSaving(true);
    try {
      const synced: Document = {
        ...draft,
        formFields: draft.formFields?.map((field) => ({
          ...field,
          value: draft.fields[field.name] ?? field.value,
        })),
      };

      await updateDocument(synced);
      setDocument(synced);
      setDraft(synced);

      if ((synced.formFields?.length ?? 0) > 0) {
        router.replace(`/document/edit/${synced.id}` as Href);
      } else {
        router.replace(`/document/${synced.id}` as Href);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: t('import.fillOnDocument') }} />
        <LoadingState />
      </ThemedView>
    );
  }

  if (notFound || !document || !draft || !document.originalPdfUri) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: t('import.fillOnDocument') }} />
        <ThemedText>{t('document.notFound')}</ThemedText>
      </ThemedView>
    );
  }

  const fieldsWithRect = (draft.formFields ?? []).filter((field) => field.rect);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemedView style={styles.flex}>
        <Stack.Screen
          options={{
            title: t('import.fillOnDocument'),
            headerRight: () => (
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setDrawMode((current) => !current);
                    setActiveFieldName(null);
                  }}
                  style={({ pressed }) => [
                    styles.addFieldButton,
                    drawMode && styles.addFieldButtonActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={
                      drawMode
                        ? { ios: 'xmark', android: 'close', web: 'close' }
                        : { ios: 'plus', android: 'add', web: 'add' }
                    }
                    size={15}
                    tintColor={drawMode ? '#ef4444' : colors.primary}
                    weight="semibold"
                  />
                  <ThemedText
                    style={[styles.addFieldButtonText, drawMode && styles.addFieldButtonTextActive]}
                  >
                    {drawMode ? t('common.cancel') : t('import.addFieldManual')}
                  </ThemedText>
                </Pressable>
                <EditorOverflowMenu
                  onGoHome={() => router.dismissAll()}
                  onOpenLibrary={() => router.replace('/documents' as Href)}
                  onSave={() => {
                    if (!saving) {
                      void handleSave();
                    }
                  }}
                />
              </View>
            ),
          }}
        />

        {rasterizing && pages.length === 0 ? (
          <View style={styles.centered}>
            <LoadingState label={t('import.rasterizing')} />
          </View>
        ) : pages.length > 0 ? (
          <View
            style={styles.flex}
            onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}
          >
            <ThemedText style={styles.hint}>
              {drawMode ? t('import.drawFieldHint') : t('import.smartFillHint')}
            </ThemedText>
            <PdfPageCanvas
              pages={pages}
              contentWidth={Math.max(200, contentWidth)}
              pageGap={10}
              enablePinchZoom
              renderOverlays={(layout) =>
                fieldsWithRect
                  .filter((field) => field.rect?.pageIndex === layout.pageIndex)
                  .map((field) => {
                    const overlay = fieldOverlayState(
                      field,
                      draft.fields[field.name] ?? field.value ?? ''
                    );
                    return (
                      <PdfFieldHighlight
                        key={field.name}
                        rect={pdfRectToUi(field.rect!, layout.heightPt, layout.scale)}
                        fontSizePt={Math.min(
                          field.fontSize ??
                            Math.min(8, Math.max(5.5, (field.rect?.height ?? 10) * 0.5)),
                          Math.max(5, (field.rect?.height ?? 10) * 0.58)
                        )}
                        scale={layout.scale}
                        align={field.align ?? 'left'}
                        bold={field.bold}
                        label={field.label}
                        value={overlay.text}
                        selected={activeFieldName === field.name}
                        filled={overlay.cover}
                        onPress={() => openField(field)}
                      />
                    );
                  })
              }
              renderInteractionLayer={
                drawMode
                  ? (layout) => (
                      <PdfDrawFieldLayer
                        layout={layout}
                        colors={colors}
                        onComplete={(rect) => {
                          setPendingRect(rect);
                          setNewFieldLabel('');
                        }}
                      />
                    )
                  : undefined
              }
            />
          </View>
        ) : (
          <View style={styles.centered}>
            <LoadingState label={t('import.rasterizing')} />
          </View>
        )}

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {(draft.formFields?.length ?? 0) > 0 ? (
            <Pressable
              onPress={() => {
                void (async () => {
                  // Persist detected/edited fields before switching to the list editor.
                  await updateDocument({
                    ...draft,
                    formFields: draft.formFields?.map((field) => ({
                      ...field,
                      value: draft.fields[field.name] ?? field.value,
                    })),
                  });
                  router.replace(`/document/edit/${draft.id}` as Href);
                })();
              }}
              style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
            >
              <ThemedText style={styles.linkText}>{t('import.fillByFields')}</ThemedText>
            </Pressable>
          ) : null}
        </View>

        <PdfFieldInputSheet
          visible={activeFieldName !== null && activeField !== null && !drawMode}
          field={activeField}
          value={sheetValue}
          onConfirm={confirmField}
          onCancel={() => setActiveFieldName(null)}
        />

        <Modal visible={pendingRect !== null} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <ThemedText style={styles.modalTitle}>{t('import.fieldNameTitle')}</ThemedText>
              <TextInput
                value={newFieldLabel}
                onChangeText={setNewFieldLabel}
                placeholder={t('import.fieldNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoFocus
              />
              <View style={styles.modalActions}>
                <PrimaryButton
                  label={t('common.cancel')}
                  variant="secondary"
                  onPress={() => {
                    setPendingRect(null);
                    setNewFieldLabel('');
                  }}
                  style={styles.modalBtn}
                />
                <PrimaryButton
                  label={t('common.create')}
                  onPress={addManualField}
                  style={styles.modalBtn}
                />
              </View>
            </View>
          </View>
        </Modal>

        {rasterizing ? (
          <PdfPageRasterizer
            pdfUri={document.originalPdfUri}
            onPage={(nextPages) => {
              setPages(nextPages);
            }}
            onDetectedFields={(detected) => {
              void handleDetectedFields(detected);
            }}
            onComplete={(nextPages) => {
              setPages(nextPages);
              setRasterizing(false);
            }}
            onError={(message) => {
              setRasterizing(false);
              showAppAlert(t('import.rasterError'), message);
            }}
          />
        ) : null}
      </ThemedView>
    </GestureHandlerRootView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hint: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 13,
      paddingHorizontal: Spacing.four,
      paddingTop: Spacing.two,
      paddingBottom: Spacing.two,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginRight: 2,
    },
    addFieldButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      minHeight: 36,
      paddingHorizontal: 12,
      borderRadius: 18,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addFieldButtonActive: {
      borderColor: '#fca5a5',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    addFieldButtonText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },
    addFieldButtonTextActive: {
      color: '#ef4444',
    },
    bottomBar: {
      minHeight: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    linkBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    linkText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 14,
    },
    pressed: {
      opacity: 0.7,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: Spacing.four,
    },
    modalCard: {
      borderRadius: AppDesign.radius.xl,
      backgroundColor: colors.surface,
      padding: Spacing.four,
      gap: Spacing.two,
      ...AppDesign.shadow,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: AppDesign.radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      backgroundColor: colors.backgroundSoft,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: Spacing.two,
    },
    modalBtn: {
      flex: 1,
    },
  });
}
