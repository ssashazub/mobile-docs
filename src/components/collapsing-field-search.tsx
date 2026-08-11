import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

import { DocumentSearchBar } from '@/components/document-search-bar';
import { type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const HEADER_BTN = 36;
const HEADER_EXPANDED_W = 168;

export function useCollapsingSearchMorph(scrollY: SharedValue<number>) {
  const searchOffset = useSharedValue(0);
  const searchHeight = useSharedValue(48);

  const progress = useDerivedValue(() =>
    interpolate(
      scrollY.value,
      [searchOffset.value - 8, searchOffset.value + Math.max(24, searchHeight.value * 0.7)],
      [0, 1],
      Extrapolation.CLAMP
    )
  );

  const onSearchLayout = useCallback(
    (event: LayoutChangeEvent) => {
      searchOffset.value = event.nativeEvent.layout.y;
      searchHeight.value = Math.max(event.nativeEvent.layout.height, 48);
    },
    [searchHeight, searchOffset]
  );

  const bodyStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.55], [1, 0], Extrapolation.CLAMP),
      maxHeight: interpolate(p, [0, 1], [56, 0], Extrapolation.CLAMP),
      marginBottom: interpolate(p, [0, 1], [0, -16], Extrapolation.CLAMP),
      overflow: 'hidden' as const,
      transform: [
        { translateY: interpolate(p, [0, 1], [0, -8], Extrapolation.CLAMP) },
        { scale: interpolate(p, [0, 1], [1, 0.97], Extrapolation.CLAMP) },
      ],
    };
  });

  /**
   * Slot size stays fixed so the ⋮ / Edit control never shifts.
   * Only opacity fades the lupa in.
   */
  const headerSlotStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      width: HEADER_BTN,
      height: HEADER_BTN,
      marginRight: 6,
      opacity: interpolate(p, [0.2, 0.55], [0, 1], Extrapolation.CLAMP),
      flexShrink: 0,
    };
  });

  return useMemo(
    () => ({
      progress,
      onSearchLayout,
      bodyStyle,
      headerSlotStyle,
      searchOffset,
    }),
    [bodyStyle, headerSlotStyle, onSearchLayout, progress, searchOffset]
  );
}

export type CollapsingSearchMorph = ReturnType<typeof useCollapsingSearchMorph>;

type CollapsingSearchBodyProps = {
  morph: CollapsingSearchMorph;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export function CollapsingSearchBody({
  morph,
  value,
  onChangeText,
  placeholder,
}: CollapsingSearchBodyProps) {
  return (
    <Animated.View style={morph.bodyStyle} onLayout={morph.onSearchLayout}>
      <DocumentSearchBar value={value} onChangeText={onChangeText} placeholder={placeholder} />
    </Animated.View>
  );
}

type CollapsingSearchHeaderBtnProps = {
  morph: CollapsingSearchMorph;
  hasQuery: boolean;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  accessibilityLabel: string;
};

export function CollapsingSearchHeaderBtn({
  morph,
  hasQuery,
  expanded,
  onExpand,
  onCollapse,
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
}: CollapsingSearchHeaderBtnProps) {
  const colors = useTheme();
  const styles = useMemo(() => createChromeStyles(colors), [colors]);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!expanded) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [expanded]);

  if (expanded) {
    return (
      <View style={styles.headerExpandedSlot}>
        <DocumentSearchBar
          compact
          autoFocus
          inputRef={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          style={styles.headerExpandedBar}
          onBlur={() => {
            if (!value.trim()) {
              onCollapse();
            }
          }}
        />
      </View>
    );
  }

  return (
    <Animated.View style={morph.headerSlotStyle} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onExpand}
        style={({ pressed }) => [
          styles.headerSearchBtn,
          pressed && styles.headerSearchBtnPressed,
        ]}
      >
        <SymbolView
          name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
          size={17}
          tintColor={colors.text}
          weight="semibold"
        />
        {hasQuery ? <View style={styles.headerSearchDot} /> : null}
      </Pressable>
    </Animated.View>
  );
}

function createChromeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerExpandedSlot: {
      width: HEADER_EXPANDED_W,
      height: HEADER_BTN,
      marginRight: 6,
      justifyContent: 'center',
      flexShrink: 0,
    },
    headerExpandedBar: {
      minHeight: HEADER_BTN,
      maxHeight: HEADER_BTN,
      paddingVertical: 0,
    },
    headerSearchBtn: {
      width: HEADER_BTN,
      height: HEADER_BTN,
      borderRadius: HEADER_BTN / 2,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      backgroundColor: colors.surfaceContainer,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    headerSearchBtnPressed: {
      opacity: 0.7,
    },
    headerSearchDot: {
      position: 'absolute',
      top: 7,
      right: 7,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.primary,
      borderWidth: 1.5,
      borderColor: colors.background,
    },
  });
}
