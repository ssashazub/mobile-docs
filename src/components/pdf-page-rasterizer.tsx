import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, PixelRatio, Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

import { ensurePdfJsRuntime } from '@/lib/pdfjs-sources';
import { readPdfBytes, writePdfBytes } from '@/lib/pdf-bytes';
import type { DetectedPdfField, RasterPageMessage } from '@/lib/pdfjs-rasterizer-html';

export type RasterizedPage = {
  pageIndex: number;
  widthPt: number;
  heightPt: number;
  imageUri: string;
  imageWidth?: number;
  imageHeight?: number;
};

type PdfPageRasterizerProps = {
  pdfUri: string;
  onComplete: (pages: RasterizedPage[]) => void;
  onError: (message: string) => void;
  onPage?: (pages: RasterizedPage[], done: number, total: number) => void;
  onDetectedFields?: (fields: DetectedPdfField[]) => void;
  /** When false, only rasterize pages (used after baking edits into a working PDF). */
  detectFields?: boolean;
};

const RASTER_TIMEOUT_MS = 90000;

export function PdfPageRasterizer({
  pdfUri,
  onComplete,
  onError,
  onPage,
  onDetectedFields,
  detectFields = true,
}: PdfPageRasterizerProps) {
  const webRef = useRef<WebView>(null);
  const pagesRef = useRef<RasterizedPage[]>([]);
  const readyRef = useRef(false);
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  const runtimeDirRef = useRef<string | null>(null);
  const detectFieldsRef = useRef(detectFields);
  detectFieldsRef.current = detectFields;

  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const onPageRef = useRef(onPage);
  const onDetectedFieldsRef = useRef(onDetectedFields);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;
  onPageRef.current = onPage;
  onDetectedFieldsRef.current = onDetectedFields;

  const [htmlUri, setHtmlUri] = useState<string | null>(null);
  const [webKey, setWebKey] = useState(0);

  const startIfReady = useCallback(() => {
    if (!readyRef.current || startedRef.current) {
      return;
    }
    startedRef.current = true;
    const cssWidth = Math.round(Dimensions.get('window').width);
    const dpr = PixelRatio.get();
    const detect = detectFieldsRef.current ? 'true' : 'false';
    webRef.current?.injectJavaScript(
      `try { window.__startRaster__('./document.pdf', { cssWidth: ${cssWidth}, dpr: ${dpr}, detectFields: ${detect} }); } catch (e) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: String(e && e.message ? e.message : e) })); } true;`
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const prepare = async () => {
      try {
        readyRef.current = false;
        startedRef.current = false;
        finishedRef.current = false;
        pagesRef.current = [];
        setHtmlUri(null);

        const [runtime, bytes] = await Promise.all([
          ensurePdfJsRuntime(),
          readPdfBytes(pdfUri),
        ]);

        if (cancelled) {
          return;
        }

        runtimeDirRef.current = runtime.dir;
        await writePdfBytes(`${runtime.dir}document.pdf`, bytes);

        if (cancelled) {
          return;
        }

        setHtmlUri(runtime.htmlUri);
        setWebKey((value) => value + 1);

        timeoutId = setTimeout(() => {
          if (!cancelled && !finishedRef.current && pagesRef.current.length === 0) {
            onErrorRef.current('PDF rasterization timed out');
          }
        }, RASTER_TIMEOUT_MS);
      } catch (error) {
        if (!cancelled) {
          onErrorRef.current(error instanceof Error ? error.message : String(error));
        }
      }
    };

    void prepare();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [pdfUri]);

  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      let message: RasterPageMessage;
      try {
        message = JSON.parse(event.nativeEvent.data) as RasterPageMessage;
      } catch {
        return;
      }

      if (message.type === 'ready') {
        readyRef.current = true;
        startIfReady();
        return;
      }

      if (message.type === 'error') {
        onErrorRef.current(message.message);
        return;
      }

      if (message.type === 'progress') {
        return;
      }

      if (message.type === 'detectedFields') {
        onDetectedFieldsRef.current?.(message.fields);
        return;
      }

      if (message.type === 'page') {
        try {
          const cacheDir = `${FileSystem.cacheDirectory}pdf-pages/`;
          const dirInfo = await FileSystem.getInfoAsync(cacheDir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
          }

          const base64 = message.dataUri.replace(/^data:image\/\w+;base64,/, '');
          const imageUri = `${cacheDir}${Date.now()}-${message.pageIndex}.jpg`;
          await FileSystem.writeAsStringAsync(imageUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          pagesRef.current = [
            ...pagesRef.current.filter((page) => page.pageIndex !== message.pageIndex),
            {
              pageIndex: message.pageIndex,
              widthPt: message.widthPt,
              heightPt: message.heightPt,
              imageUri,
              imageWidth: message.imageWidth,
              imageHeight: message.imageHeight,
            },
          ].sort((a, b) => a.pageIndex - b.pageIndex);

          onPageRef.current?.(pagesRef.current, message.pageIndex + 1, message.total);
        } catch (error) {
          onErrorRef.current(error instanceof Error ? error.message : String(error));
        }
        return;
      }

      if (message.type === 'done') {
        finishedRef.current = true;
        onCompleteRef.current(pagesRef.current);
      }
    },
    [startIfReady]
  );

  if (!htmlUri) {
    return null;
  }

  return (
    <View style={styles.host} pointerEvents="none" collapsable={false}>
      <WebView
        key={webKey}
        ref={webRef}
        source={{ uri: htmlUri }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        allowingReadAccessToURL={runtimeDirRef.current ?? undefined}
        mixedContentMode="always"
        onLoadEnd={() => {
          startIfReady();
        }}
        onMessage={handleMessage}
        onError={(event) => {
          onErrorRef.current(event.nativeEvent.description || 'WebView failed to load');
        }}
        onHttpError={() => {
          onErrorRef.current('WebView HTTP error while loading PDF.js');
        }}
        style={styles.webview}
        {...(Platform.OS === 'android' ? { androidLayerType: 'hardware' as const } : null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    // Keep a large off-screen surface so mobile WebViews don't clamp canvas buffers.
    left: -5000,
    top: 0,
    width: 2400,
    height: 3400,
    opacity: 1,
    zIndex: -1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#111',
  },
});
