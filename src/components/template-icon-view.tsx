import { loadAsync } from 'expo-font';
import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import boldWeight from 'expo-symbols/androidWeights/bold';
import mediumWeight from 'expo-symbols/androidWeights/medium';
import regularWeight from 'expo-symbols/androidWeights/regular';
import semiBoldWeight from 'expo-symbols/androidWeights/semiBold';

import type { TemplateIcon } from '@/constants/template-icons';
import { getSymbolPreset } from '@/lib/template-icon';

// expo-symbols Android Text gets a gray box under parent opacity unless
// backgroundColor is explicitly transparent (SymbolView omits this).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { androidSymbolToString } = require('expo-symbols/build/android') as {
  androidSymbolToString: (symbol: string | null) => string | null;
};

type TemplateIconViewProps = {
  icon: TemplateIcon;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  weight?: 'medium' | 'semibold' | 'bold';
};

function androidFontForWeight(weight: TemplateIconViewProps['weight']) {
  switch (weight) {
    case 'medium':
      return mediumWeight;
    case 'bold':
      return boldWeight;
    case 'semibold':
      return semiBoldWeight;
    default:
      return regularWeight;
  }
}

function AndroidSymbolIcon({
  name,
  size,
  color,
  weight = 'semibold',
  style,
}: {
  name: NonNullable<SymbolViewProps['name']>;
  size: number;
  color?: string;
  weight?: TemplateIconViewProps['weight'];
  style?: StyleProp<ViewStyle>;
}) {
  const androidName = typeof name === 'object' ? name.android : null;
  const font = useMemo(() => androidFontForWeight(weight), [weight]);
  const [loaded, setLoaded] = useState(false);
  const glyph = androidName ? androidSymbolToString(androidName) : null;

  useEffect(() => {
    if (!androidName || !glyph) {
      return;
    }

    let cancelled = false;
    loadAsync({
      [font.name]: {
        uri: font.font,
        testString: glyph,
      },
    })
      .then(() => {
        if (!cancelled) {
          setLoaded(true);
        }
      })
      .catch(() => {
        /* noop */
      });

    return () => {
      cancelled = true;
    };
  }, [androidName, font.font, font.name, glyph]);

  if (!androidName || !glyph) {
    return null;
  }

  if (!loaded) {
    return <View style={[{ width: size, height: size, backgroundColor: 'transparent' }, style]} />;
  }

  return (
    <View style={[{ width: size, height: size, backgroundColor: 'transparent' }, style]}>
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: font.name,
          color: color ?? '#ffffff',
          fontSize: size,
          lineHeight: size,
          backgroundColor: 'transparent',
          includeFontPadding: false,
          textAlignVertical: 'center',
          textAlign: 'center',
        }}
      >
        {glyph}
      </Text>
    </View>
  );
}

export function TemplateIconView({
  icon,
  size = 24,
  color,
  style,
  textStyle,
  weight = 'semibold',
}: TemplateIconViewProps) {
  if (icon.kind === 'none' || !icon.value.trim()) {
    return null;
  }

  if (icon.kind === 'emoji') {
    return (
      <View style={style}>
        <Text style={[styles.emoji, { fontSize: size, backgroundColor: 'transparent' }, textStyle]}>
          {icon.value}
        </Text>
      </View>
    );
  }

  const preset = getSymbolPreset(icon.value);

  if (!preset) {
    return null;
  }

  if (Platform.OS === 'android' || Platform.OS === 'web') {
    return (
      <AndroidSymbolIcon
        name={preset.name}
        size={size}
        color={color}
        weight={weight}
        style={style}
      />
    );
  }

  return (
    <View style={[styles.symbolWrap, style]}>
      <SymbolView
        name={preset.name}
        size={size}
        weight={weight}
        tintColor={color}
        resizeMode="scaleAspectFit"
        style={styles.symbol}
      />
    </View>
  );
}

export function TemplateIconBadge({
  icon,
  title,
  size = 14,
  color,
  style,
  titleStyle,
}: {
  icon: TemplateIcon;
  title: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}) {
  const hasIcon = icon.kind !== 'none' && icon.value.trim().length > 0;

  return (
    <View style={[styles.badgeRow, style]}>
      {hasIcon ? <TemplateIconView icon={icon} size={size} color={color} /> : null}
      <Text style={[styles.badgeTitle, color ? { color } : null, titleStyle]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emoji: {
    lineHeight: undefined,
  },
  symbolWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  symbol: {
    backgroundColor: 'transparent',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
  },
});
