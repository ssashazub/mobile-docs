import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

import {
  registerMupdfBridge,
  type MupdfRedactJobRequest,
} from '@/lib/mupdf-bridge';
import { ensureMupdfRuntime } from '@/lib/mupdf-sources';
import { base64ToUint8Array, writePdfBytes } from '@/lib/pdf-bytes';

const JOB_TIMEOUT_MS = 120000;

type ProcessorMessage =
  | { type: 'ready' }
  | { type: 'selftest'; ok: boolean; message?: string }
  | { type: 'error'; message: string; jobId?: string }
  | { type: 'done'; jobId: string; base64: string; rectCount?: number };

/**
 * Hidden WebView host for MuPDF.js WASM redaction.
 * Mount once in the root layout so export can call `redactPdfWithMupdf`.
 */
export function MupdfPdfProcessor() {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const runtimeDirRef = useRef<string | null>(null);
  const queueRef = useRef<MupdfRedactJobRequest[]>([]);
  const activeRef = useRef<MupdfRedactJobRequest | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [html, setHtml] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [webKey, setWebKey] = useState(0);

  const clearJobTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const pump = useCallback(async () => {
    if (!readyRef.current || activeRef.current || queueRef.current.length === 0) {
      return;
    }

    const job = queueRef.current.shift()!;
    activeRef.current = job;
    const dir = runtimeDirRef.current;
    if (!dir) {
      job.reject(new Error('MuPDF runtime missing'));
      activeRef.current = null;
      void pump();
      return;
    }

    try {
      await writePdfBytes(`${dir}document.pdf`, job.pdfBytes);
      const rectsJson = JSON.stringify(job.rects);
      clearJobTimeout();
      timeoutRef.current = setTimeout(() => {
        if (activeRef.current?.id === job.id) {
          activeRef.current = null;
          job.reject(new Error('MuPDF redaction timed out'));
          void pump();
        }
      }, JOB_TIMEOUT_MS);

      console.log('[mupdf] starting job', job.id, 'rects', job.rects.length);
      webRef.current?.injectJavaScript(
        `try { window.__runMupdfRedact__({ jobId: ${JSON.stringify(job.id)}, pdfUrl: './document.pdf', rects: ${rectsJson} }); } catch (e) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', jobId: ${JSON.stringify(job.id)}, message: String(e && e.message ? e.message : e) })); } true;`
      );
    } catch (error) {
      clearJobTimeout();
      activeRef.current = null;
      job.reject(error instanceof Error ? error : new Error(String(error)));
      void pump();
    }
  }, [clearJobTimeout]);

  const enqueue = useCallback(
    (job: MupdfRedactJobRequest) => {
      queueRef.current.push(job);
      void pump();
    },
    [pump]
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      registerMupdfBridge(null);
      return;
    }

    registerMupdfBridge({
      enqueue,
      isReady: () => readyRef.current,
    });

    return () => {
      registerMupdfBridge(null);
    };
  }, [enqueue]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let cancelled = false;

    const prepare = async () => {
      try {
        console.log('[mupdf] preparing runtime…');
        const runtime = await ensureMupdfRuntime();
        if (cancelled) {
          return;
        }
        runtimeDirRef.current = runtime.dir;
        const htmlBody = await FileSystem.readAsStringAsync(runtime.htmlUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        if (cancelled) {
          return;
        }
        const dir = runtime.dir.endsWith('/') ? runtime.dir : `${runtime.dir}/`;
        setBaseUrl(dir);
        setHtml(htmlBody);
        setWebKey((value) => value + 1);
        console.log('[mupdf] runtime ready at', runtime.dir);
      } catch (error) {
        console.warn('[mupdf] runtime prepare failed', error);
      }
    };

    void prepare();

    return () => {
      cancelled = true;
      clearJobTimeout();
    };
  }, [clearJobTimeout]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: ProcessorMessage;
      try {
        message = JSON.parse(event.nativeEvent.data) as ProcessorMessage;
      } catch {
        return;
      }

      if (message.type === 'ready') {
        console.log('[mupdf] WebView ready');
        readyRef.current = true;
        void pump();
        return;
      }

      if (message.type === 'selftest') {
        if (message.ok) {
          console.log('[mupdf] selftest OK — WASM loaded');
        } else {
          console.warn('[mupdf] selftest FAILED — export will use whiteout only:', message.message);
        }
        return;
      }

      if (message.type === 'error') {
        console.warn('[mupdf] WebView error', message.message);
        clearJobTimeout();
        const active = activeRef.current;
        activeRef.current = null;
        if (active) {
          active.reject(new Error(message.message));
        }
        void pump();
        return;
      }

      if (message.type === 'done') {
        console.log('[mupdf] job done', message.jobId, 'rects', message.rectCount);
        clearJobTimeout();
        const active = activeRef.current;
        activeRef.current = null;
        if (active && active.id === message.jobId) {
          try {
            active.resolve(base64ToUint8Array(message.base64));
          } catch (error) {
            active.reject(error instanceof Error ? error : new Error(String(error)));
          }
        }
        void pump();
      }
    },
    [clearJobTimeout, pump]
  );

  if (Platform.OS === 'web' || !html || !baseUrl) {
    return null;
  }

  return (
    <View style={styles.host} pointerEvents="none" collapsable={false}>
      <WebView
        key={webKey}
        ref={webRef}
        source={{ html, baseUrl }}
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
          console.warn('[mupdf] WebView onError', event.nativeEvent.description);
          const active = activeRef.current;
          if (active) {
            clearJobTimeout();
            activeRef.current = null;
            active.reject(new Error(event.nativeEvent.description || 'MuPDF WebView failed'));
            void pump();
          }
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
    left: -5000,
    top: 0,
    width: 400,
    height: 400,
    opacity: 1,
    zIndex: -1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#111',
  },
});
