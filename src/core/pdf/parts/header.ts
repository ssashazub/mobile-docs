import { escapeHtml } from '@/core/pdf/html';
import { resolveIconPdfText, normalizeTemplateIcon } from '@/lib/template-icon';
import type { DocumentTemplate } from '@/types/template';
import type { PdfHeaderStyle, ResolvedPdfDesign } from '@/types/pdf-style-design';

export function renderPdfHeader(
  design: ResolvedPdfDesign,
  template: DocumentTemplate,
  titleValue: string,
  created: string,
  showDate: boolean
): string {
  const iconText = resolveIconPdfText(normalizeTemplateIcon(template));
  const emojiPart = design.showEmoji && iconText ? `${escapeHtml(iconText)} ` : '';
  const dateBadge = showDate ? `<span class="badge">${created}</span>` : '';
  const metaWithDate = showDate
    ? `${emojiPart}${escapeHtml(template.title)} · ${created}`
    : `${emojiPart}${escapeHtml(template.title)}`;

  const headerStyles: Record<PdfHeaderStyle, string> = {
    gradient: `
      <div class="hero-gradient">
        <div class="hero-kicker">${escapeHtml(template.title)}</div>
        <h1 class="hero-title">${escapeHtml(titleValue)}</h1>
        <div class="hero-meta">
          ${design.showEmoji && iconText ? `<span class="badge">${escapeHtml(iconText)} ${escapeHtml(template.title)}</span>` : ''}
          ${dateBadge}
        </div>
      </div>
    `,
    solid: `
      <div class="hero-solid">
        <h1 class="hero-title">${escapeHtml(titleValue)}</h1>
        <div class="hero-meta">${metaWithDate}</div>
      </div>
    `,
    banner: `
      <div class="hero-banner">
        <h1 class="hero-title">${escapeHtml(titleValue)}</h1>
        <div class="hero-meta">${metaWithDate}</div>
      </div>
    `,
    sidebar: `
      <div class="hero-sidebar">
        <div class="hero-sidebar-accent"></div>
        <div class="hero-sidebar-body">
          <h1 class="hero-title" style="color:#0f172a">${escapeHtml(titleValue)}</h1>
          <div class="header-meta">${metaWithDate}</div>
        </div>
      </div>
    `,
    line: `
      <div class="header-line">
        <h1 class="header-title">${escapeHtml(titleValue)}</h1>
        <div class="header-meta">${metaWithDate}</div>
      </div>
    `,
    minimal: `
      <div class="header-minimal">
        <h1 class="header-title">${escapeHtml(titleValue)}</h1>
        <div class="header-meta">${metaWithDate}</div>
      </div>
    `,
  };

  return headerStyles[design.headerStyle];
}
