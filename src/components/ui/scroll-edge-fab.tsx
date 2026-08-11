import { memo, useCallback, useEffect, useImperativeHandle, forwardRef, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import type { ThemeColors } from '@/constants/theme';

export type ScrollEdgeMode = 'none' | 'start' | 'middle' | 'end';

export type ScrollEdgeFabHandle = {
  setMetrics: (offsetY: number, viewportHeight: number, contentHeight: number) => void;
};

type ScrollEdgeFabProps = {
  colors: ThemeColors;
  onScrollToTop: () => void;
  onScrollToBottom: () => void;
  topLabel: string;
  bottomLabel: string;
};

const SPLIT_GAP = 44;
const APPEAR_MS = 280;
const SPLIT_SPRING = { damping: 16, stiffness: 180, mass: 0.7 };
const FAB_FILL_ALPHA = 0.62;

function colorWithAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const value = hex[1];
    const r = Number.parseInt(value.slice(0, 2), 16);
    const g = Number.parseInt(value.slice(2, 4), 16);
    const b = Number.parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

function modeFromMetrics(
  offsetY: number,
  viewportHeight: number,
  contentHeight: number
): ScrollEdgeMode {
  if (viewportHeight <= 0 || contentHeight <= 0) {
    return 'none';
  }
  if (contentHeight <= viewportHeight + 48) {
    return 'none';
  }
  const distanceFromBottom = contentHeight - (offsetY + viewportHeight);
  if (offsetY <= 56) {
    return 'start';
  }
  if (distanceFromBottom <= 56) {
    return 'end';
  }
  return 'middle';
}

/**
 * Morphing scroll controls on the right edge.
 * Metrics are pushed imperatively so the parent does not re-render on scroll.
 */
export const ScrollEdgeFab = memo(
  forwardRef<ScrollEdgeFabHandle, ScrollEdgeFabProps>(function ScrollEdgeFab(
    { colors, onScrollToTop, onScrollToBottom, topLabel, bottomLabel },
    ref
  ) {
    const [mode, setMode] = useState<ScrollEdgeMode>('none');
    const modeRef = useRef<ScrollEdgeMode>('none');
    const visible = useSharedValue(0);
    const split = useSharedValue(0);
    const showUp = useSharedValue(0);
    const showDown = useSharedValue(0);

    const applyMode = useCallback((next: ScrollEdgeMode) => {
      if (modeRef.current === next) {
        return;
      }
      modeRef.current = next;
      setMode(next);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        setMetrics(offsetY, viewportHeight, contentHeight) {
          applyMode(modeFromMetrics(offsetY, viewportHeight, contentHeight));
        },
      }),
      [applyMode]
    );

    useEffect(() => {
      const isVisible = mode !== 'none';
      visible.value = withTiming(isVisible ? 1 : 0, {
        duration: APPEAR_MS,
        easing: Easing.out(Easing.cubic),
      });

      if (mode === 'start') {
        split.value = withSpring(0, SPLIT_SPRING);
        showUp.value = withTiming(0, { duration: 200 });
        showDown.value = withTiming(1, { duration: APPEAR_MS });
      } else if (mode === 'middle') {
        split.value = withSpring(1, SPLIT_SPRING);
        showUp.value = withTiming(1, { duration: 220 });
        showDown.value = withTiming(1, { duration: 220 });
      } else if (mode === 'end') {
        split.value = withSpring(0, SPLIT_SPRING);
        showUp.value = withTiming(1, { duration: APPEAR_MS });
        showDown.value = withTiming(0, { duration: 200 });
      } else {
        showUp.value = withTiming(0, { duration: 180 });
        showDown.value = withTiming(0, { duration: 180 });
      }
    }, [mode, showDown, showUp, split, visible]);

    const stackStyle = useAnimatedStyle(() => ({
      opacity: visible.value,
      transform: [
        {
          scale: interpolate(visible.value, [0, 1], [0.86, 1], Extrapolation.CLAMP),
        },
      ],
    }));

    const upStyle = useAnimatedStyle(() => ({
      opacity: showUp.value,
      transform: [
        {
          translateY: interpolate(split.value, [0, 1], [0, -SPLIT_GAP / 2], Extrapolation.CLAMP),
        },
        {
          scale: interpolate(showUp.value, [0, 1], [0.7, 1], Extrapolation.CLAMP),
        },
      ],
    }));

    const downStyle = useAnimatedStyle(() => ({
      opacity: showDown.value,
      transform: [
        {
          translateY: interpolate(split.value, [0, 1], [0, SPLIT_GAP / 2], Extrapolation.CLAMP),
        },
        {
          scale: interpolate(showDown.value, [0, 1], [0.7, 1], Extrapolation.CLAMP),
        },
      ],
    }));

    const upEnabled = mode === 'middle' || mode === 'end';
    const downEnabled = mode === 'start' || mode === 'middle';

    return (
      <Animated.View
        pointerEvents={mode === 'none' ? 'none' : 'box-none'}
        style={[styles.stack, stackStyle]}
      >
        <Animated.View style={[styles.slot, upStyle]} pointerEvents={upEnabled ? 'auto' : 'none'}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={topLabel}
            onPress={onScrollToTop}
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: colorWithAlpha(colors.surface, FAB_FILL_ALPHA),
                borderColor: colorWithAlpha(colors.border, 0.55),
              },
              pressed && styles.fabPressed,
            ]}
          >
            <SymbolView
              name={{ ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }}
              size={22}
              tintColor={colors.text}
            />
          </Pressable>
        </Animated.View>

        <Animated.View
          style={[styles.slot, downStyle]}
          pointerEvents={downEnabled ? 'auto' : 'none'}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={bottomLabel}
            onPress={onScrollToBottom}
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: colorWithAlpha(colors.surface, FAB_FILL_ALPHA),
                borderColor: colorWithAlpha(colors.border, 0.55),
              },
              pressed && styles.fabPressed,
            ]}
          >
            <SymbolView
              name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
              size={22}
              tintColor={colors.text}
            />
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  })
);

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  slot: {
    position: 'absolute',
  },
  fab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    // Soft overlay — sits on top of full-width fields without reserving layout space.
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  fabPressed: {
    opacity: 0.72,
  },
});
