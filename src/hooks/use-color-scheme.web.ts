import { useEffect, useState } from 'react';

import { useResolvedColorScheme } from '@/contexts/theme-preference-context';

export function useColorScheme(): 'light' | 'dark' {
  const scheme = useResolvedColorScheme();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Avoid SSR/first-paint mismatch on web.
  if (!hasHydrated) {
    return 'light';
  }

  return scheme;
}
