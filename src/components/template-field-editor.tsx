import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { AppDesign } from '@/constants/app-design';
import { useI18n } from '@/hooks/use-i18n';
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
        placeholderTextColor={AppDesign.textMuted}
        autoCapitalize="sentences"
        keyboardType="default"
      />

      <Text style={styles.label}>{t('templates.placeholderLabel')}</Text>
      <TextInput
        style={styles.input}
        value={field.placeholder ?? ''}
        onChangeText={(placeholder) => onChange({ ...field, placeholder })}
        placeholder={t('templates.placeholderHint')}
        placeholderTextColor={AppDesign.textMuted}
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
          trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
          thumbColor={field.multiline ? AppDesign.primary : '#f8fafc'}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('templates.requiredField')}</Text>
        <Switch
          value={!!field.required}
          onValueChange={(required) => onChange({ ...field, required })}
          trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
          thumbColor={field.required ? AppDesign.primary : '#f8fafc'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppDesign.surface,
    borderRadius: AppDesign.radius.md,
    borderWidth: 1,
    borderColor: AppDesign.border,
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
    color: AppDesign.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  delete: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: AppDesign.dangerSoft,
  },
  deleteText: {
    color: AppDesign.danger,
    fontWeight: '700',
    fontSize: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: AppDesign.textSecondary,
    marginTop: 4,
  },
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppDesign.text,
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kindChip: {
    borderWidth: 1.5,
    borderColor: AppDesign.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: AppDesign.backgroundSoft,
  },
  kindChipSelected: {
    borderColor: AppDesign.primary,
    backgroundColor: '#eef2ff',
  },
  kindChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppDesign.textSecondary,
  },
  kindChipTextSelected: {
    color: AppDesign.primary,
  },
});
