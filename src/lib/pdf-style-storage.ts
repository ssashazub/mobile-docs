import AsyncStorage from '@react-native-async-storage/async-storage';

import { PDF_STYLES_STORAGE_KEY } from '@/constants/storage';
import type { SavedPdfStyle } from '@/types/pdf-style-design';
import type { PdfStyle } from '@/types/template';

function getNextStyleId(styles: SavedPdfStyle[]): string {
  const maxId = styles.reduce((max, style) => {
    const numeric = Number(style.id.replace('pdf-style-', ''));
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);

  return `pdf-style-${maxId + 1}`;
}

export async function getSavedPdfStyles(): Promise<SavedPdfStyle[]> {
  const raw = await AsyncStorage.getItem(PDF_STYLES_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as SavedPdfStyle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function savePdfStyle(style: SavedPdfStyle): Promise<void> {
  const styles = await getSavedPdfStyles();
  const index = styles.findIndex((item) => item.id === style.id);

  if (index >= 0) {
    styles[index] = style;
  } else {
    styles.push(style);
  }

  await AsyncStorage.setItem(PDF_STYLES_STORAGE_KEY, JSON.stringify(styles));
}

export async function deletePdfStyle(styleId: string): Promise<void> {
  const styles = await getSavedPdfStyles();
  await AsyncStorage.setItem(
    PDF_STYLES_STORAGE_KEY,
    JSON.stringify(styles.filter((style) => style.id !== styleId))
  );
}

export async function createSavedPdfStyleFromPdfStyle(
  name: string,
  pdfStyle: PdfStyle,
  design: SavedPdfStyle['design']
): Promise<SavedPdfStyle> {
  const styles = await getSavedPdfStyles();
  const now = new Date().toISOString();

  const saved: SavedPdfStyle = {
    id: getNextStyleId(styles),
    name: name.trim(),
    layout: pdfStyle.layout,
    showFooter: pdfStyle.showFooter,
    showDate: pdfStyle.showDate,
    design,
    createdAt: now,
    updatedAt: now,
  };

  await savePdfStyle(saved);
  return saved;
}

export async function getSavedPdfStyleById(styleId: string): Promise<SavedPdfStyle | null> {
  const styles = await getSavedPdfStyles();
  return styles.find((style) => style.id === styleId) ?? null;
}
