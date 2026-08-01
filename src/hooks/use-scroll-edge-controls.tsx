import { useCallback, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from 'react-native';

import { LoadingState } from '@/components/ui/loading-state';
import {
  ScrollEdgeFab,
  type ScrollEdgeFabHandle,
} from '@/components/ui/scroll-edge-fab';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';

type Scrollable = {
  scrollTo: (options: { y: number; animated?: boolean }) => void;
  scrollToEnd: (options?: { animated?: boolean }) => void;
};

type UseScrollEdgeControlsOptions = {
  /** Existing ScrollView ref (e.g. from field-focus hook). */
  scrollRef?: RefObject<ScrollView | null>;
  /** Approximate list size — large lists jump with loader, small ones animate. */
  itemCount?: number;
  largeItemThreshold?: number;
};

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Shared up/down edge controls for long ScrollViews.
 */
export function useScrollEdgeControls(options: UseScrollEdgeControlsOptions = {}) {
  const { t } = useI18n();
  const colors = useTheme();
  const internalScrollRef = useRef<ScrollView>(null);
  const scrollRef = (options.scrollRef ?? internalScrollRef) as RefObject<ScrollView | null>;
  const fabRef = useRef<ScrollEdgeFabHandle>(null);
  const offsetYRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const jumpGenerationRef = useRef(0);
  const itemCountRef = useRef(options.itemCount ?? 0);
  itemCountRef.current = options.itemCount ?? 0;
  const largeThreshold = options.largeItemThreshold ?? 80;

  const [jumpingToEnd, setJumpingToEnd] = useState(false);

  const publishMetrics = useCallback(() => {
    fabRef.current?.setMetrics(
      offsetYRef.current,
      viewportHeightRef.current,
      contentHeightRef.current
    );
  }, []);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      offsetYRef.current = contentOffset.y;
      viewportHeightRef.current = layoutMeasurement.height;
      contentHeightRef.current = contentSize.height;
      publishMetrics();
    },
    [publishMetrics]
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      contentHeightRef.current = height;
      publishMetrics();
    },
    [publishMetrics]
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeightRef.current = event.nativeEvent.layout.height;
      publishMetrics();
    },
    [publishMetrics]
  );

  const isNearBottom = useCallback(() => {
    const content = contentHeightRef.current;
    const viewport = viewportHeightRef.current;
    const offset = offsetYRef.current;
    if (content <= 0 || viewport <= 0) {
      return false;
    }
    return content - (offset + viewport) <= 28;
  }, []);

  const getScroller = useCallback((): Scrollable | null => {
    return scrollRef.current as unknown as Scrollable | null;
  }, [scrollRef]);

  const scrollToTop = useCallback(() => {
    jumpGenerationRef.current += 1;
    setJumpingToEnd(false);
    getScroller()?.scrollTo({ y: 0, animated: true });
  }, [getScroller]);

  const scrollToBottom = useCallback(async () => {
    if (jumpingToEnd) {
      return;
    }

    const scroller = getScroller();
    if (!scroller) {
      return;
    }

    const isLarge = itemCountRef.current >= largeThreshold;
    const generation = ++jumpGenerationRef.current;

    if (!isLarge) {
      scroller.scrollToEnd({ animated: true });
      return;
    }

    setJumpingToEnd(true);
    const startedAt = Date.now();

    try {
      let previousContentHeight = -1;
      let stablePasses = 0;

      for (let attempt = 0; attempt < 50; attempt++) {
        if (jumpGenerationRef.current !== generation) {
          return;
        }

        scroller.scrollToEnd({ animated: false });
        await wait(36);

        const contentHeight = contentHeightRef.current;
        if (Math.abs(contentHeight - previousContentHeight) < 2) {
          stablePasses += 1;
        } else {
          stablePasses = 0;
        }
        previousContentHeight = contentHeight;

        if (isNearBottom() && stablePasses >= 2) {
          break;
        }

        scroller.scrollTo({
          y: Math.max(
            contentHeightRef.current,
            (attempt + 1) * Math.max(viewportHeightRef.current, 500)
          ),
          animated: false,
        });
      }

      if (jumpGenerationRef.current !== generation) {
        return;
      }

      scroller.scrollToEnd({ animated: false });
      publishMetrics();

      const elapsed = Date.now() - startedAt;
      if (elapsed < 550) {
        await wait(550 - elapsed);
      }
    } finally {
      if (jumpGenerationRef.current === generation) {
        getScroller()?.scrollToEnd({ animated: false });
        setJumpingToEnd(false);
        requestAnimationFrame(() => {
          getScroller()?.scrollToEnd({ animated: false });
          publishMetrics();
        });
      }
    }
  }, [getScroller, isNearBottom, jumpingToEnd, largeThreshold, publishMetrics]);

  const overlay: ReactNode = jumpingToEnd ? (
    <View style={styles.jumpOverlay} pointerEvents="auto">
      <LoadingState />
    </View>
  ) : null;

  const fab: ReactNode = !jumpingToEnd ? (
    <ScrollEdgeFab
      ref={fabRef}
      colors={colors}
      onScrollToTop={scrollToTop}
      onScrollToBottom={() => {
        void scrollToBottom();
      }}
      topLabel={t('common.scrollToTop')}
      bottomLabel={t('common.scrollToBottom')}
    />
  ) : null;

  return {
    scrollRef,
    jumpingToEnd,
    onScroll,
    onContentSizeChange,
    onLayout,
    scrollToTop,
    scrollToBottom,
    overlay,
    fab,
  };
}

const styles = StyleSheet.create({
  jumpOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
    backgroundColor: 'transparent',
  },
});
