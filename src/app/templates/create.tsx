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
import { type Href, Stack, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PdfLayoutPicker } from '@/components/pdf-layout-picker';
import { TemplateFieldEditor } from '@/components/template-field-editor';
import { PrimaryButton } from '@/components/ui/primary-button';
import { DEFAULT_PDF_STYLE } from '@/constants/pdf-layouts';
import { TEMPLATE_COLOR_PRESETS } from '@/constants/template-colors';
import { AppDesign } from '@/constants/app-design';
import { useI18n } from '@/hooks/use-i18n';
import {
  cloneTemplateFields,
  createBlankTemplate,
  createEmptyField,
  getColorPresetIndex,
  normalizePdfStyle,
} from '@/lib/template-helpers';
import { getNextCustomTemplateId, getTemplates, saveTemplate } from '@/lib/template-storage';
import type { DocumentTemplate, PdfStyle, TemplateField } from '@/types/template';

type BaseTemplateId = 'blank' | string;

export default function CreateTemplateScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const blank = createBlankTemplate();

  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [baseTemplateId, setBaseTemplateId] = useState<BaseTemplateId>('blank');
  const [title, setTitle] = useState(blank.title);
  const [emoji, setEmoji] = useState(blank.emoji);
  const [colorIndex, setColorIndex] = useState(4);
  const [fields, setFields] = useState<TemplateField[]>(blank.fields);
  const [pdfStyle, setPdfStyle] = useState<PdfStyle>({ ...DEFAULT_PDF_STYLE });
  const [saving, setSaving] = useState(false);

  const colors = TEMPLATE_COLOR_PRESETS[colorIndex];

  const loadTemplates = useCallback(async () => {
    setTemplates(await getTemplates());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [loadTemplates])
  );

  const applyBaseTemplate = (nextBaseId: BaseTemplateId) => {
    setBaseTemplateId(nextBaseId);

    if (nextBaseId === 'blank') {
      const nextBlank = createBlankTemplate();
      setTitle(nextBlank.title);
      setEmoji(nextBlank.emoji);
      setFields(nextBlank.fields);
      setPdfStyle({ ...DEFAULT_PDF_STYLE });
      setColorIndex(4);
      return;
    }

    const base = templates.find((item) => item.id === nextBaseId);

    if (!base) {
      return;
    }

    setTitle(t('templates.newTemplate'));
    setEmoji(base.emoji);
    setFields(cloneTemplateFields(base.fields));
    setPdfStyle(normalizePdfStyle(base.pdfStyle, base.id));
    setColorIndex(getColorPresetIndex(base.accentColor));
  };

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
    if (!title.trim()) {
      Alert.alert(t('templates.enterTemplateName'));
      return;
    }

    if (fields.some((field) => !field.label.trim())) {
      Alert.alert(t('templates.allFieldsNeedLabel'));
      return;
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();
      const template: DocumentTemplate = {
        id: getNextCustomTemplateId(),
        title: title.trim(),
        emoji: emoji.trim() || '📝',
        accentColor: colors.accentColor,
        gradientEnd: colors.gradientEnd,
        fields,
        pdfStyle,
        isBuiltIn: false,
        createdAt: now,
        updatedAt: now,
      };

      await saveTemplate(template);
      router.replace(`/templates/edit/${template.id}` as Href);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('templates.newTemplate') }} />
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
          <Text style={styles.heading}>{t('templates.createHeading')}</Text>
          <Text style={styles.subheading}>{t('templates.createFormSubtitle')}</Text>

          <View style={styles.baseSection}>
            <Text style={styles.baseTitle}>{t('templates.baseTemplateTitle')}</Text>
            <Text style={styles.baseSubtitle}>{t('templates.baseTemplateSubtitle')}</Text>
            <View style={styles.baseList}>
              <Pressable
                onPress={() => applyBaseTemplate('blank')}
                style={({ pressed }) => [
                  styles.baseCard,
                  baseTemplateId === 'blank' && styles.baseCardSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.baseEmoji}>✨</Text>
                <Text
                  style={[
                    styles.baseCardTitle,
                    baseTemplateId === 'blank' && styles.baseCardTitleSelected,
                  ]}
                >
                  {t('templates.blankTemplate')}
                </Text>
              </Pressable>

              {templates.map((template) => {
                const selected = baseTemplateId === template.id;

                return (
                  <Pressable
                    key={template.id}
                    onPress={() => applyBaseTemplate(template.id)}
                    style={({ pressed }) => [
                      styles.baseCard,
                      selected && styles.baseCardSelected,
                      selected && { borderColor: template.accentColor },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.baseEmoji}>{template.emoji}</Text>
                    <Text
                      style={[
                        styles.baseCardTitle,
                        selected && styles.baseCardTitleSelected,
                        selected && { color: template.accentColor },
                      ]}
                      numberOfLines={2}
                    >
                      {template.title}
                    </Text>
                    <Text style={styles.baseCardMeta}>
                      {template.fields.length} {t('common.fields')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <PdfLayoutPicker
            value={pdfStyle}
            accentColor={colors.accentColor}
            gradientEnd={colors.gradientEnd}
            onChange={setPdfStyle}
          />

          <View style={styles.card}>
            <Text style={styles.label}>{t('templates.templateName')}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('templates.examplePlaceholder')}
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

          <View style={styles.fieldsHeader}>
            <Text style={styles.fieldsTitle}>{t('templates.templateFieldsTitle')}</Text>
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
            <PrimaryButton label={t('templates.saveTemplate')} onPress={handleSave} loading={saving} />
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
  baseSection: { gap: 8 },
  baseTitle: { fontSize: 18, fontWeight: '800', color: AppDesign.text },
  baseSubtitle: { fontSize: 13, lineHeight: 19, color: AppDesign.textSecondary },
  baseList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 4,
  },
  baseCard: {
    width: '47%',
    flexGrow: 1,
    minWidth: 124,
    backgroundColor: AppDesign.surface,
    borderRadius: AppDesign.radius.md,
    borderWidth: 2,
    borderColor: AppDesign.border,
    padding: 12,
    gap: 4,
    ...AppDesign.cardShadow,
  },
  baseCardSelected: {
    backgroundColor: '#f8fafc',
    borderColor: AppDesign.primary,
  },
  baseEmoji: { fontSize: 24 },
  baseCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: AppDesign.text,
    lineHeight: 17,
  },
  baseCardTitleSelected: {
    color: AppDesign.primary,
  },
  baseCardMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: AppDesign.textSecondary,
  },
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
});
