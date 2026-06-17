import type { SymbolViewProps } from 'expo-symbols';

export type TemplateIconKind = 'symbol' | 'emoji' | 'none';

export type TemplateIcon = {
  kind: TemplateIconKind;
  value: string;
};

export type TemplateSymbolId =
  | 'doc.text'
  | 'doc.plaintext'
  | 'receipt'
  | 'chart.bar'
  | 'checkmark.seal'
  | 'tray.and.arrow.down'
  | 'signature'
  | 'building.2'
  | 'person.crop.circle'
  | 'calendar'
  | 'folder'
  | 'briefcase'
  | 'envelope'
  | 'sparkles'
  | 'cart'
  | 'list.bullet.clipboard';

export type TemplateSymbolPreset = {
  id: TemplateSymbolId;
  name: SymbolViewProps['name'];
  pdfFallback: string;
};

export const TEMPLATE_SYMBOL_PRESETS: TemplateSymbolPreset[] = [
  {
    id: 'doc.text',
    name: { ios: 'doc.text', android: 'description', web: 'description' },
    pdfFallback: '📄',
  },
  {
    id: 'doc.plaintext',
    name: { ios: 'doc.plaintext', android: 'note', web: 'note' },
    pdfFallback: '📝',
  },
  {
    id: 'receipt',
    name: { ios: 'receipt', android: 'receipt_long', web: 'receipt_long' },
    pdfFallback: '🧾',
  },
  {
    id: 'chart.bar',
    name: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
    pdfFallback: '📊',
  },
  {
    id: 'checkmark.seal',
    name: { ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' },
    pdfFallback: '✅',
  },
  {
    id: 'tray.and.arrow.down',
    name: { ios: 'tray.and.arrow.down.fill', android: 'download', web: 'download' },
    pdfFallback: '📥',
  },
  {
    id: 'signature',
    name: { ios: 'signature', android: 'draw', web: 'draw' },
    pdfFallback: '✍️',
  },
  {
    id: 'building.2',
    name: { ios: 'building.2.fill', android: 'business', web: 'business' },
    pdfFallback: '🏢',
  },
  {
    id: 'person.crop.circle',
    name: { ios: 'person.crop.circle.fill', android: 'person', web: 'person' },
    pdfFallback: '👤',
  },
  {
    id: 'calendar',
    name: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
    pdfFallback: '📅',
  },
  {
    id: 'folder',
    name: { ios: 'folder.fill', android: 'folder', web: 'folder' },
    pdfFallback: '📁',
  },
  {
    id: 'briefcase',
    name: { ios: 'briefcase.fill', android: 'work', web: 'work' },
    pdfFallback: '💼',
  },
  {
    id: 'envelope',
    name: { ios: 'envelope.fill', android: 'mail', web: 'mail' },
    pdfFallback: '✉️',
  },
  {
    id: 'sparkles',
    name: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
    pdfFallback: '✨',
  },
  {
    id: 'cart',
    name: { ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' },
    pdfFallback: '🛒',
  },
  {
    id: 'list.bullet.clipboard',
    name: { ios: 'list.bullet.clipboard.fill', android: 'checklist', web: 'checklist' },
    pdfFallback: '📋',
  },
];

export const DEFAULT_TEMPLATE_ICON: TemplateIcon = {
  kind: 'symbol',
  value: 'doc.plaintext',
};

export const BUILTIN_EMOJI_TO_SYMBOL: Record<string, TemplateSymbolId> = {
  '📄': 'doc.text',
  '📝': 'doc.plaintext',
  '🧾': 'receipt',
  '📊': 'chart.bar',
  '✅': 'checkmark.seal',
  '📥': 'tray.and.arrow.down',
  '✨': 'sparkles',
  '📁': 'folder',
};
