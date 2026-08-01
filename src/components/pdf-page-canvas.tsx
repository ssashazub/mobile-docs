import { useCallback, useMemo, useState, type ReactNode } from 'react';
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
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
  /** Pinch-to-zoom for fill-on-document style viewers. */
  enablePinchZoom?: boolean;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3.5;

function clampZoom(value: number) {
  'worklet';
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
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

  const [layoutZoom, setLayoutZoom] = useState(1);
  const [viewportHeight, setViewportHeight] = useState(0);
  const zoomSv = useSharedValue(1);
  const pinchStartZoom = useSharedValue(1);

  const commitZoom = useCallback(
    (next: number) => {
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
      setLayoutZoom(clamped);
      zoomSv.value = clamped;
    },
    [zoomSv]
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(enablePinchZoom)
        .onBegin(() => {
          pinchStartZoom.value = zoomSv.value;
        })
        .onUpdate((event) => {
          zoomSv.value = clampZoom(pinchStartZoom.value * event.scale);
        })
        .onEnd(() => {
          runOnJS(commitZoom)(zoomSv.value);
        }),
    [commitZoom, enablePinchZoom, pinchStartZoom, zoomSv]
  );

  const liveScaleStyle = useAnimatedStyle(() => {
    const base = Math.max(layoutZoom, 0.001);
    return {
      transform: [{ scale: zoomSv.value / base }],
    };
  }, [layoutZoom]);

  const baseWidth = Math.max(200, contentWidth);
  const pageWidth = baseWidth * layoutZoom;
  const contentBoxWidth = pageWidth + 24;

  const pagesContent = (
    <Animated.View
      style={[
        styles.content,
        {
          paddingBottom: pageGap * 2,
          width: contentBoxWidth,
          transformOrigin: 'top center',
        },
        enablePinchZoom ? liveScaleStyle : null,
      ]}
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
                resizeMode="contain"
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
    </Animated.View>
  );

  const onViewportLayout = (event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height);
  };

  const verticalScroll = (
    <ScrollView
      style={
        enablePinchZoom
          ? {
              width: Math.max(baseWidth, contentBoxWidth),
              ...(viewportHeight > 0 ? { height: viewportHeight } : { flex: 1 }),
            }
          : styles.scroll
      }
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      bounces
      showsVerticalScrollIndicator
      nestedScrollEnabled
    >
      {pagesContent}
    </ScrollView>
  );

  const body = enablePinchZoom ? (
    <ScrollView
      horizontal
      style={styles.scroll}
      contentContainerStyle={styles.horizontalContent}
      keyboardShouldPersistTaps="handled"
      bounces
      showsHorizontalScrollIndicator={layoutZoom > 1.01}
      nestedScrollEnabled
    >
      {verticalScroll}
    </ScrollView>
  ) : (
    verticalScroll
  );

  const frame = (
    <View style={[styles.flex, style]} onLayout={enablePinchZoom ? onViewportLayout : undefined}>
      {body}
    </View>
  );

  if (!enablePinchZoom) {
    return frame;
  }

  return <GestureDetector gesture={pinch}>{frame}</GestureDetector>;
}

function createStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    horizontalContent: {
      flexGrow: 1,
    },
    content: {
      alignItems: 'center',
      paddingTop: 12,
      paddingHorizontal: 12,
      alignSelf: 'center',
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
