import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDefaultTemplates } from '@/constants/default-templates';
import { getAppLocale } from '@/i18n';
import { TEMPLATES_STORAGE_KEY } from '@/constants/storage';
import { normalizeTemplate } from '@/lib/template-helpers';
import type { DocumentTemplate } from '@/types/template';

function cloneTemplate(template: DocumentTemplate): DocumentTemplate {
  return normalizeTemplate(template);
}

async function readSavedTemplates(): Promise<DocumentTemplate[]> {
  const raw = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  return (JSON.parse(raw) as DocumentTemplate[]).map(cloneTemplate);
}

async function writeSavedTemplates(templates: DocumentTemplate[]): Promise<void> {
  await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

export async function ensureTemplatesSeeded(): Promise<void> {
  const raw = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);

  if (!raw) {
    await writeSavedTemplates([]);
  }
}

export async function getTemplates(): Promise<DocumentTemplate[]> {
  const defaultTemplates = getDefaultTemplates(getAppLocale()).map(cloneTemplate);
  const savedTemplates = await readSavedTemplates();
  const savedById = new Map(savedTemplates.map((template) => [template.id, template]));

  const builtinTemplates = defaultTemplates.map((defaultTemplate) => {
    const saved = savedById.get(defaultTemplate.id);
    if (!saved) {
      return defaultTemplate;
    }

    return cloneTemplate({
      ...saved,
      isBuiltIn: true,
    });
  });

  const customTemplates = savedTemplates.filter((template) => !template.isBuiltIn);

  return [...builtinTemplates, ...customTemplates];
}

export async function getTemplateById(templateId: string): Promise<DocumentTemplate | null> {
  const templates = await getTemplates();
  return templates.find((template) => template.id === templateId) ?? null;
}

export async function saveTemplate(template: DocumentTemplate): Promise<void> {
  const savedTemplates = await readSavedTemplates();
  const now = new Date().toISOString();
  const nextTemplate = cloneTemplate({
    ...template,
    createdAt: template.createdAt ?? now,
    updatedAt: now,
  });

  const index = savedTemplates.findIndex((item) => item.id === template.id);
  const updated =
    index === -1
      ? [...savedTemplates, nextTemplate]
      : savedTemplates.map((item, itemIndex) =>
          itemIndex === index ? nextTemplate : item
        );

  await writeSavedTemplates(updated);
}

export async function deleteTemplate(templateId: string): Promise<boolean> {
  const savedTemplates = await readSavedTemplates();
  const template = savedTemplates.find((item) => item.id === templateId);

  if (!template || template.isBuiltIn) {
    return false;
  }

  await writeSavedTemplates(savedTemplates.filter((item) => item.id !== templateId));
  return true;
}

export async function resetTemplateToDefault(templateId: string): Promise<DocumentTemplate | null> {
  const defaultTemplate = getDefaultTemplates(getAppLocale()).find((item) => item.id === templateId);

  if (!defaultTemplate) {
    return null;
  }

  const savedTemplates = await readSavedTemplates();
  await writeSavedTemplates(savedTemplates.filter((item) => item.id !== templateId));

  return cloneTemplate({
    ...defaultTemplate,
    updatedAt: new Date().toISOString(),
  });
}

export function getNextCustomTemplateId(): string {
  return `custom_${Date.now()}`;
}
