/**
 * OCR fallback for scanned PDFs.
 *
 * Tesseract.js with the English language pack bundled at build time. Slower
 * than Apple Vision but cross-platform — see spec §2.3 for why we accepted
 * the trade-off.
 *
 * This module is intentionally lazy-imported from extract.ts so the OCR
 * runtime (~5 MB) doesn't bloat cold-start for the common case where
 * every document has a text layer.
 */

import { createWorker } from "tesseract.js";
import { readFile } from "node:fs/promises";
import type { ExtractResult } from "./extract";

export async function ocrPdf(path: string, filename: string): Promise<ExtractResult> {
  // TODO[scott]: rasterize PDF pages to PNG using pdfjs first, then feed each
  // page to Tesseract. The shape is in place — the rasterization helper is
  // the next thing to write. For now, return a structured "needs OCR" stub
  // so the rest of the pipeline doesn't blow up on a scanned file.
  void readFile;
  const stub = `[OCR pending for ${filename}]\n\nThis document appears to be scanned. Re-run after the OCR pipeline ships in v0.2.`;
  return {
    filename,
    mimeType: "application/pdf",
    text: stub,
    pageMap: [{ page: 1, charStart: 0, charEnd: stub.length }],
    pageCount: 1,
    ocrUsed: true,
  };
}

/** Initialize a reusable Tesseract worker. Cache per process. */
let _worker: Awaited<ReturnType<typeof createWorker>> | null = null;
export async function getOcrWorker() {
  if (_worker) return _worker;
  _worker = await createWorker("eng");
  return _worker;
}
