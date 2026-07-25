import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { type Href, router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type ActionSheetItem } from '@/components/ui/action-sheet';
import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { getDocuments } from '@/lib/document-storage';

type EditorOverflowMenuProps = {
  onGoHome: () => void;
  onOpenLibrary?: () => void;
  onEditTemplate?: () => void;
};

export function EditorOverflowMenu({
  onGoHome,
  onOpenLibrary,
  onEditTemplate,
}: EditorOverflowMenuProps) {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void getDocuments().then((documents) => {
        if (active) {
          setShowLibrary(documents.length > 3);
        }
      });

      return () => {
        active = false;
      };
    }, [])
  );

  const items: ActionSheetItem[] = [
    {
      key: 'home',
      label: t('common.mainMenu'),
      symbol: { ios: 'house.fill', android: 'home', web: 'home' },
      onPress: onGoHome,
    },
    ...(onEditTemplate
      ? [
          {
            key: 'editTemplate',
            label: t('common.editTemplate'),
            symbol: {
              ios: 'square.and.pencil' as const,
              android: 'edit_note' as const,
              web: 'edit_note' as const,
            },
            onPress: onEditTemplate,
          },
        ]
      : []),
    ...(showLibrary
      ? [
          {
            key: 'library',
            label: t('common.documentLibrary'),
            symbol: {
              ios: 'books.vertical.fill' as const,
              android: 'library_books' as const,
              web: 'library_books' as const,
            },
            onPress:
              onOpenLibrary ??
              (() => {
                router.push('/documents' as Href);
              }),
          },
        ]
      : []),
  ];

  const openMenu = () => {
    animation.setValue(0);
    setVisible(true);
    requestAnimationFrame(() => {
      Animated.spring(animation, {
        toValue: 1,
        damping: 18,
        stiffness: 260,
        mass: 0.72,
        useNativeDriver: true,
      }).start();
    });
  };

  const closeMenu = (afterClose?: () => void) => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      if (afterClose) {
        // Defer navigation until the modal overlay is fully unmounted,
        // otherwise the closing overlay stays on top and blocks the next screen.
        setTimeout(afterClose, 0);
      }
    });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.more')}
        hitSlop={6}
        onPress={openMenu}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <SymbolView
          name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }}
          size={20}
          tintColor={colors.text}
          weight="semibold"
        />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => closeMenu()}
      >
        <View style={styles.overlay}>
          <Animated.View style={[styles.backdrop, { opacity: animation }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => closeMenu()} />
          </Animated.View>

          <Animated.View
            style={[
              styles.menu,
              {
                top: insets.top + 54,
                opacity: animation,
                transform: [
                  {
                    translateY: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                  {
                    scale: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>{t('common.navigationMenu')}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => closeMenu()}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'close' }}
                  size={17}
                  tintColor={colors.textSecondary}
                />
              </Pressable>
            </View>

            <View style={styles.items}>
              {items.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => closeMenu(item.onPress)}
                  style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                >
                  <View style={styles.itemIcon}>
                    {item.symbol ? (
                      <SymbolView name={item.symbol} size={20} tintColor={colors.primary} />
                    ) : null}
                  </View>
                  <Text style={styles.itemText}>{item.label}</Text>
                  <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                    size={17}
                    tintColor={colors.textMuted}
                  />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    button: {
      width: 36,
      height: 36,
      marginRight: 4,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.96 }],
    },
    overlay: {
      flex: 1,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0, 0, 0, 0.38)',
    },
    menu: {
      position: 'absolute',
      right: 14,
      width: 310,
      maxWidth: '88%',
      padding: 12,
      borderRadius: AppDesign.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      ...AppDesign.shadow,
    },
    menuHeader: {
      minHeight: 38,
      paddingLeft: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    menuTitle: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSoft,
    },
    items: {
      marginTop: 8,
      gap: 8,
    },
    item: {
      minHeight: 58,
      paddingHorizontal: 12,
      borderRadius: AppDesign.radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.backgroundSoft,
    },
    itemPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.985 }],
    },
    itemIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    itemText: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
