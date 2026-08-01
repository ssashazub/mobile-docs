import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  /** Opens full document editor (layout / field values). */
  onOpenDocumentEditor?: () => void;
  /** When set, adds “Fill on document” and runs discovery pulses. */
  onFillOnDocument?: () => void;
  /** When set, adds Save as the first menu action. */
  onSave?: () => void;
  /** Bump to replay the ⋮ hint pulse (e.g. on screen focus). */
  hintPulseKey?: number;
};

type MenuItem = ActionSheetItem & { pulse?: boolean };

/** Shared so React Navigation header remounts can keep driving the same scale value. */
const sharedTriggerPulse = new Animated.Value(1);
let sharedTriggerPulseAnim: Animated.CompositeAnimation | null = null;

function runPulse(
  value: Animated.Value,
  options: { peak: number; duration: number; iterations: number }
): Animated.CompositeAnimation {
  value.setValue(1);
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: options.peak,
        duration: options.duration,
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 1,
        duration: options.duration,
        useNativeDriver: true,
      }),
    ]),
    { iterations: options.iterations }
  );
}

function startTriggerPulse() {
  sharedTriggerPulseAnim?.stop();
  const anim = runPulse(sharedTriggerPulse, {
    peak: 1.16,
    duration: 360,
    iterations: 5,
  });
  sharedTriggerPulseAnim = anim;
  anim.start(({ finished }) => {
    if (sharedTriggerPulseAnim !== anim) {
      return;
    }
    sharedTriggerPulseAnim = null;
    if (finished) {
      sharedTriggerPulse.setValue(1);
    }
  });
}

function stopTriggerPulse() {
  sharedTriggerPulseAnim?.stop();
  sharedTriggerPulseAnim = null;
  sharedTriggerPulse.setValue(1);
}

export function EditorOverflowMenu({
  onGoHome,
  onOpenLibrary,
  onEditTemplate,
  onOpenDocumentEditor,
  onFillOnDocument,
  onSave,
  hintPulseKey = 0,
}: EditorOverflowMenuProps) {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const fillItemPulse = useRef(new Animated.Value(1)).current;
  const fillItemPulseAnim = useRef<Animated.CompositeAnimation | null>(null);
  /** Per-instance guard: same keystroke-driven prop churn must not restart the hint. */
  const playedHintKeyRef = useRef(-1);

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

  useEffect(() => {
    if (!onFillOnDocument || hintPulseKey <= 0) {
      return;
    }
    if (playedHintKeyRef.current === hintPulseKey) {
      return;
    }
    playedHintKeyRef.current = hintPulseKey;
    // Remounts reset playedHintKeyRef, so a killed header pulse can restart.
    startTriggerPulse();
  }, [hintPulseKey, onFillOnDocument]);

  const items: MenuItem[] = [
    ...(onSave
      ? [
          {
            key: 'save',
            label: t('common.save'),
            symbol: {
              ios: 'square.and.arrow.down' as const,
              android: 'save' as const,
              web: 'save' as const,
            },
            onPress: onSave,
          },
        ]
      : []),
    ...(onFillOnDocument
      ? [
          {
            key: 'fillOnDocument',
            label: t('import.fillOnDocument'),
            symbol: {
              ios: 'doc.text.magnifyingglass' as const,
              android: 'find_in_page' as const,
              web: 'find_in_page' as const,
            },
            onPress: onFillOnDocument,
            pulse: true,
          },
        ]
      : []),
    ...(onOpenDocumentEditor
      ? [
          {
            key: 'documentEditor',
            label: t('common.editForm'),
            symbol: {
              ios: 'doc.badge.gearshape' as const,
              android: 'edit_document' as const,
              web: 'edit_document' as const,
            },
            onPress: onOpenDocumentEditor,
          },
        ]
      : []),
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
    {
      key: 'home',
      label: t('common.mainMenu'),
      symbol: { ios: 'house.fill', android: 'home', web: 'home' },
      onPress: onGoHome,
    },
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
    stopTriggerPulse();

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

    if (onFillOnDocument) {
      fillItemPulseAnim.current?.stop();
      fillItemPulseAnim.current = runPulse(fillItemPulse, {
        peak: 1.045,
        duration: 260,
        iterations: 3,
      });
      fillItemPulseAnim.current.start(() => {
        fillItemPulse.setValue(1);
      });
    }
  };

  const closeMenu = (afterClose?: () => void) => {
    fillItemPulseAnim.current?.stop();
    fillItemPulse.setValue(1);

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
      <Animated.View style={{ transform: [{ scale: sharedTriggerPulse }] }}>
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
      </Animated.View>

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
              {items.map((item) => {
                const row = (
                  <Pressable
                    onPress={() => closeMenu(item.onPress)}
                    style={({ pressed }) => [
                      styles.item,
                      item.pulse && styles.itemHighlight,
                      pressed && styles.itemPressed,
                    ]}
                  >
                    <View style={[styles.itemIcon, item.pulse && styles.itemIconHighlight]}>
                      {item.symbol ? (
                        <SymbolView name={item.symbol} size={20} tintColor={colors.primary} />
                      ) : null}
                    </View>
                    <Text style={styles.itemText}>{item.label}</Text>
                    <SymbolView
                      name={{
                        ios: 'chevron.right',
                        android: 'chevron_right',
                        web: 'chevron_right',
                      }}
                      size={17}
                      tintColor={colors.textMuted}
                    />
                  </Pressable>
                );

                if (!item.pulse) {
                  return <View key={item.key}>{row}</View>;
                }

                return (
                  <Animated.View
                    key={item.key}
                    style={{ transform: [{ scale: fillItemPulse }] }}
                  >
                    {row}
                  </Animated.View>
                );
              })}
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
    itemHighlight: {
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
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
    itemIconHighlight: {
      backgroundColor: colors.surface,
    },
    itemText: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
