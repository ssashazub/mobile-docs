import AsyncStorage from '@react-native-async-storage/async-storage';

import { APP_SETTINGS_STORAGE_KEY } from '@/constants/storage';
import {
  DEFAULT_APP_SETTINGS,
  FILE_NAME_FORMATS,
  type AppSettings,
  type ExportFileNameFormat,
  type ExportFolderMode,
} from '@/types/app-settings';

function isFileNameFormat(value: unknown): value is ExportFileNameFormat {
  return typeof value === 'string' && (FILE_NAME_FORMATS as string[]).includes(value);
}

function isFolderMode(value: unknown): value is ExportFolderMode {
  return value === 'app' || value === 'custom';
}

function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    exportFolderMode: isFolderMode(raw?.exportFolderMode)
      ? raw.exportFolderMode
      : DEFAULT_APP_SETTINGS.exportFolderMode,
    customExportFolderUri:
      typeof raw?.customExportFolderUri === 'string' ? raw.customExportFolderUri : null,
    customExportFolderLabel:
      typeof raw?.customExportFolderLabel === 'string' ? raw.customExportFolderLabel : null,
    fileNameFormat: isFileNameFormat(raw?.fileNameFormat)
      ? raw.fileNameFormat
      : DEFAULT_APP_SETTINGS.fileNameFormat,
    hapticsEnabled:
      typeof raw?.hapticsEnabled === 'boolean'
        ? raw.hapticsEnabled
        : DEFAULT_APP_SETTINGS.hapticsEnabled,
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY);

  if (!raw) {
    return { ...DEFAULT_APP_SETTINGS };
  }

  try {
    return normalizeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
}

export async function updateAppSettings(
  patch: Partial<AppSettings>
): Promise<AppSettings> {
  const current = await getAppSettings();
  const next = normalizeSettings({ ...current, ...patch });
  await saveAppSettings(next);
  return next;
}
