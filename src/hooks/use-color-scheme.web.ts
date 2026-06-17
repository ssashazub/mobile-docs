import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { useThemePreference } from '@/contexts/theme-preference-context';

export function useColorScheme(): 'light' | 'dark' {
  const { preference, isHydrated } = useThemePreference();
  const [hasHydrated, setHasHydrated] = useState(false);
  const systemScheme = useRNColorScheme();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!isHydrated || !hasHydrated) {
    return 'light';
  }

  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }

  return preference;
}
