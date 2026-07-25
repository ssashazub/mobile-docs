/** Shared responsive layout tokens for phone + tablet. */
export const Layout = {
  /** Shortest edge where we treat the device as a tablet-class screen. */
  tabletMinWidth: 768,
  /** Large tablet / landscape-ish width for denser grids. */
  largeTabletMinWidth: 1024,
  /** Max readable content width for forms, settings, legal. */
  contentMaxWidth: 720,
  /** Slightly wider for card grids / lists. */
  listMaxWidth: 960,
  /** PDF preview paper cap (near A4 @ screen density, readable on tablets). */
  previewPageMaxWidth: 680,
  /** Centered action sheets / pickers on tablet. */
  sheetMaxWidth: 480,
} as const;
