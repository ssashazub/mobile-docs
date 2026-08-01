import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { AppDesign } from '@/constants/app-design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { UiRect } from '@/lib/pdf-coords';

export type OverlayViewModel = {
  id: string;
  label?: string;
  text: string;
  editable: boolean;
  rect: UiRect;
};

type PdfOverlayItemProps = {
  item: OverlayViewModel;
  selected: boolean;
  onSelect: (id: string) => void;
  onChangeText: (id: string, text: string) => void;
  onMove: (id: string, rect: UiRect) => void;
  onResize: (id: string, rect: UiRect) => void;
  onDelete: (id: string) => void;
  pageWidth: number;
  pageHeight: number;
};

const MIN_WIDTH = 48;
const MIN_HEIGHT = 24;

export function PdfOverlayItem({
  item,
  selected,
  onSelect,
  onChangeText,
  onMove,
  onResize,
  onDelete,
  pageWidth,
  pageHeight,
}: PdfOverlayItemProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [editing, setEditing] = useState(false);

  const left = useSharedValue(item.rect.left);
  const top = useSharedValue(item.rect.top);
  const width = useSharedValue(item.rect.width);
  const height = useSharedValue(item.rect.height);
  const startLeft = useSharedValue(0);
  const startTop = useSharedValue(0);
  const startWidth = useSharedValue(0);
  const startHeight = useSharedValue(0);

  useEffect(() => {
    left.value = item.rect.left;
    top.value = item.rect.top;
    width.value = item.rect.width;
    height.value = item.rect.height;
  }, [item.rect.height, item.rect.left, item.rect.top, item.rect.width, left, top, width, height]);

  const commitMove = (rect: UiRect) => {
    onMove(item.id, rect);
  };

  const commitResize = (rect: UiRect) => {
    onResize(item.id, rect);
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      startLeft.value = left.value;
      startTop.value = top.value;
    })
    .onUpdate((event) => {
      const nextLeft = Math.min(
        pageWidth - width.value,
        Math.max(0, startLeft.value + event.translationX)
      );
      const nextTop = Math.min(
        pageHeight - height.value,
        Math.max(0, startTop.value + event.translationY)
      );
      left.value = nextLeft;
      top.value = nextTop;
    })
    .onEnd(() => {
      runOnJS(commitMove)({
        left: left.value,
        top: top.value,
        width: width.value,
        height: height.value,
      });
    });

  const resize = Gesture.Pan()
    .onBegin(() => {
      startWidth.value = width.value;
      startHeight.value = height.value;
      startLeft.value = left.value;
      startTop.value = top.value;
    })
    .onUpdate((event) => {
      width.value = Math.min(
        pageWidth - startLeft.value,
        Math.max(MIN_WIDTH, startWidth.value + event.translationX)
      );
      height.value = Math.min(
        pageHeight - startTop.value,
        Math.max(MIN_HEIGHT, startHeight.value + event.translationY)
      );
    })
    .onEnd(() => {
      runOnJS(commitResize)({
        left: left.value,
        top: top.value,
        width: width.value,
        height: height.value,
      });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    left: left.value,
    top: top.value,
    width: width.value,
    height: height.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.box, selected && styles.boxSelected, animatedStyle]}>
        <Pressable
          style={styles.inner}
          onPress={() => {
            onSelect(item.id);
            if (item.editable) {
              setEditing(true);
            }
          }}
        >
          {item.label ? (
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
          ) : null}
          {editing && item.editable ? (
            <TextInput
              autoFocus
              value={item.text}
              onChangeText={(text) => onChangeText(item.id, text)}
              onBlur={() => setEditing(false)}
              style={styles.input}
              multiline
            />
          ) : (
            <Text style={styles.text} numberOfLines={4}>
              {item.text || ' '}
            </Text>
          )}
        </Pressable>

        {selected ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => onDelete(item.id)}
              style={styles.deleteBtn}
              hitSlop={8}
            >
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={12}
                tintColor="#fff"
              />
            </Pressable>
            <GestureDetector gesture={resize}>
              <View style={styles.resizeHandle} />
            </GestureDetector>
          </>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    box: {
      position: 'absolute',
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 6,
      backgroundColor: 'rgba(99, 102, 241, 0.12)',
      overflow: 'visible',
    },
    boxSelected: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      ...AppDesign.shadow,
    },
    inner: {
      flex: 1,
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    label: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 2,
    },
    text: {
      fontSize: 12,
      color: colors.text,
    },
    input: {
      flex: 1,
      fontSize: 12,
      color: colors.text,
      padding: 0,
      margin: 0,
    },
    deleteBtn: {
      position: 'absolute',
      top: -10,
      right: -10,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#ef4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    resizeHandle: {
      position: 'absolute',
      right: -6,
      bottom: -6,
      width: 16,
      height: 16,
      borderRadius: 4,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: '#fff',
    },
  });
}
