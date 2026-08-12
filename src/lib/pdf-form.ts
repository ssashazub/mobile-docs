import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFRadioGroup,
  PDFTextField,
  setFontAndSize,
  type PDFField,
} from 'pdf-lib';

import type { PdfFieldRect, PdfFormField, PdfFormFieldType } from '@/types/document';
import { inferPdfFormFieldInputKind } from '@/lib/field-validation';
import { embedUnicodeFont } from '@/lib/pdf-unicode-font';

/** Keep filled values readable next to printed field labels. */
const FORM_FONT_MIN = 7;
const FORM_FONT_MAX = 10;
const FORM_FONT_DEFAULT = 9;

const TF_REGEX = /\/([^\0\t\n\f\r ]+)[\0\t\n\f\r ]+(\d*\.\d+|\d+)[\0\t\n\f\r ]+Tf/;

export function isCheckboxChecked(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || value === '✓';
}

function fieldType(field: PDFField): PdfFormFieldType {
  if (field instanceof PDFTextField) {
    return 'text';
  }
  if (field instanceof PDFCheckBox) {
    return 'checkbox';
  }
  if (field instanceof PDFRadioGroup) {
    return 'radio';
  }
  if (field instanceof PDFDropdown) {
    return 'dropdown';
  }
  return 'other';
}

function readFieldValue(field: PDFField): Pick<PdfFormField, 'value' | 'options'> {
  if (field instanceof PDFTextField) {
    return { value: field.getText() ?? '' };
  }

  if (field instanceof PDFCheckBox) {
    return { value: field.isChecked() ? 'true' : 'false' };
  }

  if (field instanceof PDFRadioGroup) {
    return {
      value: field.getSelected() ?? '',
      options: field.getOptions(),
    };
  }

  if (field instanceof PDFDropdown) {
    const selected = field.getSelected();
    return {
      value: selected.length > 0 ? selected[0] : '',
      options: field.getOptions(),
    };
  }

  return { value: '' };
}

function readFieldRect(field: PDFField, pdfDoc: PDFDocument): PdfFieldRect | undefined {
  try {
    const widgets = field.acroField.getWidgets();
    if (widgets.length === 0) {
      return undefined;
    }

    const widget = widgets[0]!;
    const { x, y, width, height } = widget.getRectangle();
    const pages = pdfDoc.getPages();
    let pageIndex = 0;

    try {
      // Prefer explicit page reference on the widget annotation when present.
      const pageRef = (widget as { P?: () => unknown }).P?.();
      if (pageRef) {
        const found = pages.findIndex((page) => page.ref === pageRef);
        if (found >= 0) {
          pageIndex = found;
        }
      }
    } catch {
      pageIndex = 0;
    }

    return {
      pageIndex,
      x,
      y,
      width: Math.abs(width),
      height: Math.abs(height),
    };
  } catch {
    return undefined;
  }
}

export function extractFormFields(pdfDoc: PDFDocument): PdfFormField[] {
  const form = pdfDoc.getForm();

  if (form.hasXFA()) {
    form.deleteXFA();
  }

  const fields = form.getFields();

  if (fields.length === 0) {
    return [];
  }

  return fields.map((field) => {
    const name = field.getName();
    const { value, options } = readFieldValue(field);
    const label = name.replace(/_/g, ' ');
    const type = fieldType(field);

    return {
      name,
      label,
      type,
      value,
      options,
      rect: readFieldRect(field, pdfDoc),
      origin: 'acroform' as const,
      // Track the PDF's own stored value as the "pristine" baseline — same as
      // detected fields. Without this, any AcroForm field that already has a
      // value (even one meant for machine/DB use, not for display — e.g. a
      // transliterated duplicate of a printed name) gets redrawn as an
      // overlay on every open, doubling up with the correct printed text.
      // Only once the user actually changes the value away from this
      // baseline should we cover the original and draw the new text.
      sourceText: type === 'text' || type === 'other' ? value : undefined,
      inputKind:
        type === 'text' || type === 'other'
          ? inferPdfFormFieldInputKind(name, label)
          : undefined,
    };
  });
}

