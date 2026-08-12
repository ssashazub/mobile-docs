import type { MupdfRedactRect } from '@/lib/mupdf-redact-rects';

export type MupdfRedactJobRequest = {
  id: string;
  pdfBytes: Uint8Array;
  rects: MupdfRedactRect[];
  resolve: (bytes: Uint8Array) => void;
  reject: (error: Error) => void;
};

type MupdfBridge = {
  enqueue: (job: MupdfRedactJobRequest) => void;
  isReady: () => boolean;
};

let bridge: MupdfBridge | null = null;
let jobSeq = 0;

export function registerMupdfBridge(next: MupdfBridge | null): void {
  bridge = next;
}

export function isMupdfBridgeReady(): boolean {
  return bridge?.isReady() === true;
}

/**
 * Permanently remove text inside rects via MuPDF WASM (content-stream redaction).
 * Requires `<MupdfPdfProcessor />` mounted (root layout).
 */
export function redactPdfWithMupdf(
  pdfBytes: Uint8Array,
  rects: MupdfRedactRect[]
): Promise<Uint8Array> {
  if (rects.length === 0) {
    return Promise.resolve(pdfBytes);
  }

  if (!bridge) {
    return Promise.reject(new Error('MuPDF processor is not mounted'));
  }

  return new Promise((resolve, reject) => {
    jobSeq += 1;
    bridge!.enqueue({
      id: `mupdf-job-${jobSeq}`,
      pdfBytes,
      rects,
      resolve,
      reject,
    });
  });
}
