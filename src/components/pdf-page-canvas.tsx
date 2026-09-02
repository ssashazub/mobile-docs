import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { RasterizedPage } from '@/components/pdf-page-rasterizer';
import { AppDesign } from '@/constants/app-design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PageLayout = {
  pageIndex: number;
  widthPt: number;
  heightPt: number;
  widthPx: number;
  heightPx: number;
  scale: number;
};

type PdfPageCanvasProps = {
  pages: RasterizedPage[];
  contentWidth: number;
  renderOverlays?: (layout: PageLayout) => ReactNode;
  /** Drawn above page image; receives touches before highlights when needed. */
  renderInteractionLayer?: (layout: PageLayout) => ReactNode;
  onPagePress?: (pageIndex: number, xUi: number, yUi: number, layout: PageLayout) => void;
  onPageLayout?: (layout: PageLayout) => void;
  style?: StyleProp<ViewStyle>;
  pageGap?: number;
  /** Photo-gallery style pinch / pan / double-tap zoom (no ScrollView conflict). */
  enablePinchZoom?: boolean;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const DOUBLE_TAP_ZOOM = 2.5;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export function PdfPageCanvas({
  pages,
  contentWidth,
  renderOverlays,
  renderInteractionLayer,
  onPagePress,
  onPageLayout,
  style,
  pageGap = 12,
  enablePinchZoom = false,
}: PdfPageCanvasProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [contentHeight, setContentHeight] = useState(0);

  const scaleSv = useSharedValue(1);
  const translateXSv = useSharedValue(0);
  const translateYSv = useSharedValue(0);
  const startScaleSv = useSharedValue(1);
  const startTXSv = useSharedValue(0);
  const startTYSv = useSharedValue(0);
  const focalXSv = useSharedValue(0);
  const focalYSv = useSharedValue(0);
  const viewportWSv = useSharedValue(0);
  const viewportHSv = useSharedValue(0);
  const contentWSv = useSharedValue(0);
  const contentHSv = useSharedValue(0);

  const baseWidth = Math.max(200, contentWidth);
  const pageWidth = baseWidth;
  const contentWidthPx = pageWidth + 24;

  useEffect(() => {
    contentWSv.value = contentWidthPx;
  }, [contentWSv, contentWidthPx]);

  const clampTranslation = useCallback(
    (scale: number, x: number, y: number) => {
      'worklet';
      const vw = viewportWSv.value;
      const vh = viewportHSv.value;
      const cw = contentWSv.value;
      const ch = contentHSv.value;
      if (vw <= 0 || vh <= 0 || cw <= 0 || ch <= 0) {
        return { x, y };
      }

      const scaledW = cw * scale;
      const scaledH = ch * scale;

      let nextX = x;
      let nextY = y;

      if (scaledW <= vw) {
        nextX = (vw - scaledW) / 2;
      } else {
        nextX = clamp(x, vw - scaledW, 0);
      }

      if (scaledH <= vh) {
        nextY = 0;
      } else {
        nextY = clamp(y, vh - scaledH, 0);
      }

      return { x: nextX, y: nextY };
    },
    [contentHSv, contentWSv, viewportHSv, viewportWSv]
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart((event) => {
          startScaleSv.value = scaleSv.value;
          startTXSv.value = translateXSv.value;
          startTYSv.value = translateYSv.value;
          focalXSv.value = event.focalX;
          focalYSv.value = event.focalY;
        })
        .onUpdate((event) => {
          const nextScale = clamp(startScaleSv.value * event.scale, MIN_ZOOM, MAX_ZOOM);
          const ratio = nextScale / Math.max(startScaleSv.value, 0.001);
          const focalX = focalXSv.value;
          const focalY = focalYSv.value;

          scaleSv.value = nextScale;
          translateXSv.value = focalX - (focalX - startTXSv.value) * ratio;
          translateYSv.value = focalY - (focalY - startTYSv.value) * ratio;
        })
        .onEnd(() => {
          if (scaleSv.value <= 1.02) {
            const centered = clampTranslation(1, 0, 0);
            scaleSv.value = withTiming(1, { duration: 150 });
            translateXSv.value = withTiming(centered.x, { duration: 150 });
            translateYSv.value = withTiming(0, { duration: 150 });
            return;
          }

          const bounded = clampTranslation(
            scaleSv.value,
            translateXSv.value,
            translateYSv.value
          );
          translateXSv.value = withTiming(bounded.x, { duration: 120 });
          translateYSv.value = withTiming(bounded.y, { duration: 120 });
        }),
    [
      clampTranslation,
      focalXSv,
      focalYSv,
      scaleSv,
      startScaleSv,
      startTXSv,
      startTYSv,
      translateXSv,
      translateYSv,
    ]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // One finger only — two-finger moves belong to pinch, not scroll.
        .maxPointers(1)
        .minDistance(6)
        .onStart(() => {
          startTXSv.value = translateXSv.value;
          startTYSv.value = translateYSv.value;
        })
        .onUpdate((event) => {
          translateXSv.value = startTXSv.value + event.translationX;
          translateYSv.value = startTYSv.value + event.translationY;
        })
        .onEnd(() => {
          const bounded = clampTranslation(
            scaleSv.value,
            translateXSv.value,
            translateYSv.value
          );
          translateXSv.value = withTiming(bounded.x, { duration: 120 });
          translateYSv.value = withTiming(bounded.y, { duration: 120 });
        }),
    [clampTranslation, scaleSv, startTXSv, startTYSv, translateXSv, translateYSv]
  );

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(280)
        .onEnd((event, success) => {
          if (!success) {
            return;
          }

          if (scaleSv.value > 1.15) {
            const centered = clampTranslation(1, 0, 0);
            scaleSv.value = withTiming(1, { duration: 180 });
            translateXSv.value = withTiming(centered.x, { duration: 180 });
            translateYSv.value = withTiming(0, { duration: 180 });
            return;
          }

          const nextScale = DOUBLE_TAP_ZOOM;
          const ratio = nextScale / Math.max(scaleSv.value, 0.001);
          const nextTX = event.x - (event.x - translateXSv.value) * ratio;
          const nextTY = event.y - (event.y - translateYSv.value) * ratio;
          const bounded = clampTranslation(nextScale, nextTX, nextTY);

          scaleSv.value = withTiming(nextScale, { duration: 180 });
          translateXSv.value = withTiming(bounded.x, { duration: 180 });
          translateYSv.value = withTiming(bounded.y, { duration: 180 });
        }),
    [clampTranslation, scaleSv, translateXSv, translateYSv]
  );

  const composed = useMemo(
    () => Gesture.Simultaneous(pinch, Gesture.Race(doubleTap, pan)),
    [doubleTap, pan, pinch]
  );

  const liveTransformStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateXSv.value },
      { translateY: translateYSv.value },
      { scale: scaleSv.value },
    ],
  }));

  const pagesContent = (
    <View
      style={[
        styles.content,
        {
          paddingBottom: pageGap * 2,
          width: contentWidthPx,
        },
      ]}
      onLayout={(event) => {
        const height = event.nativeEvent.layout.height;
        setContentHeight(height);
        contentHSv.value = height;
      }}
    >
      {pages.map((page) => {
        const scale = pageWidth > 0 ? pageWidth / page.widthPt : 1;
        const widthPx = page.widthPt * scale;
        const heightPx = page.heightPt * scale;
        const layout: PageLayout = {
          pageIndex: page.pageIndex,
          widthPt: page.widthPt,
          heightPt: page.heightPt,
          widthPx,
          heightPx,
          scale,
        };

        return (
          <View
            key={page.pageIndex}
            style={[styles.pageWrap, { width: widthPx, marginBottom: pageGap }]}
            onLayout={() => onPageLayout?.(layout)}
          >
            <Pressable
              onPress={(event) => {
                if (!onPagePress) {
                  return;
                }
                const { locationX, locationY } = event.nativeEvent;
                onPagePress(page.pageIndex, locationX, locationY, layout);
              }}
            >
              <Image
                key={page.imageUri}
                source={{
                  uri: page.imageUri,
                  ...(page.imageWidth && page.imageHeight
                    ? { width: page.imageWidth, height: page.imageHeight }
                    : null),
                }}
                style={{
                  width: widthPx,
                  height: heightPx,
                  borderRadius: AppDesign.radius.md,
                }}
                resizeMode="stretch"
                fadeDuration={0}
              />
            </Pressable>
            <View
              style={[styles.overlayLayer, { width: widthPx, height: heightPx }]}
              pointerEvents="box-none"
            >
              {renderOverlays?.(layout)}
            </View>
            {renderInteractionLayer ? (
              <View style={[styles.overlayLayer, { width: widthPx, height: heightPx }]}>
                {renderInteractionLayer(layout)}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );

  if (!enablePinchZoom) {
    return (
      <View style={[styles.flex, style]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces
          showsVerticalScrollIndicator
        >
          {pagesContent}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[styles.flex, styles.clip, style]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewport({ width, height });
        viewportWSv.value = width;
        viewportHSv.value = height;
        if (scaleSv.value <= 1.01 && width > 0) {
          translateXSv.value = Math.max(0, (width - contentWidthPx) / 2);
        }
      }}
    >
      <GestureDetector gesture={composed}>
        <Animated.View
          collapsable={false}
          style={[
            styles.zoomContent,
            {
              width: contentWidthPx,
              minHeight: contentHeight > 0 ? contentHeight : viewport.height || undefined,
            },
            liveTransformStyle,
          ]}
        >
          {pagesContent}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function createStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    clip: {
      overflow: 'hidden',
    },
    zoomContent: {
      transformOrigin: 'top left',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    content: {
      alignItems: 'center',
      paddingTop: 12,
      paddingHorizontal: 12,
      alignSelf: 'flex-start',
    },
    pageWrap: {
      position: 'relative',
      borderRadius: AppDesign.radius.md,
      backgroundColor: _colors.surface,
      ...AppDesign.shadow,
    },
    overlayLayer: {
      ...StyleSheet.absoluteFill,
    },
  });
}

export function useContentWidthFromLayout(
  onWidth: (width: number) => void
): (event: LayoutChangeEvent) => void {
  return (event) => {
    onWidth(event.nativeEvent.layout.width);
  };
}
