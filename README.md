# Mobile Docs

Expo / React Native app for importing and editing PDF forms (Ukrainian balance sheets and similar documents).

## License

**This project is licensed under [GNU AGPL v3.0 or later](https://www.gnu.org/licenses/agpl-3.0.html).**

MuPDF.js (Artifex) is included for PDF redaction and is also AGPL-licensed. Using MuPDF in a distributed app without a [commercial license from Artifex](https://artifex.com/contact/mupdf-js) requires publishing the **complete corresponding source code** of this application under AGPL.

### What you must do before publishing to App Store / Google Play

1. **Publish source** — push this repository (or a public fork) to GitHub/GitLab. Set the URL in `app.json` → `extra.sourceCodeUrl`.
2. **Tag each release** — for app version `1.2.0`, create git tag `v1.2.0` and build from that commit.
3. **Keep source available** — AGPL requires corresponding source to remain accessible for at least three years after distribution.
4. **In-app notice** — users can open **Settings → Open source** for license text and source links.

See also [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).

## Get started

```bash
npm install
npx expo start
```

## Build (EAS)

```bash
npx eas build --profile preview --platform android
```
