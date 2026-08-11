import type { Document } from '@/types/document';

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/**
 * Filter user documents by title, client, description, or imported file name.
 */
export function filterDocumentsByQuery(documents: Document[], query: string): Document[] {
  const needle = normalizeSearchText(query);
  if (!needle) {
    return documents;
  }

  return documents.filter((document) => {
    const haystack = [
      document.title,
      document.client,
      document.description,
      document.importedFileName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();

    return haystack.includes(needle);
  });
}

export type FieldSearchParts = {
  /** Visible field label */
  label?: string | null;
  /** Internal key / AcroForm name */
  id?: string | null;
  /** Current filled value (or display value) */
  value?: string | null;
};

/**
 * Match a form field by label, internal id/name, or filled value.
 */
export function matchesFieldSearchQuery(parts: FieldSearchParts, query: string): boolean {
  const needle = normalizeSearchText(query);
  if (!needle) {
    return true;
  }

  const haystack = [parts.label, parts.id, parts.value]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();

  return haystack.includes(needle);
}

export function filterByFieldSearchQuery<T>(
  items: T[],
  query: string,
  getParts: (item: T) => FieldSearchParts
): T[] {
  const needle = normalizeSearchText(query);
  if (!needle) {
    return items;
  }

  return items.filter((item) => matchesFieldSearchQuery(getParts(item), query));
}
