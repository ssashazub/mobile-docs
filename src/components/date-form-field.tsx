import { useMemo, useState, type ReactNode } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { SymbolView } from 'expo-symbols';

import { FormField } from '@/components/ui/form-field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { AppDesign } from '@/constants/app-design';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { formatDateValue, parseDateValue, sanitizeFieldInput } from '@/lib/field-validation';

type DateFormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  required?: boolean;
  error?: boolean;
  shakeToken?: number;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
};

export function DateFormField({
  label,
  value,
  onChangeText,
  required,
  error,
  shakeToken,
  placeholder = '07.06.2026',
  style,
}: DateFormFieldProps) {
  const { t } = useI18n();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showPicker, setShowPicker] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseDateValue(value) ?? new Date());

  const openPicker = () => {
    Keyboard.dismiss();
    setDraftDate(parseDateValue(value) ?? new Date());
    setShowPicker(true);
  };

  const commitDate = (date: Date) => {
    onChangeText(formatDateValue(date));
    setShowPicker(false);
  };

  if (Platform.OS === 'web') {
    return (
      <FormField
        label={label}
        value={value}
        required={required}
        error={error}
        shakeToken={shakeToken}
        onChangeText={(text) => onChangeText(sanitizeFieldInput('date', text))}
        placeholder={placeholder}
        style={style}
        keyboardType="number-pad"
        maxLength={10}
        autoCapitalize="none"
        autoCorrect={false}
      />
    );
  }

  return (
    <View>
      <Pressable onPress={openPicker}>
        <View pointerEvents="none">
          <FormField
            label={label}
            value={value}
            required={required}
            error={error}
            shakeToken={shakeToken}
            onChangeText={onChangeText}
            placeholder={placeholder}
            style={style}
            editable={false}
            showSoftInputOnFocus={false}
            caretHidden
          />
        </View>
        <View style={styles.calendarAffordance} pointerEvents="none">
          <SymbolView
            name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
            size={18}
            tintColor={colors.textMuted}
          />
        </View>
      </Pressable>

      {showPicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={draftDate}
          mode="date"
          presentation="dialog"
          display="default"
          accentColor={colors.primary}
          onValueChange={(_event, selectedDate) => {
            commitDate(selectedDate);
          }}
          onDismiss={() => setShowPicker(false)}
        />
      ) : null}

      {showPicker && Platform.OS === 'ios' ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setShowPicker(false)}>
          <Pressable style={styles.iosBackdrop} onPress={() => setShowPicker(false)} />
          <View style={styles.iosSheet}>
            <Text style={styles.iosTitle}>{label}</Text>
            <DateTimePicker
              value={draftDate}
              mode="date"
              display="spinner"
              accentColor={colors.primary}
              onValueChange={(_event, selectedDate) => {
                setDraftDate(selectedDate);
              }}
            />
            <PrimaryButton label={t('common.ok')} onPress={() => commitDate(draftDate)} />
            <PrimaryButton
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => setShowPicker(false)}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

/** Opens the platform date picker and returns DD.MM.YYYY via onChange. */
export function DatePickerTrigger({
  value,
  onChange,
  children,
  style,
}: {
  value: string;
  onChange: (next: string) => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showPicker, setShowPicker] = useState(false);
  const [draftDate, setDraftDate] = useState(() => parseDateValue(value) ?? new Date());

  const openPicker = () => {
    Keyboard.dismiss();
    setDraftDate(parseDateValue(value) ?? new Date());
    setShowPicker(true);
  };

  return (
    <View style={style}>
      <Pressable onPress={openPicker}>{children}</Pressable>

      {showPicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={draftDate}
          mode="date"
          presentation="dialog"
          display="default"
          accentColor={colors.primary}
          onValueChange={(_event, selectedDate) => {
            onChange(formatDateValue(selectedDate));
            setShowPicker(false);
          }}
          onDismiss={() => setShowPicker(false)}
        />
      ) : null}

      {showPicker && Platform.OS === 'ios' ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setShowPicker(false)}>
          <Pressable style={styles.iosBackdrop} onPress={() => setShowPicker(false)} />
          <View style={styles.iosSheet}>
            <DateTimePicker
              value={draftDate}
              mode="date"
              display="spinner"
              accentColor={colors.primary}
              onValueChange={(_event, selectedDate) => {
                setDraftDate(selectedDate);
              }}
            />
            <PrimaryButton
              label={t('common.ok')}
              onPress={() => {
                onChange(formatDateValue(draftDate));
                setShowPicker(false);
              }}
            />
            <PrimaryButton
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => setShowPicker(false)}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    calendarAffordance: {
      position: 'absolute',
      right: Spacing.three,
      bottom: 14,
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iosBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    iosSheet: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 28,
      borderRadius: AppDesign.radius.xl,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: Spacing.three,
      gap: Spacing.two,
      ...AppDesign.shadow,
    },
    iosTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
  });
}
