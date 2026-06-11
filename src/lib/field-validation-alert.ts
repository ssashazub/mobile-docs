import type { FieldValidationError } from '@/types/field-validation';
import type { t } from '@/i18n';

type TranslationKey = Parameters<typeof t>[0];

export function getFieldValidationAlert(
  error: FieldValidationError,
  translate: (key: TranslationKey, params?: Record<string, string>) => string
): {
  title: string;
  message: string;
} {
  const params = { label: error.label };

  switch (error.messageKey) {
    case 'required':
      return {
        title: translate('create.fillRequired'),
        message: translate('create.validationRequiredField', params),
      };
    case 'invalidDate':
      return {
        title: translate('create.validationTitle'),
        message: translate('create.validationInvalidDate', params),
      };
    case 'invalidNumber':
      return {
        title: translate('create.validationTitle'),
        message: translate('create.validationInvalidNumber', params),
      };
    case 'invalidEmail':
      return {
        title: translate('create.validationTitle'),
        message: translate('create.validationInvalidEmail', params),
      };
    case 'invalidPhone':
      return {
        title: translate('create.validationTitle'),
        message: translate('create.validationInvalidPhone', params),
      };
    default:
      return {
        title: translate('create.validationTitle'),
        message: translate('create.validationRequiredField', params),
      };
  }
}
