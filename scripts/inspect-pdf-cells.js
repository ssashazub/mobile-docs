const fs = require('fs');
const path = require('path');

const pdfPath = 'c:/Users/1/Downloads/Telegram Desktop/звіт вд.pdf';
const bytes = fs.readFileSync(pdfPath);
const s = bytes.toString('latin1');

console.log('size', bytes.length);
console.log('Count', (s.match(/\/Count\s+(\d+)/) || [])[1]);
console.log('Page dicts', (s.match(/\/Type\s*\/Page\b/g) || []).length);
console.log('Image', (s.match(/\/Subtype\s*\/Image/g) || []).length);
console.log('Form XObject', (s.match(/\/Subtype\s*\/Form/g) || []).length);
console.log('re ops samples', (s.match(/[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+re/g) || []).slice(0, 15));
console.log('re count', (s.match(/[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+re/g) || []).length);
console.log('Do samples', (s.match(/\/[A-Za-z0-9.#]+\s+Do/g) || []).slice(0, 30));
console.log('Do count', (s.match(/\/[A-Za-z0-9.#]+\s+Do/g) || []).length);
console.log('m/l samples', (s.match(/[\d.]+\s+[\d.]+\s+m[\r\n\s]+[\d.]+\s+[\d.]+\s+l/g) || []).slice(0, 5));
console.log('has Flate', /FlateDecode/.test(s));

// Try pdfjs from asset via copying worker approach - use pdfjs-dist if we npm install
async function main() {
  let pdfjs;
  try {
    pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  } catch {
    console.log('Installing pdfjs-dist temporarily...');
    require('child_process').execSync('npm install pdfjs-dist@3.11.174 --no-save', {
      stdio: 'inherit',
    });
    pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  }

  pdfjs.GlobalWorkerOptions.workerSrc = require.resolve(
    'pdfjs-dist/legacy/build/pdf.worker.js'
  );

  const data = new Uint8Array(bytes);
  const doc = await pdfjs.getDocument({ data, disableWorker: true }).promise;
  console.log('pdfjs pages', doc.numPages);

  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  console.log('viewport', viewport.width, viewport.height);

  const ops = await page.getOperatorList();
  const OPS = pdfjs.OPS;
  const freq = {};
  for (const fn of ops.fnArray) {
    const name = Object.keys(OPS).find((k) => OPS[k] === fn) || String(fn);
    freq[name] = (freq[name] || 0) + 1;
  }
  console.log(
    'top ops',
    Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
  );

  const rectCount = ops.fnArray.filter((fn) => fn === OPS.rectangle).length;
  console.log('rectangle ops', rectCount);
  const constructCount = ops.fnArray.filter((fn) => fn === OPS.constructPath).length;
  console.log('constructPath ops', constructCount);

  // Dump first few rectangle args
  let shown = 0;
  for (let i = 0; i < ops.fnArray.length && shown < 20; i++) {
    if (ops.fnArray[i] === OPS.rectangle) {
      console.log('rect', ops.argsArray[i]);
      shown += 1;
    }
  }

  // Inspect constructPath for rectangles
  let pathRects = 0;
  let pathLines = 0;
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] !== OPS.constructPath) continue;
    const [subOps, subArgs] = ops.argsArray[i];
    for (let s = 0; s < subOps.length; s++) {
      if (subOps[s] === OPS.rectangle) pathRects += 1;
      if (subOps[s] === OPS.lineTo) pathLines += 1;
    }
  }
  console.log('constructPath rectangles', pathRects, 'lineTos', pathLines);

  const text = await page.getTextContent();
  console.log('text items', text.items.length);
  console.log(
    'text sample',
    text.items.slice(0, 8).map((t) => t.str)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
