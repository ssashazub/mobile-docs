import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ValidatedFormField } from '@/components/validated-form-field';
import { ThemedText } from '@/components/themed-text';
import { AppDesign } from '@/constants/app-design';
import { Spacing } from '@/constants/theme';
import { isCheckboxChecked } from '@/lib/pdf-form';
import type { PdfFormField } from '@/types/document';

type PdfFormFieldInputProps = {
  field: PdfFormField;
  value: string;
  onChange: (value: string) => void;
};

function OptionPicker({
  label,
  options,
  value,
  onChange,
  mode,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  mode: 'radio' | 'dropdown';
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = value === option;

          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={[styles.optionMarker, mode === 'radio' ? styles.radio : styles.dropdown]}>
                {selected ? <View style={styles.optionMarkerFill} /> : null}
              </View>
              <ThemedText style={styles.optionText}>{option}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function PdfFormFieldInput({ field, value, onChange }: PdfFormFieldInputProps) {
  if (field.type === 'checkbox') {
    return (
      <View style={styles.field}>
        <View style={styles.checkboxRow}>
          <ThemedText type="smallBold" style={styles.checkboxLabel}>
            {field.label}
          </ThemedText>
          <Switch
            value={isCheckboxChecked(value)}
            onValueChange={(checked) => onChange(checked ? 'true' : 'false')}
            trackColor={{ false: '#cbd5e1', true: '#99f6e4' }}
            thumbColor={isCheckboxChecked(value) ? '#0f766e' : '#f8fafc'}
          />
        </View>
      </View>
    );
  }

  if (field.type === 'radio' && field.options && field.options.length > 0) {
    return (
      <OptionPicker
        label={field.label}
        options={field.options}
        value={value}
        onChange={onChange}
        mode="radio"
      />
    );
  }

  if (field.type === 'dropdown' && field.options && field.options.length > 0) {
    return (
      <OptionPicker
        label={field.label}
        options={field.options}
        value={value}
        onChange={onChange}
        mode="dropdown"
      />
    );
  }

  return (
    <ValidatedFormField
      fieldKey={field.name}
      kind={field.inputKind}
      label={field.label}
      value={value}
      onChangeText={onChange}
      multiline={field.type === 'text' && value.length > 80}
      numberOfLines={field.type === 'text' && value.length > 80 ? 4 : 1}
      textAlignVertical={field.type === 'text' && value.length > 80 ? 'top' : 'center'}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  label: {
    marginLeft: Spacing.one,
    color: AppDesign.textSecondary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppDesign.surface,
    borderWidth: 1.5,
    borderColor: AppDesign.border,
    borderRadius: AppDesign.radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  checkboxLabel: {
    flex: 1,
    color: AppDesign.text,
    paddingRight: Spacing.two,
  },
  options: {
    gap: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: AppDesign.surface,
    borderWidth: 1.5,
    borderColor: AppDesign.border,
    borderRadius: AppDesign.radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  optionSelected: {
    borderColor: '#0f766e',
    backgroundColor: '#f0fdfa',
  },
  optionPressed: {
    opacity: 0.92,
  },
  optionMarker: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    borderRadius: 10,
  },
  dropdown: {
    borderRadius: 4,
  },
  optionMarkerFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0f766e',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
});
