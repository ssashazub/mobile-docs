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

export type SettingsPickerOption<T extends string> = {
  value: T;
  title: string;
  subtitle?: string;
};

type SettingsPickerModalProps<T extends string> = {
  visible: boolean;
  title: string;
  subtitle?: string;
  selected: T;
  options: SettingsPickerOption<T>[];
  onSelect: (value: T) => void;
  onClose: () => void;
};

export function SettingsPickerModal<T extends string>({
  visible,
  title,
  subtitle,
  selected,
  options,
  onSelect,
  onClose,
}: SettingsPickerModalProps<T>) {
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
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

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
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, isSelected && styles.rowTitleSelected]}>
                      {option.title}
                    </Text>
                    {option.subtitle ? (
                      <Text style={styles.rowSubtitle}>{option.subtitle}</Text>
                    ) : null}
                  </View>
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
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      paddingHorizontal: 4,
    },
    subtitle: {
      marginTop: 4,
      marginBottom: 12,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
      paddingHorizontal: 4,
    },
    list: {
      marginTop: 8,
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
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    rowTitleSelected: {
      color: colors.primary,
    },
    rowSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
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
