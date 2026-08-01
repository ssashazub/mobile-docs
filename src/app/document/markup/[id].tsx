import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Stack, type Href, useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PdfPageCanvas, type PageLayout } from '@/components/pdf-page-canvas';
import {
  PdfPageRasterizer,
  type RasterizedPage,
} from '@/components/pdf-page-rasterizer';
import { LoadingState } from '@/components/ui/loading-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { showAppAlert } from '@/components/ui/app-alert';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppDesign } from '@/constants/app-design';
import { DEFAULT_TEMPLATE_ICON } from '@/constants/template-icons';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { isImportedFormDocument } from '@/lib/document-display';
import { getDocuments, updateDocument } from '@/lib/document-storage';
import { createFieldName, formFieldsFromMarkup } from '@/lib/pdf-overlay-state';
import { uiRectToPdf, type UiRect } from '@/lib/pdf-coords';
import { readPdfBytes } from '@/lib/pdf-bytes';
import { savePdfBytesForTemplate } from '@/lib/pdf-file-storage';
import { getNextCustomTemplateId, saveTemplate } from '@/lib/template-storage';
import type { Document, PdfFieldRect, PdfFormField } from '@/types/document';
import type { FieldInputKind } from '@/types/field-validation';
import type { DocumentTemplate } from '@/types/template';

function parseDocumentId(id: string | string[] | undefined): number | null {
  const rawId = Array.isArray(id) ? id[0] : id;
  const parsedId = Number(rawId);
  if (!rawId || Number.isNaN(parsedId)) {
    return null;
  }
  return parsedId;
}

type DraftField = {
  id: string;
  name: string;
  label: string;
  inputKind: FieldInputKind;
  rect: PdfFieldRect;
};

type Translate = ReturnType<typeof useI18n>['t'];

const FIELD_KINDS: FieldInputKind[] = ['text', 'number', 'date', 'email', 'phone'];

function kindLabel(kind: FieldInputKind, t: Translate): string {
  switch (kind) {
    case 'date':
      return t('templates.fieldKindDate');
    case 'number':
      return t('templates.fieldKindNumber');
    case 'email':
      return t('templates.fieldKindEmail');
    case 'phone':
      return t('templates.fieldKindPhone');
    default:
      return t('templates.fieldKindText');
  }
}

