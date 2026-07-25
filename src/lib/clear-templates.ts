import AsyncStorage from '@react-native-async-storage/async-storage';

import { TEMPLATES_STORAGE_KEY } from '@/constants/storage';
import { getTemplates } from '@/lib/template-storage';

/** Removes custom templates and drops edits made to built-in ones. */
export async function clearAllTemplates(): Promise<number> {
  const templates = await getTemplates();
  const customCount = templates.filter((template) => !template.isBuiltIn).length;

  await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify([]));

  return customCount;
}
