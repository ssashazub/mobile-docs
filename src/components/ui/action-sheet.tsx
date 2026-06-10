import { useEffect, useRef } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppDesign } from '@/constants/app-design';
import { useI18n } from '@/hooks/use-i18n';

export type ActionSheetItem = {
  key: string;
  label: string;
  icon?: string;
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
  accentColor = AppDesign.primary,
  items,
  onClose,
  headerStyle,
}: ActionSheetProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const backdrop = useRef(new Animated.Value(0)).current;
  const sheet = useRef(new Animated.Value(320)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheet, {
          toValue: 0,
          damping: 22,
          stiffness: 240,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheet, {
        toValue: 320,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, backdrop, sheet]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheet }] },
          ]}
        >
          <View style={styles.handle} />

          <View style={[styles.header, headerStyle]}>
            <View style={[styles.accentDot, { backgroundColor: accentColor }]} />
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
                  <Text style={styles.itemIcon}>{item.icon ?? '•'}</Text>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: AppDesign.surface,
    borderTopLeftRadius: AppDesign.radius.xl,
    borderTopRightRadius: AppDesign.radius.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppDesign.border,
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
    color: AppDesign.text,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    color: AppDesign.textSecondary,
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
    backgroundColor: AppDesign.backgroundSoft,
  },
  itemDanger: {
    backgroundColor: AppDesign.dangerSoft,
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
    backgroundColor: AppDesign.primarySoft,
  },
  itemIconDanger: {
    backgroundColor: '#fee2e2',
  },
  itemIcon: {
    fontSize: 18,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: AppDesign.text,
  },
  itemLabelDanger: {
    color: AppDesign.danger,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: AppDesign.radius.md,
    backgroundColor: '#f1f5f9',
  },
  cancelPressed: {
    opacity: 0.85,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppDesign.textSecondary,
  },
});
