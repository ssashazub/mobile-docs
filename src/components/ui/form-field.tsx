import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppDesign } from '@/constants/app-design';
import { Spacing } from '@/constants/theme';
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
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: AppDesign.surface,
            borderColor: focused ? AppDesign.primary : AppDesign.border,
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

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  label: {
    marginLeft: Spacing.one,
    color: AppDesign.textSecondary,
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
    shadowColor: AppDesign.primary,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
