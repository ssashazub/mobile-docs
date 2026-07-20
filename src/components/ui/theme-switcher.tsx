import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AppDesign } from '@/constants/app-design';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useThemePreference } from '@/contexts/theme-preference-context';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import type { ThemePreference } from '@/types/theme-preference';

type ThemeIconName = SymbolViewProps['name'];

const THEME_ICONS: Record<ThemePreference, ThemeIconName> = {
  light: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' },
  dark: { ios: 'moon.stars.fill', android: 'dark_mode', web: 'dark_mode' },
  system: { ios: 'circle.lefthalf.filled', android: 'brightness_auto', web: 'brightness_auto' },
};

const OPTIONS: { value: ThemePreference; labelKey: 'theme.light' | 'theme.dark' | 'theme.system' }[] = [
  { value: 'light', labelKey: 'theme.light' },
  { value: 'dark', labelKey: 'theme.dark' },
  { value: 'system', labelKey: 'theme.system' },
];

const SPRING = { damping: 18, stiffness: 220, mass: 0.8 };

type ThemeSwitcherProps = {
  compact?: boolean;
  showCaption?: boolean;
};

function ThemeIcon({
  preference,
  color,
  size = 20,
  filled = false,
}: {
  preference: ThemePreference;
  color: string;
  size?: number;
  filled?: boolean;
}) {
  return (
    <SymbolView
      name={THEME_ICONS[preference]}
      size={size}
      weight={filled ? 'semibold' : 'medium'}
      tintColor={color}
      resizeMode="scaleAspectFit"
    />
  );
}

export function ThemeSwitcher({ compact = false, showCaption = true }: ThemeSwitcherProps) {
  const { t } = useI18n();
  const colors = useTheme();
  const { preference, setPreference } = useThemePreference();
  const styles = useMemo(() => createStyles(colors, compact), [colors, compact]);
  const [expanded, setExpanded] = useState(false);

  const collapsedSize = compact ? 42 : 48;
  const expandedWidth = compact ? 132 : 200;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(expanded ? 1 : 0, SPRING);
  }, [expanded, progress]);

  const shellStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [collapsedSize, expandedWidth]),
    height: collapsedSize,
    borderRadius: interpolate(
      progress.value,
      [0, 1],
      [collapsedSize / 2, compact ? collapsedSize / 2 : AppDesign.radius.md]
    ),
  }));

  const collapsedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.9], Extrapolation.CLAMP) }],
  }));

  const expandedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.35, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const handleExpand = () => {
    if (expanded) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(true);
  };

  const handleSelect = (value: ThemePreference) => {
    if (value !== preference) {
      void Haptics.selectionAsync();
      setPreference(value);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setExpanded(false);
  };

  const selectedLabel = t(OPTIONS.find((option) => option.value === preference)!.labelKey);

  return (
    <View style={styles.wrapper}>
      {!compact && showCaption ? <Text style={styles.caption}>{t('theme.appearance')}</Text> : null}

      <Animated.View style={[styles.shell, shellStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('theme.appearance')}: ${selectedLabel}`}
          accessibilityHint={t('theme.expandHint')}
          accessibilityState={{ expanded }}
          disabled={expanded}
          onPress={handleExpand}
          style={styles.collapsedHitArea}
        >
          <Animated.View style={[styles.collapsedContent, collapsedStyle]} pointerEvents="none">
            <ThemeIcon preference={preference} color={colors.primary} size={compact ? 19 : 21} filled />
          </Animated.View>
        </Pressable>

        <Animated.View
          style={[styles.expandedRow, expandedStyle]}
          pointerEvents={expanded ? 'auto' : 'none'}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('theme.appearance')}
        >
          {OPTIONS.map((option) => {
            const selected = preference === option.value;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={t(option.labelKey)}
                onPress={() => handleSelect(option.value)}
                style={({ pressed }) => [
                  styles.segment,
                  selected && styles.segmentSelected,
                  pressed && styles.pressed,
                ]}
              >
                <ThemeIcon
                  preference={option.value}
                  color={selected ? colors.primary : colors.textSecondary}
                  size={compact ? 18 : 20}
                  filled={selected}
                />
                {!compact ? (
                  <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
                    {t(option.labelKey)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function createStyles(colors: ThemeColors, compact: boolean) {
  return StyleSheet.create({
    wrapper: {
      gap: Spacing.one,
      alignItems: compact ? 'flex-end' : 'stretch',
    },
    caption: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginLeft: Spacing.one,
    },
    shell: {
      overflow: 'hidden',
      backgroundColor: colors.backgroundElement,
      borderWidth: 1,
      borderColor: colors.border,
      ...AppDesign.cardShadow,
    },
    collapsedHitArea: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    collapsedContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    expandedRow: {
      ...StyleSheet.absoluteFill,
      flexDirection: 'row',
      padding: 3,
      gap: 3,
      zIndex: 1,
    },
    segment: {
      flex: 1,
      flexDirection: compact ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: compact ? 0 : 3,
      borderRadius: compact ? 999 : AppDesign.radius.sm - 2,
      minWidth: compact ? 36 : 52,
    },
    segmentSelected: {
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    pressed: {
      opacity: 0.86,
      transform: [{ scale: 0.97 }],
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    labelSelected: {
      color: colors.primary,
    },
  });
}
