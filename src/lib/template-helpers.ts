import { DEFAULT_TEMPLATE_ICON } from '@/constants/template-icons';
import { TEMPLATE_COLOR_PRESETS } from '@/constants/template-colors';
import { normalizeTemplateIcon, resolveIconPdfText } from '@/lib/template-icon';
import { BUILTIN_PDF_STYLES, DEFAULT_PDF_STYLE } from '@/constants/pdf-layouts';
import { getTranslations } from '@/i18n';
import { getAppLocale } from '@/i18n';
import type { DocumentTemplate, PdfStyle, TemplateField } from '@/types/template';

export function normalizePdfStyle(
  pdfStyle: Partial<PdfStyle> | undefined,
  templateId?: string
): PdfStyle {
  const builtin = templateId ? BUILTIN_PDF_STYLES[templateId] : undefined;

  return {
    layout: pdfStyle?.layout ?? builtin?.layout ?? DEFAULT_PDF_STYLE.layout,
    showFooter: pdfStyle?.showFooter ?? builtin?.showFooter ?? DEFAULT_PDF_STYLE.showFooter,
    showDate: pdfStyle?.showDate ?? builtin?.showDate ?? DEFAULT_PDF_STYLE.showDate,
    design: pdfStyle?.design,
    savedStyleId: pdfStyle?.savedStyleId,
    savedStyleName: pdfStyle?.savedStyleName,
  };
}

export function normalizeTemplate(template: DocumentTemplate): DocumentTemplate {
  const icon = normalizeTemplateIcon(template);

  return {
    ...template,
    icon,
    emoji: resolveIconPdfText(icon),
    kind: template.kind ?? 'html',
    pdfStyle: normalizePdfStyle(template.pdfStyle, template.id),
    fields: template.fields.map((field) => ({ ...field })),
  };
}

export function createFieldKey(label: string, existingKeys: string[]): string {
  const transliterated = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґё\s_-]/gi, '')
    .replace(/\s+/g, '_')
    .slice(0, 32);

  const base = transliterated || `field_${Date.now()}`;
  let key = base;
  let index = 1;

  while (existingKeys.includes(key)) {
    key = `${base}_${index}`;
    index += 1;
  }

  return key;
}

export function createEmptyField(existingKeys: string[]): TemplateField {
  const strings = getTranslations(getAppLocale());
  const label = strings.common.newField;

  return {
    key: createFieldKey(label, existingKeys),
    label,
    placeholder: strings.templates.placeholderHint,
    multiline: false,
    required: false,
  };
}

export function cloneTemplateFields(fields: TemplateField[]): TemplateField[] {
  return fields.map((field) => ({ ...field }));
}

export function getColorPresetIndex(accentColor: string): number {
  const presetIndex = TEMPLATE_COLOR_PRESETS.findIndex((preset) => preset.accentColor === accentColor);
  return presetIndex >= 0 ? presetIndex : 4;
}

export function createBlankTemplate() {
  const strings = getTranslations(getAppLocale());

  const fields: TemplateField[] = [
    {
      key: 'title',
      label: strings.templates.templateName,
      placeholder: strings.templates.enterTemplateName,
      required: true,
    },
    {
      key: 'client',
      label: strings.home.client,
      placeholder: strings.home.client,
      required: true,
    },
    {
      key: createFieldKey('description', ['title', 'client']),
      label: strings.templates.fieldsTitle,
      placeholder: strings.templates.placeholderHint,
      multiline: true,
    },
  ];

  return {
    title: strings.templates.newTemplate,
    icon: DEFAULT_TEMPLATE_ICON,
    accentColor: '#4f46e5',
    gradientEnd: '#6366f1',
    pdfStyle: { ...DEFAULT_PDF_STYLE },
    fields,
  };
}
