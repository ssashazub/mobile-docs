import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/primary-button';
import { AppDesign } from '@/constants/app-design';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useModalSheetAnimation } from '@/hooks/use-modal-sheet-animation';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { getInputPropsForKind, sanitizeFieldInput } from '@/lib/field-validation';
import { isCheckboxChecked } from '@/lib/pdf-form';
import type { PdfFormField } from '@/types/document';

type PdfFieldInputSheetProps = {
  visible: boolean;
  field: PdfFormField | null;
  value: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

export function PdfFieldInputSheet({
  visible,
  field,
  value,
  onConfirm,
  onCancel,
}: PdfFieldInputSheetProps) {
  const { t } = useI18n();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { backdrop, sheet } = useModalSheetAnimation(visible, 420);
  const [draft, setDraft] = useState(value);
  const [contentHeight, setContentHeight] = useState(22);

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setContentHeight(22);
    }
  }, [visible, value, field?.name]);

  if (!field) {
    return null;
  }

  const kind = field.inputKind ?? 'text';
  const kindProps = getInputPropsForKind(kind, true);
  const isCheckbox = field.type === 'checkbox';
  const canClear = !isCheckbox && draft.length > 0;
  const inputPaddingY = 12;
  const inputHeight = Math.min(22 * 4, Math.max(22, contentHeight)) + inputPaddingY * 2;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                transform: [{ translateY: sheet }],
              },
            ]}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>{field.label || field.name}</Text>
            <View style={styles.rule} />

            {isCheckbox ? (
              <View style={styles.checkboxRow}>
                <Text style={styles.checkboxLabel}>{t('import.overlayPlaceholder')}</Text>
                <Switch
                  value={isCheckboxChecked(draft)}
                  onValueChange={(checked) => setDraft(checked ? 'true' : 'false')}
                />
              </View>
            ) : (
              <View style={styles.inputWrap}>
                <TextInput
                  autoFocus
                  multiline
                  scrollEnabled={false}
                  textAlignVertical="top"
                  value={draft}
                  onChangeText={(text) => setDraft(sanitizeFieldInput(kind, text))}
                  onContentSizeChange={(event) => {
                    setContentHeight(event.nativeEvent.contentSize.height);
                  }}
                  placeholder={kindProps.placeholder ?? t('import.fieldValuePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    { height: Math.max(52, inputHeight) },
                    canClear && styles.inputWithClear,
                  ]}
                  {...kindProps}
                />
                {canClear ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('common.clear')}
                    hitSlop={8}
                    onPress={() => setDraft('')}
                    style={({ pressed }) => [
                      styles.clearButton,
                      pressed && styles.clearButtonPressed,
                    ]}
                  >
                    <SymbolView
                      name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                      size={20}
                      tintColor={colors.textMuted}
                    />
                  </Pressable>
                ) : null}
              </View>
            )}

            <View style={styles.actions}>
              <PrimaryButton
                label={t('common.cancel')}
                variant="secondary"
                onPress={onCancel}
                style={styles.actionBtn}
              />
              <PrimaryButton
                label={t('import.fieldDone')}
                onPress={() => {
                  onConfirm(draft);
                }}
                style={styles.actionBtn}
              />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    keyboard: {
      width: '100%',
    },
    sheet: {
      borderTopLeftRadius: AppDesign.radius.xl,
      borderTopRightRadius: AppDesign.radius.xl,
      backgroundColor: colors.surface,
      paddingHorizontal: Spacing.four,
      paddingTop: Spacing.two,
      gap: Spacing.three,
      borderTopWidth: 1,
      borderColor: colors.border,
      ...AppDesign.shadow,
    },
    handle: {
      alignSelf: 'center',
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    inputWrap: {
      position: 'relative',
      justifyContent: 'center',
    },
    input: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: AppDesign.radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.backgroundSoft,
    },
    inputWithClear: {
      paddingRight: 44,
    },
    clearButton: {
      position: 'absolute',
      right: 10,
      top: 10,
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearButtonPressed: {
      opacity: 0.65,
    },
    checkboxRow: {
      minHeight: 52,
      borderRadius: AppDesign.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSoft,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    checkboxLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    actionBtn: {
      flex: 1,
    },
  });
}
