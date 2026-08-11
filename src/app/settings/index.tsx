import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router, Stack } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from '@/lib/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ui/action-sheet';
import { showAppAlert } from '@/components/ui/app-alert';
import { PrimaryButton } from '@/components/ui/primary-button';
import { LanguagePickerModal } from '@/components/ui/language-picker-modal';
import { SettingsPickerModal } from '@/components/ui/settings-picker-modal';
import { AppDesign, AppGradients } from '@/constants/app-design';
import { APP_FEEDBACK_EMAIL } from '@/constants/app-info';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useAppSettings } from '@/contexts/app-settings-context';
import { useLocalePreference } from '@/contexts/locale-preference-context';
import { useThemePreference } from '@/contexts/theme-preference-context';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { useLayout } from '@/hooks/use-layout';
import { getAppVersion, openFeedbackEmail, requestAppReview } from '@/lib/about-actions';
import { clearAppCache } from '@/lib/clear-cache';
import { clearAllDocuments } from '@/lib/clear-documents';
import { clearAllTemplates } from '@/lib/clear-templates';
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

type StorageTarget = 'cache' | 'documents' | 'templates';

const STORAGE_TARGETS: {
  value: StorageTarget;
  labelKey: 'settings.clearCache' | 'settings.clearDocuments' | 'settings.clearTemplates';
}[] = [
  { value: 'cache', labelKey: 'settings.clearCache' },
  { value: 'documents', labelKey: 'settings.clearDocuments' },
  { value: 'templates', labelKey: 'settings.clearTemplates' },
];

