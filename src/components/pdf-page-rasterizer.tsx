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
  /** Bump to re-run raster in the same WebView (warmup → display → detect). */
  runGeneration?: number;
  onComplete: (pages: RasterizedPage[]) => void;
  onError: (message: string) => void;
  onPage?: (pages: RasterizedPage[], done: number, total: number) => void;
  onDetectedFields?: (fields: DetectedPdfField[]) => void;
  detectFields?: boolean;
  emitPages?: boolean;
  cssWidth?: number;
};

const RASTER_TIMEOUT_MS = 90000;

export function PdfPageRasterizer({
  pdfUri,
  runGeneration = 0,
  onComplete,
  onError,
  onPage,
  onDetectedFields,
  detectFields = true,
  emitPages = true,
  cssWidth,
}: PdfPageRasterizerProps) {
  const webRef = useRef<WebView>(null);
  const pagesRef = useRef<RasterizedPage[]>([]);
  const pageChunksRef = useRef<
    Map<number, { parts: string[]; chunkCount: number; meta: RasterPageMessage | null }>
  >(new Map());
  const readyRef = useRef(false);
  const activeRunRef = useRef(runGeneration);
  const runtimeDirRef = useRef<string | null>(null);
  const detectFieldsRef = useRef(detectFields);
  detectFieldsRef.current = detectFields;
  const emitPagesRef = useRef(emitPages);
  emitPagesRef.current = emitPages;
  const cssWidthRef = useRef(cssWidth);
  cssWidthRef.current = cssWidth;

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

  const isActiveRun = useCallback((runId?: number) => {
    return runId == null || runId === activeRunRef.current;
  }, []);

  const startRaster = useCallback(() => {
    if (!readyRef.current) {
      return;
    }

    activeRunRef.current = runGeneration;
    pageChunksRef.current.clear();
    if (emitPagesRef.current) {
      pagesRef.current = [];
    }

    const width =
      cssWidthRef.current != null && cssWidthRef.current > 0
        ? Math.round(cssWidthRef.current)
        : Math.round(Dimensions.get('window').width);
    const dpr = PixelRatio.get();
    const detect = detectFieldsRef.current ? 'true' : 'false';
    const emit = emitPagesRef.current ? 'true' : 'false';

    setTimeout(() => {
      webRef.current?.injectJavaScript(
        `try { window.__startRaster__('./document.pdf', { cssWidth: ${width}, dpr: ${dpr}, detectFields: ${detect}, emitPages: ${emit}, runId: ${runGeneration} }); } catch (e) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: String(e && e.message ? e.message : e), runId: ${runGeneration} })); } true;`
      );
    }, 150);
  }, [runGeneration]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const prepare = async () => {
      try {
        readyRef.current = false;
        pagesRef.current = [];
        pageChunksRef.current.clear();
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
          if (!cancelled && pagesRef.current.length === 0 && emitPagesRef.current) {
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

  useEffect(() => {
    if (htmlUri && readyRef.current) {
      startRaster();
    }
  }, [htmlUri, runGeneration, detectFields, emitPages, cssWidth, startRaster]);

  const savePageImage = useCallback(
    async (
      pageIndex: number,
      total: number,
      widthPt: number,
      heightPt: number,
      dataUri: string,
      imageWidth?: number,
      imageHeight?: number
    ) => {
      const cacheDir = `${FileSystem.cacheDirectory}pdf-pages/`;
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      }

      const base64 = dataUri.replace(/^data:image\/\w+;base64,/, '');
      const imageUri = `${cacheDir}${Date.now()}-${pageIndex}.jpg`;
      await FileSystem.writeAsStringAsync(imageUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      pagesRef.current = [
        ...pagesRef.current.filter((page) => page.pageIndex !== pageIndex),
        {
          pageIndex,
          widthPt,
          heightPt,
          imageUri,
          imageWidth,
          imageHeight,
        },
      ].sort((a, b) => a.pageIndex - b.pageIndex);

      onPageRef.current?.(pagesRef.current, pageIndex + 1, total);
    },
    []
  );

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
        startRaster();
        return;
      }

      if (message.type === 'error') {
        if (!isActiveRun(message.runId)) {
          return;
        }
        onErrorRef.current(message.message);
        return;
      }

      if (message.type === 'progress') {
        return;
      }

      if (message.type === 'detectedFields') {
        if (!isActiveRun(message.runId)) {
          return;
        }
        onDetectedFieldsRef.current?.(message.fields);
        return;
      }

      if (message.type === 'pageChunk') {
        if (!isActiveRun(message.runId)) {
          return;
        }
        try {
          const existing = pageChunksRef.current.get(message.pageIndex) ?? {
            parts: new Array(message.chunkCount).fill(''),
            chunkCount: message.chunkCount,
            meta: null,
          };
          existing.parts[message.chunkIndex] = message.data;
          existing.meta = message;
          pageChunksRef.current.set(message.pageIndex, existing);

          const ready = existing.parts.every((part) => part.length > 0);
          if (!ready || !existing.meta) {
            return;
          }

          const dataUri = existing.parts.join('');
          pageChunksRef.current.delete(message.pageIndex);
          await savePageImage(
            message.pageIndex,
            message.total,
            message.widthPt,
            message.heightPt,
            dataUri,
            message.imageWidth,
            message.imageHeight
          );
        } catch (error) {
          onErrorRef.current(error instanceof Error ? error.message : String(error));
        }
        return;
      }

      if (message.type === 'page') {
        if (!isActiveRun(message.runId)) {
          return;
        }
        try {
          await savePageImage(
            message.pageIndex,
            message.total,
            message.widthPt,
            message.heightPt,
            message.dataUri,
            message.imageWidth,
            message.imageHeight
          );
        } catch (error) {
          onErrorRef.current(error instanceof Error ? error.message : String(error));
        }
        return;
      }

      if (message.type === 'done') {
        if (!isActiveRun(message.runId)) {
          return;
        }
        onCompleteRef.current(pagesRef.current);
      }
    },
    [isActiveRun, savePageImage, startRaster]
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
        onMessage={handleMessage}
        onError={(event) => {
          onErrorRef.current(event.nativeEvent.description || 'WebView failed to load');
        }}
        onHttpError={() => {
          onErrorRef.current('WebView HTTP error while loading PDF.js');
        }}
        style={styles.webview}
        {...(Platform.OS === 'android' ? { androidLayerType: 'software' as const } : null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: -5000,
    top: 0,
    width: 4096,
    height: 5200,
    opacity: 1,
    zIndex: -1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#111',
  },
});
