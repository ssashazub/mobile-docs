import type { ExportFileNameFormat } from '@/types/app-settings';
import type { Document } from '@/types/document';

export function sanitizeFileName(title: string): string {
  return title.replace(/[^a-zA-Z0-9а-яА-ЯёЁіїєґІЇЄҐ_-]/g, '_');
}

function formatDateStamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildExportFileBaseName(
  document: Document,
  format: ExportFileNameFormat
): string {
  const title = sanitizeFileName(document.title || document.importedFileName || 'document');
  const date = formatDateStamp();
  const id = String(document.id);

  switch (format) {
    case 'title_date':
      return `${title}_${date}`;
    case 'date_title':
      return `${date}_${title}`;
    case 'id_title':
      return `${id}_${title}`;
    case 'title':
    default:
      return title;
  }
}
