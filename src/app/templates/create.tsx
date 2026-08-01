import { useCallback, useMemo, useState } from 'react';
import {
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
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PdfLayoutPicker } from '@/components/pdf-layout-picker';
import { TemplateFieldsList } from '@/components/template-field-editor';
import { TemplateIconPicker } from '@/components/template-icon-picker';
import { TemplateIconView } from '@/components/template-icon-view';
import { EditorOverflowMenu } from '@/components/ui/editor-overflow-menu';
import { PrimaryButton } from '@/components/ui/primary-button';
import { showAppAlert } from '@/components/ui/app-alert';
import { DEFAULT_PDF_STYLE } from '@/constants/pdf-layouts';
import { TEMPLATE_COLOR_PRESETS } from '@/constants/template-colors';
import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { useLayout } from '@/hooks/use-layout';
import { useScrollEdgeControls } from '@/hooks/use-scroll-edge-controls';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import {
  cloneTemplateFields,
  createBlankTemplate,
  createEmptyField,
  getColorPresetIndex,
  normalizePdfStyle,
  normalizeTemplate,
} from '@/lib/template-helpers';
import { normalizeTemplateIcon } from '@/lib/template-icon';
import type { TemplateIcon } from '@/constants/template-icons';
import { getNextCustomTemplateId, getTemplates, saveTemplate } from '@/lib/template-storage';
import type { DocumentTemplate, PdfStyle, TemplateField } from '@/types/template';

type BaseTemplateId = 'blank' | string;

export default function CreateTemplateScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const layout = useLayout();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const blank = createBlankTemplate();

  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [baseTemplateId, setBaseTemplateId] = useState<BaseTemplateId>('blank');
  const [title, setTitle] = useState(blank.title);
  const [icon, setIcon] = useState<TemplateIcon>(blank.icon);
  const [colorIndex, setColorIndex] = useState(4);
  const [fields, setFields] = useState<TemplateField[]>(blank.fields);
  const [pdfStyle, setPdfStyle] = useState<PdfStyle>({ ...DEFAULT_PDF_STYLE });
  const [saving, setSaving] = useState(false);

  const {
    scrollRef,
    onScroll,
    onContentSizeChange,
    onLayout,
    overlay: scrollOverlay,
    fab: scrollFab,
  } = useScrollEdgeControls({ itemCount: fields.length + templates.length });

  const colorPreset = TEMPLATE_COLOR_PRESETS[colorIndex];

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
      setIcon(nextBlank.icon);
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
    setIcon(normalizeTemplateIcon(base));
    setFields(cloneTemplateFields(base.fields));
    setPdfStyle(normalizePdfStyle(base.pdfStyle, base.id));
    setColorIndex(getColorPresetIndex(base.accentColor));
  };

  const updateField = (index: number, field: TemplateField) => {
    setFields((current) => current.map((item, itemIndex) => (itemIndex === index ? field : item)));
  };

  const removeField = (index: number) => {
    if (fields.length <= 1) {
      showAppAlert(t('templates.minOneField'));
      return;
    }
    setFields((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const addField = () => {
    setFields((current) => [...current, createEmptyField(current.map((field) => field.key))]);
  };

  const handleSave = async (navigateAfterSave = true): Promise<boolean> => {
    if (!title.trim()) {
      showAppAlert(t('templates.enterTemplateName'));
      return false;
    }

    if (fields.some((field) => !field.label.trim())) {
      showAppAlert(t('templates.allFieldsNeedLabel'));
      return false;
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();
      const template = normalizeTemplate({
        id: getNextCustomTemplateId(),
        title: title.trim(),
        icon,
        accentColor: colorPreset.accentColor,
        gradientEnd: colorPreset.gradientEnd,
        fields,
        pdfStyle,
        isBuiltIn: false,
        createdAt: now,
        updatedAt: now,
      });

      await saveTemplate(template);
      if (navigateAfterSave) {
        allowNavigation();
        router.replace(`/create/${template.id}` as Href);
      }
      return true;
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = useMemo(
    () =>
      baseTemplateId !== 'blank' ||
      title !== blank.title ||
      JSON.stringify(icon) !== JSON.stringify(blank.icon) ||
      colorIndex !== 4 ||
      JSON.stringify(fields) !== JSON.stringify(blank.fields) ||
      JSON.stringify(pdfStyle) !== JSON.stringify(DEFAULT_PDF_STYLE),
    [baseTemplateId, blank.fields, blank.icon, blank.title, colorIndex, fields, icon, pdfStyle, title]
  );

  const allowNavigation = useUnsavedChangesGuard({
    hasChanges,
    onSave: () => handleSave(false),
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: t('templates.newTemplate'),
          headerRight: () => (
            <EditorOverflowMenu
              onGoHome={() => router.dismissAll()}
              onSave={() => {
                void handleSave();
              }}
            />
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.screen}
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
                <TemplateIconView
                  icon={{ kind: 'symbol', value: 'sparkles' }}
                  size={24}
                  color={baseTemplateId === 'blank' ? colors.primary : colors.textSecondary}
                />
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
                    <TemplateIconView icon={normalizeTemplateIcon(template)} size={24} color={colors.textSecondary} />
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
            accentColor={colorPreset.accentColor}
            gradientEnd={colorPreset.gradientEnd}
            onChange={setPdfStyle}
          />

          <View style={styles.card}>
            <Text style={styles.label}>{t('templates.templateName')}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('templates.examplePlaceholder')}
              placeholderTextColor={colors.textMuted}
            />

            <TemplateIconPicker value={icon} onChange={setIcon} />

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
          </View>

          <View style={styles.fields}>
            <TemplateFieldsList
              fields={fields}
              onChangeField={updateField}
              onDeleteField={removeField}
            />

            <Pressable
              onPress={addField}
              accessibilityRole="button"
              style={({ pressed }) => [styles.addFieldButton, pressed && styles.pressed]}
            >
              <SymbolView
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                size={16}
                tintColor={colors.primary}
                weight="semibold"
              />
              <Text style={styles.addFieldButtonText}>{t('templates.addField')}</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              label={t('templates.saveTemplate')}
              onPress={() => void handleSave()}
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
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    content: { padding: 24, gap: 16 },
    heading: { fontSize: 28, fontWeight: '800', color: colors.text },
    subheading: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    baseSection: { gap: 8 },
    baseTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    baseSubtitle: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
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
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.md,
      borderWidth: 2,
      borderColor: colors.border,
      padding: 12,
      gap: 4,
      ...AppDesign.cardShadow,
    },
    baseCardSelected: {
      backgroundColor: colors.backgroundSoft,
      borderColor: colors.primary,
    },
    baseCardTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
      lineHeight: 17,
    },
    baseCardTitleSelected: {
      color: colors.primary,
    },
    baseCardMeta: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 8,
    },
    label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 4 },
    input: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.backgroundSoft,
    },
    colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    colorDot: { width: 34, height: 34, borderRadius: 17 },
    colorDotActive: { borderWidth: 3, borderColor: colors.text },
    fieldsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fieldsTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    addFieldButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 44,
      borderRadius: AppDesign.radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      backgroundColor: 'transparent',
      paddingHorizontal: 14,
    },
    addFieldButtonText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 14,
    },
    fields: { gap: 12 },
    actions: { gap: 10, marginTop: 8 },
    pressed: { opacity: 0.88 },
  });
}
