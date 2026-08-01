import { createFieldName } from '@/lib/pdf-overlay-state';
import { inferPdfFormFieldInputKind } from '@/lib/field-validation';
import type { DetectedPdfField } from '@/lib/pdfjs-rasterizer-html';
import type { PdfFormField } from '@/types/document';

function rectKey(field: Pick<DetectedPdfField, 'pageIndex' | 'x' | 'y' | 'width' | 'height'>): string {
  return [
    field.pageIndex,
    Math.round(field.x),
    Math.round(field.y),
    Math.round(field.width),
    Math.round(field.height),
  ].join(':');
}

function rectsSimilar(
  a: NonNullable<PdfFormField['rect']>,
  b: DetectedPdfField,
  tolerance = 6
): boolean {
  return (
    a.pageIndex === b.pageIndex &&
    Math.abs(a.x - b.x) <= tolerance &&
    Math.abs(a.y - b.y) <= tolerance &&
    Math.abs(a.width - b.width) <= tolerance &&
    Math.abs(a.height - b.height) <= tolerance
  );
}

export function detectedFieldsToFormFields(
  detected: DetectedPdfField[],
  previous: PdfFormField[] = [],
  previousValues: Record<string, string> = {}
): PdfFormField[] {
  const names = previous
    .filter((field) => field.origin === 'acroform' || field.origin === 'custom')
    .map((field) => field.name);
  const previousDetected = previous.filter((field) => field.origin === 'detected' && field.rect);

  return detected.map((item, index) => {
    const matched = previousDetected.find((field) => field.rect && rectsSimilar(field.rect, item));
    const label = item.label.trim() || matched?.label || `Field ${index + 1}`;
    const name = matched?.name ?? createFieldName(label || `field_${rectKey(item)}`, names);
    names.push(name);

    return {
      name,
      label,
      type: matched?.type ?? 'text',
      value: previousValues[name] ?? matched?.value ?? item.value ?? '',
      inputKind: matched?.inputKind ?? inferPdfFormFieldInputKind(name, label),
      rect: {
        pageIndex: item.pageIndex,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      },
      origin: 'detected' as const,
      sourceText: item.value?.trim() ? item.value : matched?.sourceText,
      fontSize: item.fontSize ?? matched?.fontSize,
      // Prefer freshly detected bold; keep previous if the new pass omitted it.
      bold: item.bold === true || matched?.bold === true,
      align: item.align ?? matched?.align,
    };
  }).map((field) => {
    if (!field.rect || field.fontSize == null) {
      return field;
    }
    const capped = Math.min(field.fontSize, Math.max(5, field.rect.height * 0.62));
    return capped === field.fontSize ? field : { ...field, fontSize: capped };
  });
}
