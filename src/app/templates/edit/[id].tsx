import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PdfLayoutPicker } from '@/components/pdf-layout-picker';
import { TemplateFieldsList } from '@/components/template-field-editor';
import { TemplateIconPicker } from '@/components/template-icon-picker';
import { LoadingState } from '@/components/ui/loading-state';
import { EditorOverflowMenu } from '@/components/ui/editor-overflow-menu';
import { PrimaryButton } from '@/components/ui/primary-button';
import { showAppAlert } from '@/components/ui/app-alert';
import { TEMPLATE_COLOR_PRESETS } from '@/constants/template-colors';
import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { useLayout } from '@/hooks/use-layout';
import { useScrollEdgeControls } from '@/hooks/use-scroll-edge-controls';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import { setPendingCreateTemplateSwitch } from '@/lib/create-document-draft';
import { createEmptyField, normalizePdfStyle, normalizeTemplate } from '@/lib/template-helpers';
import { normalizeTemplateIcon } from '@/lib/template-icon';
import type { TemplateIcon } from '@/constants/template-icons';
import {
  getNextCustomTemplateId,
  getTemplateById,
  resetTemplateToDefault,
  saveTemplate,
} from '@/lib/template-storage';
import type { DocumentTemplate, PdfStyle, TemplateField } from '@/types/template';

