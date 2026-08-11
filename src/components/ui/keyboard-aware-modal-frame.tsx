import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

type KeyboardAwareModalFrameProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Centers modal content and lifts it above the keyboard on iOS/Android.
 */
export function KeyboardAwareModalFrame({ children, style }: KeyboardAwareModalFrameProps) {
  return (
    <KeyboardAvoidingView
      behavior="padding"
      automaticOffset
      style={[styles.frame, style]}
      pointerEvents="box-none"
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    justifyContent: 'center',
  },
});
