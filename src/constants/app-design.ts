import { Platform } from 'react-native';

/** Layout tokens (radius, shadows). Use `useTheme()` for colors. */
export const AppDesign = {
  radius: {
    sm: 12,
    md: 16,
    lg: 22,
    xl: 28,
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
} as const;
