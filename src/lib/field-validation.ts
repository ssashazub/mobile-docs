import type { TextInputProps } from 'react-native';

import type { FieldInputKind, FieldValidationError, FieldValidationMessageKey } from '@/types/field-validation';
import type { PdfFormField } from '@/types/document';
import type { TemplateField } from '@/types/template';

const DATE_KEY_PATTERN =
  /(?:^|_)(date|datum|дата|termin|deadline|birthday|birth)(?:$|_)/i;
const DATE_LABEL_PATTERN =
  /\b(date|datum|дата|день|termin|deadline|birthday|birth|рождения|рождення)\b/i;

const NUMBER_KEY_PATTERN =
  /(?:^|_)(amount|total|tax|sum|price|qty|quantity|count|percent|rate|suma|сума|пдв|totalamount|subtotal)(?:$|_)/i;
const NUMBER_LABEL_PATTERN =
  /\b(amount|total|tax|sum|price|qty|quantity|percent|rate|сума|пдв|сумма|стоимость|кількість|количество)\b/i;

const EMAIL_KEY_PATTERN = /(?:^|_)(email|e-mail|mail|пошта|почта)(?:$|_)/i;
const EMAIL_LABEL_PATTERN = /\b(email|e-mail|mail|пошта|почта)\b/i;

const PHONE_KEY_PATTERN = /(?:^|_)(phone|tel|mobile|telefon|телефон|тел)(?:$|_)/i;
const PHONE_LABEL_PATTERN = /\b(phone|tel|mobile|telefon|телефон|тел\.?)\b/i;

const DATE_DOT_FORMAT = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const DATE_INPUT_MAX_DIGITS = 8;

type ValidatableField = {
  key: string;
  label: string;
  kind?: FieldInputKind;
  required?: boolean;
  multiline?: boolean;
};

export function inferFieldKind(key: string, label: string): FieldInputKind {
  const normalizedKey = key.replace(/[^a-z0-9а-яіїєґё_]/gi, '');

  if (DATE_KEY_PATTERN.test(normalizedKey) || DATE_LABEL_PATTERN.test(label)) {
    return 'date';
  }

  if (NUMBER_KEY_PATTERN.test(normalizedKey) || NUMBER_LABEL_PATTERN.test(label)) {
    return 'number';
  }

  if (EMAIL_KEY_PATTERN.test(normalizedKey) || EMAIL_LABEL_PATTERN.test(label)) {
    return 'email';
  }

  if (PHONE_KEY_PATTERN.test(normalizedKey) || PHONE_LABEL_PATTERN.test(label)) {
    return 'phone';
  }

  return 'text';
}

export function resolveFieldKind(field: ValidatableField): FieldInputKind {
  if (field.kind && field.kind !== 'text') {
    return field.kind;
  }

  if (field.kind === 'text') {
    return 'text';
  }

  return inferFieldKind(field.key, field.label);
}

function parseDateParts(value: string): { year: number; month: number; day: number } | null {
  const match = value.trim().match(DATE_DOT_FORMAT);
  if (!match) {
    return null;
  }

  return {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  };
}

export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, DATE_INPUT_MAX_DIGITS);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

