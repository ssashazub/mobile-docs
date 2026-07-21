import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, Stack, useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { getDocumentDisplayInfo, isImportedFormDocument } from '@/lib/document-display';
import { getDocuments, updateDocument } from '@/lib/document-storage';
import { buildDocumentFromFields } from '@/lib/document-helpers';
import { getFieldValidationAlert } from '@/lib/field-validation-alert';
import { validatePdfFormFields, validateTemplateFields } from '@/lib/field-validation';
import { normalizePdfStyle } from '@/lib/template-helpers';
import { getTemplateById } from '@/lib/template-storage';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import type { Document } from '@/types/document';
import type { DocumentTemplate, PdfStyle } from '@/types/template';

function parseDocumentId(id: string | string[] | undefined): number | null {
  const rawId = Array.isArray(id) ? id[0] : id;
  const parsedId = Number(rawId);

  if (!rawId || Number.isNaN(parsedId)) {
    return null;
  }

  return parsedId;
}

export default function EditDocumentScreen() {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = parseDocumentId(id);
  const insets = useSafeAreaInsets();

  const [document, setDocument] = useState<Document | null>(null);
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pdfStyle, setPdfStyle] = useState<PdfStyle>(normalizePdfStyle(undefined));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

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
              setTemplate(null);
              setFields(foundDocument.fields);
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

  const updateField = (key: string, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
  };

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

    if (isImportedFormDocument(document) && document.formFields) {
      const validationError = validatePdfFormFields(document.formFields, fields);

      if (validationError) {
        const alert = getFieldValidationAlert(validationError, t);
        showAppAlert(alert.title, alert.message);
        return false;
      }
    } else if (template) {
      const validationError = validateTemplateFields(template.fields, fields);

      if (validationError) {
        const alert = getFieldValidationAlert(validationError, t);
        showAppAlert(alert.title, alert.message);
        return false;
      }
    }

    setSaving(true);

    try {
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

    if (JSON.stringify(fields) !== JSON.stringify(document.fields)) {
      return true;
    }

    if (isImportedFormDocument(document)) {
      return false;
    }

    const initialStyle = normalizePdfStyle(
      document.pdfStyle ?? template?.pdfStyle,
      template?.id
    );
    return JSON.stringify(pdfStyle) !== JSON.stringify(initialStyle);
  }, [document, fields, pdfStyle, template]);

  const allowNavigation = useUnsavedChangesGuard({
    hasChanges,
    onSave: () => saveDocument('none'),
  });

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
        <ThemedText type="subtitle">{t('document.notFound')}</ThemedText>
        <PrimaryButton label={t('common.back')} variant="secondary" onPress={() => router.back()} />
      </ThemedView>
    );
  }

  const display = getDocumentDisplayInfo(document, template);
  const isFormImport = isImportedFormDocument(document);
  const canSave = isFormImport
    ? Object.values(fields).some((value) => value.trim().length > 0)
    : Boolean(fields.title?.trim());

  return (
    <>
      <Stack.Screen
        options={{
          title: `${t('document.editTitle')} · ${display.title}`,
          headerRight: () => (
            <EditorOverflowMenu
              onGoHome={() => navigateAfterExit('home')}
              onOpenLibrary={() => navigateAfterExit('library')}
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
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + Spacing.four },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
              {isFormImport ? t('import.formHint') : t('document.editHint')}
            </ThemedText>

            {!isFormImport && template ? (
              <PdfLayoutPicker
                value={pdfStyle}
                accentColor={template.accentColor}
                gradientEnd={template.gradientEnd}
                onChange={setPdfStyle}
              />
            ) : null}

            <View style={styles.form}>
              {isFormImport && document.formFields
                ? document.formFields.map((field) => (
                    <PdfFormFieldInput
                      key={field.name}
                      field={field}
                      value={fields[field.name] ?? ''}
                      onChange={(value) => updateField(field.name, value)}
                    />
                  ))
                : display.fields.map((field) => (
                    <ValidatedFormField
                      key={field.key}
                      fieldKey={field.key}
                      kind={field.kind}
                      label={field.label}
                      value={fields[field.key] ?? ''}
                      onChangeText={(value) => updateField(field.key, value)}
                      placeholder={field.placeholder}
                      multiline={field.multiline}
                      numberOfLines={field.multiline ? 4 : 1}
                      textAlignVertical={field.multiline ? 'top' : 'center'}
                      style={field.multiline ? styles.descriptionInput : undefined}
                    />
                  ))}
            </View>

            <View style={styles.actions}>
              <PrimaryButton
                label={t('common.save')}
                onPress={() => void saveDocument()}
                loading={saving}
                disabled={!canSave}
              />
              <PrimaryButton
                label={t('common.cancel')}
                variant="secondary"
                onPress={() => router.back()}
                disabled={saving}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    form: {
      gap: Spacing.three,
    },
    hint: {
      lineHeight: 22,
    },
    descriptionInput: {
      minHeight: 120,
      paddingTop: Spacing.two + 2,
    },
    actions: {
      gap: Spacing.two,
      marginTop: Spacing.two,
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
