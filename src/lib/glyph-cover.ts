/**
 * Cover/whiteout helpers.
 *
 * Stay inside the field/cell so table grid lines survive. When the text has
 * descenders (у, д, р, ф…), enlarge the wipe slightly so tails leave no residue.
 */

/** Just enough to miss the black grid stroke (~0.5–1pt). */
const BORDER_INSET_PT = 0.2;

/** Cyrillic + Latin glyphs with descenders / long tails under the baseline. */
const DESCENDER_RE = /[уУдДрРфФцЦщЩзЗgjpqyGJPQY]/;

export function hasDescenderGlyphs(text: string): boolean {
  return DESCENDER_RE.test(text);
}

/**
 * PDF cover rect strictly inside the field — leaves table borders untouched.
 * With descender letters, the box is slightly taller (still hugging the cell).
 */
export function coverPdfRectInsideCell<
  T extends { x: number; y: number; width: number; height: number },
>(
  rect: T,
  options?: {
    insetPt?: number;
    text?: string;
    fontSizePt?: number;
  }
): T {
  const hasTails = hasDescenderGlyphs(options?.text ?? '');
  const baseInset = options?.insetPt ?? BORDER_INSET_PT;
  const inset = Math.min(baseInset, Math.max(0.2, Math.min(rect.width, rect.height) / 8));

  if (!hasTails) {
    return {
      ...rect,
      x: rect.x + inset,
      y: rect.y + inset,
      width: Math.max(1, rect.width - inset * 2),
      height: Math.max(1, rect.height - inset * 2),
    };
  }

  // Slightly larger wipe for tails — grow down (and a little up for ф), but keep
  // a hairline margin so grid strokes stay visible.
  const size = Math.max(5, options?.fontSizePt ?? rect.height * 0.7);
  const growBottom = Math.min(1.0, Math.max(0.55, size * 0.13));
  const growTop = /[фФfF]/.test(options?.text ?? '') ? growBottom * 0.4 : growBottom * 0.12;
  const edge = Math.min(0.28, inset);

  return {
    ...rect,
    x: rect.x + edge,
    y: rect.y + edge - growBottom,
    width: Math.max(1, rect.width - edge * 2),
    height: Math.max(1, rect.height - edge * 2 + growBottom + growTop),
  };
}

/**
 * UI cover rect strictly inside the field box (same idea for on-screen).
 */
export function coverUiRectInsideCell(
  rect: { left: number; top: number; width: number; height: number },
  scale: number,
  options?: {
    text?: string;
    fontSizePx?: number;
  }
): { left: number; top: number; width: number; height: number } {
  const hasTails = hasDescenderGlyphs(options?.text ?? '');
  const inset = Math.min(
    Math.max(0.4, BORDER_INSET_PT * scale),
    Math.max(0.4, Math.min(rect.width, rect.height) / 8)
  );

  if (!hasTails) {
    return {
      left: rect.left + inset,
      top: rect.top + inset,
      width: Math.max(1, rect.width - inset * 2),
      height: Math.max(1, rect.height - inset * 2),
    };
  }

  const size = Math.max(5, options?.fontSizePx ?? rect.height * 0.7);
  const growBottom = Math.min(1.4 * scale, Math.max(0.7 * scale, size * 0.13));
  const growTop = /[фФfF]/.test(options?.text ?? '') ? growBottom * 0.4 : growBottom * 0.12;
  const edge = Math.min(0.35 * scale, inset);

  return {
    left: rect.left + edge,
    top: rect.top + edge - growTop,
    width: Math.max(1, rect.width - edge * 2),
    height: Math.max(1, rect.height - edge * 2 + growBottom + growTop),
  };
}
