import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDefaultTemplates } from '@/constants/default-templates';
import { getAppLocale } from '@/i18n';
import { TEMPLATES_STORAGE_KEY } from '@/constants/storage';
import { normalizeTemplate } from '@/lib/template-helpers';
import type { DocumentTemplate } from '@/types/template';

function cloneTemplate(template: DocumentTemplate): DocumentTemplate {
  return normalizeTemplate(template);
}

export async function ensureTemplatesSeeded(): Promise<void> {
  const raw = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);

  if (!raw) {
    await AsyncStorage.setItem(
      TEMPLATES_STORAGE_KEY,
      JSON.stringify(getDefaultTemplates(getAppLocale()).map(cloneTemplate))
    );
  }
}

export async function getTemplates(): Promise<DocumentTemplate[]> {
  const raw = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);
  const defaultTemplates = getDefaultTemplates(getAppLocale()).map(cloneTemplate);

  if (!raw) {
    return defaultTemplates;
  }

  const savedTemplates = (JSON.parse(raw) as DocumentTemplate[]).map(cloneTemplate);
  const customTemplates = savedTemplates.filter((template) => !template.isBuiltIn);

  return [...defaultTemplates, ...customTemplates];
}

export async function getTemplateById(templateId: string): Promise<DocumentTemplate | null> {
  const templates = await getTemplates();
  return templates.find((template) => template.id === templateId) ?? null;
}

export async function saveTemplate(template: DocumentTemplate): Promise<void> {
  const templates = await getTemplates();
  const index = templates.findIndex((item) => item.id === template.id);
  const now = new Date().toISOString();
  const nextTemplate = {
    ...template,
    createdAt: template.createdAt ?? now,
    updatedAt: now,
  };

  if (index === -1) {
    await AsyncStorage.setItem(
      TEMPLATES_STORAGE_KEY,
      JSON.stringify([...templates, nextTemplate])
    );
    return;
  }

  const updated = [...templates];
  updated[index] = nextTemplate;
  await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
}

export async function deleteTemplate(templateId: string): Promise<boolean> {
  const templates = await getTemplates();
  const template = templates.find((item) => item.id === templateId);

  if (!template || template.isBuiltIn) {
    return false;
  }

  const updated = templates.filter((item) => item.id !== templateId);
  await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
  return true;
}

export async function resetTemplateToDefault(templateId: string): Promise<DocumentTemplate | null> {
  const defaultTemplate = getDefaultTemplates(getAppLocale()).find((item) => item.id === templateId);

  if (!defaultTemplate) {
    return null;
  }

  const restored = cloneTemplate({
    ...defaultTemplate,
    updatedAt: new Date().toISOString(),
  });

  await saveTemplate(restored);
  return restored;
}

export function getNextCustomTemplateId(): string {
  return `custom_${Date.now()}`;
}
