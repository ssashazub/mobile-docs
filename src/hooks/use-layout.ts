import { useMemo } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';

import { Layout } from '@/constants/layout';
import { MaxContentWidth } from '@/constants/theme';

export type AppLayout = {
  width: number;
  height: number;
  isTablet: boolean;
  isLargeTablet: boolean;
  /** 1 on phone, 2 on tablet, 3 on large tablet. */
  columns: 1 | 2 | 3;
  contentMaxWidth: number;
  listMaxWidth: number;
  /** Center + cap width for forms / settings / detail. */
  contentStyle: ViewStyle;
  /** Slightly wider centered shell for document/template lists. */
  listContentStyle: ViewStyle;
  /** Row wrap container for card grids. */
  gridStyle: ViewStyle;
  /** Item width inside a grid (accounts for gap via %). */
  gridItemStyle: ViewStyle;
};

export function useLayout(): AppLayout {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const shortest = Math.min(width, height);
    const isTablet = shortest >= Layout.tabletMinWidth || width >= Layout.tabletMinWidth;
    const isLargeTablet = width >= Layout.largeTabletMinWidth;
    const columns: 1 | 2 | 3 = !isTablet ? 1 : isLargeTablet ? 3 : 2;

    const contentMaxWidth = Math.min(Layout.contentMaxWidth, MaxContentWidth);
    const listMaxWidth = Layout.listMaxWidth;

    const contentStyle: ViewStyle = {
      width: '100%',
      maxWidth: contentMaxWidth,
      alignSelf: 'center',
    };

    const listContentStyle: ViewStyle = {
      width: '100%',
      maxWidth: listMaxWidth,
      alignSelf: 'center',
    };

    const gridStyle: ViewStyle =
      columns === 1
        ? { gap: 10 }
        : {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
          };

    const gridItemStyle: ViewStyle =
      columns === 1
        ? { width: '100%' }
        : columns === 2
          ? { width: '48.2%' }
          : { width: '31.5%' };

    return {
      width,
      height,
      isTablet,
      isLargeTablet,
      columns,
      contentMaxWidth,
      listMaxWidth,
      contentStyle,
      listContentStyle,
      gridStyle,
      gridItemStyle,
    };
  }, [height, width]);
}
