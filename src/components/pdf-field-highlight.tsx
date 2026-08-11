import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DEFAULT_OVERLAY_FONT,
  resolveOverlayRnFontFamily,
  type PdfOverlayFontId,
} from '@/constants/overlay-fonts';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { coverUiRectInsideCell } from '@/lib/glyph-cover';
import type { UiRect } from '@/lib/pdf-coords';
import type { PdfFormField } from '@/types/document';

type PdfFieldHighlightProps = {
  rect: UiRect;
  /** PDF font size in points — scaled to screen via `scale`. */
  fontSizePt?: number;
  scale: number;
  align?: PdfFormField['align'];
  bold?: boolean;
  fontFamily?: PdfOverlayFontId;
  label?: string;
  value?: string;
  /** Original printed text — used to enlarge cover for descenders (у, д, р…). */
  sourceText?: string;
  selected?: boolean;
  filled?: boolean;
  /** When false, renders a non-interactive visual (page-level hit testing). */
  interactive?: boolean;
  onPress?: () => void;
};

export function PdfFieldHighlight({
  rect,
  fontSizePt = 8,
  scale,
  align = 'left',
  bold = false,
  fontFamily = DEFAULT_OVERLAY_FONT,
  label,
  value,
  sourceText,
  selected = false,
  filled = false,
  interactive = true,
  onPress,
}: PdfFieldHighlightProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const fontSize = Math.max(4, fontSizePt * scale);
  const rnFontFamily = resolveOverlayRnFontFamily(fontFamily);
  const hasValue = Boolean(value);
  const coverSample = sourceText || value || '';
  // Cover stays inside the cell; grows a bit when source has descender letters.
  const boxRect =
    filled || selected
      ? coverUiRectInsideCell(rect, scale, {
          text: coverSample,
          fontSizePx: fontSize,
        })
      : {
          left: rect.left,
          top: rect.top,
          width: Math.max(rect.width, 1),
          height: Math.max(rect.height, 1),
        };
  const width = Math.max(boxRect.width, 1);
  const height = Math.max(boxRect.height, 1);
  const multiline = height > fontSize * 1.55;

  const boxStyle = [
    styles.box,
    {
      left: boxRect.left,
      top: boxRect.top,
      width,
      height,
    },
    selected && styles.boxSelected,
    // White paper when covering existing glyphs OR clearing them.
    filled && !selected && styles.boxCover,
    hasValue && !filled && !selected && styles.boxPlain,
    // Empty editable hit target — never on top of an erase cover.
    !hasValue && !filled && !selected && styles.boxEmpty,
  ];

  const content = (
    <>
      {value ? (
        <Text
          style={[
            styles.value,
            {
              fontSize,
              lineHeight: fontSize * 1.15,
              textAlign: align,
              width: '100%',
              fontFamily: rnFontFamily,
              fontWeight: bold ? '700' : '400',
              letterSpacing: 0,
            },
          ]}
          numberOfLines={multiline ? 3 : 1}
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
              fontFamily: rnFontFamily,
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
    </>
  );

  if (!interactive || !onPress) {
    return (
      <View pointerEvents="none" style={boxStyle}>
        {content}
      </View>
    );
  }

  return (
    <Pressable onPress={onPress} style={boxStyle}>
      {content}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    box: {
      position: 'absolute',
      borderRadius: 0,
      paddingHorizontal: 1.5,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    boxEmpty: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(37, 99, 235, 0.55)',
      borderStyle: 'dashed',
      backgroundColor: 'rgba(37, 99, 235, 0.03)',
    },
    boxSelected: {
      borderColor: colors.primary,
      borderWidth: 1.25,
      borderStyle: 'solid',
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
    },
    boxPlain: {
      borderWidth: 0,
      borderColor: 'transparent',
      backgroundColor: 'transparent',
    },
    boxCover: {
      borderWidth: 0,
      borderColor: 'transparent',
      backgroundColor: '#ffffff',
    },
    value: {
      color: '#000000',
      includeFontPadding: false,
      fontWeight: '400',
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