export default function EditTemplateScreen() {
  const { t } = useI18n();
  const { id, fromCreate } = useLocalSearchParams<{ id: string; fromCreate?: string }>();
  const openedFromCreate = fromCreate === '1' || fromCreate === 'true';
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const layout = useLayout();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<TemplateIcon>({ kind: 'symbol', value: 'doc.plaintext' });
  const [colorIndex, setColorIndex] = useState(0);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [pdfStyle, setPdfStyle] = useState<PdfStyle>(normalizePdfStyle(undefined));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nameDialogVisible, setNameDialogVisible] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const {
    scrollRef,
    onScroll,
    onContentSizeChange,
    onLayout,
    overlay: scrollOverlay,
    fab: scrollFab,
  } = useScrollEdgeControls({ itemCount: fields.length });

  const colorPreset = TEMPLATE_COLOR_PRESETS[colorIndex];

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
    setIcon(normalizeTemplateIcon(loaded));
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
      showAppAlert(t('templates.minOneField'));
      return;
    }
    setFields((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const addField = () => {
    setFields((current) => [...current, createEmptyField(current.map((field) => field.key))]);
  };

  const validateBeforeSave = (): boolean => {
    if (!template || !title.trim()) {
      showAppAlert(t('templates.enterTemplateName'));
      return false;
    }

    if (fields.some((field) => !field.label.trim())) {
      showAppAlert(t('templates.allFieldsNeedLabel'));
      return false;
    }

    return true;
  };

  const finishAfterSave = (nextTemplateId?: string) => {
    allowNavigation();
    if (openedFromCreate && nextTemplateId && nextTemplateId !== id) {
      setPendingCreateTemplateSwitch(nextTemplateId);
    }
    router.back();
  };

  const persistOverwrite = async (navigateAfterSave: boolean): Promise<boolean> => {
    if (!template || !validateBeforeSave()) {
      return false;
    }

    setSaving(true);

    try {
      await saveTemplate(
        normalizeTemplate({
          ...template,
          title: title.trim(),
          icon,
          accentColor: colorPreset.accentColor,
          gradientEnd: colorPreset.gradientEnd,
          fields,
          pdfStyle,
        })
      );
      if (navigateAfterSave) {
        finishAfterSave();
      }
      return true;
    } finally {
      setSaving(false);
    }
  };

  const persistAsNew = async (name: string): Promise<boolean> => {
    if (!template) {
      return false;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
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
      const newId = getNextCustomTemplateId();
      await saveTemplate(
        normalizeTemplate({
          ...template,
          id: newId,
          title: trimmedName,
          icon,
          accentColor: colorPreset.accentColor,
          gradientEnd: colorPreset.gradientEnd,
          fields,
          pdfStyle,
          isBuiltIn: false,
          createdAt: now,
          updatedAt: now,
        })
      );
      setNameDialogVisible(false);
      finishAfterSave(newId);
      return true;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (navigateAfterSave = true): Promise<boolean> => {
    if (!validateBeforeSave()) {
      return false;
    }

    if (openedFromCreate) {
      return new Promise((resolve) => {
        showAppAlert(t('templates.saveChoiceTitle'), t('templates.saveChoiceText'), [
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: t('templates.saveAsNewTemplate'),
            style: 'secondary',
            onPress: () => {
              setNewTemplateName(title.trim());
              setNameDialogVisible(true);
              resolve(false);
            },
          },
          {
            text: t('templates.modifyThisTemplate'),
            onPress: () => {
              void persistOverwrite(navigateAfterSave).then(resolve);
            },
          },
        ]);
      });
    }

    return persistOverwrite(navigateAfterSave);
  };

  const hasChanges = useMemo(() => {
    if (!template) {
      return false;
    }

    const initialStyle = normalizePdfStyle(template.pdfStyle, template.id);
    return (
      title !== template.title ||
      JSON.stringify(icon) !== JSON.stringify(normalizeTemplateIcon(template)) ||
      colorPreset.accentColor !== template.accentColor ||
      colorPreset.gradientEnd !== template.gradientEnd ||
      JSON.stringify(fields) !== JSON.stringify(template.fields) ||
      JSON.stringify(pdfStyle) !== JSON.stringify(initialStyle)
    );
  }, [colorPreset, fields, icon, pdfStyle, template, title]);

  const allowNavigation = useUnsavedChangesGuard({
    hasChanges,
    onSave: () => handleSave(false),
  });

  const handleReset = () => {
    if (!template?.isBuiltIn) {
      return;
    }

    showAppAlert(t('templates.resetTitle'), t('templates.resetText'), [
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
        <LoadingState />
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
      <Stack.Screen
        options={{
          title: `${t('templates.editTitle')} · ${template.title}`,
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
          <Text style={styles.heading}>{t('templates.editHeading')}</Text>
          <Text style={styles.subheading}>{t('templates.editSubtitle')}</Text>

          <View style={styles.card}>
            <Text style={styles.label}>{t('templates.templateName')}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('templates.templateName')}
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

          <PdfLayoutPicker
            value={pdfStyle}
            accentColor={colorPreset.accentColor}
            gradientEnd={colorPreset.gradientEnd}
            onChange={setPdfStyle}
          />

          <View style={styles.fieldsHeader}>
            <Text style={styles.fieldsTitle}>
              {t('templates.fieldsCount', { count: String(fields.length) })}
            </Text>
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
              label={t('templates.saveChanges')}
              onPress={() => void handleSave()}
              loading={saving}
            />
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
        {scrollOverlay}
        {scrollFab}
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={nameDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNameDialogVisible(false)}
      >
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{t('templates.newTemplateNameTitle')}</Text>
            <TextInput
              value={newTemplateName}
              onChangeText={setNewTemplateName}
              placeholder={t('templates.newTemplateNamePlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoFocus
              selectTextOnFocus
              style={styles.dialogInput}
              onSubmitEditing={() => void persistAsNew(newTemplateName)}
            />
            <View style={styles.dialogActions}>
              <PrimaryButton
                label={t('common.cancel')}
                variant="secondary"
                onPress={() => setNameDialogVisible(false)}
                disabled={saving}
                style={styles.dialogButton}
              />
              <PrimaryButton
                label={t('common.save')}
                onPress={() => void persistAsNew(newTemplateName)}
                loading={saving}
                disabled={!newTemplateName.trim()}
                style={styles.dialogButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 12,
      backgroundColor: colors.background,
    },
    loadingText: { fontSize: 16, fontWeight: '600', color: colors.text },
    dialogBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    dialog: {
      width: '100%',
      maxWidth: 420,
      borderRadius: AppDesign.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 18,
      gap: 12,
      ...AppDesign.shadow,
    },
    dialogTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    dialogInput: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.backgroundSoft,
    },
    dialogActions: {
      flexDirection: 'row',
      gap: 10,
    },
    dialogButton: {
      flex: 1,
    },
  });
}
