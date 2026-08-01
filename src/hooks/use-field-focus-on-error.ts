import { useCallback, useRef, useState } from 'react';
import { type FlatList, type ScrollView } from 'react-native';

import type { FieldValidationError } from '@/types/field-validation';

type ListLike = Pick<FlatList<unknown>, 'scrollToIndex' | 'scrollToOffset' | 'scrollToEnd'>;

export function useFieldFocusOnError() {
  /** Prefer FlatList for long forms; ScrollView kept for shorter template editors. */
  const listRef = useRef<ListLike | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const formOffsetY = useRef(0);
  const fieldOffsets = useRef<Record<string, number>>({});
  const indexByKeyRef = useRef<Record<string, number>>({});
  const [errorFieldKey, setErrorFieldKey] = useState<string | null>(null);
  const [shakeToken, setShakeToken] = useState(0);

  const setFormLayoutY = useCallback((y: number) => {
    formOffsetY.current = y;
  }, []);

  const setFieldLayoutY = useCallback((key: string, y: number) => {
    fieldOffsets.current[key] = y;
  }, []);

  const setFieldIndexes = useCallback((entries: Array<{ key: string; index: number }>) => {
    const next: Record<string, number> = {};
    for (const entry of entries) {
      next[entry.key] = entry.index;
    }
    indexByKeyRef.current = next;
  }, []);

  const clearFieldError = useCallback((key: string) => {
    setErrorFieldKey((current) => (current === key ? null : current));
  }, []);

  const focusInvalidField = useCallback((error: FieldValidationError) => {
    setErrorFieldKey(error.key);
    setShakeToken((token) => token + 1);

    const index = indexByKeyRef.current[error.key];
    if (typeof index === 'number' && listRef.current) {
      requestAnimationFrame(() => {
        try {
          listRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.15,
          });
        } catch {
          listRef.current?.scrollToOffset({
            offset: Math.max(0, index * 72),
            animated: true,
          });
        }
      });
      return;
    }

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
    listRef,
    scrollRef,
    errorFieldKey,
    shakeToken,
    setFormLayoutY,
    setFieldLayoutY,
    setFieldIndexes,
    clearFieldError,
    focusInvalidField,
  };
}
