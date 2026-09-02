import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * MuPDF.js WASM runtime for native PDF redaction (AGPL-3.0-or-later).
 * The app is AGPL-licensed; see assets/mupdf/AGPL-NOTICE.txt and LICENSE.
 */
const MUPDF_DIR = `${FileSystem.cacheDirectory}mupdf-runtime-v8/`;

let scriptsPromise: Promise<void> | null = null;

async function copyAssetToFile(moduleId: number, fileName: string): Promise<void> {
  const destination = `${MUPDF_DIR}${fileName}`;
  const info = await FileSystem.getInfoAsync(destination);
  if (info.exists) {
    return;
  }

  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const sourceUri = asset.localUri ?? asset.uri;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
}

async function ensureScripts(): Promise<void> {
  if (!scriptsPromise) {
    scriptsPromise = (async () => {
      const dirInfo = await FileSystem.getInfoAsync(MUPDF_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(MUPDF_DIR, { intermediates: true });
      }

      await copyAssetToFile(require('../../assets/mupdf/mupdf.js.txt'), 'mupdf.js');
      await copyAssetToFile(require('../../assets/mupdf/mupdf-wasm.js.txt'), 'mupdf-wasm.js');
      await copyAssetToFile(require('../../assets/mupdf/mupdf-wasm.wasm.bin'), 'mupdf-wasm.wasm');
    })().catch((error) => {
      scriptsPromise = null;
      throw error;
    });
  }

  await scriptsPromise;
}

/**
 * Classic (non-module) HTML shell.
 * Android WebView blocks ES module imports from file:// — we load JS via XHR,
 * rewrite the wasm helper to a blob URL, then dynamic-import the blob.
 */
function buildProcessorHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>mupdf-redact</title>
</head>
<body>
  <pre id="log">boot</pre>
  <script>
    (function () {
      var logEl = document.getElementById('log');
      function setLog(text) {
        if (logEl) logEl.textContent = text;
      }

      function post(payload) {
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        } catch (err) {}
      }

      function fail(err) {
        var message = (err && err.message) ? err.message : String(err);
        setLog('error: ' + message);
        post({ type: 'error', message: message });
      }

      function loadArrayBuffer(url) {
        return new Promise(function (resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.responseType = 'arraybuffer';
          xhr.onload = function () {
            if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
              resolve(xhr.response);
            } else {
              reject(new Error('XHR status ' + xhr.status + ' for ' + url));
            }
          };
          xhr.onerror = function () {
            reject(new Error('XHR failed for ' + url));
          };
          xhr.send();
        });
      }

      function loadText(url) {
        return new Promise(function (resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.responseType = 'text';
          xhr.onload = function () {
            if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
              resolve(xhr.responseText);
            } else {
              reject(new Error('XHR status ' + xhr.status + ' for ' + url));
            }
          };
          xhr.onerror = function () {
            reject(new Error('XHR failed for ' + url));
          };
          xhr.send();
        });
      }

      function uint8ToBase64(bytes) {
        var chunk = 0x8000;
        var binary = '';
        for (var i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
      }

      var mupdfPromise = null;

      function loadMupdf() {
        if (mupdfPromise) {
          return mupdfPromise;
        }
        mupdfPromise = (async function () {
          setLog('loading wasm');
          var wasmBinary = await loadArrayBuffer('./mupdf-wasm.wasm');
          // locateFile MUST be set: when the ESM is loaded from a blob/data URL,
          // mupdf-wasm.js does new URL("mupdf-wasm.wasm", import.meta.url) and
          // Android WebView throws "Failed to construct URL: Invalid URL".
          globalThis.$libmupdf_wasm_Module = {
            wasmBinary: wasmBinary,
            locateFile: function (path) {
              return 'https://mupdf.local/' + path;
            }
          };

          setLog('loading scripts');
          var wasmJsText = await loadText('./mupdf-wasm.js');
          // Hard-disable the import.meta.url resolution path (Android blob origins
          // make new URL(rel, import.meta.url) throw Invalid URL).
          wasmJsText = wasmJsText.split(
            'new URL("mupdf-wasm.wasm",import.meta.url).href'
          ).join('"https://mupdf.local/mupdf-wasm.wasm"');
          wasmJsText = wasmJsText.split(
            "new URL('mupdf-wasm.wasm',import.meta.url).href"
          ).join('"https://mupdf.local/mupdf-wasm.wasm"');

          var wasmBlobUrl = URL.createObjectURL(
            new Blob([wasmJsText], { type: 'text/javascript' })
          );

          var mupdfJsText = await loadText('./mupdf.js');
          mupdfJsText = mupdfJsText.split('./mupdf-wasm.js').join(wasmBlobUrl);
          if (mupdfJsText.indexOf(wasmBlobUrl) === -1) {
            throw new Error('Failed to rewrite mupdf-wasm import');
          }

          var mupdfBlobUrl = URL.createObjectURL(
            new Blob([mupdfJsText], { type: 'text/javascript' })
          );

          setLog('importing mupdf');
          var mod = await import(mupdfBlobUrl);
          setLog('mupdf ready');
          return mod;
        })().catch(function (err) {
          mupdfPromise = null;
          throw err;
        });
        return mupdfPromise;
      }

      window.__runMupdfRedact__ = function (job) {
        (async function () {
          try {
            setLog('job ' + (job && job.jobId));
            var mupdf = await loadMupdf();
            var Document = mupdf.Document || (mupdf.default && mupdf.default.Document);
            var PDFPage = mupdf.PDFPage || (mupdf.default && mupdf.default.PDFPage);
            if (!Document || !PDFPage) {
              throw new Error('MuPDF exports missing Document/PDFPage');
            }

            var pdfBuffer = await loadArrayBuffer(job.pdfUrl || './document.pdf');
            var doc = Document.openDocument(pdfBuffer, 'application/pdf');
            var pdf = doc.asPDF();
            if (!pdf) {
              throw new Error('Not a PDF document');
            }

            var rects = job.rects || [];
            var byPage = {};
            for (var i = 0; i < rects.length; i++) {
              var r = rects[i];
              var key = String(r.pageIndex);
              if (!byPage[key]) byPage[key] = [];
              byPage[key].push(r);
            }

            function rectsOverlap(a, b) {
              return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
            }

            function quadToRect(q) {
              var xs = [q[0], q[2], q[4], q[6]];
              var ys = [q[1], q[3], q[5], q[7]];
              return [
                Math.min.apply(null, xs),
                Math.min.apply(null, ys),
                Math.max.apply(null, xs),
                Math.max.apply(null, ys)
              ];
            }

            function addRedactRect(page, rect) {
              var annot = page.createAnnotation('Redact');
              annot.setRect(rect);
              annot.update();
            }

            var pageKeys = Object.keys(byPage);
            var redacted = 0;
            for (var p = 0; p < pageKeys.length; p++) {
              var pageIndex = Number(pageKeys[p]);
              var page = pdf.loadPage(pageIndex);
              var pageRects = byPage[pageKeys[p]];
              for (var j = 0; j < pageRects.length; j++) {
                var box = pageRects[j];
                var fieldRect = [box.x0, box.y0, box.x1, box.y1];
                var usedSearch = false;
                var needle = (box.searchText || '').trim();
                if (needle && page.search) {
                  try {
                    var hits = page.search(needle) || [];
                    for (var h = 0; h < hits.length; h++) {
                      var quads = hits[h] || [];
                      for (var qi = 0; qi < quads.length; qi++) {
                        var qr = quadToRect(quads[qi]);
                        if (rectsOverlap(qr, fieldRect)) {
                          var pad = 0.6;
                          addRedactRect(page, [
                            qr[0] - pad,
                            qr[1] - pad,
                            qr[2] + pad,
                            qr[3] + pad
                          ]);
                          usedSearch = true;
                          redacted += 1;
                        }
                      }
                    }
                  } catch (es) {}
                }
                if (!usedSearch) {
                  addRedactRect(page, fieldRect);
                  redacted += 1;
                }
              }
              // Text-only forms: never touch image pixels — REDACT_IMAGE_PIXELS
              // rewrites overlapping images and degrades table lines / backgrounds.
              page.applyRedactions(
                false,
                PDFPage.REDACT_IMAGE_NONE,
                PDFPage.REDACT_LINE_ART_NONE,
                PDFPage.REDACT_TEXT_REMOVE
              );
              try { page.destroy(); } catch (e0) {}
            }

            // Incremental save keeps untouched streams/fonts as in the source PDF.
            var saveOpts = pdf.canBeSavedIncrementally() ? 'incremental' : '';
            var out = pdf.saveToBuffer(saveOpts);
            var bytes = out.asUint8Array();
            setLog('done bytes=' + bytes.length + ' redacts=' + redacted);
            post({
              type: 'done',
              jobId: job.jobId,
              base64: uint8ToBase64(bytes),
              rectCount: rects.length,
              redactCount: redacted,
            });
            try { pdf.destroy(); } catch (e1) {}
            try { doc.destroy(); } catch (e2) {}
          } catch (err) {
            fail(err);
          }
        })();
      };

      window.__runMupdfSelfTest__ = function () {
        (async function () {
          try {
            setLog('selftest');
            var mupdf = await loadMupdf();
            var Document = mupdf.Document || (mupdf.default && mupdf.default.Document);
            if (!Document) {
              throw new Error('Document export missing');
            }
            setLog('selftest ok');
            post({ type: 'selftest', ok: true });
          } catch (err) {
            var message = (err && err.message) ? err.message : String(err);
            setLog('selftest fail: ' + message);
            post({ type: 'selftest', ok: false, message: message });
          }
        })();
      };

      setLog('ready');
      post({ type: 'ready' });
      // Prove WASM/ESM boot works before any export job.
      setTimeout(function () {
        try { window.__runMupdfSelfTest__(); } catch (e) {}
      }, 50);
    })();
  </script>
</body>
</html>`;
}

export async function ensureMupdfRuntime(): Promise<{ dir: string; htmlUri: string }> {
  await ensureScripts();

  const htmlUri = `${MUPDF_DIR}processor.html`;
  await FileSystem.writeAsStringAsync(htmlUri, buildProcessorHtml(), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { dir: MUPDF_DIR, htmlUri };
}
