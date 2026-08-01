import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { PageLayout } from '@/components/pdf-page-canvas';
import type { ThemeColors } from '@/constants/theme';
import { uiRectToPdf, type UiRect } from '@/lib/pdf-coords';
import type { PdfFieldRect } from '@/types/document';

type PdfDrawFieldLayerProps = {
  layout: PageLayout;
  colors: ThemeColors;
  enabled?: boolean;
  onComplete: (rect: PdfFieldRect) => void;
};

export function PdfDrawFieldLayer({
  layout,
  colors,
  enabled = true,
  onComplete,
}: PdfDrawFieldLayerProps) {
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const visible = useSharedValue(0);

  const finish = (uiRect: UiRect) => {
    if (uiRect.width < 20 || uiRect.height < 14) {
      return;
    }
    onComplete(uiRectToPdf(uiRect, layout.pageIndex, layout.heightPt, layout.scale));
  };

  const pan = Gesture.Pan()
    .enabled(enabled)
    .onBegin((event) => {
      startX.value = event.x;
      startY.value = event.y;
      left.value = event.x;
      top.value = event.y;
      width.value = 0;
      height.value = 0;
      visible.value = 1;
    })
    .onUpdate((event) => {
      const x1 = startX.value;
      const y1 = startY.value;
      const x2 = Math.min(layout.widthPx, Math.max(0, event.x));
      const y2 = Math.min(layout.heightPx, Math.max(0, event.y));
      left.value = Math.min(x1, x2);
      top.value = Math.min(y1, y2);
      width.value = Math.abs(x2 - x1);
      height.value = Math.abs(y2 - y1);
    })
    .onEnd(() => {
      const uiRect: UiRect = {
        left: left.value,
        top: top.value,
        width: width.value,
        height: height.value,
      };
      visible.value = 0;
      runOnJS(finish)(uiRect);
    });

  const style = useAnimatedStyle(() => ({
    opacity: visible.value,
    left: left.value,
    top: top.value,
    width: width.value,
    height: height.value,
    borderColor: colors.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.16)',
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill} collapsable={false}>
        <Animated.View style={[styles.box, style]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
});
