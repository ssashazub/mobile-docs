import { useResolvedColorScheme } from '@/contexts/theme-preference-context';

export function useColorScheme(): 'light' | 'dark' {
  return useResolvedColorScheme();
}
