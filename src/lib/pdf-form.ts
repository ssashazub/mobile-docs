import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFRadioGroup,
  PDFTextField,
  type PDFField,
} from 'pdf-lib';

import type { PdfFormField, PdfFormFieldType } from '@/types/document';
import { inferPdfFormFieldInputKind } from '@/lib/field-validation';

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
      inputKind:
        type === 'text' || type === 'other'
          ? inferPdfFormFieldInputKind(name, label)
          : undefined,
    };
  });
}

export async function applyFormFieldValues(
  pdfBytes: Uint8Array,
  values: Record<string, string>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  for (const [name, value] of Object.entries(values)) {
    try {
      const field = form.getField(name);

      if (field instanceof PDFTextField) {
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
        if (value.trim()) {
          field.select(value);
        }
      }
    } catch {
      // Skip unknown or incompatible fields.
    }
  }

  return pdfDoc.save();
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
