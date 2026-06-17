import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

import type { TemplateIcon } from '@/constants/template-icons';
import { getSymbolPreset } from '@/lib/template-icon';

type TemplateIconViewProps = {
  icon: TemplateIcon;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  weight?: 'medium' | 'semibold' | 'bold';
};

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
        <Text style={[styles.emoji, { fontSize: size }, textStyle]}>{icon.value}</Text>
      </View>
    );
  }

  const preset = getSymbolPreset(icon.value);

  if (!preset) {
    return null;
  }

  return (
    <View style={style}>
      <SymbolView
        name={preset.name}
        size={size}
        weight={weight}
        tintColor={color}
        resizeMode="scaleAspectFit"
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
