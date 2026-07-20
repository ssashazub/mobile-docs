import { fontStack } from '@/core/pdf/html';
import { getAndroidPdfPrintZoom, PDF_A4 } from '@/constants/pdf-page';
import type { ResolvedPdfDesign } from '@/types/pdf-style-design';

export function buildPdfStyles(design: ResolvedPdfDesign): string {
  const spacing = design.denseSpacing ? '14px' : '20px';
  const fieldGap = design.denseSpacing ? '12px' : '16px';
  const borderStyle = design.showFieldBorders ? '1px solid #e2e8f0' : 'none';
  const cardRadius = design.showFieldBorders ? '10px' : '0';
  const androidZoom = getAndroidPdfPrintZoom();
  const zoomRule =
    androidZoom !== 1
      ? `zoom: ${androidZoom}; -webkit-text-size-adjust: 100%;`
      : '-webkit-text-size-adjust: 100%;';

  return `
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * { box-sizing: border-box; }
    html {
      margin: 0;
      padding: 0;
      width: 100%;
      background: #fff;
      ${zoomRule}
    }
    body {
      margin: 0;
      padding: ${PDF_A4.marginPx}px;
      width: 100%;
      max-width: 100%;
      color: #0f172a;
      background: #fff;
      color-scheme: light only;
      font-family: ${fontStack(design.fontFamily)};
      line-height: ${design.denseSpacing ? 1.45 : 1.55};
      font-size: ${design.denseSpacing ? '10.5pt' : '11pt'};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-shell {
      width: 100% !important;
      max-width: 100%;
      border-collapse: collapse;
    }
    .page {
      width: 100%;
      max-width: 100%;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #0f172a;
    }
    .page-main {
      width: 100%;
    }
    .footer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 9pt;
      text-align: center;
    }
    .hero-gradient {
      background: linear-gradient(135deg, ${design.accent} 0%, ${design.gradientEnd} 100%);
      color: #fff;
      border-radius: 16px;
      padding: 26px 28px;
      margin-bottom: ${spacing};
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
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
      padding: 18px 20px;
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
      padding-bottom: 14px;
      border-bottom: ${design.headerStyle === 'line' ? '2px solid #0f172a' : '1px solid #e2e8f0'};
    }
    .header-line { text-align: center; }
    .hero-kicker {
      font-size: 9pt;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      opacity: 0.88;
      margin-bottom: 8px;
    }
    .hero-title, .header-title {
      font-size: ${design.headerStyle === 'banner' ? '18pt' : '22pt'};
      font-weight: 700;
      margin: 0 0 8px;
      line-height: 1.2;
      color: inherit;
    }
    .header-title { color: #0f172a; }
    .hero-meta, .header-meta {
      font-size: ${design.denseSpacing ? '9.5pt' : '10.5pt'};
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
      font-size: 9pt;
      margin-right: 8px;
    }
    .section { margin-bottom: ${spacing}; page-break-inside: avoid; }
    .section-title {
      font-size: 10pt;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: ${design.accent};
      font-weight: 800;
      margin: 0 0 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .section-body { color: #334155; font-size: 11pt; }
    .field { margin-bottom: ${fieldGap}; page-break-inside: avoid; }
    .field-label {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-bottom: 4px;
      font-weight: 700;
    }
    .field-value {
      font-size: 11pt;
      color: #334155;
      line-height: 1.55;
      ${design.showFieldBorders ? 'border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;' : ''}
    }
    .fields-table {
      width: 100% !important;
      max-width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      table-layout: fixed;
    }
    .fields-table tr { page-break-inside: avoid; }
    .fields-table td {
      border: 1px solid #cbd5e1;
      padding: 12px 14px;
      vertical-align: top;
      word-wrap: break-word;
    }
    .fields-table .label {
      width: 36%;
      background: #f8fafc;
      font-weight: 700;
      color: #334155;
      font-size: 10pt;
    }
    .fields-table .value {
      background: #ffffff;
      color: #0f172a;
      font-size: 11pt;
    }
    .fields-grid {
      width: 100% !important;
      max-width: 100%;
      border-collapse: separate;
      border-spacing: ${design.denseSpacing ? '8px' : '10px'};
      table-layout: fixed;
      margin: 0;
    }
    .fields-grid td {
      width: 50%;
      vertical-align: top;
    }
    .hero-gradient,
    .hero-solid,
    .hero-banner,
    .hero-sidebar,
    .header-line,
    .header-minimal,
    .section,
    .field,
    .page-main {
      width: 100% !important;
      max-width: 100%;
    }
    .grid-item, .card-item, .column-item {
      border: ${borderStyle};
      border-radius: ${cardRadius};
      padding: ${design.denseSpacing ? '10px' : '12px'};
      page-break-inside: avoid;
      background: ${design.showFieldBorders ? '#fff' : 'transparent'};
      width: 100%;
    }
    .grid-label, .card-label, .column-label {
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${design.accent};
      font-weight: 800;
      margin-bottom: 4px;
    }
    .grid-value, .card-value, .column-value {
      font-size: 10.5pt;
      color: #334155;
      line-height: 1.45;
    }
  `;
}
