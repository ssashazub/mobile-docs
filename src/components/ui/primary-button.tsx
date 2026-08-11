import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { AppDesign, AppGradients } from '@/constants/app-design';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PrimaryButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  loading = false,
  variant = 'primary',
  disabled,
  style,
  ...props
}: PrimaryButtonProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDisabled = disabled || loading;

  const content = loading ? (
    <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#fff'} />
  ) : (
    <ThemedText
      style={[styles.label, variant === 'secondary' ? styles.labelTonal : styles.labelSolid]}
    >
      {label}
    </ThemedText>
  );

  if (variant === 'secondary') {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.button,
          styles.tonal,
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.tonalPressed,
          style,
        ]}
        {...props}
      >
        {content}
      </Pressable>
    );
  }

  const gradientColors = variant === 'danger' ? [colors.danger, '#be123c'] : AppGradients.brand;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.shell,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...props}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        {content}
      </LinearGradient>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    shell: {
      borderRadius: AppDesign.radius.pill,
      ...AppDesign.heroShadow,
    },
    button: {
      borderRadius: AppDesign.radius.pill,
      paddingVertical: Spacing.three,
      paddingHorizontal: Spacing.five,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 54,
    },
    tonal: {
      backgroundColor: colors.primaryContainer,
      ...AppDesign.softShadow,
    },
    tonalPressed: {
      backgroundColor: colors.backgroundSelected,
      transform: [{ scale: 0.985 }],
    },
    label: {
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: 0.1,
    },
    labelSolid: {
      color: '#fff',
    },
    labelTonal: {
      color: colors.onPrimaryContainer,
    },
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.92,
      transform: [{ scale: 0.985 }],
    },
  });
}
