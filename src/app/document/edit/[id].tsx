import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '@/components/ui/form-field';
import { PdfLayoutPicker } from '@/components/pdf-layout-picker';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppDesign } from '@/constants/app-design';
import { getDocuments, updateDocument } from '@/lib/document-storage';
import { buildDocumentFromFields } from '@/lib/document-helpers';
import { normalizePdfStyle } from '@/lib/template-helpers';
import { getTemplateById } from '@/lib/template-storage';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
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

          if (documents.length === 0) {
            if (isActive) {
              setNotFound(true);
            }
            return;
          }
          const foundDocument = documents.find((doc) => doc.id === documentId);

          if (!foundDocument) {
            if (isActive) {
              setNotFound(true);
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

  const saveDocument = async () => {
    if (documentId === null || !document || !template || !fields.title?.trim()) {
      return;
    }

    setSaving(true);

    try {
      const updatedDocument = buildDocumentFromFields(template, fields, documentId, pdfStyle);
      await updateDocument({ ...updatedDocument, createdAt: document.createdAt });
      router.back();
    } finally {
      setSaving(false);
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
        <ThemedText type="subtitle">{t('document.notFound')}</ThemedText>
        <PrimaryButton label={t('common.back')} variant="secondary" onPress={() => router.back()} />
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `${t('document.editTitle')} · ${template.title}` }} />

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
              colors={[template.accentColor, template.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.typeBanner}
            >
              <ThemedText style={styles.typeBannerText}>
                {template.emoji} {template.title}
              </ThemedText>
            </LinearGradient>

            <ThemedText themeColor="textSecondary" style={styles.hint}>
              {t('document.editHint')}
            </ThemedText>

            <PdfLayoutPicker
              value={pdfStyle}
              accentColor={template.accentColor}
              gradientEnd={template.gradientEnd}
              onChange={setPdfStyle}
            />

            <View style={styles.form}>
              {template.fields.map((field) => (
                <FormField
                  key={field.key}
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
                onPress={saveDocument}
                loading={saving}
                disabled={!fields.title?.trim()}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppDesign.background,
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
