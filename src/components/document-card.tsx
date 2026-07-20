import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { TemplateIconBadge } from '@/components/template-icon-view';
import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
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
};

const SPRING = { damping: 16, stiffness: 280, mass: 0.65 };

export function DocumentCard({
  document,
  template,
  onPress,
  onLongPress,
}: DocumentCardProps) {
  const { t, dateLocale } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        <View style={[styles.accent, { backgroundColor: display.accentColor }]} />

        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={[styles.badge, { backgroundColor: `${display.accentColor}18` }]}>
              <TemplateIconBadge
                icon={display.icon}
                title={display.title}
                size={12}
                color={display.accentColor}
              />
              <Text style={[styles.badgeText, { color: display.accentColor }]} numberOfLines={1}>
                {display.title}
              </Text>
            </View>
            <Text style={styles.date}>
              {new Date(document.createdAt).toLocaleDateString(dateLocale)}
            </Text>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {document.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {t('home.client')}: {document.client || '-'}
          </Text>
          {document.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {document.description}
            </Text>
          ) : null}
          <Text style={styles.hint}>{t('home.longPressHint')}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...AppDesign.cardShadow,
    },
    accent: {
      width: 5,
    },
    body: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 14,
      gap: 6,
      minWidth: 0,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      maxWidth: '72%',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    badgeText: {
      flexShrink: 1,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    date: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600',
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      lineHeight: 24,
    },
    meta: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    description: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
    },
    hint: {
      marginTop: 2,
      fontSize: 11,
      color: colors.hint,
      fontWeight: '600',
    },
  });
}
