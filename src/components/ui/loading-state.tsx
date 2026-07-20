import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label }: LoadingStateProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cycle = useSharedValue(0);
  const scan = useSharedValue(0);
  const float = useSharedValue(0);
  const dotA = useSharedValue(0);
  const dotB = useSharedValue(0);
  const dotC = useSharedValue(0);

  useEffect(() => {
    cycle.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false
    );
    scan.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    float.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    const bounce = (delay: number) =>
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) })
          ),
          -1,
          false
        )
      );

    dotA.value = bounce(0);
    dotB.value = bounce(140);
    dotC.value = bounce(280);
  }, [cycle, scan, float, dotA, dotB, dotC]);

  const stageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(float.value, [0, 1], [0, -6]) }],
  }));

  const backCardStyle = useAnimatedStyle(() => {
    const t = cycle.value;
    return {
      opacity: interpolate(t, [0, 0.35, 0.7, 1], [0.35, 0.55, 0.4, 0.35]),
      transform: [
        { translateY: interpolate(t, [0, 0.5, 1], [-10, -16, -10]) },
        { translateX: interpolate(t, [0, 0.5, 1], [10, 14, 10]) },
        { rotate: `${interpolate(t, [0, 0.5, 1], [8, 12, 8])}deg` },
        { scale: interpolate(t, [0, 0.5, 1], [0.9, 0.86, 0.9]) },
      ],
    };
  });

  const midCardStyle = useAnimatedStyle(() => {
    const t = cycle.value;
    return {
      opacity: interpolate(t, [0, 0.4, 0.75, 1], [0.55, 0.75, 0.6, 0.55]),
      transform: [
        { translateY: interpolate(t, [0, 0.5, 1], [-4, -8, -4]) },
        { translateX: interpolate(t, [0, 0.5, 1], [4, 7, 4]) },
        { rotate: `${interpolate(t, [0, 0.5, 1], [3, 5, 3])}deg` },
        { scale: interpolate(t, [0, 0.5, 1], [0.95, 0.92, 0.95]) },
      ],
    };
  });

  const frontCardStyle = useAnimatedStyle(() => {
    const t = cycle.value;
    return {
      transform: [
        { translateY: interpolate(t, [0, 0.45, 1], [0, -14, 0], Extrapolation.CLAMP) },
        { rotate: `${interpolate(t, [0, 0.45, 1], [0, -4, 0], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(t, [0, 0.45, 1], [1, 1.04, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  const scanStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scan.value, [0, 0.15, 0.85, 1], [0, 0.9, 0.9, 0]),
    transform: [{ translateY: interpolate(scan.value, [0, 1], [8, 52]) }],
  }));

  const lineAStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scan.value, [0, 0.25, 0.55, 1], [0.25, 0.9, 0.55, 0.25]),
    width: interpolate(scan.value, [0, 0.4, 1], [18, 36, 22]),
  }));

  const lineBStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scan.value, [0, 0.35, 0.7, 1], [0.2, 0.75, 0.45, 0.2]),
    width: interpolate(scan.value, [0, 0.55, 1], [14, 30, 16]),
  }));

  const lineCStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scan.value, [0, 0.45, 0.85, 1], [0.15, 0.6, 0.35, 0.15]),
    width: interpolate(scan.value, [0, 0.7, 1], [12, 26, 14]),
  }));

  const dotAStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + dotA.value * 0.65,
    transform: [{ translateY: -dotA.value * 5 }, { scale: 0.85 + dotA.value * 0.3 }],
  }));
  const dotBStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + dotB.value * 0.65,
    transform: [{ translateY: -dotB.value * 5 }, { scale: 0.85 + dotB.value * 0.3 }],
  }));
  const dotCStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + dotC.value * 0.65,
    transform: [{ translateY: -dotC.value * 5 }, { scale: 0.85 + dotC.value * 0.3 }],
  }));

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={label}>
      <Animated.View style={[styles.stage, stageStyle]}>
        <Animated.View style={[styles.card, styles.cardBack, backCardStyle]} />
        <Animated.View style={[styles.card, styles.cardMid, midCardStyle]} />
        <Animated.View style={[styles.card, styles.cardFront, frontCardStyle]}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <SymbolView
                name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}
                size={18}
                tintColor={colors.primary}
                weight="semibold"
              />
            </View>
            <View style={styles.headerBars}>
              <Animated.View style={[styles.line, styles.lineStrong, lineAStyle]} />
              <Animated.View style={[styles.line, lineBStyle]} />
            </View>
          </View>
          <Animated.View style={[styles.line, lineCStyle]} />
          <View style={styles.lineShort} />
          <Animated.View style={[styles.scanBeam, scanStyle]} />
        </Animated.View>
      </Animated.View>

      <View style={styles.dots}>
        <Animated.View style={[styles.dot, dotAStyle]} />
        <Animated.View style={[styles.dot, styles.dotMid, dotBStyle]} />
        <Animated.View style={[styles.dot, dotCStyle]} />
      </View>

      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
    },
    stage: {
      width: 120,
      height: 110,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      position: 'absolute',
      width: 78,
      height: 96,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cardBack: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.templatesBorder,
    },
    cardMid: {
      backgroundColor: colors.backgroundSoft,
    },
    cardFront: {
      padding: 12,
      gap: 8,
      overflow: 'hidden',
      shadowColor: colors.primary,
      shadowOpacity: 0.16,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconBadge: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    headerBars: {
      flex: 1,
      gap: 5,
    },
    line: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
      opacity: 0.35,
    },
    lineStrong: {
      opacity: 0.55,
    },
    lineShort: {
      height: 6,
      width: 28,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    scanBeam: {
      position: 'absolute',
      left: 8,
      right: 8,
      height: 2,
      borderRadius: 2,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.7,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
    },
    dots: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 7,
      height: 14,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    dotMid: {
      opacity: 0.85,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });
}
