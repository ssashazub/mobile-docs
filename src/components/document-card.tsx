import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

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

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress();
      }}
      delayLongPress={380}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        { borderColor: pressed ? display.accentColor : colors.border },
      ]}
    >
      <View style={[styles.accentStrip, { backgroundColor: display.accentColor }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: `${display.accentColor}16` }]}>
            <Text style={[styles.badgeText, { color: display.accentColor }]}>
              {display.emoji} {display.title}
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
          {t('home.client')}: {document.client || '—'}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {document.description || '—'}
        </Text>

        <Text style={styles.hint}>{t('home.longPressHint')}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.lg,
      borderWidth: 1.5,
      overflow: 'hidden',
      ...AppDesign.cardShadow,
    },
    cardPressed: {
      transform: [{ scale: 0.985 }],
      opacity: 0.96,
    },
    accentStrip: {
      height: 4,
      width: '100%',
    },
    content: {
      padding: 18,
      gap: 8,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '800',
    },
    date: {
      fontSize: 12,
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
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
    hint: {
      marginTop: 4,
      fontSize: 11,
      color: colors.hint,
      fontWeight: '600',
    },
  });
}
