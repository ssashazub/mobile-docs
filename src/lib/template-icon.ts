import {
  BUILTIN_EMOJI_TO_SYMBOL,
  DEFAULT_TEMPLATE_ICON,
  TEMPLATE_SYMBOL_PRESETS,
  type TemplateIcon,
  type TemplateSymbolId,
} from '@/constants/template-icons';
import type { DocumentTemplate } from '@/types/template';

export function getSymbolPreset(symbolId: string) {
  return TEMPLATE_SYMBOL_PRESETS.find((preset) => preset.id === symbolId);
}

export function isTemplateSymbolId(value: string): value is TemplateSymbolId {
  return TEMPLATE_SYMBOL_PRESETS.some((preset) => preset.id === value);
}

export function normalizeTemplateIcon(
  source: Partial<Pick<DocumentTemplate, 'icon' | 'emoji'>>
): TemplateIcon {
  if (source.icon?.kind) {
    if (source.icon.kind === 'none') {
      return { kind: 'none', value: '' };
    }

    if (source.icon.kind === 'emoji') {
      const emoji = source.icon.value.trim();
      return emoji ? { kind: 'emoji', value: emoji } : { kind: 'none', value: '' };
    }

    if (isTemplateSymbolId(source.icon.value)) {
      return { kind: 'symbol', value: source.icon.value };
    }
  }

  const legacyEmoji = source.emoji?.trim();

  if (!legacyEmoji) {
    return DEFAULT_TEMPLATE_ICON;
  }

  const mappedSymbol = BUILTIN_EMOJI_TO_SYMBOL[legacyEmoji];

  if (mappedSymbol) {
    return { kind: 'symbol', value: mappedSymbol };
  }

  return { kind: 'emoji', value: legacyEmoji };
}

export function resolveIconPdfText(icon: TemplateIcon): string {
  if (icon.kind === 'none' || !icon.value.trim()) {
    return '';
  }

  if (icon.kind === 'emoji') {
    return icon.value.trim();
  }

  return getSymbolPreset(icon.value)?.pdfFallback ?? '';
}

export function templateIconsEqual(left: TemplateIcon, right: TemplateIcon): boolean {
  return left.kind === right.kind && left.value === right.value;
}

export function createSymbolIcon(symbolId: TemplateSymbolId): TemplateIcon {
  return { kind: 'symbol', value: symbolId };
}

export function createEmojiIcon(value: string): TemplateIcon {
  const trimmed = value.trim();
  return trimmed ? { kind: 'emoji', value: trimmed } : { kind: 'none', value: '' };
}

export function createNoneIcon(): TemplateIcon {
  return { kind: 'none', value: '' };
}
