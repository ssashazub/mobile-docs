import { useMemo } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppDesign } from '@/constants/app-design';
import { Layout } from '@/constants/layout';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useLayout } from '@/hooks/use-layout';
import { useModalSheetAnimation } from '@/hooks/use-modal-sheet-animation';
import { useTheme } from '@/hooks/use-theme';
import type { LocalePreference } from '@/types/locale-preference';

export type LanguageOption = {
  value: LocalePreference;
  code: string;
  label: string;
};

type LanguagePickerModalProps = {
  visible: boolean;
  selected: LocalePreference;
  options: LanguageOption[];
  onSelect: (value: LocalePreference) => void;
  onClose: () => void;
};

export function LanguagePickerModal({
  visible,
  selected,
  options,
  onSelect,
  onClose,
}: LanguagePickerModalProps) {
  const { t } = useI18n();
  const colors = useTheme();
  const layout = useLayout();
  const styles = useMemo(() => createStyles(colors, layout.isTablet), [colors, layout.isTablet]);
  const insets = useSafeAreaInsets();
  const { backdrop, sheet } = useModalSheetAnimation(visible, 360);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={[styles.overlay, layout.isTablet && styles.overlayTablet]}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            layout.isTablet && styles.sheetTablet,
            {
              paddingBottom: layout.isTablet ? 20 : insets.bottom + 16,
              transform: [{ translateY: sheet }],
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <SymbolView
                name={{ ios: 'globe', android: 'translate', web: 'translate' }}
                size={20}
                tintColor={colors.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t('settings.languageChoose')}</Text>
              <Text style={styles.subtitle}>{t('settings.languageHint')}</Text>
            </View>
          </View>

          <View style={styles.list}>
            {options.map((option, index) => {
              const isSelected = option.value === selected;
              const isLast = index === options.length - 1;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => onSelect(option.value)}
                  style={({ pressed }) => [
                    styles.row,
                    !isLast && styles.rowBorder,
                    isSelected && styles.rowSelected,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={[styles.codeBadge, isSelected && styles.codeBadgeSelected]}>
                    <Text style={[styles.codeText, isSelected && styles.codeTextSelected]}>
                      {option.code}
                    </Text>
                  </View>
                  <Text style={[styles.label, isSelected && styles.labelSelected]}>
                    {option.label}
                  </Text>
                  {isSelected ? (
                    <SymbolView
                      name={{
                        ios: 'checkmark.circle.fill',
                        android: 'check_circle',
                        web: 'check_circle',
                      }}
                      size={22}
                      tintColor={colors.primary}
                    />
                  ) : (
                    <View style={styles.radio} />
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelPressed]}
          >
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, isTablet: boolean) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlayTablet: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: AppDesign.radius.xl,
      borderTopRightRadius: AppDesign.radius.xl,
      paddingHorizontal: 16,
      paddingTop: 10,
      width: '100%',
    },
    sheetTablet: {
      maxWidth: Layout.sheetMaxWidth,
      borderRadius: AppDesign.radius.xl,
      ...AppDesign.shadow,
    },
    handle: {
      alignSelf: 'center',
      width: isTablet ? 0 : 40,
      height: isTablet ? 0 : 4,
      borderRadius: 999,
      backgroundColor: colors.border,
      marginBottom: isTablet ? 8 : 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 4,
      paddingBottom: 14,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    list: {
      borderRadius: AppDesign.radius.lg,
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 13,
      paddingHorizontal: 12,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowSelected: {
      backgroundColor: colors.primarySoft,
    },
    rowPressed: {
      opacity: 0.88,
    },
    codeBadge: {
      minWidth: 44,
      height: 32,
      paddingHorizontal: 8,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    codeBadgeSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.surface,
    },
    codeText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: colors.textMuted,
    },
    codeTextSelected: {
      color: colors.primary,
    },
    label: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    labelSelected: {
      color: colors.primary,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    cancelButton: {
      marginTop: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: AppDesign.radius.md,
      backgroundColor: colors.backgroundElement,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelPressed: {
      opacity: 0.85,
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textSecondary,
    },
  });
}