export default function MarkupScreen() {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = parseDocumentId(id);

  const [document, setDocument] = useState<Document | null>(null);
  const [pages, setPages] = useState<RasterizedPage[]>([]);
  const [contentWidth, setContentWidth] = useState(0);
  const [draftFields, setDraftFields] = useState<DraftField[]>([]);
  const [loading, setLoading] = useState(true);
  const [rasterizing, setRasterizing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [fieldModal, setFieldModal] = useState<{
    rect: PdfFieldRect;
    label: string;
    inputKind: FieldInputKind;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [templateNameModal, setTemplateNameModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;

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
          } else {
            setDocument(found);
            setNotFound(false);
            setPages([]);
            setRasterizing(true);
            // Seed with existing custom fields if re-opening markup.
            setDraftFields(
              (found.formFields ?? [])
                .filter((field) => field.rect && field.origin !== 'acroform')
                .map((field) => ({
                  id: field.name,
                  name: field.name,
                  label: field.label,
                  inputKind: field.inputKind ?? 'text',
                  rect: field.rect!,
                }))
            );
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

  const openFieldModal = (rect: PdfFieldRect) => {
    setFieldModal({
      rect,
      label: '',
      inputKind: 'text',
    });
  };

  const confirmField = () => {
    if (!fieldModal) {
      return;
    }
    const label = fieldModal.label.trim() || t('common.newField');
    const name = createFieldName(
      label,
      draftFields.map((field) => field.name)
    );
    setDraftFields((current) => [
      ...current,
      {
        id: name,
        name,
        label,
        inputKind: fieldModal.inputKind,
        rect: fieldModal.rect,
      },
    ]);
    setFieldModal(null);
  };

  const persistFormFields = async (
    formFields: PdfFormField[],
    options?: { templateId?: string }
  ) => {
    if (!document) {
      return;
    }

    const fields = Object.fromEntries(formFields.map((field) => [field.name, '']));
    const updated: Document = {
      ...document,
      formFields,
      fields: { ...document.fields, ...fields },
      hasNativeAcroForm: document.hasNativeAcroForm ?? false,
      templateId: options?.templateId ?? document.templateId,
    };
    await updateDocument(updated);
    router.replace(`/document/edit/${updated.id}` as Href);
  };

  const finishMarkup = () => {
    if (draftFields.length === 0) {
      showAppAlert(t('import.markupNeedFields'));
      return;
    }

    showAppAlert(t('import.saveMarkupTitle'), t('import.saveMarkupText'), [
      {
        text: t('import.useForDocumentOnly'),
        onPress: async () => {
          setSaving(true);
          try {
            const formFields = formFieldsFromMarkup(draftFields);
            await persistFormFields(formFields);
          } finally {
            setSaving(false);
          }
        },
      },
      {
        text: t('import.saveAsTemplate'),
        onPress: () => {
          setTemplateName(document?.title || t('import.templateNamePlaceholder'));
          setTemplateNameModal(true);
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const saveAsTemplate = async (title: string) => {
    if (!document?.originalPdfUri) {
      return;
    }

    setSaving(true);
    try {
      const templateId = getNextCustomTemplateId();
      const bytes = await readPdfBytes(document.originalPdfUri);
      const sourcePdfUri = await savePdfBytesForTemplate(templateId, bytes);
      const now = new Date().toISOString();

      const template: DocumentTemplate = {
        id: templateId,
        title: title.trim() || t('import.templateNamePlaceholder'),
        icon: DEFAULT_TEMPLATE_ICON,
        accentColor: '#4f46e5',
        gradientEnd: '#6366f1',
        kind: 'pdf-backed',
        sourcePdfUri,
        fields: draftFields.map((field) => ({
          key: field.name,
          label: field.label,
          kind: field.inputKind,
          required: false,
          rect: field.rect,
        })),
        createdAt: now,
        updatedAt: now,
      };

      await saveTemplate(template);
      const formFields = formFieldsFromMarkup(draftFields);
      await persistFormFields(formFields, { templateId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: t('import.markupTitle') }} />
        <LoadingState />
      </ThemedView>
    );
  }

  if (notFound || !document?.originalPdfUri) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: t('import.markupTitle') }} />
        <ThemedText>{t('document.notFound')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemedView style={styles.flex}>
        <Stack.Screen options={{ title: t('import.markupTitle') }} />

        {rasterizing && pages.length === 0 ? (
          <View style={styles.centered}>
            <LoadingState label={t('import.rasterizing')} />
          </View>
        ) : pages.length > 0 ? (
          <View
            style={styles.flex}
            onLayout={(event) => setContentWidth(event.nativeEvent.layout.width - 24)}
          >
            <ThemedText style={styles.hint}>{t('import.markupHint')}</ThemedText>
            <PdfPageCanvas
              pages={pages}
              contentWidth={Math.max(200, contentWidth)}
              enablePinchZoom
              renderOverlays={(layout) => (
                <>
                  {draftFields
                    .filter((field) => field.rect.pageIndex === layout.pageIndex)
                    .map((field) => {
                      const scale = layout.scale;
                      const left = field.rect.x * scale;
                      const top =
                        (layout.heightPt - field.rect.y - field.rect.height) * scale;
                      const width = field.rect.width * scale;
                      const height = field.rect.height * scale;
                      return (
                        <Pressable
                          key={field.id}
                          style={[
                            styles.markedField,
                            { left, top, width, height },
                          ]}
                          onLongPress={() =>
                            setDraftFields((current) =>
                              current.filter((item) => item.id !== field.id)
                            )
                          }
                        >
                          <ThemedText style={styles.markedLabel} numberOfLines={1}>
                            {field.label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  <MarkupDrawLayer
                    layout={layout}
                    onComplete={openFieldModal}
                    colors={colors}
                  />
                </>
              )}
            />
          </View>
        ) : (
          <View style={styles.centered}>
            <LoadingState label={t('import.rasterizing')} />
          </View>
        )}

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <ThemedText style={styles.count}>
            {draftFields.length} {t('common.fields')}
          </ThemedText>
          <PrimaryButton
            label={t('import.markupDone')}
            loading={saving}
            onPress={finishMarkup}
          />
        </View>

        {rasterizing ? (
          <PdfPageRasterizer
            pdfUri={document.originalPdfUri}
            onPage={(nextPages) => {
              setPages(nextPages);
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

        <Modal visible={fieldModal !== null} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <ThemedText style={styles.modalTitle}>{t('import.fieldNameTitle')}</ThemedText>
              <TextInput
                value={fieldModal?.label ?? ''}
                onChangeText={(label) =>
                  setFieldModal((current) => (current ? { ...current, label } : current))
                }
                placeholder={t('import.fieldNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoFocus
              />
              <ThemedText style={styles.modalSubtitle}>{t('import.fieldTypeTitle')}</ThemedText>
              <View style={styles.kindRow}>
                {FIELD_KINDS.map((kind) => (
                  <Pressable
                    key={kind}
                    onPress={() =>
                      setFieldModal((current) =>
                        current ? { ...current, inputKind: kind } : current
                      )
                    }
                    style={[
                      styles.kindChip,
                      fieldModal?.inputKind === kind && styles.kindChipActive,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.kindChipText,
                        fieldModal?.inputKind === kind && styles.kindChipTextActive,
                      ]}
                    >
                      {kindLabel(kind, t)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              <View style={styles.modalActions}>
                <PrimaryButton
                  label={t('common.cancel')}
                  variant="secondary"
                  onPress={() => setFieldModal(null)}
                  style={styles.modalBtn}
                />
                <PrimaryButton
                  label={t('common.create')}
                  onPress={confirmField}
                  style={styles.modalBtn}
                />
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={templateNameModal} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <ThemedText style={styles.modalTitle}>{t('import.templateNameTitle')}</ThemedText>
              <TextInput
                value={templateName}
                onChangeText={setTemplateName}
                placeholder={t('import.templateNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoFocus
              />
              <View style={styles.modalActions}>
                <PrimaryButton
                  label={t('common.cancel')}
                  variant="secondary"
                  onPress={() => setTemplateNameModal(false)}
                  style={styles.modalBtn}
                />
                <PrimaryButton
                  label={t('common.save')}
                  loading={saving}
                  onPress={() => {
                    setTemplateNameModal(false);
                    void saveAsTemplate(templateName);
                  }}
                  style={styles.modalBtn}
                />
              </View>
            </View>
          </View>
        </Modal>
      </ThemedView>
    </GestureHandlerRootView>
  );
}

function MarkupDrawLayer({
  layout,
  onComplete,
  colors,
}: {
  layout: PageLayout;
  onComplete: (rect: PdfFieldRect) => void;
  colors: ThemeColors;
}) {
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const visible = useSharedValue(0);

  const finish = (uiRect: UiRect) => {
    if (uiRect.width < 24 || uiRect.height < 16) {
      return;
    }
    onComplete(uiRectToPdf(uiRect, layout.pageIndex, layout.heightPt, layout.scale));
  };

  const pan = Gesture.Pan()
    .onBegin((event) => {
      startX.value = event.x;
      startY.value = event.y;
      left.value = event.x;
      top.value = event.y;
      width.value = 0;
      height.value = 0;
      visible.value = 1;
    })
    .onUpdate((event) => {
      const x1 = startX.value;
      const y1 = startY.value;
      const x2 = Math.min(layout.widthPx, Math.max(0, event.x));
      const y2 = Math.min(layout.heightPx, Math.max(0, event.y));
      left.value = Math.min(x1, x2);
      top.value = Math.min(y1, y2);
      width.value = Math.abs(x2 - x1);
      height.value = Math.abs(y2 - y1);
    })
    .onEnd(() => {
      const uiRect: UiRect = {
        left: left.value,
        top: top.value,
        width: width.value,
        height: height.value,
      };
      visible.value = 0;
      runOnJS(finish)(uiRect);
    });

  const style = useAnimatedStyle(() => ({
    opacity: visible.value,
    left: left.value,
    top: top.value,
    width: width.value,
    height: height.value,
    borderColor: colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill} collapsable={false}>
        <Animated.View style={[stylesDraw.box, style]} />
      </View>
    </GestureDetector>
  );
}

const stylesDraw = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
});

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
      paddingBottom: Spacing.two,
    },
    markedField: {
      position: 'absolute',
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 4,
      backgroundColor: 'rgba(99, 102, 241, 0.15)',
      padding: 4,
    },
    markedLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
    },
    footer: {
      paddingHorizontal: Spacing.four,
      paddingTop: Spacing.two,
      gap: Spacing.two,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    count: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 13,
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
    modalSubtitle: {
      marginTop: Spacing.two,
      fontSize: 14,
      fontWeight: '700',
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
    kindRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    kindChip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    kindChipActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    kindChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    kindChipTextActive: {
      color: colors.primary,
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
