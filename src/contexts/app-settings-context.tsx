import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getAppSettings, updateAppSettings } from '@/lib/app-settings-storage';
import { DEFAULT_APP_SETTINGS, type AppSettings } from '@/types/app-settings';

type AppSettingsContextValue = {
  settings: AppSettings;
  isHydrated: boolean;
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  refreshSettings: () => Promise<void>;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);

  const refreshSettings = useCallback(async () => {
    const next = await getAppSettings();
    setSettings(next);
  }, []);

  useEffect(() => {
    let isActive = true;

    getAppSettings().then((stored) => {
      if (!isActive) {
        return;
      }

      setSettings(stored);
      setIsHydrated(true);
    });

    return () => {
      isActive = false;
    };
  }, []);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await updateAppSettings(patch);
    setSettings(next);
    return next;
  }, []);

  const value = useMemo(
    () => ({
      settings,
      isHydrated,
      updateSettings,
      refreshSettings,
    }),
    [settings, isHydrated, updateSettings, refreshSettings]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);

  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }

  return context;
}
