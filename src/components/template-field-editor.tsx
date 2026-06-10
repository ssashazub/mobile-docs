import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { AppDesign } from '@/constants/app-design';
import { useI18n } from '@/hooks/use-i18n';
import type { TemplateField } from '@/types/template';

type TemplateFieldEditorProps = {
  field: TemplateField;
  index: number;
  onChange: (field: TemplateField) => void;
  onDelete: () => void;
  canDelete: boolean;
};

export function TemplateFieldEditor({
  field,
  index,
  onChange,
  onDelete,
  canDelete,
}: TemplateFieldEditorProps) {
  const { t } = useI18n();

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

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('templates.multiline')}</Text>
        <Switch
          value={!!field.multiline}
          onValueChange={(multiline) => onChange({ ...field, multiline })}
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
});
