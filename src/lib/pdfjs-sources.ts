import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

/** Bump when rasterizer HTML/JS wiring changes so devices pick up a fresh runtime. */
const PDFJS_DIR = `${FileSystem.cacheDirectory}pdfjs-runtime-v16/`;

let scriptsPromise: Promise<void> | null = null;

async function copyAssetToFile(moduleId: number, fileName: string): Promise<void> {
  const destination = `${PDFJS_DIR}${fileName}`;
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
      const dirInfo = await FileSystem.getInfoAsync(PDFJS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(PDFJS_DIR, { intermediates: true });
      }

      await copyAssetToFile(require('../../assets/pdfjs/pdf.min.js.txt'), 'pdf.min.js');
      await copyAssetToFile(require('../../assets/pdfjs/pdf.worker.min.js.txt'), 'pdf.worker.min.js');
    })().catch((error) => {
      scriptsPromise = null;
      throw error;
    });
  }

  await scriptsPromise;
}

function buildRasterizerHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    html, body { margin: 0; padding: 0; background: #111; width: 100%; height: 100%; }
    #status { color: #fff; font: 12px sans-serif; padding: 8px; }
  </style>
</head>
<body>
  <div id="status">boot</div>
  <script src="./pdf.min.js"></script>
  <script>
    (function () {
      var statusEl = document.getElementById('status');
      function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
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
        setStatus('error: ' + message);
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
              reject(new Error('XHR status ' + xhr.status));
            }
          };
          xhr.onerror = function () {
            reject(new Error('XHR failed for ' + url));
          };
          xhr.send();
        });
      }

      function multiply(m1, m2) {
        return [
          m1[0] * m2[0] + m1[2] * m2[1],
          m1[1] * m2[0] + m1[3] * m2[1],
          m1[0] * m2[2] + m1[2] * m2[3],
          m1[1] * m2[2] + m1[3] * m2[3],
          m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
          m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
        ];
      }

      function applyMat(m, x, y) {
        return {
          x: m[0] * x + m[2] * y + m[4],
          y: m[1] * x + m[3] * y + m[5]
        };
      }

      function clusterValues(values, tol) {
        var sorted = values.slice().sort(function (a, b) { return a - b; });
        var groups = [];
        for (var i = 0; i < sorted.length; i++) {
          var v = sorted[i];
          var g = groups[groups.length - 1];
          if (!g || Math.abs(g.sum / g.n - v) > tol) {
            groups.push({ sum: v, n: 1 });
          } else {
            g.sum += v;
            g.n += 1;
          }
        }
        return groups.map(function (g) { return g.sum / g.n; });
      }

      function itemHeight(item) {
        var h = Math.abs(item.transform[3] || 0);
        if (!h && item.height) h = Math.abs(item.height);
        // Real table text is often 6–9pt; never inflate a missing size to 10.
        if (!h || h < 3) h = 7;
        return h;
      }

      function isBoldFontName(name) {
        var n = String(name || '')
          .toLowerCase()
          .replace(/\\+/g, '')
          .replace(/[\\s_,-]+/g, '');
        return (
          n.indexOf('bold') !== -1 ||
          n.indexOf('black') !== -1 ||
          n.indexOf('heavy') !== -1 ||
          n.indexOf('semibold') !== -1 ||
          n.indexOf('demibold') !== -1 ||
          n.indexOf('extrabold') !== -1 ||
          n.indexOf('mediumbold') !== -1 ||
          n.indexOf('жирн') !== -1 ||
          /(?:^|[^a-z])bd(?:[^a-z]|$)/.test(n)
        );
      }

      /**
       * Build a set of PDF.js font ids that are visually bold on this page.
       * Many Ukrainian forms use embedded fonts without "Bold" in the name —
       * row codes / section headers usually use the bold face.
       */
      function buildBoldFontSet(items, styles) {
        var boldFonts = {};
        var usage = {};

        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          var fn = item && item.fontName;
          if (!fn) continue;
          var str = String(item.str || '').trim();
          if (!str) continue;

          var style = (styles && styles[fn]) || {};
          var family = String(style.fontFamily || '');
          if (isBoldFontName(family) || isBoldFontName(fn) || isBoldFontName(family + fn)) {
            boldFonts[fn] = true;
          }

          if (!usage[fn]) {
            usage[fn] = { header: 0, code: 0, body: 0 };
          }

          // Section titles / Roman-numeral rows are almost always bold.
          if (
            /^(актив|пасив|разом|усього|итого|всего|баланс)\\b/i.test(str) ||
            /^[ivxlcіх]{1,8}\\./i.test(str) ||
            (str.length <= 28 &&
              str === str.toUpperCase() &&
              /[A-ZА-ЯІЇЄҐ]{3,}/.test(str))
          ) {
            usage[fn].header += 1;
            boldFonts[fn] = true;
          } else if (/^\\d{3,4}$/.test(str)) {
            // Balance-sheet row codes (1000–9999) are typically bold.
            usage[fn].code += 1;
          } else {
            usage[fn].body += 1;
          }
        }

        var names = Object.keys(usage);
        for (var u = 0; u < names.length; u++) {
          var name = names[u];
          var stats = usage[name];
          // Font used for row codes more than for long body text → bold face.
          if (stats.code >= 3 && stats.code >= stats.body * 0.25) {
            boldFonts[name] = true;
          }
          if (stats.header >= 1 && stats.code + stats.header >= 2) {
            boldFonts[name] = true;
          }
        }

        return boldFonts;
      }

      function isBoldTextItem(item, styles, boldFonts) {
        if (!item) return false;
        if (item.fontName && boldFonts && boldFonts[item.fontName]) {
          return true;
        }
        var style = (styles && item.fontName && styles[item.fontName]) || {};
        return isBoldFontName(style.fontFamily) || isBoldFontName(item.fontName);
      }

      function cleanLabel(raw) {
        return String(raw || '')
          .replace(/[:：.\\s]*$/, '')
          .replace(/[_….\\-]{2,}/g, '')
          .replace(/\\s+/g, ' ')
          .trim();
      }

      function pushH(hLines, y, x1, x2) {
        if (x2 - x1 < 6) return;
        hLines.push({ y: y, x1: x1, x2: x2 });
      }

      function pushV(vLines, x, y1, y2) {
        if (y2 - y1 < 6) return;
        vLines.push({ x: x, y1: y1, y2: y2 });
      }

      /**
       * Table grids are drawn either as thin filled rects (certificates)
       * or as stroked moveTo/lineTo segments (balance sheets). Detect both.
       */
      function extractGridLines(ops) {
        var OPS = window.pdfjsLib.OPS || {};
        var hLines = [];
        var vLines = [];
        var stack = [];
        var ctm = [1, 0, 0, 1, 0, 0];
        var fnArray = ops.fnArray || [];
        var argsArray = ops.argsArray || [];

        for (var i = 0; i < fnArray.length; i++) {
          var fn = fnArray[i];
          var args = argsArray[i] || [];

          if (fn === OPS.save) {
            stack.push(ctm.slice());
          } else if (fn === OPS.restore) {
            ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
          } else if (fn === OPS.transform) {
            ctm = multiply(ctm, args);
          } else if (fn === OPS.constructPath) {
            var subOps = args[0] || [];
            var subArgs = args[1] || [];
            var cursor = 0;
            var last = null;
            for (var s = 0; s < subOps.length; s++) {
              if (subOps[s] === OPS.rectangle) {
                var x = subArgs[cursor];
                var y = subArgs[cursor + 1];
                var w = subArgs[cursor + 2];
                var h = subArgs[cursor + 3];
                cursor += 4;
                var p1 = applyMat(ctm, x, y);
                var p2 = applyMat(ctm, x + w, y + h);
                var rx = Math.min(p1.x, p2.x);
                var ry = Math.min(p1.y, p2.y);
                var rw = Math.abs(p2.x - p1.x);
                var rh = Math.abs(p2.y - p1.y);
                if (rh <= 2.8 && rw >= 8) {
                  pushH(hLines, ry + rh / 2, rx, rx + rw);
                } else if (rw <= 2.8 && rh >= 8) {
                  pushV(vLines, rx + rw / 2, ry, ry + rh);
                } else if (rw >= 10 && rh >= 8 && rw <= 900 && rh <= 400) {
                  // Closed stroked/filled cell outline → treat edges as grid lines.
                  pushH(hLines, ry, rx, rx + rw);
                  pushH(hLines, ry + rh, rx, rx + rw);
                  pushV(vLines, rx, ry, ry + rh);
                  pushV(vLines, rx + rw, ry, ry + rh);
                }
                last = null;
              } else if (subOps[s] === OPS.moveTo) {
                var mx = subArgs[cursor];
                var my = subArgs[cursor + 1];
                cursor += 2;
                last = applyMat(ctm, mx, my);
              } else if (subOps[s] === OPS.lineTo) {
                var lx = subArgs[cursor];
                var ly = subArgs[cursor + 1];
                cursor += 2;
                var pt = applyMat(ctm, lx, ly);
                if (last) {
                  var dx = Math.abs(pt.x - last.x);
                  var dy = Math.abs(pt.y - last.y);
                  if (dy <= 1.2 && dx >= 6) {
                    pushH(hLines, (last.y + pt.y) / 2, Math.min(last.x, pt.x), Math.max(last.x, pt.x));
                  } else if (dx <= 1.2 && dy >= 6) {
                    pushV(vLines, (last.x + pt.x) / 2, Math.min(last.y, pt.y), Math.max(last.y, pt.y));
                  }
                }
                last = pt;
              } else if (subOps[s] === OPS.curveTo) {
                cursor += 6;
                last = null;
              } else {
                break;
              }
            }
          }
        }

        return { hLines: hLines, vLines: vLines };
      }

      function coverageH(hLines, y, x1, x2) {
        var sum = 0;
        for (var i = 0; i < hLines.length; i++) {
          var l = hLines[i];
          if (Math.abs(l.y - y) > 2.2) continue;
          sum += Math.max(0, Math.min(l.x2, x2) - Math.max(l.x1, x1));
        }
        return sum;
      }

      function coverageV(vLines, x, y1, y2) {
        var sum = 0;
        for (var i = 0; i < vLines.length; i++) {
          var l = vLines[i];
          if (Math.abs(l.x - x) > 2.2) continue;
          sum += Math.max(0, Math.min(l.y2, y2) - Math.max(l.y1, y1));
        }
        return sum;
      }

      function strongAxisPositions(lines, kind, tol, pageSize) {
        var raw = clusterValues(
          lines.map(function (l) { return kind === 'v' ? l.x : l.y; }),
          tol
        );
        var out = [];
        for (var i = 0; i < raw.length; i++) {
          var pos = raw[i];
          var total = 0;
          var segs = 0;
          for (var j = 0; j < lines.length; j++) {
            var l = lines[j];
            if (kind === 'v') {
              if (Math.abs(l.x - pos) > tol + 0.2) continue;
              total += l.y2 - l.y1;
              segs += 1;
            } else {
              if (Math.abs(l.y - pos) > tol + 0.2) continue;
              total += l.x2 - l.x1;
              segs += 1;
            }
          }
          // Drop short rulings from side micro-tables (e.g. КОДИ block) that
          // otherwise split the real rightmost column into tiny fragments.
          if (total >= pageSize * 0.35 || total >= 400 || segs >= 18) {
            out.push(pos);
          }
        }
        return out;
      }

      function buildGridCells(hLines, vLines, pageWidth, pageHeight) {
        var ys = clusterValues(hLines.map(function (l) { return l.y; }), 1.3);
        var xs = strongAxisPositions(vLines, 'v', 1.3, pageHeight);
        if (xs.length < 2) {
          xs = clusterValues(vLines.map(function (l) { return l.x; }), 1.3);
        }
        var cells = [];

        for (var i = 0; i < ys.length - 1; i++) {
          for (var j = 0; j < xs.length - 1; j++) {
            var x1 = xs[j];
            var x2 = xs[j + 1];
            var y1 = ys[i];
            var y2 = ys[i + 1];
            var width = x2 - x1;
            var height = y2 - y1;
            if (width < 10 || height < 8) continue;
            if (height > Math.min(280, pageHeight * 0.55)) continue;
            if (width > pageWidth * 0.98) continue;
            if (x1 < -3 || y1 < -3 || x2 > pageWidth + 5 || y2 > pageHeight + 5) continue;

            var top = coverageH(hLines, y2, x1, x2) / width;
            var bot = coverageH(hLines, y1, x1, x2) / width;
            var left = coverageV(vLines, x1, y1, y2) / height;
            var right = coverageV(vLines, x2, y1, y2) / height;
            var edges = 0;
            if (top >= 0.35) edges += 1;
            if (bot >= 0.35) edges += 1;
            if (left >= 0.35) edges += 1;
            if (right >= 0.35) edges += 1;
            if (edges < 3) continue;

            cells.push({ x: x1, y: y1, width: width, height: height });
          }
        }

        return cells;
      }

      function analyzeTextInCell(items, rect, styles, boldFonts) {
        var count = 0;
        var chars = 0;
        var boldChars = 0;
        var labelTop = -Infinity;
        var labelBottom = Infinity;
        var labelRight = -Infinity;
        var parts = [];
        var fontSum = 0;

        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          var str = String(item.str || '').trim();
          if (!str) continue;
          var ih = itemHeight(item);
          var iw = item.width || 0;
          var ix = item.transform[4];
          var iy = item.transform[5];
          var cx = ix + iw / 2;
          var cy = iy + ih / 2;
          if (cx < rect.x || cx > rect.x + rect.width || cy < rect.y || cy > rect.y + rect.height) {
            continue;
          }
          count += 1;
          chars += str.length;
          if (isBoldTextItem(item, styles, boldFonts)) {
            boldChars += str.length;
          }
          fontSum += ih;
          labelTop = Math.max(labelTop, iy + ih);
          labelBottom = Math.min(labelBottom, iy);
          labelRight = Math.max(labelRight, ix + iw);
          parts.push({ str: str, x: ix, y: iy, w: iw, h: ih });
        }

        parts.sort(function (a, b) {
          if (Math.abs(b.y - a.y) > 2) return b.y - a.y;
          return a.x - b.x;
        });

        var text = parts.map(function (p) { return p.str; }).join(' ').replace(/\\s+/g, ' ').trim();
        var label = cleanLabel(text.split(/\\n/)[0] || text).slice(0, 80);
        var fontSize = count > 0 ? fontSum / count : Math.min(8, Math.max(5.5, rect.height * 0.5));
        // Never let detected size exceed what fits the cell visually.
        fontSize = Math.min(fontSize, Math.max(5, rect.height * 0.62));
        var bold = chars > 0 && boldChars >= chars * 0.4;

        var align = 'left';
        if (parts.length > 0) {
          var minX = Infinity;
          var maxX = -Infinity;
          for (var p = 0; p < parts.length; p++) {
            minX = Math.min(minX, parts[p].x);
            maxX = Math.max(maxX, parts[p].x + parts[p].w);
          }
          var textMid = (minX + maxX) / 2;
          var cellMid = rect.x + rect.width / 2;
          var delta = textMid - cellMid;
          var slop = Math.max(3, rect.width * 0.1);
          if (Math.abs(delta) <= slop) {
            align = 'center';
          } else if (delta > slop) {
            align = 'right';
          } else {
            align = 'left';
          }
        } else if (rect.width >= 28 && rect.width <= 200) {
          // Empty value columns in forms/tables are usually centered.
          align = 'center';
        }

        return {
          count: count,
          chars: chars,
          labelBottom: labelBottom,
          labelRight: labelRight,
          label: label,
          value: text,
          fontSize: fontSize,
          bold: bold,
          align: align,
          empty: count === 0
        };
      }

      function buildFillRect(cell, inside) {
        var pad = 1.2;
        var isCheckbox =
          cell.width <= 22 && cell.height <= 22 && Math.abs(cell.width - cell.height) < 6;

        if (isCheckbox) {
          return {
            x: cell.x + 1,
            y: cell.y + 1,
            width: cell.width - 2,
            height: cell.height - 2,
            label: inside.label || '☐',
            value: inside.value || '',
            fontSize: Math.min(inside.fontSize || 9, cell.height * 0.65),
            bold: !!inside.bold,
            align: 'center',
            checkbox: true
          };
        }

        // Tall form cells: label on top, blank band below (animal certificate).
        if (!inside.empty && cell.height >= 28) {
          var belowTop = inside.labelBottom - 2;
          var belowHeight = belowTop - (cell.y + pad);
          if (
            belowHeight >= 12 &&
            belowHeight >= cell.height * 0.28 &&
            inside.chars >= 8
          ) {
            return {
              x: cell.x + pad,
              y: cell.y + pad,
              width: Math.max(10, cell.width - pad * 2),
              height: belowHeight,
              label: inside.label || '',
              value: '',
              fontSize: Math.min(8, Math.max(5.5, belowHeight * 0.45)),
              bold: !!inside.bold,
              align: 'left',
              checkbox: false
            };
          }
        }

        // Table / Smallpdf: edit the whole cell at the original glyph size.
        return {
          x: cell.x + pad,
          y: cell.y + pad,
          width: Math.max(8, cell.width - pad * 2),
          height: Math.max(7, cell.height - pad * 2),
          label: inside.label || '',
          value: inside.value || '',
          fontSize: Math.min(inside.fontSize || 7.5, Math.max(5, cell.height * 0.58)),
          bold: !!inside.bold,
          align: inside.align || 'left',
          checkbox: false
        };
      }

      function detectFieldsOnPage(page, pageIndex) {
        var viewport = page.getViewport({ scale: 1 });
        var pageWidth = viewport.width;
        var pageHeight = viewport.height;

        return Promise.all([page.getTextContent(), page.getOperatorList()]).then(function (results) {
          var textContent = results[0] || {};
          var items = (textContent.items || []).filter(function (item) {
            return item && item.str && String(item.str).trim().length > 0;
          });
          var styles = textContent.styles || {};
          var boldFonts = buildBoldFontSet(items, styles);
          var grid = extractGridLines(results[1]);
          var cells = buildGridCells(grid.hLines, grid.vLines, pageWidth, pageHeight);
          var fields = [];

          for (var c = 0; c < cells.length; c++) {
            var cell = cells[c];
            var inside = analyzeTextInCell(items, cell, styles, boldFonts);
            var fill = buildFillRect(cell, inside);
            if (!fill) continue;
            fields.push({
              pageIndex: pageIndex,
              x: fill.x,
              y: fill.y,
              width: fill.width,
              height: fill.height,
              label: fill.label || (fill.checkbox ? '☐' : ''),
              value: fill.value || '',
              fontSize: fill.fontSize,
              bold: !!fill.bold,
              align: fill.align || 'left'
            });
          }

          // Smallpdf-style: also expose text runs not covered by a grid cell
          // (headers, stamps, free labels).
          for (var t = 0; t < items.length; t++) {
            var item = items[t];
            var str = String(item.str || '').trim();
            if (str.length < 1) continue;
            var ih = itemHeight(item);
            var iw = Math.max(item.width || 0, ih * 0.4);
            var ix = item.transform[4];
            var iy = item.transform[5];
            var cx = ix + iw / 2;
            var cy = iy + ih / 2;

            var insideCell = false;
            for (var gc = 0; gc < cells.length; gc++) {
              var g = cells[gc];
              if (cx >= g.x && cx <= g.x + g.width && cy >= g.y && cy <= g.y + g.height) {
                insideCell = true;
                break;
              }
            }
            if (insideCell) continue;

            fields.push({
              pageIndex: pageIndex,
              x: ix - 0.5,
              y: iy - 0.5,
              width: iw + 1,
              height: ih + 1,
              label: cleanLabel(str).slice(0, 80),
              value: str,
              fontSize: ih,
              bold: isBoldTextItem(item, styles, boldFonts),
              align: 'left'
            });
          }

          if (fields.length > 600) {
            fields = fields.slice(0, 600);
          }

          return fields;
        });
      }

      try {
        if (!window.pdfjsLib) {
          fail(new Error('pdfjsLib missing'));
          return;
        }

        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        window.__startRaster__ = function (pdfPath, opts) {
          setStatus('loading pdf');
          var detected = [];
          opts = opts || {};
          // Target sharp display on modern phone DPI (small table text needs headroom).
          var cssWidth = Number(opts.cssWidth) || 390;
          var dpr = Number(opts.dpr) || 2;
          var targetPx = cssWidth * Math.max(dpr, 2) * 1.65;

          loadArrayBuffer(pdfPath || './document.pdf')
            .then(function (buffer) {
              setStatus('parsing pdf');
              return window.pdfjsLib.getDocument({ data: buffer }).promise;
            })
            .then(function (pdf) {
              var total = pdf.numPages;
              var index = 1;

              function next() {
                if (index > total) {
                  post({ type: 'detectedFields', fields: detected });
                  setStatus('done');
                  post({ type: 'done', total: total });
                  return;
                }

                setStatus('page ' + index + '/' + total);
                post({ type: 'progress', pageIndex: index - 1, total: total });

                pdf.getPage(index).then(function (page) {
                  var base = page.getViewport({ scale: 1 });
                  var scale = Math.min(4.5, Math.max(3.0, targetPx / base.width));
                  var viewport = page.getViewport({ scale: scale });
                  var canvas = document.createElement('canvas');
                  var widthPx = Math.floor(viewport.width);
                  var heightPx = Math.floor(viewport.height);
                  canvas.width = widthPx;
                  canvas.height = heightPx;
                  // Keep in DOM so some WebViews allocate a full-size backing store.
                  canvas.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0;';
                  document.body.appendChild(canvas);
                  var ctx = canvas.getContext('2d', { alpha: false });
                  if (!ctx) {
                    fail(new Error('canvas context missing'));
                    return null;
                  }
                  ctx.imageSmoothingEnabled = false;

                  return page.render({ canvasContext: ctx, viewport: viewport }).promise
                    .then(function () {
                      var dataUri = canvas.toDataURL('image/jpeg', 0.97);
                      post({
                        type: 'page',
                        pageIndex: index - 1,
                        total: total,
                        widthPt: base.width,
                        heightPt: base.height,
                        imageWidth: widthPx,
                        imageHeight: heightPx,
                        dataUri: dataUri
                      });
                      if (canvas.parentNode) {
                        canvas.parentNode.removeChild(canvas);
                      }
                      canvas.width = 0;
                      canvas.height = 0;
                      return detectFieldsOnPage(page, index - 1);
                    })
                    .then(function (pageFields) {
                      detected = detected.concat(pageFields || []);
                      index += 1;
                      setTimeout(next, 0);
                    });
                }).catch(fail);
              }

              next();
            })
            .catch(fail);
        };

        setStatus('ready');
        post({ type: 'ready' });
      } catch (err) {
        fail(err);
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Materialize PDF.js scripts + HTML shell on disk for file:// WebView loading.
 */
export async function ensurePdfJsRuntime(): Promise<{ dir: string; htmlUri: string }> {
  await ensureScripts();

  const htmlUri = `${PDFJS_DIR}rasterizer.html`;
  await FileSystem.writeAsStringAsync(htmlUri, buildRasterizerHtml(), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { dir: PDFJS_DIR, htmlUri };
}
