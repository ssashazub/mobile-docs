import { useCallback, useRef, useState } from 'react';
import { type ScrollView, type View } from 'react-native';

import type { FieldValidationError } from '@/types/field-validation';

export function useFieldFocusOnError() {
  const scrollRef = useRef<ScrollView>(null);
  const formOffsetY = useRef(0);
  const fieldOffsets = useRef<Record<string, number>>({});
  const [errorFieldKey, setErrorFieldKey] = useState<string | null>(null);
  const [shakeToken, setShakeToken] = useState(0);

  const setFormLayoutY = useCallback((y: number) => {
    formOffsetY.current = y;
  }, []);

  const setFieldLayoutY = useCallback((key: string, y: number) => {
    fieldOffsets.current[key] = y;
  }, []);

  const clearFieldError = useCallback((key: string) => {
    setErrorFieldKey((current) => (current === key ? null : current));
  }, []);

  const focusInvalidField = useCallback((error: FieldValidationError) => {
    setErrorFieldKey(error.key);
    setShakeToken((token) => token + 1);

    const fieldY = fieldOffsets.current[error.key];
    if (typeof fieldY !== 'number') {
      return;
    }

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, formOffsetY.current + fieldY - 24),
        animated: true,
      });
    });
  }, []);

  return {
    scrollRef,
    errorFieldKey,
    shakeToken,
    setFormLayoutY,
    setFieldLayoutY,
    clearFieldError,
    focusInvalidField,
  };
}
