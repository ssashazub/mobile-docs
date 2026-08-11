import { Platform } from 'react-native';

/** Layout tokens (radius, shadows). Use `useTheme()` for colors. */
export const AppDesign = {
  radius: {
    sm: 12,
    md: 16,
    lg: 22,
    xl: 28,
    pill: 999,
  },
  shadow: Platform.select({
    ios: {
      shadowColor: '#312e81',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  cardShadow: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: {
      elevation: 3,
    },
    default: {},
  }),
  /** Slightly stronger elevation for "hero" surfaces (create CTA, featured cards). */
  heroShadow: Platform.select({
    ios: {
      shadowColor: '#4338ca',
      shadowOpacity: 0.28,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
  /** Barely-there elevation for chips / tonal pills that still need to lift off the page. */
  softShadow: Platform.select({
    ios: {
      shadowColor: '#312e81',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    android: {
      elevation: 1,
    },
    default: {},
  }),
} as const;

/** Reusable mesh-gradient stop sets for decorative hero/header backgrounds. */
export const AppGradients = {
  brand: ['#6d5bff', '#4f46e5', '#8b2fc9'] as const,
  brandSoft: ['#8b7bff', '#6a56ff'] as const,
  teal: ['#14b8a6', '#0d9488'] as const,
  sunset: ['#fb923c', '#ec4899'] as const,
} as const;
