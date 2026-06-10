import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PdfLayoutPicker } from '@/components/pdf-layout-picker';
import { TemplateFieldEditor } from '@/components/template-field-editor';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TEMPLATE_COLOR_PRESETS } from '@/constants/template-colors';
import { AppDesign } from '@/constants/app-design';
import { useI18n } from '@/hooks/use-i18n';
import { createEmptyField, normalizePdfStyle } from '@/lib/template-helpers';
import { getTemplateById, resetTemplateToDefault, saveTemplate } from '@/lib/template-storage';
import type { DocumentTemplate, PdfStyle, TemplateField } from '@/types/template';

export default function EditTemplateScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('📝');
  const [colorIndex, setColorIndex] = useState(0);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [pdfStyle, setPdfStyle] = useState<PdfStyle>(normalizePdfStyle(undefined));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTemplate = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const loaded = await getTemplateById(id);

    if (!loaded) {
      setTemplate(null);
      setLoading(false);
      return;
    }

    setTemplate(loaded);
    setTitle(loaded.title);
    setEmoji(loaded.emoji);
    setFields(loaded.fields);
    setPdfStyle(normalizePdfStyle(loaded.pdfStyle, loaded.id));

    const presetIndex = TEMPLATE_COLOR_PRESETS.findIndex(
      (preset) => preset.accentColor === loaded.accentColor
    );
    setColorIndex(presetIndex >= 0 ? presetIndex : 0);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadTemplate();
    }, [loadTemplate])
  );

  const updateField = (index: number, field: TemplateField) => {
    setFields((current) => current.map((item, itemIndex) => (itemIndex === index ? field : item)));
  };

  const removeField = (index: number) => {
    if (fields.length <= 1) {
      Alert.alert(t('templates.minOneField'));
      return;
    }
    setFields((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const addField = () => {
    setFields((current) => [...current, createEmptyField(current.map((field) => field.key))]);
  };

  const handleSave = async () => {
    if (!template || !title.trim()) {
      Alert.alert(t('templates.enterTemplateName'));
      return;
    }

    if (fields.some((field) => !field.label.trim())) {
      Alert.alert(t('templates.allFieldsNeedLabel'));
      return;
    }

    setSaving(true);

    try {
      const colors = TEMPLATE_COLOR_PRESETS[colorIndex];
      await saveTemplate({
        ...template,
        title: title.trim(),
        emoji: emoji.trim() || '📝',
        accentColor: colors.accentColor,
        gradientEnd: colors.gradientEnd,
        fields,
        pdfStyle,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!template?.isBuiltIn) {
      return;
    }

    Alert.alert(t('templates.resetTitle'), t('templates.resetText'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('templates.resetAction'),
        style: 'destructive',
        onPress: async () => {
          await resetTemplateToDefault(template.id);
          loadTemplate();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>{t('create.templateNotFound')}</Text>
        <PrimaryButton label={t('common.back')} variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `${t('templates.editTitle')} · ${template.title}` }} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>{t('templates.editHeading')}</Text>
          <Text style={styles.subheading}>{t('templates.editSubtitle')}</Text>

          <View style={styles.card}>
            <Text style={styles.label}>{t('templates.templateName')}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('templates.templateName')}
              placeholderTextColor={AppDesign.textMuted}
            />

            <Text style={styles.label}>{t('common.emoji')}</Text>
            <TextInput
              style={styles.input}
              value={emoji}
              onChangeText={setEmoji}
              placeholder="📝"
              placeholderTextColor={AppDesign.textMuted}
              maxLength={4}
            />

            <Text style={styles.label}>{t('common.color')}</Text>
            <View style={styles.colors}>
              {TEMPLATE_COLOR_PRESETS.map((preset, index) => (
                <Pressable
                  key={preset.accentColor}
                  onPress={() => setColorIndex(index)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: preset.accentColor },
                    colorIndex === index && styles.colorDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          <PdfLayoutPicker
            value={pdfStyle}
            accentColor={TEMPLATE_COLOR_PRESETS[colorIndex].accentColor}
            gradientEnd={TEMPLATE_COLOR_PRESETS[colorIndex].gradientEnd}
            onChange={setPdfStyle}
          />

          <View style={styles.fieldsHeader}>
            <Text style={styles.fieldsTitle}>
              {t('templates.fieldsCount', { count: String(fields.length) })}
            </Text>
            <Pressable onPress={addField} style={({ pressed }) => [styles.addField, pressed && styles.pressed]}>
              <Text style={styles.addFieldText}>+ {t('templates.addField')}</Text>
            </Pressable>
          </View>

          <View style={styles.fields}>
            {fields.map((field, index) => (
              <TemplateFieldEditor
                key={field.key}
                field={field}
                index={index}
                onChange={(nextField) => updateField(index, nextField)}
                onDelete={() => removeField(index)}
                canDelete={fields.length > 1}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <PrimaryButton label={t('templates.saveChanges')} onPress={handleSave} loading={saving} />
            {template.isBuiltIn ? (
              <PrimaryButton
                label={t('templates.reset')}
                variant="secondary"
                onPress={handleReset}
                disabled={saving}
              />
            ) : null}
            <PrimaryButton
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => router.back()}
              disabled={saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppDesign.background },
  content: { padding: 24, gap: 16 },
  heading: { fontSize: 28, fontWeight: '800', color: AppDesign.text },
  subheading: { fontSize: 14, color: AppDesign.textSecondary, lineHeight: 20 },
  card: {
    backgroundColor: AppDesign.surface,
    borderRadius: AppDesign.radius.lg,
    borderWidth: 1,
    borderColor: AppDesign.border,
    padding: 16,
    gap: 8,
  },
  label: { fontSize: 13, fontWeight: '700', color: AppDesign.textSecondary, marginTop: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: AppDesign.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: AppDesign.text,
    backgroundColor: AppDesign.backgroundSoft,
  },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  colorDot: { width: 34, height: 34, borderRadius: 17 },
  colorDotActive: { borderWidth: 3, borderColor: '#0f172a' },
  fieldsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldsTitle: { fontSize: 18, fontWeight: '800', color: AppDesign.text },
  addField: {
    backgroundColor: AppDesign.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addFieldText: { color: AppDesign.primary, fontWeight: '800', fontSize: 13 },
  fields: { gap: 12 },
  actions: { gap: 10, marginTop: 8 },
  pressed: { opacity: 0.88 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: AppDesign.background,
  },
  loadingText: { fontSize: 16, fontWeight: '600', color: AppDesign.text },
});
