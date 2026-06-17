import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppDesign } from '@/constants/app-design';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FormFieldProps = TextInputProps & {
  label: string;
};

const multilingualDefaults: Partial<TextInputProps> = {
  autoCapitalize: 'sentences',
  autoCorrect: true,
  spellCheck: true,
  keyboardType: 'default',
  autoComplete: 'off',
  textContentType: 'none',
  importantForAutofill: 'no',
};

export function FormField({ label, style, onFocus, onBlur, ...inputProps }: FormFieldProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.backgroundElement,
            borderColor: focused ? colors.primary : colors.border,
          },
          focused && styles.inputFocused,
          style,
        ]}
        {...multilingualDefaults}
        {...inputProps}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    field: {
      gap: Spacing.one,
    },
    label: {
      marginLeft: Spacing.one,
    },
    input: {
      borderWidth: 1.5,
      borderRadius: AppDesign.radius.md,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two + 4,
      fontSize: 16,
      lineHeight: 22,
    },
    inputFocused: {
      shadowColor: colors.primary,
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
  });
}
