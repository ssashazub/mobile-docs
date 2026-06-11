export type FieldInputKind = 'text' | 'date' | 'number' | 'email' | 'phone';

export type FieldValidationMessageKey =
  | 'required'
  | 'invalidDate'
  | 'invalidNumber'
  | 'invalidEmail'
  | 'invalidPhone';

export type FieldValidationError = {
  key: string;
  label: string;
  messageKey: FieldValidationMessageKey;
};
