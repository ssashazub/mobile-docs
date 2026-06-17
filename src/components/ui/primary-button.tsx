import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppDesign } from '@/constants/app-design';
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

  const variantStyles = {
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.secondaryButton },
    danger: { backgroundColor: colors.danger },
  } as const;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <ThemedText style={styles.label}>{label}</ThemedText>
      )}
    </Pressable>
  );
}

function createStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    button: {
      borderRadius: AppDesign.radius.md,
      paddingVertical: Spacing.three,
      paddingHorizontal: Spacing.four,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 54,
      ...AppDesign.shadow,
    },
    label: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
    },
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.88,
      transform: [{ scale: 0.985 }],
    },
  });
}
