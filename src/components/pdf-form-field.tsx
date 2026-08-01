import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ValidatedFormField } from '@/components/validated-form-field';
import { ThemedText } from '@/components/themed-text';
import { AppDesign } from '@/constants/app-design';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isCheckboxChecked } from '@/lib/pdf-form';
import type { PdfFormField } from '@/types/document';

type PdfFormFieldInputProps = {
  field: PdfFormField;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  shakeToken?: number;
};

function OptionPicker({
  label,
  options,
  value,
  onChange,
  mode,
  styles,
  colors,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  mode: 'radio' | 'dropdown';
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = value === option;

          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
            >
              <View
                style={[
                  styles.optionMarker,
                  mode === 'radio' ? styles.radio : styles.dropdown,
                  { borderColor: colors.optionAccent },
                ]}
              >
                {selected ? (
                  <View style={[styles.optionMarkerFill, { backgroundColor: colors.optionAccent }]} />
                ) : null}
              </View>
              <ThemedText style={styles.optionText}>{option}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const PdfFormFieldInput = memo(function PdfFormFieldInput({
  field,
  value,
  onChange,
  error,
  shakeToken,
}: PdfFormFieldInputProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (field.type === 'checkbox') {
    return (
      <View style={styles.field}>
        <View style={styles.checkboxRow}>
          <ThemedText type="smallBold" style={styles.checkboxLabel}>
            {field.label}
          </ThemedText>
          <Switch
            value={isCheckboxChecked(value)}
            onValueChange={(checked) => onChange(checked ? 'true' : 'false')}
            trackColor={{ false: colors.border, true: colors.optionAccent }}
            thumbColor={isCheckboxChecked(value) ? colors.optionAccent : colors.backgroundElement}
          />
        </View>
      </View>
    );
  }

  if (field.type === 'radio' && field.options && field.options.length > 0) {
    return (
      <OptionPicker
        label={field.label}
        options={field.options}
        value={value}
        onChange={onChange}
        mode="radio"
        styles={styles}
        colors={colors}
      />
    );
  }

  if (field.type === 'dropdown' && field.options && field.options.length > 0) {
    return (
      <OptionPicker
        label={field.label}
        options={field.options}
        value={value}
        onChange={onChange}
        mode="dropdown"
        styles={styles}
        colors={colors}
      />
    );
  }

  return (
    <ValidatedFormField
      fieldKey={field.name}
      kind={field.inputKind}
      label={field.label}
      value={value}
      onChangeText={onChange}
      error={error}
      shakeToken={shakeToken}
      multiline
    />
  );
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    field: {
      gap: Spacing.one,
    },
    label: {
      marginLeft: Spacing.one,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.backgroundElement,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: AppDesign.radius.md,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two + 2,
    },
    checkboxLabel: {
      flex: 1,
      paddingRight: Spacing.two,
    },
    options: {
      gap: Spacing.two,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      backgroundColor: colors.backgroundElement,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: AppDesign.radius.md,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two + 2,
    },
    optionSelected: {
      borderColor: colors.optionAccent,
      backgroundColor: colors.optionSelected,
    },
    optionPressed: {
      opacity: 0.92,
    },
    optionMarker: {
      width: 20,
      height: 20,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radio: {
      borderRadius: 10,
    },
    dropdown: {
      borderRadius: 4,
    },
    optionMarkerFill: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    optionText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 21,
    },
  });
}
