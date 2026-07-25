import type { PdfStyle } from '@/types/template';

type CreateDocumentDraft = {
  templateId: string;
  fields: Record<string, string>;
  pdfStyle: PdfStyle;
};

let draft: CreateDocumentDraft | null = null;
let pendingTemplateSwitchId: string | null = null;

export function saveCreateDocumentDraft(next: CreateDocumentDraft): void {
  draft = next;
}

export function takeCreateDocumentDraft(templateId: string): CreateDocumentDraft | null {
  if (!draft || draft.templateId !== templateId) {
    return null;
  }

  const current = draft;
  draft = null;
  return current;
}

export function setPendingCreateTemplateSwitch(templateId: string): void {
  pendingTemplateSwitchId = templateId;
}

export function consumePendingCreateTemplateSwitch(): string | null {
  const next = pendingTemplateSwitchId;
  pendingTemplateSwitchId = null;
  return next;
}
