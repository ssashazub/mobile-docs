import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AppDesign } from '@/constants/app-design';
import { type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';

export type AppAlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive' | 'secondary';
  onPress?: () => void | Promise<void>;
};

type AppAlertOptions = {
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
};

let presentAlert: ((options: AppAlertOptions) => void) | null = null;

export function showAppAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[]
): void {
  presentAlert?.({ title, message, buttons });
}

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [alert, setAlert] = useState<AppAlertOptions | null>(null);

  useEffect(() => {
    presentAlert = setAlert;
    return () => {
      presentAlert = null;
    };
  }, []);

  const buttons = alert?.buttons?.length
    ? alert.buttons
    : [{ text: t('common.ok'), style: 'default' as const }];
  const destructive = buttons.some((button) => button.style === 'destructive');

  return (
    <>
      {children}
      <Modal
        visible={alert !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAlert(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <View
              style={[
                styles.iconWrap,
                destructive ? styles.iconWrapDanger : styles.iconWrapDefault,
              ]}
            >
              <SymbolView
                name={
                  destructive
                    ? { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }
                    : { ios: 'info.circle.fill', android: 'info', web: 'info' }
                }
                size={26}
                tintColor={destructive ? colors.danger : colors.primary}
              />
            </View>

            <Text style={styles.title}>{alert?.title}</Text>
            {alert?.message ? <Text style={styles.message}>{alert.message}</Text> : null}

            <View style={styles.buttons}>
              {buttons.map((button, index) => (
                <Pressable
                  key={`${button.text}-${index}`}
                  onPress={() => {
                    setAlert(null);
                    void button.onPress?.();
                  }}
                  style={({ pressed }) => [
                    styles.button,
                    button.style === 'cancel' && styles.buttonCancel,
                    button.style === 'secondary' && styles.buttonSecondary,
                    button.style === 'destructive' && styles.buttonDanger,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === 'cancel' && styles.buttonTextCancel,
                      button.style === 'secondary' && styles.buttonTextSecondary,
                      button.style === 'destructive' && styles.buttonTextDanger,
                    ]}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: 'rgba(0, 0, 0, 0.62)',
    },
    dialog: {
      width: '100%',
      maxWidth: 420,
      padding: 22,
      borderRadius: AppDesign.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      ...AppDesign.shadow,
    },
    iconWrap: {
      width: 48,
      height: 48,
      marginBottom: 16,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapDefault: {
      backgroundColor: colors.primarySoft,
    },
    iconWrapDanger: {
      backgroundColor: colors.dangerSoft,
    },
    title: {
      color: colors.text,
      fontSize: 21,
      lineHeight: 27,
      fontWeight: '800',
    },
    message: {
      marginTop: 8,
      color: colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
    },
    buttons: {
      marginTop: 22,
      gap: 10,
    },
    button: {
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      borderRadius: AppDesign.radius.md,
      backgroundColor: colors.primary,
    },
    buttonCancel: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundElement,
    },
    buttonSecondary: {
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    buttonDanger: {
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    buttonPressed: {
      opacity: 0.82,
      transform: [{ scale: 0.99 }],
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '800',
    },
    buttonTextCancel: {
      color: colors.textSecondary,
    },
    buttonTextSecondary: {
      color: colors.primary,
    },
    buttonTextDanger: {
      color: colors.danger,
    },
  });
}
