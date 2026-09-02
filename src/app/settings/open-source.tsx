import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { LegalScreen } from '@/components/legal-screen';
import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import {
  APP_LICENSE_URL,
  APP_SOURCE_CODE_URL,
  getSourceCodeUrlForInstalledVersion,
  MUPDF_LICENSE_URL,
  THIRD_PARTY_LIBRARIES,
} from '@/lib/open-source-info';

export default function OpenSourceScreen() {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sourceUrl = getSourceCodeUrlForInstalledVersion();

  const openUrl = (url: string) => {
    void Linking.openURL(url);
  };

  return (
    <LegalScreen
      title={t('settings.openSourceTitle')}
      intro={t('settings.openSourceIntro')}
      sections={[
        {
          title: t('settings.openSourceAppLicenseTitle'),
          body: t('settings.openSourceAppLicenseText'),
        },
        {
          title: t('settings.openSourceMupdfTitle'),
          body: t('settings.openSourceMupdfText'),
        },
      ]}
    >
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('settings.openSourceLinksTitle')}</Text>
        <LinkRow
          label={t('settings.openSourceCode')}
          value={sourceUrl}
          onPress={() => openUrl(sourceUrl)}
          styles={styles}
        />
        <LinkRow
          label={t('settings.openSourceLicense')}
          value={APP_LICENSE_URL}
          onPress={() => openUrl(APP_LICENSE_URL)}
          styles={styles}
        />
        <LinkRow
          label={t('settings.openSourceMupdfLicense')}
          value={MUPDF_LICENSE_URL}
          onPress={() => openUrl(MUPDF_LICENSE_URL)}
          styles={styles}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('settings.openSourceLibrariesTitle')}</Text>
        {THIRD_PARTY_LIBRARIES.map((library) => (
          <Pressable
            key={library.name}
            style={({ pressed }) => [styles.libraryRow, pressed && styles.pressed]}
            onPress={() => openUrl(library.url)}
          >
            <View style={styles.libraryText}>
              <Text style={styles.libraryName}>{library.name}</Text>
              <Text style={styles.libraryMeta}>
                {library.license} · {library.role}
              </Text>
            </View>
            <Text style={styles.linkChevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.footer}>{t('settings.openSourceFooter', { url: sourceUrl })}</Text>
    </LegalScreen>
  );
}

function LinkRow({
  label,
  value,
  onPress,
  styles,
}: {
  label: string;
  value: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.linkLabel}>{label}</Text>
      <Text style={styles.linkValue} numberOfLines={2}>
        {value}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
      ...AppDesign.cardShadow,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    linkRow: {
      gap: 4,
      paddingVertical: 4,
    },
    linkLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    linkValue: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.primary,
    },
    libraryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
    },
    libraryText: {
      flex: 1,
      gap: 2,
    },
    libraryName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    libraryMeta: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    linkChevron: {
      fontSize: 22,
      lineHeight: 22,
      color: colors.textMuted,
    },
    footer: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.textMuted,
      paddingHorizontal: 2,
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
