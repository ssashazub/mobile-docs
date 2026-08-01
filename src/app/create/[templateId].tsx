import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TemplateIconView } from '@/components/template-icon-view';
import { ValidatedFormField } from '@/components/validated-form-field';
import { PdfLayoutPicker } from '@/components/pdf-layout-picker';
import { LoadingState } from '@/components/ui/loading-state';
import { showAppAlert } from '@/components/ui/app-alert';
import { EditorOverflowMenu } from '@/components/ui/editor-overflow-menu';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ThemedView } from '@/components/themed-view';
import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useFieldFocusOnError } from '@/hooks/use-field-focus-on-error';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { useLayout } from '@/hooks/use-layout';
import { useScrollEdgeControls } from '@/hooks/use-scroll-edge-controls';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import * as Haptics from '@/lib/haptics';
import {
  consumePendingCreateTemplateSwitch,
  saveCreateDocumentDraft,
  takeCreateDocumentDraft,
} from '@/lib/create-document-draft';
import { addDocument, getDocuments } from '@/lib/document-storage';
import {
  buildDocumentFromFields,
  buildDocumentFromPdfBackedTemplate,
  getNextDocumentId,
} from '@/lib/document-helpers';
import { getFieldValidationAlert } from '@/lib/field-validation-alert';
import { validateTemplateFields } from '@/lib/field-validation';
import { copyPdfToDocument } from '@/lib/pdf-file-storage';
import { normalizePdfStyle } from '@/lib/template-helpers';
import { normalizeTemplateIcon } from '@/lib/template-icon';
import { getTemplateById } from '@/lib/template-storage';
import type { DocumentTemplate, PdfStyle } from '@/types/template';

