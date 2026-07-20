import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { setLocalePreferenceOverride } from '@/i18n';
import {
  getStoredLocalePreference,
  setStoredLocalePreference,
} from '@/lib/locale-preference-storage';
import type { LocalePreference } from '@/types/locale-preference';

type LocalePreferenceContextValue = {
  preference: LocalePreference;
  setPreference: (preference: LocalePreference) => void;
  isHydrated: boolean;
};

const LocalePreferenceContext = createContext<LocalePreferenceContextValue | null>(null);

export function LocalePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LocalePreference>('system');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    getStoredLocalePreference().then((stored) => {
      if (!isActive) {
        return;
      }

      if (stored) {
        setPreferenceState(stored);
        setLocalePreferenceOverride(stored);
      }

      setIsHydrated(true);
    });

    return () => {
      isActive = false;
    };
  }, []);

  const setPreference = useCallback((next: LocalePreference) => {
    setPreferenceState(next);
    setLocalePreferenceOverride(next);
    void setStoredLocalePreference(next);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      isHydrated,
    }),
    [preference, setPreference, isHydrated]
  );

  return (
    <LocalePreferenceContext.Provider value={value}>{children}</LocalePreferenceContext.Provider>
  );
}

export function useLocalePreference() {
  const context = useContext(LocalePreferenceContext);

  if (!context) {
    throw new Error('useLocalePreference must be used within LocalePreferenceProvider');
  }

  return context;
}
