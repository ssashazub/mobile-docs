import { useMemo, type Ref } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AppDesign } from '@/constants/app-design';
import { Colors, type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';

type DocumentSearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Smaller bar for navigation header slots. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
  inputRef?: Ref<TextInput>;
  onBlur?: TextInputProps['onBlur'];
  onFocus?: TextInputProps['onFocus'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
};

export function DocumentSearchBar({
  value,
  onChangeText,
  placeholder,
  compact = false,
  style,
  autoFocus,
  inputRef,
  onBlur,
  onFocus,
  onSubmitEditing,
}: DocumentSearchBarProps) {
  const { t } = useI18n();
  const colors = useTheme();
  const isDark = colors.background === Colors.dark.background;
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const canClear = value.length > 0;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      <SymbolView
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        size={compact ? 15 : 18}
        tintColor={colors.textMuted}
      />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? t('home.searchPlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, compact && styles.inputCompact]}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
        autoFocus={autoFocus}
        onBlur={onBlur}
        onFocus={onFocus}
        onSubmitEditing={onSubmitEditing}
      />
      {canClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.clear')}
          hitSlop={8}
          onPressIn={() => onChangeText('')}
          style={({ pressed }) => [styles.clearButton, pressed && styles.clearPressed]}
        >
          <SymbolView
            name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
            size={compact ? 16 : 18}
            tintColor={colors.textMuted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 48,
      paddingHorizontal: 16,
      borderRadius: AppDesign.radius.pill,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 1,
      borderColor: isDark ? colors.outlineVariant : 'rgba(79, 70, 229, 0.18)',
      backgroundColor: isDark ? colors.surfaceContainer : '#ffffff',
      ...(isDark ? {} : AppDesign.cardShadow),
    },
    wrapCompact: {
      minHeight: 34,
      paddingHorizontal: 10,
      gap: 6,
      flex: 1,
      shadowOpacity: 0,
      elevation: 0,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    inputCompact: {
      paddingVertical: 6,
      fontSize: 13,
      minWidth: 0,
    },
    clearButton: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearPressed: {
      opacity: 0.65,
    },
  });
}
