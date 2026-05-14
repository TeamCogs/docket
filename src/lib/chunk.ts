/**
 * Recursive character splitter.
 *
 * Why this and not Anthropic-style contextual retrieval at ingest time:
 *   - Contextual retrieval (Anthropic, Sept 2024) is ~35-50% retrieval-quality
 *     win, but it requires one LLM call per chunk at ingest. On a local 32B
 *     model at 25 tok/s, contextualizing a 500-page deposition would take
 *     hours. We can't pay that cost on a lawyer's laptop on first ingest.
 *   - Instead we prepend a deterministic doc-level metadata header to every
 *     chunk: "[Case: <matter> | Doc: <filename> | Pages: N-M]". That gets
 *     embedded along with the chunk text and recovers most of the locality
 *     signal at zero ingest cost.
 *   - If retrieval quality is insufficient (eval harness will tell us),
 *     revisit contextual retrieval as a v1.1 opt-in.
 */

import type { Chunk, DocId } from "./types";

const TARGET_TOKENS = 800;
const OVERLAP_TOKENS = 100;
// Rough conversion — fine for splitting. We're not paying tokens.
const CHARS_PER_TOKEN = 4;

const SEPARATORS = ["\n\n\n", "\n\n", "\n", ". ", " ", ""];

export interface ChunkInput {
  docId: DocId;
  matterName: string;
  filename: string;
  text: string;
  pageMap: Array<{ page: number; charStart: number; charEnd: number }>;
}

export function chunk(input: ChunkInput): Chunk[] {
  const target = TARGET_TOKENS * CHARS_PER_TOKEN;
  const overlap = OVERLAP_TOKENS * CHARS_PER_TOKEN;

  const rawSpans = splitWithSeparators(input.text, target, SEPARATORS);

  const chunks: Chunk[] = [];
  let cursor = 0;
  for (let i = 0; i < rawSpans.length; i++) {
    const text = rawSpans[i];
    const charStart = cursor;
    const charEnd = cursor + text.length;
    cursor = charEnd - overlap;

    const [pageStart, pageEnd] = pageRange(input.pageMap, charStart, charEnd);

    chunks.push({
      id: `${input.docId}#${i}`,
      docId: input.docId,
      chunkIndex: i,
      pageStart,
      pageEnd,
      charStart,
      charEnd,
      text,
      docMetadataPrefix: `[Case: ${input.matterName} | Doc: ${input.filename} | Pages: ${pageStart}-${pageEnd}]`,
    });
  }
  return chunks;
}

function splitWithSeparators(text: string, target: number, separators: string[]): string[] {
  if (text.length <= target) return [text];
  for (const sep of separators) {
    if (sep === "") {
      // Last-resort hard split.
      const out: string[] = [];
      for (let i = 0; i < text.length; i += target) out.push(text.slice(i, i + target));
      return out;
    }
    if (!text.includes(sep)) continue;
    const parts = text.split(sep);
    return mergeUntilSize(parts, sep, target);
  }
  return [text];
}

function mergeUntilSize(parts: string[], sep: string, target: number): string[] {
  const out: string[] = [];
  let buf = "";
  for (const p of parts) {
    const next = buf ? buf + sep + p : p;
    if (next.length > target && buf) {
      out.push(buf);
      buf = p;
    } else {
      buf = next;
    }
  }
  if (buf) out.push(buf);
  return out;
}

function pageRange(
  pageMap: ChunkInput["pageMap"],
  charStart: number,
  charEnd: number,
): [number, number] {
  if (pageMap.length === 0) return [1, 1];
  let start = pageMap[0].page;
  let end = pageMap[0].page;
  for (const pm of pageMap) {
    if (pm.charStart <= charStart) start = pm.page;
    if (pm.charStart <= charEnd) end = pm.page;
  }
  return [start, end];
}
