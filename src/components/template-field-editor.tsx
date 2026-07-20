import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import type { t } from '@/i18n';
import type { FieldInputKind } from '@/types/field-validation';
import type { TemplateField } from '@/types/template';

/** Collapse field cards into an accordion once the list gets long. */
export const FIELD_ACCORDION_THRESHOLD = 5;

type TranslationKey = Parameters<typeof t>[0];

type TemplateFieldEditorProps = {
  field: TemplateField;
  index: number;
  onChange: (field: TemplateField) => void;
  onDelete: () => void;
  canDelete: boolean;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
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
  index: _index,
  onChange,
  onDelete,
  canDelete,
  collapsible = false,
  expanded = true,
  onToggle,
}: TemplateFieldEditorProps) {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selectedKind = field.kind ?? 'text';
  const isExpanded = !collapsible || expanded;
  const previewLabel = field.label.trim() || t('common.newField');

  const setKind = (kind: FieldInputKind) => {
    onChange({
      ...field,
      kind,
      multiline: kind === 'text' ? field.multiline : false,
    });
  };

  return (
    <View style={[styles.card, collapsible && !isExpanded && styles.cardCollapsed]}>
      <View style={styles.header}>
        <Pressable
          onPress={collapsible ? onToggle : undefined}
          disabled={!collapsible}
          accessibilityRole={collapsible ? 'button' : undefined}
          accessibilityState={collapsible ? { expanded: isExpanded } : undefined}
          style={({ pressed }) => [
            styles.headerMain,
            collapsible && pressed && styles.pressed,
          ]}
        >
          <Text style={styles.previewLabel} numberOfLines={1}>
            {previewLabel}
          </Text>
          <View style={styles.indicatorRow}>
            <View style={[styles.indicatorChip, styles.kindChipBadge]}>
              <Text style={[styles.indicatorChipText, styles.kindChipBadgeText]}>
                {t(getFieldKindLabel(selectedKind))}
              </Text>
            </View>
            {field.required ? (
              <View style={[styles.indicatorChip, styles.requiredChip]}>
                <Text style={[styles.indicatorChipText, styles.requiredChipText]}>
                  {t('templates.indicatorRequired')}
                </Text>
              </View>
            ) : null}
            {field.multiline && selectedKind === 'text' ? (
              <View style={[styles.indicatorChip, styles.multilineChip]}>
                <Text style={[styles.indicatorChipText, styles.multilineChipText]}>
                  {t('templates.indicatorMultiline')}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.headerActions}>
          {canDelete ? (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
            >
              <Text style={styles.deleteText}>{t('templates.deleteField')}</Text>
            </Pressable>
          ) : null}
          {collapsible ? (
            <Pressable
              onPress={onToggle}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
              style={({ pressed }) => [styles.chevronButton, pressed && styles.pressed]}
            >
              <SymbolView
                name={{
                  ios: isExpanded ? 'chevron.up' : 'chevron.down',
                  android: isExpanded ? 'expand_less' : 'expand_more',
                  web: isExpanded ? 'expand_less' : 'expand_more',
                }}
                size={20}
                tintColor={colors.textSecondary}
                weight="semibold"
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isExpanded ? (
        <View style={styles.body}>
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
      ) : null}
    </View>
  );
}

type TemplateFieldsListProps = {
  fields: TemplateField[];
  onChangeField: (index: number, field: TemplateField) => void;
  onDeleteField: (index: number) => void;
};

export function TemplateFieldsList({
  fields,
  onChangeField,
  onDeleteField,
}: TemplateFieldsListProps) {
  const accordion = fields.length >= FIELD_ACCORDION_THRESHOLD;
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const prevLengthRef = useRef(fields.length);

  useEffect(() => {
    if (!accordion) {
      setExpandedKey(null);
      prevLengthRef.current = fields.length;
      return;
    }

    if (fields.length > prevLengthRef.current) {
      const last = fields[fields.length - 1];
      setExpandedKey(last?.key ?? null);
    } else if (expandedKey && !fields.some((field) => field.key === expandedKey)) {
      setExpandedKey(null);
    }

    prevLengthRef.current = fields.length;
  }, [accordion, expandedKey, fields]);

  return (
    <View style={listStyles.wrap}>
      {fields.map((field, index) => {
        const expanded = !accordion || expandedKey === field.key;

        return (
          <TemplateFieldEditor
            key={field.key}
            field={field}
            index={index}
            onChange={(nextField) => onChangeField(index, nextField)}
            onDelete={() => onDeleteField(index)}
            canDelete={fields.length > 1}
            collapsible={accordion}
            expanded={expanded}
            onToggle={() =>
              setExpandedKey((current) => (current === field.key ? null : field.key))
            }
          />
        );
      })}
    </View>
  );
}

const listStyles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
});

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
    cardCollapsed: {
      paddingVertical: 12,
      gap: 0,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    headerMain: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    chevronButton: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    indicatorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
    },
    indicatorChip: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    indicatorChipText: {
      fontSize: 11,
      fontWeight: '700',
    },
    kindChipBadge: {
      backgroundColor: colors.primarySoft,
    },
    kindChipBadgeText: {
      color: colors.primary,
    },
    requiredChip: {
      backgroundColor: colors.dangerSoft,
    },
    requiredChipText: {
      color: colors.danger,
    },
    multilineChip: {
      backgroundColor: colors.optionSelected,
    },
    multilineChipText: {
      color: colors.optionAccent,
    },
    body: {
      gap: 8,
      marginTop: 4,
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
