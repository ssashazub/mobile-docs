import { useMemo, type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import {
  KeyboardAvoidingView,
  type KeyboardAvoidingViewProps,
} from 'react-native-keyboard-controller';

type AppKeyboardAvoidingProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra gap above the keyboard (e.g. sticky footer height). */
  offset?: number;
  enabled?: boolean;
  behavior?: KeyboardAvoidingViewProps['behavior'];
};

/**
 * Screen-level keyboard avoidance that tracks keyboard height on iOS and Android.
 */
export function AppKeyboardAvoiding({
  children,
  style,
  offset = 0,
  enabled = true,
  behavior = 'padding',
}: AppKeyboardAvoidingProps) {
  const composed = useMemo(() => [styles.flex, style], [style]);

  return (
    <KeyboardAvoidingView
      style={composed}
      behavior={behavior}
      enabled={enabled}
      automaticOffset
      keyboardVerticalOffset={offset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
