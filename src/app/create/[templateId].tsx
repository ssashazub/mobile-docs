import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ValidatedFormField } from '@/components/validated-form-field';
import { PdfLayoutPicker } from '@/components/pdf-layout-picker';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ThemedView } from '@/components/themed-view';
import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { addDocument, getDocuments } from '@/lib/document-storage';
import { buildDocumentFromFields, getNextDocumentId } from '@/lib/document-helpers';
import { getFieldValidationAlert } from '@/lib/field-validation-alert';
import { validateTemplateFields } from '@/lib/field-validation';
import { normalizePdfStyle } from '@/lib/template-helpers';
import { getTemplateById } from '@/lib/template-storage';
import type { DocumentTemplate, PdfStyle } from '@/types/template';

export default function CreateDocumentFormScreen() {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const insets = useSafeAreaInsets();

  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pdfStyle, setPdfStyle] = useState<PdfStyle>(normalizePdfStyle(undefined));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTemplate = useCallback(async () => {
    if (!templateId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const loaded = await getTemplateById(templateId);

    if (!loaded) {
      setTemplate(null);
      setLoading(false);
      return;
    }

    setTemplate(loaded);
    setFields(Object.fromEntries(loaded.fields.map((field) => [field.key, ''])));
    setPdfStyle(normalizePdfStyle(loaded.pdfStyle, loaded.id));
    setLoading(false);
  }, [templateId]);

  useFocusEffect(
    useCallback(() => {
      loadTemplate();
    }, [loadTemplate])
  );

  const updateField = (key: string, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
  };

  const handleCreate = async () => {
    if (!template) {
      return;
    }

    const validationError = validateTemplateFields(template.fields, fields);

    if (validationError) {
      const alert = getFieldValidationAlert(validationError, t);
      Alert.alert(alert.title, alert.message);
      return;
    }

    setSaving(true);

    try {
      const documents = await getDocuments();
      const newDocument = buildDocumentFromFields(
        template,
        Object.fromEntries(
          Object.entries(fields).map(([key, value]) => [key, value.trim()])
        ),
        getNextDocumentId(documents),
        pdfStyle
      );

      await addDocument(newDocument);
      router.replace(`/document/${newDocument.id}`);
    } finally {
      setSaving(false);
    }
  };

  const fieldList = useMemo(() => template?.fields ?? [], [template]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <Text style={styles.centeredText}>{t('create.loadingTemplate')}</Text>
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
      <Stack.Screen options={{ title: template.title }} />
      <ThemedView style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[template.accentColor, template.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroEmoji}>{template.emoji}</Text>
            <Text style={styles.heroTitle}>{template.title}</Text>
          </LinearGradient>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>{t('create.inputLanguageTitle')}</Text>
            <Text style={styles.noteText}>{t('create.inputLanguageText')}</Text>
          </View>

          <PdfLayoutPicker
            value={pdfStyle}
            accentColor={template.accentColor}
            gradientEnd={template.gradientEnd}
            onChange={setPdfStyle}
          />

          <View style={styles.form}>
            {fieldList.map((field) => (
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
                style={field.multiline ? styles.multiline : undefined}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              label={t('create.createDocument')}
              onPress={handleCreate}
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
