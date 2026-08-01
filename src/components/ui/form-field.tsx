import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { AppDesign } from '@/constants/app-design';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FormFieldProps = TextInputProps & {
  label: string;
  required?: boolean;
  error?: boolean;
  shakeToken?: number;
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

const LINE_HEIGHT = 22;
const INPUT_PADDING_Y = Spacing.two + 4;
const MAX_CONTENT_HEIGHT = LINE_HEIGHT * 4;
/** Grow only after content clearly exceeds the first measured single-line height. */
const GROW_EPSILON = 8;

export function FormField({
  label,
  required = false,
  error = false,
  shakeToken = 0,
  style,
  value,
  onFocus,
  onBlur,
  multiline: _multilineProp,
  numberOfLines: _numberOfLines,
  onContentSizeChange,
  scrollEnabled,
  textAlignVertical,
  ...inputProps
}: FormFieldProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const baselineHeight = useRef<number | null>(null);
  const shake = useSharedValue(0);

  const emptyRequired = required && !(typeof value === 'string' ? value.trim() : value);
  const showError = error || emptyRequired;

  const baseline = baselineHeight.current ?? LINE_HEIGHT;
  const isGrown = contentHeight > baseline + GROW_EPSILON;
  const grownHeight = Math.min(MAX_CONTENT_HEIGHT, contentHeight) + INPUT_PADDING_Y * 2;

  useEffect(() => {
    if (!shakeToken) {
      return;
    }

    shake.value = withSequence(
      withTiming(-10, { duration: 45 }),
      withTiming(10, { duration: 45 }),
      withTiming(-8, { duration: 45 }),
      withTiming(8, { duration: 45 }),
      withTiming(-4, { duration: 40 }),
      withTiming(0, { duration: 40 })
    );
  }, [shake, shakeToken]);

  useEffect(() => {
    if (typeof value === 'string' && value.length === 0) {
      setContentHeight(0);
      baselineHeight.current = null;
    }
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  return (
    <Animated.View style={[styles.field, animatedStyle]}>
      <View style={styles.labelRow}>
        <ThemedText
          type="smallBold"
          themeColor={showError ? 'danger' : 'textSecondary'}
          style={styles.label}
        >
          {label}
        </ThemedText>
        {required ? (
          <ThemedText type="smallBold" themeColor="danger" style={styles.requiredMark}>
            *
          </ThemedText>
        ) : null}
      </View>
      <TextInput
        placeholderTextColor={colors.textMuted}
        value={value}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.backgroundElement,
            borderColor: showError
              ? colors.danger
              : focused
                ? colors.primary
                : colors.border,
          },
          isGrown ? { height: grownHeight } : null,
          focused && !showError && styles.inputFocused,
          showError && styles.inputError,
          style,
        ]}
        {...multilingualDefaults}
        {...inputProps}
        multiline
        scrollEnabled={scrollEnabled ?? false}
        textAlignVertical={textAlignVertical ?? (isGrown ? 'top' : 'center')}
        onContentSizeChange={(event) => {
          const next = event.nativeEvent.contentSize.height;
          if (baselineHeight.current == null || next < baselineHeight.current) {
            baselineHeight.current = next;
          }
          setContentHeight(next);
          onContentSizeChange?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    field: {
      gap: Spacing.one,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: Spacing.one,
    },
    label: {
      marginLeft: 0,
    },
    requiredMark: {
      lineHeight: 18,
    },
    input: {
      borderWidth: 1.5,
      borderRadius: AppDesign.radius.md,
      paddingHorizontal: Spacing.three,
      paddingVertical: INPUT_PADDING_Y,
      fontSize: 16,
      lineHeight: LINE_HEIGHT,
    },
    inputFocused: {
      shadowColor: colors.primary,
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    inputError: {
      shadowColor: colors.danger,
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
  });
}
