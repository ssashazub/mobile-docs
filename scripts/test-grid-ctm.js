const fs = require('fs');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

function multiply(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

function apply(m, x, y) {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
}

function extractGrid(ops, OPS) {
  const hLines = [];
  const vLines = [];
  const stack = [];
  let ctm = [1, 0, 0, 1, 0, 0];

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i] || [];

    if (fn === OPS.save) {
      stack.push(ctm.slice());
    } else if (fn === OPS.restore) {
      ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    } else if (fn === OPS.transform) {
      ctm = multiply(ctm, args);
    } else if (fn === OPS.constructPath) {
      const subOps = args[0] || [];
      const subArgs = args[1] || [];
      let cursor = 0;
      for (let s = 0; s < subOps.length; s++) {
        if (subOps[s] === OPS.rectangle) {
          const x = subArgs[cursor];
          const y = subArgs[cursor + 1];
          const w = subArgs[cursor + 2];
          const h = subArgs[cursor + 3];
          cursor += 4;
          const p1 = apply(ctm, x, y);
          const p2 = apply(ctm, x + w, y + h);
          const rx = Math.min(p1.x, p2.x);
          const ry = Math.min(p1.y, p2.y);
          const rw = Math.abs(p2.x - p1.x);
          const rh = Math.abs(p2.y - p1.y);
          if (rh <= 2.5 && rw >= 10) {
            hLines.push({ y: ry + rh / 2, x1: rx, x2: rx + rw });
          } else if (rw <= 2.5 && rh >= 10) {
            vLines.push({ x: rx + rw / 2, y1: ry, y2: ry + rh });
          }
        } else if (subOps[s] === OPS.moveTo || subOps[s] === OPS.lineTo) {
          cursor += 2;
        } else if (subOps[s] === OPS.curveTo) {
          cursor += 6;
        } else {
          break;
        }
      }
    }
  }
  return { hLines, vLines };
}

function cluster(values, tol) {
  const sorted = [...values].sort((a, b) => a - b);
  const groups = [];
  for (const v of sorted) {
    const g = groups[groups.length - 1];
    if (!g || Math.abs(g.sum / g.n - v) > tol) groups.push({ sum: v, n: 1 });
    else {
      g.sum += v;
      g.n += 1;
    }
  }
  return groups.map((g) => g.sum / g.n);
}

function buildCells(hLines, vLines, pageWidth, pageHeight) {
  const ys = cluster(
    hLines.map((l) => l.y),
    1.25
  );
  const xs = cluster(
    vLines.map((l) => l.x),
    1.25
  );
  const cells = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const y1 = ys[i];
    const y2 = ys[i + 1];
    const height = y2 - y1;
    if (height < 10 || height > Math.min(240, pageHeight * 0.45)) continue;
    for (let j = 0; j < xs.length - 1; j++) {
      const x1 = xs[j];
      const x2 = xs[j + 1];
      const width = x2 - x1;
      if (width < 12 || width > pageWidth * 0.98) continue;
      const hasTop = hLines.some((l) => Math.abs(l.y - y2) < 2 && l.x1 <= x1 + 3 && l.x2 >= x2 - 3);
      const hasBottom = hLines.some((l) => Math.abs(l.y - y1) < 2 && l.x1 <= x1 + 3 && l.x2 >= x2 - 3);
      const hasLeft = vLines.some((l) => Math.abs(l.x - x1) < 2 && l.y1 <= y1 + 3 && l.y2 >= y2 - 3);
      const hasRight = vLines.some((l) => Math.abs(l.x - x2) < 2 && l.y1 <= y1 + 3 && l.y2 >= y2 - 3);
      if (!(hasTop && hasBottom && hasLeft && hasRight)) continue;
      if (x1 < -2 || y1 < -2 || x2 > pageWidth + 4 || y2 > pageHeight + 4) continue;
      cells.push({ x: x1, y: y1, width, height });
    }
  }
  return cells;
}

(async () => {
  const data = new Uint8Array(fs.readFileSync('c:/Users/1/Downloads/Telegram Desktop/звіт вд.pdf'));
  const doc = await pdfjs.getDocument({ data, disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const ops = await page.getOperatorList();
  const { hLines, vLines } = extractGrid(ops, pdfjs.OPS);
  console.log('hLines', hLines.length, 'vLines', vLines.length);
  console.log(
    'x range',
    Math.min(...vLines.map((l) => l.x)),
    Math.max(...vLines.map((l) => l.x))
  );
  console.log(
    'y range',
    Math.min(...hLines.map((l) => l.y)),
    Math.max(...hLines.map((l) => l.y))
  );
  const cells = buildCells(hLines, vLines, vp.width, vp.height);
  console.log('cells', cells.length);
  console.log(
    'sample',
    cells.slice(0, 20).map((c) => ({
      x: +c.x.toFixed(1),
      y: +c.y.toFixed(1),
      w: +c.width.toFixed(1),
      h: +c.height.toFixed(1),
    }))
  );
})().catch(console.error);
