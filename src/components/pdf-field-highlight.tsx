import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { UiRect } from '@/lib/pdf-coords';
import type { PdfFormField } from '@/types/document';

type PdfFieldHighlightProps = {
  rect: UiRect;
  /** PDF font size in points — scaled to screen via `scale`. */
  fontSizePt?: number;
  scale: number;
  align?: PdfFormField['align'];
  bold?: boolean;
  label?: string;
  value?: string;
  selected?: boolean;
  filled?: boolean;
  onPress: () => void;
};

export function PdfFieldHighlight({
  rect,
  fontSizePt = 8,
  scale,
  align = 'left',
  bold = false,
  label,
  value,
  selected = false,
  filled = false,
  onPress,
}: PdfFieldHighlightProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);
  // RN system fonts read larger than PDF fonts at the same nominal size.
  // Cap by cell height so inflated detected sizes cannot grow past the row text.
  const fromPdf = fontSizePt * scale * 0.88;
  const maxByCell = height * 0.62;
  const fontSize = Math.max(4, Math.min(fromPdf, maxByCell));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={[
        styles.box,
        {
          left: rect.left,
          top: rect.top,
          width,
          height,
        },
        selected && styles.boxSelected,
        filled && !selected && styles.boxFilled,
      ]}
    >
      {value ? (
        <Text
          style={[
            styles.value,
            {
              fontSize,
              lineHeight: fontSize * 1.05,
              textAlign: align,
              width: '100%',
              fontWeight: bold ? '700' : '400',
            },
          ]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {value}
        </Text>
      ) : label && selected ? (
        <Text
          style={[
            styles.placeholder,
            {
              fontSize: Math.max(5, fontSize * 0.9),
              textAlign: align,
              width: '100%',
              fontWeight: bold ? '700' : '400',
            },
          ]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {label}
        </Text>
      ) : null}
      {selected ? <View style={styles.selectedMark} /> : null}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    box: {
      position: 'absolute',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(37, 99, 235, 0.75)',
      borderStyle: 'dashed',
      borderRadius: 1,
      backgroundColor: 'rgba(37, 99, 235, 0.04)',
      paddingHorizontal: 1,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    boxSelected: {
      borderColor: colors.primary,
      borderWidth: 1.25,
      borderStyle: 'solid',
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
    },
    boxFilled: {
      borderColor: 'rgba(37, 99, 235, 0.4)',
      borderStyle: 'solid',
      backgroundColor: '#ffffff',
    },
    value: {
      color: '#111111',
      includeFontPadding: false,
    },
    placeholder: {
      color: colors.textMuted,
    },
    selectedMark: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
  });
}
