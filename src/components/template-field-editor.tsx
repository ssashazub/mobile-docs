import { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import type { t } from '@/i18n';
import type { FieldInputKind } from '@/types/field-validation';
import type { TemplateField } from '@/types/template';

type TranslationKey = Parameters<typeof t>[0];

type TemplateFieldEditorProps = {
  field: TemplateField;
  index: number;
  onChange: (field: TemplateField) => void;
  onDelete: () => void;
  canDelete: boolean;
};

const FIELD_KINDS: FieldInputKind[] = ['text', 'date', 'number', 'email', 'phone'];

function getFieldKindLabel(kind: FieldInputKind): TranslationKey {
  switch (kind) {
    case 'date':
      return 'templates.fieldKindDate';
    case 'number':
      return 'templates.fieldKindNumber';
    case 'email':
      return 'templates.fieldKindEmail';
    case 'phone':
      return 'templates.fieldKindPhone';
    default:
      return 'templates.fieldKindText';
  }
}

export function TemplateFieldEditor({
  field,
  index,
  onChange,
  onDelete,
  canDelete,
}: TemplateFieldEditorProps) {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selectedKind = field.kind ?? 'text';

  const setKind = (kind: FieldInputKind) => {
    onChange({
      ...field,
      kind,
      multiline: kind === 'text' ? field.multiline : false,
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.index}>
          {t('common.field')} {index + 1}
        </Text>
        {canDelete ? (
          <Pressable onPress={onDelete} style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
            <Text style={styles.deleteText}>{t('templates.deleteField')}</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.label}>{t('templates.fieldLabel')}</Text>
      <TextInput
        style={styles.input}
        value={field.label}
        onChangeText={(label) => onChange({ ...field, label })}
        placeholder={t('home.client')}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="sentences"
        keyboardType="default"
      />

      <Text style={styles.label}>{t('templates.placeholderLabel')}</Text>
      <TextInput
        style={styles.input}
        value={field.placeholder ?? ''}
        onChangeText={(placeholder) => onChange({ ...field, placeholder })}
        placeholder={t('templates.placeholderHint')}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="sentences"
        keyboardType="default"
      />

      <Text style={styles.label}>{t('templates.fieldKind')}</Text>
      <View style={styles.kindRow}>
        {FIELD_KINDS.map((kind) => {
          const selected = selectedKind === kind;

          return (
            <Pressable
              key={kind}
              onPress={() => setKind(kind)}
              style={({ pressed }) => [
                styles.kindChip,
                selected && styles.kindChipSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.kindChipText, selected && styles.kindChipTextSelected]}>
                {t(getFieldKindLabel(kind))}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('templates.multiline')}</Text>
        <Switch
          value={!!field.multiline}
          onValueChange={(multiline) => onChange({ ...field, multiline })}
          disabled={selectedKind !== 'text'}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={field.multiline ? colors.primary : colors.backgroundElement}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('templates.requiredField')}</Text>
        <Switch
          value={!!field.required}
          onValueChange={(required) => onChange({ ...field, required })}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={field.required ? colors.primary : colors.backgroundElement}
        />
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 8,
      ...AppDesign.cardShadow,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    index: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    delete: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.dangerSoft,
    },
    deleteText: {
      color: colors.danger,
      fontWeight: '700',
      fontSize: 12,
    },
    pressed: {
      opacity: 0.85,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 4,
    },
    input: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.backgroundElement,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    switchLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    kindRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    kindChip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.backgroundSoft,
    },
    kindChipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.chipSelected,
    },
    kindChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    kindChipTextSelected: {
      color: colors.primary,
    },
  });
}
