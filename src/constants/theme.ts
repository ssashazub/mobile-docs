/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1b1b2f',
    background: '#e8ebff',
    backgroundElement: '#ffffff',
    backgroundSelected: '#ddd8ff',
    backgroundSoft: '#f3f1ff',
    surface: '#ffffff',
    textSecondary: '#4b4a68',
    textMuted: '#7a7799',
    border: '#d8d4f0',
    primary: '#4f46e5',
    primarySoft: '#ebe8ff',
    danger: '#e11d48',
    dangerSoft: '#ffe4e9',
    success: '#059669',
    hint: '#a5b4fc',
    noteBackground: '#eef2ff',
    noteBorder: '#c7d2fe',
    noteTitle: '#4338ca',
    noteText: '#4f46e5',
    importBorder: '#99f6e4',
    importTitle: '#0f766e',
    templatesBorder: '#c7d2fe',
    optionSelected: '#f0fdfa',
    optionAccent: '#0f766e',
    chipSelected: '#eef2ff',
    secondaryButton: '#64748b',
    // --- Material You style tonal roles (additive, richer surfaces) ---
    primaryContainer: '#ddd6fe',
    onPrimaryContainer: '#241a7a',
    secondary: '#7c5cff',
    secondaryContainer: '#efe9ff',
    onSecondaryContainer: '#3d1f8f',
    tertiary: '#c2185b',
    tertiaryContainer: '#ffd9e8',
    onTertiaryContainer: '#6b0032',
    surfaceContainerLow: '#ffffff',
    surfaceContainer: '#ffffff',
    surfaceContainerHigh: '#ebe7ff',
    outlineVariant: '#c9c4e8',
    gradientA: '#6d5bff',
    gradientB: '#4f46e5',
    gradientC: '#8b2fc9',
    shimmer: 'rgba(255,255,255,0.55)',
  },
  dark: {
    text: '#f1f0ff',
    background: '#0a0a14',
    backgroundElement: '#211f38',
    backgroundSelected: '#332f56',
    backgroundSoft: '#141225',
    surface: '#1a1830',
    textSecondary: '#b3affe',
    textMuted: '#827dab',
    border: '#332f56',
    primary: '#a99bff',
    primarySoft: '#241f45',
    danger: '#fb7185',
    dangerSoft: '#3a171c',
    success: '#34d399',
    hint: '#9aa3ff',
    noteBackground: '#1f2038',
    noteBorder: '#3b3f6e',
    noteTitle: '#b4bbff',
    noteText: '#c7d2fe',
    importBorder: '#1f5f57',
    importTitle: '#5eead4',
    templatesBorder: '#3b3f6e',
    optionSelected: '#163f3b',
    optionAccent: '#5eead4',
    chipSelected: '#2a2d4a',
    secondaryButton: '#8f8bc7',
    // --- Material You style tonal roles (additive, richer surfaces) ---
    primaryContainer: '#352c66',
    onPrimaryContainer: '#e3ddff',
    secondary: '#c6b8ff',
    secondaryContainer: '#2e2757',
    onSecondaryContainer: '#e6ddff',
    tertiary: '#ff9ecb',
    tertiaryContainer: '#5c1140',
    onTertiaryContainer: '#ffd8ea',
    surfaceContainerLow: '#161428',
    surfaceContainer: '#1e1c38',
    surfaceContainerHigh: '#282546',
    outlineVariant: '#403c66',
    gradientA: '#8b7bff',
    gradientB: '#6a56ff',
    gradientC: '#b34fe0',
    shimmer: 'rgba(255,255,255,0.08)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemeColors = (typeof Colors)[keyof typeof Colors];

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** @deprecated Prefer Layout.contentMaxWidth / useLayout(). */
export const MaxContentWidth = 720;
