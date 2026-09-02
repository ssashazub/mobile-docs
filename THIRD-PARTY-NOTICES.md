# Third-party notices

Mobile Docs is licensed under **GNU AGPL v3.0 or later**. See [LICENSE](./LICENSE) and [COPYING](./COPYING).

## MuPDF.js (AGPL-3.0-or-later)

- **Product:** MuPDF.js / MuPDF WebAssembly
- **Copyright:** Artifex Software, Inc.
- **License:** GNU Affero General Public License v3.0 or later
- **Used for:** permanent PDF text redaction during export of imported forms
- **Bundled files:** `assets/mupdf/`, runtime copied to app cache (`mupdf-runtime-v*`)
- **Upstream:** https://github.com/ArtifexSoftware/mupdf.js
- **License text:** https://www.gnu.org/licenses/agpl-3.0.html
- **Commercial licensing:** https://artifex.com/contact/mupdf-js

This application uses MuPDF under the AGPL. Corresponding source for the entire
application (including MuPDF integration) is published at the URL shown in
Settings → Open source.

## PDF.js (Apache-2.0)

- **Used for:** PDF page rasterization and text detection in WebView
- **Bundled files:** `assets/pdfjs/`, runtime copied to app cache (`pdfjs-runtime-v*`)
- **Upstream:** https://github.com/mozilla/pdf.js

## pdf-lib (MIT)

- **Used for:** PDF overlay drawing, whiteout rectangles, metadata, form fields
- **Upstream:** https://github.com/Hopding/pdf-lib

## @pdf-lib/fontkit (MIT)

- **Used for:** custom font embedding in exported PDFs
- **Upstream:** https://github.com/Hopding/fontkit

## Expo / React Native ecosystem

Expo SDK, React Native, and their dependencies are used under their respective
open-source licenses (mostly MIT). See `package-lock.json` for the full tree.
