import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type LegalSection = {
  title: string;
  body: string;
};

type LegalScreenProps = {
  title: string;
  intro?: string;
  sections?: LegalSection[];
  bullets?: string[];
  children?: ReactNode;
};

export function LegalScreen({ title, intro, sections, bullets, children }: LegalScreenProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {intro ? <Text style={styles.intro}>{intro}</Text> : null}

        {sections?.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}

        {bullets && bullets.length > 0 ? (
          <View style={styles.card}>
            {bullets.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      padding: 20,
      gap: 14,
      paddingBottom: 40,
    },
    intro: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      paddingHorizontal: 2,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 10,
      ...AppDesign.cardShadow,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    body: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    bulletDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginTop: 7,
    },
    bulletText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
    },
  });
}
