const fs = require('fs');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

function extractThinLineGrid(ops, OPS) {
  const hLines = [];
  const vLines = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] !== OPS.constructPath) continue;
    const subOps = ops.argsArray[i][0] || [];
    const subArgs = ops.argsArray[i][1] || [];
    let cursor = 0;
    for (let s = 0; s < subOps.length; s++) {
      if (subOps[s] === OPS.rectangle) {
        const x = subArgs[cursor];
        const y = subArgs[cursor + 1];
        const w = Math.abs(subArgs[cursor + 2]);
        const h = Math.abs(subArgs[cursor + 3]);
        cursor += 4;
        if (h <= 2.5 && w >= 12) {
          hLines.push({ y: y + h / 2, x1: Math.min(x, x + w), x2: Math.max(x, x + w) });
        } else if (w <= 2.5 && h >= 12) {
          vLines.push({ x: x + w / 2, y1: Math.min(y, y + h), y2: Math.max(y, y + h) });
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
  return { hLines, vLines };
}

function cluster(values, tol) {
  const sorted = [...values].sort((a, b) => a - b);
  const groups = [];
  for (const v of sorted) {
    const g = groups[groups.length - 1];
    if (!g || Math.abs(g.sum / g.n - v) > tol) {
      groups.push({ sum: v, n: 1, vals: [v] });
    } else {
      g.sum += v;
      g.n += 1;
      g.vals.push(v);
    }
  }
  return groups.map((g) => g.sum / g.n);
}

function buildCells(hLines, vLines) {
  const ys = cluster(
    hLines.map((l) => l.y),
    1.2
  );
  const xs = cluster(
    vLines.map((l) => l.x),
    1.2
  );
  const cells = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const y1 = ys[i];
    const y2 = ys[i + 1];
    const height = y2 - y1;
    if (height < 10 || height > 220) continue;
    for (let j = 0; j < xs.length - 1; j++) {
      const x1 = xs[j];
      const x2 = xs[j + 1];
      const width = x2 - x1;
      if (width < 14 || width > 580) continue;
      // require supporting h/v lines near these coords
      const hasTop = hLines.some((l) => Math.abs(l.y - y2) < 1.8 && l.x1 <= x1 + 2 && l.x2 >= x2 - 2);
      const hasBottom = hLines.some((l) => Math.abs(l.y - y1) < 1.8 && l.x1 <= x1 + 2 && l.x2 >= x2 - 2);
      const hasLeft = vLines.some((l) => Math.abs(l.x - x1) < 1.8 && l.y1 <= y1 + 2 && l.y2 >= y2 - 2);
      const hasRight = vLines.some((l) => Math.abs(l.x - x2) < 1.8 && l.y1 <= y1 + 2 && l.y2 >= y2 - 2);
      if (hasTop && hasBottom && hasLeft && hasRight) {
        cells.push({ x: x1, y: y1, width, height });
      }
    }
  }
  return cells;
}

(async () => {
  const data = new Uint8Array(fs.readFileSync('c:/Users/1/Downloads/Telegram Desktop/звіт вд.pdf'));
  const doc = await pdfjs.getDocument({ data, disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const ops = await page.getOperatorList();
  const { hLines, vLines } = extractThinLineGrid(ops, pdfjs.OPS);
  console.log('hLines', hLines.length, 'vLines', vLines.length);
  const cells = buildCells(hLines, vLines);
  console.log('cells', cells.length);
  console.log(
    'sample',
    cells.slice(0, 15).map((c) => ({
      x: Math.round(c.x),
      y: Math.round(c.y),
      w: Math.round(c.width),
      h: Math.round(c.height),
    }))
  );
})().catch((e) => console.error(e));
