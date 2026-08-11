import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from '@/lib/haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { TemplateIconView } from '@/components/template-icon-view';
import { AppDesign } from '@/constants/app-design';
import { Colors, type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { getDocumentDisplayInfo } from '@/lib/document-display';
import type { Document } from '@/types/document';
import type { DocumentTemplate } from '@/types/template';

type DocumentCardProps = {
  document: Document;
  template?: DocumentTemplate | null;
  onPress: () => void;
  onLongPress: () => void;
  compact?: boolean;
};

const SPRING = { damping: 16, stiffness: 280, mass: 0.65 };

export function DocumentCard({
  document,
  template,
  onPress,
  onLongPress,
  compact = false,
}: DocumentCardProps) {
  const { t, dateLocale } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors, compact), [colors, compact]);
  const display = getDocumentDisplayInfo(document, template);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.985, SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      onPress={onPress}
      onLongPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress();
      }}
      delayLongPress={380}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={[styles.iconAvatar, { backgroundColor: `${display.accentColor}1f` }]}>
          <TemplateIconView icon={display.icon} size={22} color={display.accentColor} />
        </View>

        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={[styles.badgeText, { color: display.accentColor }]} numberOfLines={1}>
              {display.title}
            </Text>
            <View style={styles.dateChip}>
              <SymbolView
                name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                size={11}
                tintColor={colors.textMuted}
              />
              <Text style={styles.date}>
                {new Date(document.createdAt).toLocaleDateString(dateLocale)}
              </Text>
            </View>
          </View>

          <Text style={styles.title} numberOfLines={compact ? 1 : 2}>
            {document.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {t('home.client')}: {document.client || '-'}
          </Text>
          {document.description ? (
            <Text style={styles.description} numberOfLines={1}>
              {document.description}
            </Text>
          ) : null}
        </View>

        <View style={styles.chevronWrap}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={16}
            tintColor={colors.textMuted}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors, compact: boolean) {
  const isDark = colors.background === Colors.dark.background;

  return StyleSheet.create({
    card: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.surfaceContainer : colors.surface,
      borderRadius: AppDesign.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      paddingVertical: compact ? 10 : 12,
      paddingHorizontal: 12,
      gap: 12,
      ...AppDesign.cardShadow,
    },
    iconAvatar: {
      width: compact ? 46 : 52,
      height: compact ? 46 : 52,
      borderRadius: AppDesign.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    body: {
      flex: 1,
      gap: 3,
      minWidth: 0,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    badgeText: {
      flexShrink: 1,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    dateChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    date: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600',
    },
    title: {
      fontSize: compact ? 16 : 17,
      fontWeight: '800',
      color: colors.text,
      lineHeight: compact ? 20 : 22,
    },
    meta: {
      fontSize: compact ? 12.5 : 13.5,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    description: {
      fontSize: compact ? 12 : 13,
      lineHeight: compact ? 15 : 17,
      color: colors.textMuted,
    },
    chevronWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? colors.surfaceContainerHigh : colors.backgroundSoft,
      flexShrink: 0,
    },
  });
}
