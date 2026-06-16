import { fontStack } from '@/core/pdf/html';
import type { ResolvedPdfDesign } from '@/types/pdf-style-design';

export function buildPdfStyles(design: ResolvedPdfDesign): string {
  const spacing = design.denseSpacing ? '12px' : '18px';
  const fieldGap = design.denseSpacing ? '10px' : '14px';
  const borderStyle = design.showFieldBorders ? '1px solid #e2e8f0' : 'none';
  const cardRadius = design.showFieldBorders ? '10px' : '0';

  return `
    @page { margin: 28px; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #fff;
      font-family: ${fontStack(design.fontFamily)};
      line-height: ${design.denseSpacing ? 1.4 : 1.55};
      font-size: ${design.denseSpacing ? '12px' : '13px'};
    }
    .page { max-width: 760px; margin: 0 auto; padding: 8px; }
    .footer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 11px;
      text-align: center;
    }
    .hero-gradient {
      background: linear-gradient(135deg, ${design.accent} 0%, ${design.gradientEnd} 100%);
      color: #fff;
      border-radius: 18px;
      padding: 28px 30px;
      margin-bottom: ${spacing};
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
    }
    .hero-solid {
      background: ${design.accent};
      color: #fff;
      border-radius: 14px;
      padding: 24px 26px;
      margin-bottom: ${spacing};
    }
    .hero-banner {
      background: ${design.accent};
      color: #fff;
      border-radius: 10px;
      padding: 16px 18px;
      margin-bottom: ${spacing};
    }
    .hero-sidebar {
      display: flex;
      gap: 16px;
      margin-bottom: ${spacing};
      border: ${borderStyle};
      border-radius: ${cardRadius};
      overflow: hidden;
    }
    .hero-sidebar-accent {
      width: 8px;
      background: linear-gradient(180deg, ${design.accent}, ${design.gradientEnd});
      flex-shrink: 0;
    }
    .hero-sidebar-body { padding: 18px 20px 18px 0; flex: 1; }
    .header-line, .header-minimal {
      margin-bottom: ${spacing};
      padding-bottom: 16px;
      border-bottom: ${design.headerStyle === 'line' ? '2px solid #0f172a' : '1px solid #e2e8f0'};
    }
    .header-line { text-align: center; }
    .hero-kicker {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      opacity: 0.88;
      margin-bottom: 8px;
    }
    .hero-title, .header-title {
      font-size: ${design.headerStyle === 'banner' ? '18px' : '26px'};
      font-weight: 700;
      margin: 0 0 8px;
      line-height: 1.2;
      color: inherit;
    }
    .header-title { color: #0f172a; }
    .hero-meta, .header-meta {
      font-size: ${design.denseSpacing ? '11px' : '12px'};
      opacity: 0.92;
      color: inherit;
    }
    .header-meta { color: #64748b; opacity: 1; }
    .badge {
      display: inline-block;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.28);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      margin-right: 8px;
    }
    .section { margin-bottom: ${spacing}; page-break-inside: avoid; }
    .section-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: ${design.accent};
      font-weight: 800;
      margin: 0 0 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .section-body { color: #334155; font-size: 14px; }
    .field { margin-bottom: ${fieldGap}; page-break-inside: avoid; }
    .field-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-bottom: 4px;
      font-weight: 700;
    }
    .field-value {
      font-size: 14px;
      color: #334155;
      line-height: 1.55;
      ${design.showFieldBorders ? 'border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;' : ''}
    }
    .fields-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .fields-table tr { page-break-inside: avoid; }
    .fields-table td {
      border: 1px solid #cbd5e1;
      padding: 10px 12px;
      vertical-align: top;
    }
    .fields-table .label {
      width: 34%;
      background: #f8fafc;
      font-weight: 700;
      color: #334155;
      font-size: 12px;
    }
    .fields-table .value { color: #0f172a; font-size: 13px; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: ${design.denseSpacing ? '8px' : '10px'};
    }
    .grid-item, .card-item, .column-item {
      border: ${borderStyle};
      border-radius: ${cardRadius};
      padding: ${design.denseSpacing ? '8px' : '10px'};
      page-break-inside: avoid;
      background: ${design.showFieldBorders ? '#fff' : 'transparent'};
    }
    .grid-item.wide, .card-item.wide, .column-item.wide { grid-column: 1 / -1; }
    .grid-label, .card-label, .column-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${design.accent};
      font-weight: 800;
      margin-bottom: 4px;
    }
    .grid-value, .card-value, .column-value {
      font-size: 12px;
      color: #334155;
      line-height: 1.45;
    }
  `;
}
