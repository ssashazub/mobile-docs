import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router, Stack } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ui/action-sheet';
import { showAppAlert } from '@/components/ui/app-alert';
import { LanguagePickerModal } from '@/components/ui/language-picker-modal';
import { SettingsPickerModal } from '@/components/ui/settings-picker-modal';
import { AppDesign } from '@/constants/app-design';
import { APP_FEEDBACK_EMAIL } from '@/constants/app-info';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useAppSettings } from '@/contexts/app-settings-context';
import { useLocalePreference } from '@/contexts/locale-preference-context';
import { useThemePreference } from '@/contexts/theme-preference-context';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { getAppVersion, openFeedbackEmail, requestAppReview } from '@/lib/about-actions';
import { clearAppCache } from '@/lib/clear-cache';
import { clearAllDocuments } from '@/lib/clear-documents';
import { pickCustomExportFolder } from '@/lib/export-folder';
import type { ExportFileNameFormat } from '@/types/app-settings';
import type { LocalePreference } from '@/types/locale-preference';
import type { ThemePreference } from '@/types/theme-preference';

type IconName = SymbolViewProps['name'];

const LANGUAGE_OPTIONS: {
  value: LocalePreference;
  code: string;
  labelKey:
    | 'settings.languageSystem'
    | 'settings.languageEn'
    | 'settings.languageRu'
    | 'settings.languageUk';
}[] = [
  { value: 'system', code: 'AUTO', labelKey: 'settings.languageSystem' },
  { value: 'en', code: 'EN', labelKey: 'settings.languageEn' },
  { value: 'ru', code: 'RU', labelKey: 'settings.languageRu' },
  { value: 'uk', code: 'UK', labelKey: 'settings.languageUk' },
];

const THEME_OPTIONS: {
  value: ThemePreference;
  labelKey: 'theme.light' | 'theme.dark' | 'theme.system';
  icon: IconName;
}[] = [
  {
    value: 'light',
    labelKey: 'theme.light',
    icon: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' },
  },
  {
    value: 'dark',
    labelKey: 'theme.dark',
    icon: { ios: 'moon.stars.fill', android: 'dark_mode', web: 'dark_mode' },
  },
  {
    value: 'system',
    labelKey: 'theme.system',
    icon: { ios: 'circle.lefthalf.filled', android: 'brightness_auto', web: 'brightness_auto' },
  },
];

const FILE_NAME_OPTIONS: {
  value: ExportFileNameFormat;
  labelKey:
    | 'settings.fileNameTitle'
    | 'settings.fileNameTitleDate'
    | 'settings.fileNameDateTitle'
    | 'settings.fileNameIdTitle';
  preview: string;
}[] = [
  { value: 'title', labelKey: 'settings.fileNameTitle', preview: 'Contract.pdf' },
  { value: 'title_date', labelKey: 'settings.fileNameTitleDate', preview: 'Contract_2026-07-20.pdf' },
  { value: 'date_title', labelKey: 'settings.fileNameDateTitle', preview: '2026-07-20_Contract.pdf' },
  { value: 'id_title', labelKey: 'settings.fileNameIdTitle', preview: '42_Contract.pdf' },
];

