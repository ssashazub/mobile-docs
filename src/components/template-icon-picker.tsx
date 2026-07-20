import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { TemplateIconView } from '@/components/template-icon-view';
import { AppDesign } from '@/constants/app-design';
import {
  TEMPLATE_SYMBOL_PRESETS,
  type TemplateIcon,
  type TemplateSymbolId,
} from '@/constants/template-icons';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { createEmojiIcon, createNoneIcon, createSymbolIcon } from '@/lib/template-icon';

type TemplateIconPickerProps = {
  value: TemplateIcon;
  onChange: (icon: TemplateIcon) => void;
};

export function TemplateIconPicker({ value, onChange }: TemplateIconPickerProps) {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [customEmoji, setCustomEmoji] = useState(value.kind === 'emoji' ? value.value : '');

  useEffect(() => {
    setCustomEmoji(value.kind === 'emoji' ? value.value : '');
  }, [value]);

  const selectSymbol = (symbolId: TemplateSymbolId) => {
    setCustomEmoji('');
    onChange(createSymbolIcon(symbolId));
  };

  const selectNone = () => {
    setCustomEmoji('');
    onChange(createNoneIcon());
  };

  const handleCustomEmojiChange = (text: string) => {
    setCustomEmoji(text);

    if (!text.trim()) {
      onChange(createNoneIcon());
      return;
    }

    onChange(createEmojiIcon(text));
  };

  const isNone = value.kind === 'none' || !value.value.trim();

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{t('templates.iconTitle')}</Text>
      <Text style={styles.hint}>{t('templates.iconSubtitle')}</Text>

      <View style={styles.preview}>
        {isNone ? (
          <Text style={styles.previewEmpty}>{t('templates.iconNone')}</Text>
        ) : (
          <TemplateIconView icon={value} size={28} color={colors.primary} />
        )}
      </View>

      <View style={styles.grid}>
        {TEMPLATE_SYMBOL_PRESETS.map((preset) => {
          const selected =
            value.kind === 'symbol' && value.value === preset.id;

          return (
            <Pressable
              key={preset.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t('templates.iconPreset')}
              onPress={() => selectSymbol(preset.id)}
              style={({ pressed }) => [
                styles.iconChip,
                selected && styles.iconChipSelected,
                pressed && styles.pressed,
              ]}
            >
              <TemplateIconView
                icon={{ kind: 'symbol', value: preset.id }}
                size={22}
                color={selected ? colors.primary : colors.textSecondary}
              />
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isNone }}
          accessibilityLabel={t('templates.iconNone')}
          onPress={selectNone}
          style={({ pressed }) => [
            styles.iconChip,
            styles.noneChip,
            isNone && styles.iconChipSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.noneChipText, isNone && styles.noneChipTextSelected]}>-</Text>
        </Pressable>
      </View>

      <View style={styles.customSection}>
        <Text style={styles.customLabel}>{t('templates.iconCustom')}</Text>
        <TextInput
          style={styles.customInput}
          value={customEmoji}
          onChangeText={handleCustomEmojiChange}
          placeholder={t('templates.iconCustomPlaceholder')}
          placeholderTextColor={colors.textMuted}
          maxLength={8}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      gap: Spacing.two,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 4,
    },
    hint: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
    },
    preview: {
      minHeight: 52,
      borderRadius: AppDesign.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSoft,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.two,
    },
    previewEmpty: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    iconChip: {
      width: 46,
      height: 46,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.backgroundElement,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconChipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    noneChip: {
      borderStyle: 'dashed',
    },
    noneChipText: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textMuted,
      lineHeight: 24,
    },
    noneChipTextSelected: {
      color: colors.primary,
    },
    pressed: {
      opacity: 0.86,
    },
    customSection: {
      gap: Spacing.one,
    },
    customLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    customInput: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 22,
      color: colors.text,
      backgroundColor: colors.backgroundSoft,
      textAlign: 'center',
    },
  });
}
