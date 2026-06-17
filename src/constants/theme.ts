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
    background: '#0b0b12',
    backgroundElement: '#18181f',
    backgroundSelected: '#2a2a38',
    backgroundSoft: '#12121a',
    surface: '#1a1a24',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: '#2e2e3d',
    primary: '#818cf8',
    primarySoft: '#1e1b4b',
    danger: '#fb7185',
    dangerSoft: '#3b1519',
    success: '#34d399',
    hint: '#818cf8',
    noteBackground: '#1e1b4b',
    noteBorder: '#312e81',
    noteTitle: '#a5b4fc',
    noteText: '#c7d2fe',
    importBorder: '#0f766e',
    importTitle: '#2dd4bf',
    templatesBorder: '#3730a3',
    optionSelected: '#134e4a',
    optionAccent: '#2dd4bf',
    chipSelected: '#312e81',
    secondaryButton: '#475569',
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
