import { useCallback, useMemo, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, type Href, useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showAppAlert } from '@/components/ui/app-alert';
import { LoadingState } from '@/components/ui/loading-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppDesign } from '@/constants/app-design';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import {
  canFillOnDocument,
  ensurePdfBackedForOnDocumentFill,
  supportsFillByFields,
} from '@/lib/document-fill-mode';
import { getDocuments } from '@/lib/document-storage';
import type { Document } from '@/types/document';

function parseDocumentId(id: string | string[] | undefined): number | null {
  const rawId = Array.isArray(id) ? id[0] : id;
  const parsedId = Number(rawId);
  if (!rawId || Number.isNaN(parsedId)) {
    return null;
  }
  return parsedId;
}

type ChoiceCardProps = {
  title: string;
  subtitle: string;
  gradient: [string, string];
  symbol: ComponentProps<typeof SymbolView>['name'];
  disabled?: boolean;
  onPress: () => void;
};

function ChoiceCard({ title, subtitle, gradient, symbol, disabled, onPress }: ChoiceCardProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceCard,
        pressed && !disabled && styles.choiceCardPressed,
        disabled && styles.choiceCardDisabled,
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.choiceIcon}
      >
        <SymbolView name={symbol} size={26} tintColor="#ffffff" weight="semibold" />
      </LinearGradient>

      <View style={styles.choiceText}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.choiceSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.choiceChevron}>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={18}
          tintColor={colors.textMuted}
          weight="semibold"
        />
      </View>
    </Pressable>
  );
}

export default function ImportChoiceScreen() {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = parseDocumentId(id);

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        if (documentId === null) {
          if (active) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        setLoading(true);
        try {
          const documents = await getDocuments();
          const found = documents.find((doc) => doc.id === documentId);
          if (!active) {
            return;
          }
          if (!found) {
            setNotFound(true);
            setDocument(null);
          } else {
            setDocument(found);
            setNotFound(false);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void load();
      return () => {
        active = false;
      };
    }, [documentId])
  );

  const openFillOnDocument = useCallback(async () => {
    if (!document) {
      return;
    }

    setPreparing(true);
    try {
      const ready = await ensurePdfBackedForOnDocumentFill(document);
      setDocument(ready);
      router.replace(`/document/fill-on-page/${ready.id}` as Href);
    } catch (error) {
      showAppAlert(
        t('import.errorTitle'),
        error instanceof Error ? error.message : t('import.errorTitle')
      );
    } finally {
      setPreparing(false);
    }
  }, [document, t]);

  const openFillByFields = useCallback(() => {
    if (!document) {
      return;
    }

    if (!supportsFillByFields(document)) {
      showAppAlert(t('import.fieldsUnavailableTitle'), t('import.fieldsUnavailableText'), [
        {
          text: t('import.fillOnDocument'),
          onPress: () => {
            void openFillOnDocument();
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
      return;
    }

    router.replace(`/document/edit/${document.id}` as Href);
  }, [document, openFillOnDocument, t]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: t('import.choiceTitle') }} />
        <LoadingState />
      </ThemedView>
    );
  }

  if (notFound || !document) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: t('import.choiceTitle') }} />
        <ThemedText>{t('document.notFound')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: t('import.choiceTitle') }} />
      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>{t('import.choiceTitle')}</ThemedText>
          <ThemedText style={styles.message}>{t('import.choiceSubtitle')}</ThemedText>
        </View>

        <View style={styles.choices}>
          <ChoiceCard
            title={t('import.fillByFields')}
            subtitle={t('import.fillByFieldsHint')}
            gradient={['#0f766e', '#14b8a6']}
            symbol={{ ios: 'list.bullet.rectangle', android: 'list_alt', web: 'list_alt' }}
            disabled={preparing}
            onPress={openFillByFields}
          />
          <ChoiceCard
            title={t('import.fillOnDocument')}
            subtitle={t('import.fillOnDocumentHint')}
            gradient={['#4f46e5', '#6366f1']}
            symbol={{
              ios: 'doc.text.magnifyingglass',
              android: 'find_in_page',
              web: 'find_in_page',
            }}
            disabled={preparing || !canFillOnDocument(document)}
            onPress={() => {
              void openFillOnDocument();
            }}
          />
        </View>

        {preparing ? (
          <View style={styles.preparing}>
            <ActivityIndicator color={colors.primary} />
            <ThemedText style={styles.preparingText}>{t('import.rasterizing')}</ThemedText>
          </View>
        ) : null}
      </View>
    </ThemedView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: Spacing.four,
      gap: Spacing.five,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      gap: Spacing.two,
      paddingHorizontal: 4,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
    },
    message: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    choices: {
      gap: Spacing.three,
    },
    choiceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      borderRadius: AppDesign.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      ...AppDesign.cardShadow,
    },
    choiceCardPressed: {
      opacity: 0.94,
      transform: [{ scale: 0.985 }],
    },
    choiceCardDisabled: {
      opacity: 0.55,
    },
    choiceIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    choiceText: {
      flex: 1,
      gap: 4,
    },
    choiceTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    choiceSubtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    choiceChevron: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSoft,
    },
    preparing: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    preparingText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
  });
}
