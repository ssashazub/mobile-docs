import { useMemo, type ComponentProps } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppDesign } from '@/constants/app-design';
import { Layout } from '@/constants/layout';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useLayout } from '@/hooks/use-layout';
import { useModalSheetAnimation } from '@/hooks/use-modal-sheet-animation';
import { useTheme } from '@/hooks/use-theme';

export type ActionSheetItem = {
  key: string;
  label: string;
  icon?: string;
  symbol?: ComponentProps<typeof SymbolView>['name'];
  tone?: 'default' | 'danger';
  onPress: () => void;
};

type ActionSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  accentColor?: string;
  items: ActionSheetItem[];
  onClose: () => void;
  headerStyle?: StyleProp<ViewStyle>;
};

export function ActionSheet({
  visible,
  title,
  subtitle,
  accentColor,
  items,
  onClose,
  headerStyle,
}: ActionSheetProps) {
  const { t } = useI18n();
  const colors = useTheme();
  const layout = useLayout();
  const styles = useMemo(() => createStyles(colors, layout.isTablet), [colors, layout.isTablet]);
  const resolvedAccent = accentColor ?? colors.primary;
  const insets = useSafeAreaInsets();
  const { backdrop, sheet } = useModalSheetAnimation(visible, 320);

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

          <View style={[styles.header, headerStyle]}>
            <View style={[styles.accentDot, { backgroundColor: resolvedAccent }]} />
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          </View>

          <View style={styles.items}>
            {items.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                style={({ pressed }) => [
                  styles.item,
                  item.tone === 'danger' && styles.itemDanger,
                  pressed && styles.itemPressed,
                ]}
              >
                <View
                  style={[
                    styles.itemIconWrap,
                    item.tone === 'danger' ? styles.itemIconDanger : styles.itemIconDefault,
                  ]}
                >
                  {item.symbol ? (
                    <SymbolView
                      name={item.symbol}
                      size={22}
                      tintColor={item.tone === 'danger' ? colors.danger : resolvedAccent}
                    />
                  ) : (
                    <Text style={styles.itemIcon}>{item.icon ?? '•'}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.itemLabel,
                    item.tone === 'danger' && styles.itemLabelDanger,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
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
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: AppDesign.radius.xl,
      borderTopRightRadius: AppDesign.radius.xl,
      paddingHorizontal: 20,
      paddingTop: 10,
      width: '100%',
    },
    sheetTablet: {
      maxWidth: Layout.sheetMaxWidth,
      borderRadius: AppDesign.radius.xl,
      borderTopLeftRadius: AppDesign.radius.xl,
      borderTopRightRadius: AppDesign.radius.xl,
      ...AppDesign.shadow,
    },
    handle: {
      alignSelf: 'center',
      width: isTablet ? 0 : 44,
      height: isTablet ? 0 : 5,
      borderRadius: 999,
      backgroundColor: colors.border,
      marginBottom: isTablet ? 8 : 16,
    },
    header: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 8,
    },
    accentDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
      marginTop: 6,
    },
    headerText: {
      flex: 1,
      gap: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      lineHeight: 24,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    items: {
      gap: 8,
      paddingVertical: 8,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: AppDesign.radius.md,
      backgroundColor: colors.backgroundSoft,
    },
    itemDanger: {
      backgroundColor: colors.dangerSoft,
    },
    itemPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.99 }],
    },
    itemIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemIconDefault: {
      backgroundColor: colors.primarySoft,
    },
    itemIconDanger: {
      backgroundColor: colors.dangerSoft,
    },
    itemIcon: {
      fontSize: 18,
    },
    itemLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    itemLabelDanger: {
      color: colors.danger,
    },
    cancelButton: {
      marginTop: 8,
      paddingVertical: 16,
      alignItems: 'center',
      borderRadius: AppDesign.radius.md,
      backgroundColor: colors.backgroundElement,
    },
    cancelPressed: {
      opacity: 0.85,
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });
}
