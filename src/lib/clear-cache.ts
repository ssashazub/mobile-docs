import * as FileSystem from 'expo-file-system/legacy';

export async function clearAppCache(): Promise<number> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    return 0;
  }

  const entries = await FileSystem.readDirectoryAsync(cacheDir);
  await Promise.all(
    entries.map((name) =>
      FileSystem.deleteAsync(`${cacheDir}${name}`, { idempotent: true })
    )
  );

  return entries.length;
}
