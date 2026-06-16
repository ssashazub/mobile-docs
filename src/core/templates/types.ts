import type { AppLocale } from '@/i18n/types';
import type { FieldInputKind } from '@/types/field-validation';

export type LocalizedFieldText = {
  label: string;
  placeholder?: string;
};

export type TemplateFieldDefinition = {
  key: string;
  locales: Record<AppLocale, LocalizedFieldText>;
  required?: boolean;
  multiline?: boolean;
  kind?: FieldInputKind;
};

export type BuiltinTemplateDefinition = {
  id: string;
  emoji: string;
  accentColor: string;
  gradientEnd: string;
  locales: Record<AppLocale, { title: string }>;
  fields: TemplateFieldDefinition[];
};
