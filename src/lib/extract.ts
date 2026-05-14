/**
 * Document extraction — PDF and DOCX in, plain text + page map out.
 *
 * Decision tree per file:
 *   .pdf   → unpdf text extraction → if avg chars/page < 50, escalate to OCR
 *   .docx  → mammoth
 *   .txt   → straight read
 *   .eml   → simple header+body extraction
 *
 * Returns a PageMap so chunk citations can resolve back to a specific page.
 * Without this, span-level citations are impossible.
 */

import { extractText } from "unpdf";
import mammoth from "mammoth";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

export interface ExtractResult {
  filename: string;
  mimeType: string;
  text: string;
  pageMap: Array<{ page: number; charStart: number; charEnd: number }>;
  pageCount: number;
  ocrUsed: boolean;
}

/** Pages whose average character count is below this trigger OCR fallback. */
const OCR_THRESHOLD_CHARS_PER_PAGE = 50;

export async function extract(path: string): Promise<ExtractResult> {
  const ext = extname(path).toLowerCase();
  const filename = basename(path);

  if (ext === ".pdf") return extractPdf(path, filename);
  if (ext === ".docx") return extractDocx(path, filename);
  if (ext === ".txt" || ext === ".md") return extractPlain(path, filename, ext);
  if (ext === ".eml") return extractEml(path, filename);

  throw new Error(`Unsupported file type: ${ext} (${filename})`);
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

async function extractPdf(path: string, filename: string): Promise<ExtractResult> {
  const buf = await readFile(path);
  const pdf = await extractText(new Uint8Array(buf), { mergePages: false });
  const pages = Array.isArray(pdf.text) ? pdf.text : [pdf.text];

  const avgChars = pages.reduce((acc, p) => acc + (p?.length ?? 0), 0) / Math.max(pages.length, 1);
  if (avgChars < OCR_THRESHOLD_CHARS_PER_PAGE) {
    // Scanned. Hand off to OCR (lazy import to keep cold-start fast).
    const { ocrPdf } = await import("./ocr");
    return ocrPdf(path, filename);
  }

  return assemble({
    pages,
    filename,
    mimeType: "application/pdf",
    ocrUsed: false,
  });
}

// ─── DOCX ────────────────────────────────────────────────────────────────────

async function extractDocx(path: string, filename: string): Promise<ExtractResult> {
  const buf = await readFile(path);
  const { value } = await mammoth.extractRawText({ buffer: buf });
  // DOCX has no concept of pages until rendered. Approximate every ~3000 chars
  // as a "page" for citation purposes — close enough for ~A4 at 11pt.
  const PSEUDO_PAGE = 3000;
  const pages: string[] = [];
  for (let i = 0; i < value.length; i += PSEUDO_PAGE) {
    pages.push(value.slice(i, i + PSEUDO_PAGE));
  }
  if (pages.length === 0) pages.push("");
  return assemble({
    pages,
    filename,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ocrUsed: false,
  });
}

// ─── plain text / markdown ───────────────────────────────────────────────────

async function extractPlain(path: string, filename: string, ext: string): Promise<ExtractResult> {
  const text = await readFile(path, "utf-8");
  return assemble({
    pages: [text],
    filename,
    mimeType: ext === ".md" ? "text/markdown" : "text/plain",
    ocrUsed: false,
  });
}

// ─── email (.eml) ────────────────────────────────────────────────────────────

async function extractEml(path: string, filename: string): Promise<ExtractResult> {
  const raw = await readFile(path, "utf-8");
  // Very simple: split on the first blank line. Real email parsing would use
  // a library like mailparser. For the Enron corpus this is enough.
  const split = raw.indexOf("\n\n");
  const headers = split >= 0 ? raw.slice(0, split) : raw;
  const body = split >= 0 ? raw.slice(split + 2) : "";
  const text = `${headers}\n\n${body}`;
  return assemble({
    pages: [text],
    filename,
    mimeType: "message/rfc822",
    ocrUsed: false,
  });
}

// ─── shared helpers ──────────────────────────────────────────────────────────

function assemble(input: {
  pages: string[];
  filename: string;
  mimeType: string;
  ocrUsed: boolean;
}): ExtractResult {
  let cursor = 0;
  const pageMap: ExtractResult["pageMap"] = [];
  const buf: string[] = [];
  for (let i = 0; i < input.pages.length; i++) {
    const t = input.pages[i] ?? "";
    pageMap.push({ page: i + 1, charStart: cursor, charEnd: cursor + t.length });
    buf.push(t);
    cursor += t.length + 2; // page-break newlines
    buf.push("\n\n");
  }
  return {
    filename: input.filename,
    mimeType: input.mimeType,
    text: buf.join(""),
    pageMap,
    pageCount: input.pages.length,
    ocrUsed: input.ocrUsed,
  };
}
