import { FormField } from '@/components/ui/form-field';
import {
  getInputPropsForKind,
  resolveFieldKind,
  sanitizeFieldInput,
} from '@/lib/field-validation';
import type { FieldInputKind } from '@/types/field-validation';
import type { TextInputProps } from 'react-native';

type ValidatedFormFieldProps = Omit<TextInputProps, 'onChangeText'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  fieldKey: string;
  kind?: FieldInputKind;
  required?: boolean;
  error?: boolean;
  shakeToken?: number;
};

export function ValidatedFormField({
  label,
  value,
  onChangeText,
  fieldKey,
  kind,
  required,
  error,
  shakeToken,
  multiline,
  placeholder,
  style,
  ...rest
}: ValidatedFormFieldProps) {
  const resolvedKind = resolveFieldKind({
    key: fieldKey,
    label,
    kind,
    multiline,
  });
  const kindProps = getInputPropsForKind(resolvedKind, multiline);

  return (
    <FormField
      label={label}
      value={value}
      required={required}
      error={error}
      shakeToken={shakeToken}
      onChangeText={(text) => onChangeText(sanitizeFieldInput(resolvedKind, text))}
      placeholder={placeholder ?? kindProps.placeholder}
      multiline={multiline}
      style={style}
      {...kindProps}
      {...rest}
    />
  );
}
