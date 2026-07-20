/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0f172a',
    background: '#eef2ff',
    backgroundElement: '#ffffff',
    backgroundSelected: '#e0e7ff',
    backgroundSoft: '#f8fafc',
    surface: '#ffffff',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    primary: '#4f46e5',
    primarySoft: '#eef2ff',
    danger: '#ef4444',
    dangerSoft: '#fef2f2',
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
  },
  dark: {
    text: '#f1f5f9',
    background: '#0a0b10',
    backgroundElement: '#2a2c3a',
    backgroundSelected: '#34364a',
    backgroundSoft: '#14151f',
    surface: '#1c1e2c',
    textSecondary: '#a1a8bd',
    textMuted: '#7b8299',
    border: '#3d4158',
    primary: '#8b93ff',
    primarySoft: '#1f2038',
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
    secondaryButton: '#64748b',
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
