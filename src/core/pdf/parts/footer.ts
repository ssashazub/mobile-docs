import { escapeHtml } from '@/core/pdf/html';

export function renderPdfFooter(footerText: string, created: string, showDate: boolean): string {
  return `<div class="footer">${escapeHtml(footerText)}${showDate ? ` · ${created}` : ''}</div>`;
}