export function formatDateValue(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}.${month}.${year}`;
}

export function parseDateValue(value: string): Date | null {
  const parts = parseDateParts(value.trim());
  if (!parts) {
    return null;
  }

  const date = new Date(parts.year, parts.month - 1, parts.day);
  if (
    date.getFullYear() !== parts.year ||
    date.getMonth() !== parts.month - 1 ||
    date.getDate() !== parts.day
  ) {
    return null;
  }

  return date;
}

export function isValidDateValue(value: string): boolean {
  return parseDateValue(value) !== null;
}

export function isValidNumberValue(value: string): boolean {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) {
    return false;
  }

  return /^-?\d+(\.\d+)?$/.test(normalized) && Number.isFinite(Number(normalized));
}

export function isValidEmailValue(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhoneValue(value: string): boolean {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');

  return digits.length >= 7 && /^[\d\s+\-().]+$/.test(trimmed);
}

export function isValidFieldValue(kind: FieldInputKind, value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  switch (kind) {
    case 'date':
      return isValidDateValue(trimmed);
    case 'number':
      return isValidNumberValue(trimmed);
    case 'email':
      return isValidEmailValue(trimmed);
    case 'phone':
      return isValidPhoneValue(trimmed);
    default:
      return true;
  }
}

function invalidMessageKeyForKind(kind: FieldInputKind): FieldValidationMessageKey {
  switch (kind) {
    case 'date':
      return 'invalidDate';
    case 'number':
      return 'invalidNumber';
    case 'email':
      return 'invalidEmail';
    case 'phone':
      return 'invalidPhone';
    default:
      return 'invalidDate';
  }
}

export function validateField(
  field: ValidatableField,
  value: string
): FieldValidationError | null {
  const trimmed = value.trim();
  const kind = resolveFieldKind(field);

  if (field.required && !trimmed) {
    return {
      key: field.key,
      label: field.label,
      messageKey: 'required',
    };
  }

  if (trimmed && !isValidFieldValue(kind, trimmed)) {
    return {
      key: field.key,
      label: field.label,
      messageKey: invalidMessageKeyForKind(kind),
    };
  }

  return null;
}

export function validateFields(
  fields: ValidatableField[],
  values: Record<string, string>
): FieldValidationError | null {
  for (const field of fields) {
    const error = validateField(field, values[field.key] ?? '');
    if (error) {
      return error;
    }
  }

  return null;
}

export function validateTemplateFields(
  fields: TemplateField[],
  values: Record<string, string>
): FieldValidationError | null {
  return validateFields(
    fields.map((field) => ({
      key: field.key,
      label: field.label,
      kind: field.kind,
      required: field.required,
      multiline: field.multiline,
    })),
    values
  );
}

export function validatePdfFormFields(
  formFields: PdfFormField[],
  values: Record<string, string>
): FieldValidationError | null {
  for (const field of formFields) {
    if (field.type !== 'text' && field.type !== 'other') {
      continue;
    }

    const kind = field.inputKind ?? inferFieldKind(field.name, field.label);
    const error = validateField(
      {
        key: field.name,
        label: field.label,
        kind,
      },
      values[field.name] ?? ''
    );

    if (error) {
      return error;
    }
  }

  return null;
}

export function sanitizeFieldInput(kind: FieldInputKind, value: string): string {
  switch (kind) {
    case 'date':
      return formatDateInput(value);
    case 'number':
      return value.replace(/[^\d\s,.-]/g, '');
    case 'phone':
      return value.replace(/[^\d\s+\-().]/g, '');
    default:
      return value;
  }
}

export function getInputPropsForKind(
  kind: FieldInputKind,
  multiline?: boolean
): Partial<TextInputProps> {
  if (multiline) {
    return {
      keyboardType: 'default',
      autoCapitalize: 'sentences',
      autoCorrect: true,
    };
  }

  switch (kind) {
    case 'date':
      return {
        keyboardType: 'number-pad',
        autoCapitalize: 'none',
        autoCorrect: false,
        placeholder: '07.06.2026',
        maxLength: 10,
      };
    case 'number':
      return {
        keyboardType: 'decimal-pad',
        autoCapitalize: 'none',
        autoCorrect: false,
      };
    case 'email':
      return {
        keyboardType: 'email-address',
        autoCapitalize: 'none',
        autoCorrect: false,
        autoComplete: 'email',
        textContentType: 'emailAddress',
      };
    case 'phone':
      return {
        keyboardType: 'phone-pad',
        autoCapitalize: 'none',
        autoCorrect: false,
        autoComplete: 'tel',
        textContentType: 'telephoneNumber',
      };
    default:
      return {
        keyboardType: 'default',
        autoCapitalize: 'sentences',
        autoCorrect: true,
      };
  }
}

export function inferPdfFormFieldInputKind(name: string, label: string): FieldInputKind {
  return inferFieldKind(name, label);
}