function readDaFontSize(da: string | undefined): number | undefined {
  if (!da) {
    return undefined;
  }

  const match = TF_REGEX.exec(da);
  if (!match) {
    return undefined;
  }

  const size = Number(match[2]);
  return Number.isFinite(size) ? size : undefined;
}

function rewriteDaFontSize(da: string | undefined, fontSize: number): string {
  if (!da?.trim()) {
    return `${setFontAndSize('Helv', fontSize).toString()} 0 g`;
  }

  if (TF_REGEX.test(da)) {
    return da.replace(TF_REGEX, `/$1 ${fontSize} Tf`);
  }

  return `${da.trim()}\n${setFontAndSize('Helv', fontSize).toString()}`;
}

function getPrimaryWidgetHeight(field: PDFTextField | PDFDropdown): number {
  const widgets = field.acroField.getWidgets();
  if (widgets.length === 0) {
    return FORM_FONT_DEFAULT * 1.6;
  }

  const height = Math.abs(widgets[0]!.getRectangle().height);
  return height > 0 ? height : FORM_FONT_DEFAULT * 1.6;
}

/**
 * pdf-lib auto-fits text when /DA size is 0/missing — short values in tall
 * widgets become huge and crowd printed labels. Cap to a form-like size.
 */
function resolveFormFontSize(field: PDFTextField | PDFDropdown): number {
  const height = getPrimaryWidgetHeight(field);
  const fieldDaSize = readDaFontSize(field.acroField.getDefaultAppearance());
  const widgetDaSize = readDaFontSize(field.acroField.getWidgets()[0]?.getDefaultAppearance());
  const declared = fieldDaSize ?? widgetDaSize;

  if (declared && declared >= FORM_FONT_MIN && declared <= FORM_FONT_MAX) {
    return declared;
  }

  // ~60% of widget height, hard-capped so tall section boxes stay label-friendly.
  const fitted = Math.floor(height * 0.6);
  return Math.min(FORM_FONT_MAX, Math.max(FORM_FONT_MIN, fitted || FORM_FONT_DEFAULT));
}

function applyFormFontSize(field: PDFTextField | PDFDropdown, fontSize: number): void {
  field.acroField.setDefaultAppearance(
    rewriteDaFontSize(field.acroField.getDefaultAppearance(), fontSize)
  );

  for (const widget of field.acroField.getWidgets()) {
    const widgetDa = widget.getDefaultAppearance();
    // Widget-level /DA with Tf 0 wins over the field and re-triggers auto-size.
    if (widgetDa) {
      widget.setDefaultAppearance(rewriteDaFontSize(widgetDa, fontSize));
    }
  }
}

export async function applyFormFieldValues(
  pdfBytes: Uint8Array,
  values: Record<string, string>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  // Helvetica (WinAnsi) cannot encode Cyrillic — use a Unicode font for appearances.
  const unicodeFont = await embedUnicodeFont(pdfDoc);

  for (const [name, value] of Object.entries(values)) {
    try {
      const field = form.getField(name);

      if (field instanceof PDFTextField) {
        applyFormFontSize(field, resolveFormFontSize(field));
        field.setText(value);
      } else if (field instanceof PDFCheckBox) {
        if (isCheckboxChecked(value)) {
          field.check();
        } else {
          field.uncheck();
        }
      } else if (field instanceof PDFRadioGroup) {
        if (value.trim()) {
          field.select(value);
        } else {
          field.clear();
        }
      } else if (field instanceof PDFDropdown) {
        applyFormFontSize(field, resolveFormFontSize(field));
        if (value.trim()) {
          field.select(value);
        }
      }
    } catch {
      // Skip unknown or incompatible fields.
    }
  }

  form.updateFieldAppearances(unicodeFont);
  return pdfDoc.save({ updateFieldAppearances: false });
}

export function formatFormFieldDisplayValue(field: PdfFormField, value: string): string {
  if (field.type === 'checkbox') {
    return isCheckboxChecked(value) ? '✓' : '-';
  }

  if ((field.type === 'radio' || field.type === 'dropdown') && !value.trim()) {
    return '-';
  }

  return value || '-';
}
