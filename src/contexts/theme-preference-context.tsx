import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import {
  getStoredThemePreference,
  setStoredThemePreference,
} from '@/lib/theme-preference-storage';
import type { ThemePreference } from '@/types/theme-preference';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  isHydrated: boolean;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | 'unspecified' | null | undefined
): 'light' | 'dark' {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }

  return preference;
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    getStoredThemePreference().then((stored) => {
      if (!isActive) {
        return;
      }

      if (stored) {
        setPreferenceState(stored);
      }

      setIsHydrated(true);
    });

    return () => {
      isActive = false;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void setStoredThemePreference(next);
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
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);

  if (!context) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }

  return context;
}

export function useResolvedColorScheme(): 'light' | 'dark' {
  const { preference, isHydrated } = useThemePreference();
  const systemScheme = useRNColorScheme();

  if (!isHydrated) {
    return 'light';
  }

  return resolveColorScheme(preference, systemScheme);
}