export default function CreateDocumentFormScreen() {
  const { t } = useI18n();
  const colors = useTheme();
  const layout = useLayout();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const insets = useSafeAreaInsets();
  const initializedRef = useRef(false);
  const fieldsRef = useRef<Record<string, string>>({});
  const pdfStyleRef = useRef<PdfStyle>(normalizePdfStyle(undefined));
  const allowNavigationRef = useRef<() => void>(() => undefined);

  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pdfStyle, setPdfStyle] = useState<PdfStyle>(normalizePdfStyle(undefined));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const {
    scrollRef,
    errorFieldKey,
    shakeToken,
    setFormLayoutY,
    setFieldLayoutY,
    clearFieldError,
    focusInvalidField,
  } = useFieldFocusOnError();

  const fieldList = useMemo(() => template?.fields ?? [], [template]);
  const {
    onScroll,
    onContentSizeChange,
    onLayout,
    overlay: scrollOverlay,
    fab: scrollFab,
  } = useScrollEdgeControls({
    scrollRef,
    itemCount: fieldList.length,
  });

  fieldsRef.current = fields;
  pdfStyleRef.current = pdfStyle;

  useEffect(() => {
    initializedRef.current = false;
    setTemplate(null);
    setFields({});
    setPdfStyle(normalizePdfStyle(undefined));
    setLoading(true);
  }, [templateId]);

  const loadTemplate = useCallback(async () => {
    if (!templateId) {
      setLoading(false);
      return;
    }

    const isFirstLoad = !initializedRef.current;
    if (isFirstLoad) {
      setLoading(true);
    }

    const loaded = await getTemplateById(templateId);

    if (!loaded) {
      setTemplate(null);
      setLoading(false);
      return;
    }

    const savedDraft = isFirstLoad ? takeCreateDocumentDraft(templateId) : null;

    setTemplate(loaded);
    setFields((current) =>
      Object.fromEntries(
        loaded.fields.map((field) => [
          field.key,
          savedDraft?.fields[field.key] ?? (isFirstLoad ? '' : (current[field.key] ?? '')),
        ])
      )
    );

    if (isFirstLoad) {
      setPdfStyle(savedDraft?.pdfStyle ?? normalizePdfStyle(loaded.pdfStyle, loaded.id));
      initializedRef.current = true;
    }

    setLoading(false);
  }, [templateId]);

  const hasChanges = useMemo(() => {
    if (!template) {
      return false;
    }

    const initialStyle = normalizePdfStyle(template.pdfStyle, template.id);
    return (
      Object.values(fields).some((value) => value.length > 0) ||
      JSON.stringify(pdfStyle) !== JSON.stringify(initialStyle)
    );
  }, [fields, pdfStyle, template]);

  const navigateAfterExit = (destination: 'home' | 'library') => {
    if (destination === 'home') {
      router.dismissAll();
      return;
    }

    router.replace('/documents' as Href);
  };

  const handleCreate = async (
    destination: 'detail' | 'home' | 'library' | 'none' = 'detail'
  ): Promise<boolean> => {
    if (!template) {
      return false;
    }

    const validationError = validateTemplateFields(template.fields, fields);

    if (validationError) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      focusInvalidField(validationError);

      if (validationError.messageKey !== 'required') {
        const alert = getFieldValidationAlert(validationError, t);
        showAppAlert(alert.title, alert.message);
      }

      return false;
    }

    setSaving(true);

    try {
      const documents = await getDocuments();
      const nextId = getNextDocumentId(documents);
      const trimmedFields = Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [key, value.trim()])
      );

      if (template.kind === 'pdf-backed' && template.sourcePdfUri) {
        const originalPdfUri = await copyPdfToDocument(template.sourcePdfUri, nextId);
        const newDocument = buildDocumentFromPdfBackedTemplate(
          template,
          trimmedFields,
          nextId,
          originalPdfUri
        );
        await addDocument(newDocument);
        if (destination === 'detail') {
          allowNavigationRef.current();
          router.replace(`/document/${newDocument.id}`);
        } else if (destination !== 'none') {
          navigateAfterExit(destination);
        }
        return true;
      }

      const newDocument = buildDocumentFromFields(template, trimmedFields, nextId, pdfStyle);

      await addDocument(newDocument);
      if (destination === 'detail') {
        allowNavigationRef.current();
        router.replace(`/document/${newDocument.id}`);
      } else if (destination !== 'none') {
        navigateAfterExit(destination);
      }
      return true;
    } finally {
      setSaving(false);
    }
  };

  const allowNavigation = useUnsavedChangesGuard({
    hasChanges,
    onSave: () => handleCreate('none'),
  });
  allowNavigationRef.current = allowNavigation;

  useFocusEffect(
    useCallback(() => {
      const nextTemplateId = consumePendingCreateTemplateSwitch();
      if (nextTemplateId && templateId && nextTemplateId !== templateId) {
        saveCreateDocumentDraft({
          templateId: nextTemplateId,
          fields: fieldsRef.current,
          pdfStyle: pdfStyleRef.current,
        });
        allowNavigationRef.current();
        router.replace(`/create/${nextTemplateId}` as Href);
        return;
      }

      void loadTemplate();
    }, [loadTemplate, templateId])
  );

  const updateField = (key: string, value: string) => {
    clearFieldError(key);
    setFields((current) => ({ ...current, [key]: value }));
  };

  const openTemplateEditor = () => {
    if (!templateId) {
      return;
    }

    allowNavigation();
    router.push(`/templates/edit/${templateId}?fromCreate=1` as Href);
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <LoadingState />
      </ThemedView>
    );
  }

  if (!template) {
    return (
      <ThemedView style={styles.centered}>
        <Text style={styles.centeredText}>{t('create.templateNotFound')}</Text>
        <PrimaryButton label={t('common.back')} variant="secondary" onPress={() => router.back()} />
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: template.title,
          headerRight: () => (
            <EditorOverflowMenu
              onGoHome={() => navigateAfterExit('home')}
              onOpenLibrary={() => navigateAfterExit('library')}
              onEditTemplate={openTemplateEditor}
              onSave={() => {
                void handleCreate();
              }}
            />
          ),
        }}
      />
      <ThemedView style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
        <View style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            layout.contentStyle,
            { paddingBottom: insets.bottom + 24, paddingRight: 48 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onContentSizeChange={onContentSizeChange}
          onLayout={onLayout}
        >
          <LinearGradient
            colors={[template.accentColor, template.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <TemplateIconView
              icon={normalizeTemplateIcon(template)}
              size={30}
              color="#ffffff"
              textStyle={styles.heroEmoji}
            />
            <Text style={styles.heroTitle}>{template.title}</Text>
          </LinearGradient>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>{t('create.inputLanguageTitle')}</Text>
            <Text style={styles.noteText}>{t('create.inputLanguageText')}</Text>
          </View>

          {template.kind === 'pdf-backed' ? null : (
            <PdfLayoutPicker
              value={pdfStyle}
              accentColor={template.accentColor}
              gradientEnd={template.gradientEnd}
              onChange={setPdfStyle}
            />
          )}

          <View
            style={styles.form}
            onLayout={(event) => setFormLayoutY(event.nativeEvent.layout.y)}
          >
            {fieldList.map((field) => (
              <View
                key={field.key}
                onLayout={(event) => setFieldLayoutY(field.key, event.nativeEvent.layout.y)}
              >
                <ValidatedFormField
                  fieldKey={field.key}
                  kind={field.kind}
                  label={field.label}
                  value={fields[field.key] ?? ''}
                  required={field.required}
                  error={errorFieldKey === field.key}
                  shakeToken={errorFieldKey === field.key ? shakeToken : 0}
                  onChangeText={(value) => updateField(field.key, value)}
                  placeholder={field.placeholder}
                  multiline
                  textAlignVertical={field.multiline ? 'top' : undefined}
                  style={field.multiline ? styles.multiline : undefined}
                />
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              label={t('create.createDocument')}
              onPress={() => void handleCreate()}
              loading={saving}
            />
            <PrimaryButton
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => router.back()}
              disabled={saving}
            />
          </View>
        </ScrollView>
        {scrollOverlay}
        {scrollFab}
        </View>
        </KeyboardAvoidingView>
      </ThemedView>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: 24,
      gap: 16,
    },
    hero: {
      borderRadius: AppDesign.radius.lg,
      padding: 22,
      gap: 4,
    },
    heroKicker: {
      color: 'rgba(255,255,255,0.82)',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    heroEmoji: {
      fontSize: 30,
      marginTop: 4,
    },
    heroTitle: {
      color: '#fff',
      fontSize: 26,
      fontWeight: '800',
    },
    noteCard: {
      backgroundColor: colors.noteBackground,
      borderRadius: AppDesign.radius.md,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.noteBorder,
      gap: 4,
    },
    noteTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.noteTitle,
    },
    noteText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.noteText,
    },
    form: {
      gap: 14,
    },
    multiline: {
      minHeight: 120,
      paddingTop: 12,
    },
    actions: {
      gap: 10,
      marginTop: 8,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 12,
    },
    centeredText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
  });
}
