import type { Document, PdfFormField, PdfOverlayItem } from '@/types/document';
import type { FieldInputKind } from '@/types/field-validation';
import type { OverlayViewModel } from '@/components/pdf-overlay-item';
import type { PageLayout } from '@/components/pdf-page-canvas';
import { pdfRectToUi, uiRectToPdf, type UiRect } from '@/lib/pdf-coords';

export function createOverlayId(): string {
  return `ov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createFieldName(label: string, existing: string[]): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9а-яіїєґё\s_-]/gi, '')
      .replace(/\s+/g, '_')
      .slice(0, 32) || `field_${Date.now()}`;

  let key = base;
  let index = 1;
  while (existing.includes(key)) {
    key = `${base}_${index}`;
    index += 1;
  }
  return key;
}

export function buildOverlayViewModels(
  document: Pick<Document, 'formFields' | 'fields' | 'overlays'>,
  layout: PageLayout,
  placeholder: string
): OverlayViewModel[] {
  const items: OverlayViewModel[] = [];
  const fields = document.fields ?? {};

  for (const field of document.formFields ?? []) {
    if (!field.rect || field.rect.pageIndex !== layout.pageIndex) {
      continue;
    }

    items.push({
      id: `field:${field.name}`,
      label: field.label,
      text:
        field.type === 'checkbox'
          ? fields[field.name] === 'true' || fields[field.name] === '1'
            ? '✓'
            : ''
          : (fields[field.name] ?? field.value ?? ''),
      editable: field.type === 'text' || field.type === 'other',
      rect: pdfRectToUi(field.rect, layout.heightPt, layout.scale),
    });
  }

  for (const overlay of document.overlays ?? []) {
    if (overlay.pageIndex !== layout.pageIndex) {
      continue;
    }

    // Skip overlays that duplicate a field with geometry (shown above).
    if (overlay.fieldName) {
      const linked = document.formFields?.find((field) => field.name === overlay.fieldName);
      if (linked?.rect) {
        continue;
      }
    }

    items.push({
      id: overlay.id,
      text: overlay.fieldName ? (fields[overlay.fieldName] ?? overlay.text) : overlay.text || placeholder,
      editable: true,
      rect: pdfRectToUi(overlay, layout.heightPt, layout.scale),
    });
  }

  return items;
}

export function applyOverlayRectToDocument(
  document: Document,
  itemId: string,
  uiRect: UiRect,
  layout: PageLayout
): Document {
  const pdfRect = uiRectToPdf(uiRect, layout.pageIndex, layout.heightPt, layout.scale);

  if (itemId.startsWith('field:')) {
    const name = itemId.slice('field:'.length);
    return {
      ...document,
      formFields: (document.formFields ?? []).map((field) =>
        field.name === name ? { ...field, rect: pdfRect } : field
      ),
    };
  }

  return {
    ...document,
    overlays: (document.overlays ?? []).map((overlay) =>
      overlay.id === itemId
        ? {
            ...overlay,
            pageIndex: pdfRect.pageIndex,
            x: pdfRect.x,
            y: pdfRect.y,
            width: pdfRect.width,
            height: pdfRect.height,
          }
        : overlay
    ),
  };
}

export function applyOverlayTextToDocument(
  document: Document,
  itemId: string,
  text: string
): Document {
  if (itemId.startsWith('field:')) {
    const name = itemId.slice('field:'.length);
    return {
      ...document,
      fields: { ...document.fields, [name]: text },
      formFields: (document.formFields ?? []).map((field) =>
        field.name === name ? { ...field, value: text } : field
      ),
    };
  }

  const overlay = (document.overlays ?? []).find((item) => item.id === itemId);
  if (!overlay) {
    return document;
  }

  if (overlay.fieldName) {
    return {
      ...document,
      fields: { ...document.fields, [overlay.fieldName]: text },
      overlays: (document.overlays ?? []).map((item) =>
        item.id === itemId ? { ...item, text } : item
      ),
    };
  }

  return {
    ...document,
    overlays: (document.overlays ?? []).map((item) =>
      item.id === itemId ? { ...item, text } : item
    ),
  };
}

export function deleteOverlayFromDocument(document: Document, itemId: string): Document {
  if (itemId.startsWith('field:')) {
    const name = itemId.slice('field:'.length);
    const { [name]: _removed, ...restFields } = document.fields;
    return {
      ...document,
      fields: restFields,
      formFields: (document.formFields ?? []).filter((field) => field.name !== name),
      overlays: (document.overlays ?? []).filter((overlay) => overlay.fieldName !== name),
    };
  }

  return {
    ...document,
    overlays: (document.overlays ?? []).filter((overlay) => overlay.id !== itemId),
  };
}

export function addFreeOverlay(
  document: Document,
  pageIndex: number,
  xUi: number,
  yUi: number,
  layout: PageLayout,
  placeholder: string
): Document {
  const defaultWidth = 140;
  const defaultHeight = 28;
  const uiRect: UiRect = {
    left: Math.max(0, xUi - defaultWidth / 2),
    top: Math.max(0, yUi - defaultHeight / 2),
    width: defaultWidth,
    height: defaultHeight,
  };
  const pdfRect = uiRectToPdf(uiRect, pageIndex, layout.heightPt, layout.scale);
  const overlay: PdfOverlayItem = {
    id: createOverlayId(),
    pageIndex: pdfRect.pageIndex,
    x: pdfRect.x,
    y: pdfRect.y,
    width: pdfRect.width,
    height: pdfRect.height,
    text: placeholder,
    fontSize: 11,
  };

  return {
    ...document,
    overlays: [...(document.overlays ?? []), overlay],
  };
}

export function formFieldsFromMarkup(
  draftFields: Array<{
    name: string;
    label: string;
    inputKind: FieldInputKind;
    rect: PdfFormField['rect'];
  }>
): PdfFormField[] {
  return draftFields.map((field) => ({
    name: field.name,
    label: field.label,
    type: 'text',
    value: '',
    inputKind: field.inputKind,
    rect: field.rect,
    origin: 'custom',
  }));
}
