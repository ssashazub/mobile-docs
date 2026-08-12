import { createFieldName } from '@/lib/pdf-overlay-state';
import { inferPdfFormFieldInputKind } from '@/lib/field-validation';
import { looksLikeNumericValue, looksLikeRowCode, capOverlayFontSize } from '@/lib/overlay-text-format';
import { normalizeOverlayFontId } from '@/constants/overlay-fonts';
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
    const sample = item.value?.trim() || matched?.sourceText || '';
    const amountLike = looksLikeNumericValue(sample);
    // Only short row-code-shaped numbers were the real false-positive case
    // (sharing a font id with bold headers). Genuine amounts — e.g. bold
    // total/subtotal rows — should keep the font's real detected weight.
    const rowCodeLike = amountLike && looksLikeRowCode(sample);
    const bold = rowCodeLike ? false : item.bold === true;

    return {
      name,
      label,
      type: matched?.type ?? 'text',
      value: previousValues[name] ?? matched?.value ?? item.value ?? '',
      inputKind:
        matched?.inputKind ??
        (amountLike ? 'number' : inferPdfFormFieldInputKind(name, label)),
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
      bold,
      align: item.align ?? matched?.align ?? (amountLike ? 'right' : undefined),
      fontFamily: normalizeOverlayFontId(
        item.fontFamily ?? matched?.fontFamily ?? (amountLike ? 'arial' : 'times')
      ),
    };
  }).map((field) => {
    if (!field.rect || field.fontSize == null) {
      return field;
    }
    const capped = capOverlayFontSize(field.fontSize, field.rect.height);
    return capped === field.fontSize ? field : { ...field, fontSize: capped };
  });
}
