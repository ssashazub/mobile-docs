import Constants from 'expo-constants';

import { getAppVersion } from '@/lib/about-actions';

/** Public git tag or branch that matches store builds (AGPL corresponding source). */
export const APP_SOURCE_CODE_URL =
  (Constants.expoConfig?.extra?.sourceCodeUrl as string | undefined) ??
  'https://github.com/ssashazub/mobile-docs';

export const APP_LICENSE_URL = `${APP_SOURCE_CODE_URL}/blob/main/LICENSE`;

export const MUPDF_LICENSE_URL = 'https://www.gnu.org/licenses/agpl-3.0.html';
export const MUPDF_UPSTREAM_URL = 'https://github.com/ArtifexSoftware/mupdf.js';

export type ThirdPartyLibrary = {
  name: string;
  license: string;
  url: string;
  role: string;
};

export const THIRD_PARTY_LIBRARIES: ThirdPartyLibrary[] = [
  {
    name: 'MuPDF.js',
    license: 'AGPL-3.0-or-later',
    url: MUPDF_UPSTREAM_URL,
    role: 'PDF redaction (Artifex Software)',
  },
  {
    name: 'PDF.js',
    license: 'Apache-2.0',
    url: 'https://github.com/mozilla/pdf.js',
    role: 'PDF preview and field detection',
  },
  {
    name: 'pdf-lib',
    license: 'MIT',
    url: 'https://github.com/Hopding/pdf-lib',
    role: 'PDF export overlays and metadata',
  },
  {
    name: '@pdf-lib/fontkit',
    license: 'MIT',
    url: 'https://github.com/Hopding/fontkit',
    role: 'Font embedding',
  },
];

/** Tag URL for the version currently installed (best-effort AGPL pointer). */
export function getSourceCodeUrlForInstalledVersion(): string {
  const version = getAppVersion();
  if (!version || version === '1.0.0') {
    return APP_SOURCE_CODE_URL;
  }
  return `${APP_SOURCE_CODE_URL}/releases/tag/v${version}`;
}