export default function SettingsScreen() {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { preference, setPreference } = useLocalePreference();
  const { preference: themePreference, setPreference: setThemePreference } = useThemePreference();
  const { settings, updateSettings } = useAppSettings();
  const [busy, setBusy] = useState(false);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const [fileNameSheetOpen, setFileNameSheetOpen] = useState(false);
  const [folderSheetOpen, setFolderSheetOpen] = useState(false);
  const appVersion = getAppVersion();

  const selectedLanguage = LANGUAGE_OPTIONS.find((option) => option.value === preference)!;
  const selectedLanguageLabel = t(selectedLanguage.labelKey);
  const selectedFileName =
    FILE_NAME_OPTIONS.find((option) => option.value === settings.fileNameFormat) ??
    FILE_NAME_OPTIONS[0];

  const folderSummary =
    settings.exportFolderMode === 'custom' && settings.customExportFolderLabel
      ? settings.customExportFolderLabel
      : t('settings.exportFolderApp');

  const handlePickFolder = async () => {
    try {
      setBusy(true);
      const picked = await pickCustomExportFolder();
      if (!picked) {
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await updateSettings({
        exportFolderMode: 'custom',
        customExportFolderUri: picked.uri,
        customExportFolderLabel: picked.label,
      });
    } catch (error) {
      showAppAlert(
        t('settings.title'),
        error instanceof Error ? error.message : t('settings.exportFolderChoose')
      );
    } finally {
      setBusy(false);
    }
  };

  const handleResetFolder = async () => {
    void Haptics.selectionAsync();
    await updateSettings({
      exportFolderMode: 'app',
      customExportFolderUri: null,
      customExportFolderLabel: null,
    });
  };

  const handleClearDocuments = () => {
    showAppAlert(t('settings.clearDocumentsConfirmTitle'), t('settings.clearDocumentsConfirmText'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await clearAllDocuments();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showAppAlert(t('settings.done'), t('settings.clearDocumentsDone'));
          } catch (error) {
            showAppAlert(
              t('settings.title'),
              error instanceof Error ? error.message : t('settings.clearDocuments')
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleClearCache = () => {
    showAppAlert(t('settings.clearCacheConfirmTitle'), t('settings.clearCacheConfirmText'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.clearCache'),
        onPress: async () => {
          try {
            setBusy(true);
            await clearAppCache();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showAppAlert(t('settings.done'), t('settings.clearCacheDone'));
          } catch (error) {
            showAppAlert(
              t('settings.title'),
              error instanceof Error ? error.message : t('settings.clearCache')
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleFeedback = async () => {
    try {
      await openFeedbackEmail();
    } catch {
      showAppAlert(t('settings.feedback'), APP_FEEDBACK_EMAIL);
    }
  };

  const handleRate = async () => {
    try {
      await requestAppReview();
    } catch {
      showAppAlert(t('settings.rate'), t('settings.rateUnavailable'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <LinearGradient
            colors={['#6366f1', '#4f46e5', '#4338ca']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBadge}
          >
            <SymbolView
              name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
              size={28}
              tintColor="#fff"
              weight="semibold"
            />
          </LinearGradient>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{t('settings.title')}</Text>
            <Text style={styles.heroSubtitle}>{t('settings.subtitle')}</Text>
          </View>
        </View>

        <SettingsGroup title={t('settings.sectionGeneral')} styles={styles}>
          <SettingsRow
            label={t('settings.language')}
            value={selectedLanguageLabel}
            icon={{ ios: 'globe', android: 'translate', web: 'translate' }}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setLanguageSheetOpen(true);
            }}
            styles={styles}
            colors={colors}
          />
          <View style={styles.divider} />
          <View style={styles.themeBlock}>
            <View style={styles.themeHeader}>
              <View style={styles.rowIcon}>
                <SymbolView
                  name={{ ios: 'paintpalette.fill', android: 'palette', web: 'palette' }}
                  size={18}
                  tintColor={colors.primary}
                />
              </View>
              <Text style={styles.rowLabel}>{t('settings.appearance')}</Text>
            </View>
            <View style={styles.themeSegment}>
              {THEME_OPTIONS.map((option) => {
                const selected = themePreference === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setThemePreference(option.value);
                    }}
                    style={({ pressed }) => [
                      styles.themeChip,
                      selected && styles.themeChipSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      name={option.icon}
                      size={16}
                      tintColor={selected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[styles.themeChipLabel, selected && styles.themeChipLabelSelected]}
                      numberOfLines={1}
                    >
                      {t(option.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </SettingsGroup>

        <SettingsGroup title={t('settings.sectionExport')} styles={styles}>
          <SettingsRow
            label={t('settings.exportFolder')}
            value={folderSummary}
            icon={{ ios: 'folder.fill', android: 'folder', web: 'folder' }}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFolderSheetOpen(true);
            }}
            styles={styles}
            colors={colors}
          />
          <View style={styles.divider} />
          <SettingsRow
            label={t('settings.fileNameFormat')}
            value={selectedFileName.preview}
            icon={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFileNameSheetOpen(true);
            }}
            styles={styles}
            colors={colors}
          />
        </SettingsGroup>

        <SettingsGroup title={t('settings.sectionStorage')} styles={styles}>
          <SettingsRow
            label={t('settings.clearCache')}
            icon={{ ios: 'flame.fill', android: 'cleaning_services', web: 'cleaning_services' }}
            onPress={handleClearCache}
            styles={styles}
            colors={colors}
          />
          <View style={styles.divider} />
          <SettingsRow
            label={t('settings.clearDocuments')}
            icon={{ ios: 'trash.fill', android: 'delete_forever', web: 'delete_forever' }}
            onPress={handleClearDocuments}
            destructive
            styles={styles}
            colors={colors}
          />
        </SettingsGroup>

        <SettingsGroup title={t('settings.about')} styles={styles}>
          <View style={styles.staticRow}>
            <View style={styles.rowIcon}>
              <SymbolView
                name={{ ios: 'app.badge.fill', android: 'info', web: 'info' }}
                size={18}
                tintColor={colors.primary}
              />
            </View>
            <Text style={styles.rowLabel}>{t('settings.version')}</Text>
            <Text style={styles.rowValue}>{appVersion}</Text>
          </View>
          <View style={styles.divider} />
          <SettingsRow
            label={t('settings.privacy')}
            icon={{ ios: 'hand.raised.fill', android: 'privacy_tip', web: 'privacy_tip' }}
            onPress={() => router.push('/settings/privacy' as Href)}
            styles={styles}
            colors={colors}
          />
          <View style={styles.divider} />
          <SettingsRow
            label={t('settings.terms')}
            icon={{ ios: 'doc.text.fill', android: 'gavel', web: 'gavel' }}
            onPress={() => router.push('/settings/terms' as Href)}
            styles={styles}
            colors={colors}
          />
          <View style={styles.divider} />
          <SettingsRow
            label={t('settings.feedback')}
            icon={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }}
            onPress={() => {
              void handleFeedback();
            }}
            styles={styles}
            colors={colors}
          />
          <View style={styles.divider} />
          <SettingsRow
            label={t('settings.rate')}
            icon={{ ios: 'star.fill', android: 'star', web: 'star' }}
            onPress={() => {
              void handleRate();
            }}
            styles={styles}
            colors={colors}
          />
        </SettingsGroup>

        {busy ? (
          <View style={styles.busyOverlay}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
      </ScrollView>

      <LanguagePickerModal
        visible={languageSheetOpen}
        selected={preference}
        options={LANGUAGE_OPTIONS.map((option) => ({
          value: option.value,
          code: option.code,
          label: t(option.labelKey),
        }))}
        onClose={() => setLanguageSheetOpen(false)}
        onSelect={(value) => {
          void Haptics.selectionAsync();
          setPreference(value);
          setLanguageSheetOpen(false);
        }}
      />

      <SettingsPickerModal
        visible={fileNameSheetOpen}
        title={t('settings.fileNameFormat')}
        subtitle={t('settings.fileNameHint')}
        selected={settings.fileNameFormat}
        options={FILE_NAME_OPTIONS.map((option) => ({
          value: option.value,
          title: option.preview,
          subtitle: t(option.labelKey),
        }))}
        onClose={() => setFileNameSheetOpen(false)}
        onSelect={(value) => {
          void Haptics.selectionAsync();
          void updateSettings({ fileNameFormat: value });
          setFileNameSheetOpen(false);
        }}
      />

      <ActionSheet
        visible={folderSheetOpen}
        title={t('settings.exportFolder')}
        subtitle={folderSummary}
        onClose={() => setFolderSheetOpen(false)}
        items={[
          {
            key: 'choose',
            label: t('settings.exportFolderChoose'),
            symbol: { ios: 'folder.fill', android: 'folder', web: 'folder' },
            onPress: () => {
              void handlePickFolder();
            },
          },
          ...(settings.exportFolderMode === 'custom'
            ? [
                {
                  key: 'reset',
                  label: t('settings.exportFolderReset'),
                  symbol: { ios: 'arrow.counterclockwise', android: 'refresh', web: 'refresh' },
                  onPress: () => {
                    void handleResetFolder();
                  },
                },
              ]
            : []),
        ]}
      />
    </SafeAreaView>
  );
}

function SettingsGroup({
  title,
  children,
  styles,
}: {
  title: string;
  children: ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function SettingsRow({
  label,
  value,
  icon,
  onPress,
  destructive = false,
  styles,
  colors,
}: {
  label: string;
  value?: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, destructive && styles.rowIconDanger]}>
        <SymbolView
          name={icon}
          size={18}
          tintColor={destructive ? colors.danger : colors.primary}
        />
      </View>
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDanger]} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={18}
        tintColor={destructive ? colors.danger : colors.textMuted}
      />
    </Pressable>
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
      gap: 18,
      paddingBottom: 48,
    },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingVertical: 2,
    },
    heroBadge: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      ...AppDesign.shadow,
    },
    heroText: {
      flex: 1,
      gap: 4,
    },
    heroTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
    },
    heroSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    group: {
      gap: 8,
    },
    groupTitle: {
      marginLeft: 12,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: AppDesign.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...AppDesign.cardShadow,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 13,
      paddingHorizontal: 14,
      minHeight: 56,
    },
    staticRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 13,
      paddingHorizontal: 14,
      minHeight: 56,
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    rowIconDanger: {
      backgroundColor: colors.dangerSoft,
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    rowLabelDanger: {
      color: colors.danger,
    },
    rowValue: {
      maxWidth: '42%',
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'right',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 60,
    },
    themeBlock: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
      gap: 12,
    },
    themeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    themeSegment: {
      flexDirection: 'row',
      gap: 8,
    },
    themeChip: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: AppDesign.radius.md,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    themeChipSelected: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    themeChipLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    themeChipLabelSelected: {
      color: colors.primary,
    },
    pressed: {
      opacity: 0.88,
    },
    busyOverlay: {
      paddingVertical: Spacing.three,
      alignItems: 'center',
    },
  });
}