const EMPTY_STORAGE_SELECTION: Record<StorageTarget, boolean> = {
  cache: true,
  documents: false,
  templates: false,
};

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
  const layout = useLayout();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { preference, setPreference } = useLocalePreference();
  const { preference: themePreference, setPreference: setThemePreference } = useThemePreference();
  const { settings, updateSettings } = useAppSettings();
  const [busy, setBusy] = useState(false);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const [fileNameSheetOpen, setFileNameSheetOpen] = useState(false);
  const [folderSheetOpen, setFolderSheetOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [storageSelection, setStorageSelection] =
    useState<Record<StorageTarget, boolean>>(EMPTY_STORAGE_SELECTION);
  const storageProgress = useSharedValue(0);
  const storageHeight = useSharedValue(0);
  const measuredStorageHeight = useRef(0);
  const appVersion = getAppVersion();
  const selectedTargets = STORAGE_TARGETS.filter((option) => storageSelection[option.value]);
  const storageChevronStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(storageProgress.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));
  const storagePanelStyle = useAnimatedStyle(() => {
    const progress = storageProgress.value;
    return {
      height: storageHeight.value * progress,
      opacity: interpolate(progress, [0, 0.35, 1], [0, 1, 1]),
    };
  });

  const toggleStorageOpen = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStorageOpen((current) => !current);
  };

  useEffect(() => {
    storageProgress.value = withTiming(storageOpen ? 1 : 0, {
      duration: storageOpen ? 360 : 280,
      easing: storageOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [storageOpen, storageProgress]);

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

  const toggleStorageTarget = (target: StorageTarget) => {
    void Haptics.selectionAsync();
    setStorageSelection((current) => ({ ...current, [target]: !current[target] }));
  };

  const handleClearSelected = () => {
    const targets = selectedTargets.map((option) => option.value);

    if (targets.length === 0) {
      return;
    }

    showAppAlert(t('settings.clearSelectedConfirmTitle'), t('settings.clearSelectedConfirmText'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);

            if (targets.includes('cache')) {
              await clearAppCache();
            }
            if (targets.includes('documents')) {
              await clearAllDocuments();
            }
            if (targets.includes('templates')) {
              await clearAllTemplates();
            }

            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setStorageSelection(EMPTY_STORAGE_SELECTION);
            showAppAlert(t('settings.done'), t('settings.clearSelectedDone'));
          } catch (error) {
            showAppAlert(
              t('settings.title'),
              error instanceof Error ? error.message : t('settings.clearSelected')
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
      <ScrollView
        contentContainerStyle={[styles.container, layout.contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <LinearGradient
            colors={AppGradients.brand}
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
          <View style={styles.divider} />
          <View style={styles.staticRow}>
            <View style={styles.rowIcon}>
              <SymbolView
                name={{ ios: 'iphone.radiowaves.left.and.right', android: 'vibration', web: 'vibration' }}
                size={18}
                tintColor={colors.primary}
              />
            </View>
            <Text style={styles.rowLabel}>{t('settings.haptics')}</Text>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(hapticsEnabled) => {
                if (settings.hapticsEnabled && !hapticsEnabled) {
                  void Haptics.selectionAsync();
                }
                void updateSettings({ hapticsEnabled }).then(() => {
                  if (hapticsEnabled) {
                    void Haptics.selectionAsync();
                  }
                });
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={settings.hapticsEnabled ? '#ffffff' : colors.backgroundElement}
            />
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
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: storageOpen }}
            onPress={toggleStorageOpen}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowIcon}>
              <SymbolView
                name={{
                  ios: 'trash.fill',
                  android: 'cleaning_services',
                  web: 'cleaning_services',
                }}
                size={18}
                tintColor={colors.primary}
              />
            </View>
            <Text style={styles.rowLabel} numberOfLines={1}>
              {t('settings.storageCleanup')}
            </Text>
            {selectedTargets.length > 0 ? (
              <View style={styles.selectionBadge}>
                <Text style={styles.selectionBadgeText}>{selectedTargets.length}</Text>
              </View>
            ) : null}
            <Animated.View style={storageChevronStyle}>
              <SymbolView
                name={{
                  ios: 'chevron.down',
                  android: 'expand_more',
                  web: 'expand_more',
                }}
                size={18}
                tintColor={colors.textMuted}
              />
            </Animated.View>
          </Pressable>

          <Animated.View
            pointerEvents={storageOpen ? 'auto' : 'none'}
            style={[styles.storagePanelWrap, storagePanelStyle]}
          >
            <View
              style={styles.storagePanelMeasure}
              onLayout={(event) => {
                const nextHeight = Math.ceil(event.nativeEvent.layout.height);
                if (nextHeight > 0 && Math.abs(measuredStorageHeight.current - nextHeight) > 1) {
                  measuredStorageHeight.current = nextHeight;
                  storageHeight.value = nextHeight;
                }
              }}
            >
              <View style={styles.divider} />
              <View style={styles.storagePanel}>
                <Text style={styles.storageHint}>{t('settings.storageCleanupHint')}</Text>

                {STORAGE_TARGETS.map((option) => {
                  const checked = storageSelection[option.value];

                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      onPress={() => toggleStorageTarget(option.value)}
                      style={({ pressed }) => [styles.checkRow, pressed && styles.pressed]}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked ? (
                          <SymbolView
                            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                            size={14}
                            tintColor="#ffffff"
                            weight="bold"
                          />
                        ) : null}
                      </View>
                      <Text style={[styles.checkLabel, checked && styles.checkLabelChecked]}>
                        {t(option.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}

                <PrimaryButton
                  label={t('common.clear')}
                  variant="danger"
                  onPress={handleClearSelected}
                  disabled={selectedTargets.length === 0 || busy}
                />
              </View>
            </View>
          </Animated.View>
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
    selectionBadge: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    selectionBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
    },
    storagePanelWrap: {
      overflow: 'hidden',
    },
    storagePanelMeasure: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
    },
    storagePanel: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
      gap: 10,
    },
    storageHint: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 46,
      paddingHorizontal: 12,
      borderRadius: AppDesign.radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSoft,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    checkboxChecked: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    checkLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    checkLabelChecked: {
      color: colors.text,
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
