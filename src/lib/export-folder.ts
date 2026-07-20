import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { getAppSettings } from '@/lib/app-settings-storage';
import type { AppSettings } from '@/types/app-settings';

const APP_EXPORTS_DIR = `${FileSystem.documentDirectory}exports/`;

export function getAppExportsDirectory(): string {
  return APP_EXPORTS_DIR;
}

export async function ensureAppExportsDirectory(): Promise<string> {
  const info = await FileSystem.getInfoAsync(APP_EXPORTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(APP_EXPORTS_DIR, { intermediates: true });
  }
  return APP_EXPORTS_DIR;
}

export function folderLabelFromUri(uri: string): string {
  try {
    const decoded = decodeURIComponent(uri);
    const parts = decoded.split(/[/:]/).filter(Boolean);
    return parts[parts.length - 1] || uri;
  } catch {
    return uri;
  }
}

export async function pickCustomExportFolder(): Promise<{
  uri: string;
  label: string;
} | null> {
  if (Platform.OS === 'android') {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted || !permissions.directoryUri) {
      return null;
    }

    return {
      uri: permissions.directoryUri,
      label: folderLabelFromUri(permissions.directoryUri),
    };
  }

  try {
    const { Directory } = await import('expo-file-system');
    const directory = await Directory.pickDirectoryAsync();
    return {
      uri: directory.uri,
      label: directory.name || folderLabelFromUri(directory.uri),
    };
  } catch {
    return null;
  }
}

export async function writeExportPdfBytes(
  fileBaseName: string,
  base64: string,
  settings?: AppSettings
): Promise<string> {
  const resolved = settings ?? (await getAppSettings());
  const fileName = `${fileBaseName}.pdf`;

  if (resolved.exportFolderMode === 'custom' && resolved.customExportFolderUri) {
    if (Platform.OS === 'android' && resolved.customExportFolderUri.startsWith('content://')) {
      const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
        resolved.customExportFolderUri,
        fileBaseName,
        'application/pdf'
      );
      await FileSystem.StorageAccessFramework.writeAsStringAsync(safUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return safUri;
    }

    const destination = resolved.customExportFolderUri.endsWith('/')
      ? `${resolved.customExportFolderUri}${fileName}`
      : `${resolved.customExportFolderUri}/${fileName}`;
    await FileSystem.writeAsStringAsync(destination, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return destination;
  }

  const dir = await ensureAppExportsDirectory();
  const destination = `${dir}${fileName}`;
  await FileSystem.writeAsStringAsync(destination, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return destination;
}
