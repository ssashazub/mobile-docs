import { useFonts } from 'expo-font';

/**
 * Load bundled Unicode faces used for imported-PDF overlay text on Android/web.
 * iOS uses system Times New Roman / Arial / Georgia / Courier New.
 */
export function useOverlayFonts(): boolean {
  const [loaded] = useFonts({
    NotoSans: require('../../assets/fonts/NotoSans-Regular.ttf'),
    NotoSerif: require('../../assets/fonts/NotoSerif-Regular.ttf'),
  });

  return loaded;
}
