/**
 * Hybrid retrieval — vector + BM25 + cross-encoder rerank.
 *
 * Pipeline:
 *   1. Dense vector search (nomic-embed-text) → top 30 candidates
 *   2. BM25 keyword search                   → top 30 candidates
 *   3. Reciprocal-rank fusion                → unified top-30 list
 *   4. Cross-encoder rerank (bge-reranker-v2-m3 sidecar) → final top-8
 *
 * The reranker sidecar is optional. If RERANKER_URL is unreachable the
 * pipeline falls back to RRF ordering silently, so the app stays functional
 * without it running.
 *
 * Start the sidecar:
 *   pip install -r reranker/requirements.txt
 *   python -m uvicorn reranker.server:app --host 127.0.0.1 --port 8001
 */

import { embed } from "./ollama";
import { bm25Search, getChunksTable, openMatter, vectorSearch } from "./lancedb";
import type { Chunk, ChunkId, MatterId } from "./types";

const EMBEDDING_DIM = 768; // nomic-embed-text (Ollama, v1.5)

const HYBRID_TOP_K = 30;
const RERANK_TOP_K = 8;

const RERANKER_URL = process.env.RERANKER_URL ?? "http://127.0.0.1:8001";

/** Reciprocal-rank fusion weights. Vector beats BM25 a bit by default. */
const VECTOR_WEIGHT = 0.6;
const BM25_WEIGHT = 0.4;
const RRF_K = 60;

export interface RetrievedChunk {
  chunk: Chunk;
  score: number;
}

export async function retrieve(matterId: MatterId, query: string): Promise<RetrievedChunk[]> {
  const conn = await openMatter(matterId);
  const table = await getChunksTable(conn, EMBEDDING_DIM);

  const [embeddings] = [await embed([query])];
  const queryEmbedding = embeddings[0];

  const [vecHits, bmHits] = await Promise.all([
    vectorSearch(table, queryEmbedding, HYBRID_TOP_K),
    bm25Search(table, query, HYBRID_TOP_K),
  ]);

  // Reciprocal rank fusion — cleanly normalizes the two ranked lists.
  const scores = new Map<string, number>();
  const byId = new Map<string, (typeof vecHits)[0]>();

  vecHits.forEach((row, idx) => {
    scores.set(row.chunk_id, (scores.get(row.chunk_id) ?? 0) + VECTOR_WEIGHT / (RRF_K + idx + 1));
    byId.set(row.chunk_id, row);
  });
  bmHits.forEach((row, idx) => {
    scores.set(row.chunk_id, (scores.get(row.chunk_id) ?? 0) + BM25_WEIGHT / (RRF_K + idx + 1));
    if (!byId.has(row.chunk_id)) byId.set(row.chunk_id, row);
  });

  const fused = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, HYBRID_TOP_K)
    .map(([id, score]) => ({ row: byId.get(id)!, score }));

  // Rerank step. Week 1: passthrough (returns the top-K from RRF as-is).
  // Week 2: swap in the bge-reranker-v2-m3 sidecar — see TODO[scott] below.
  const reranked = await rerankCandidates(query, fused);

  return reranked.slice(0, RERANK_TOP_K).map(({ row, score }) => ({
    chunk: rowToChunk(row),
    score,
  }));
}

/**
 * Cross-encoder rerank via the bge-reranker-v2-m3 Python sidecar.
 *
 * Generic over R so the full row type flows through — callers get back the
 * same objects they passed in, just re-scored and re-sorted. This also fixes
 * the narrow-type mismatch that previously caused a TS2345 error.
 *
 * Graceful degradation: any fetch error (sidecar not running, timeout, etc.)
 * falls back to the RRF-ordered input silently.
 */
async function rerankCandidates<R extends { text: string; doc_metadata_prefix: string }>(
  query: string,
  hits: Array<{ row: R; score: number }>,
): Promise<Array<{ row: R; score: number }>> {
  if (hits.length === 0) return hits;
  try {
    // Include the metadata prefix so the cross-encoder sees document provenance
    // (e.g. "SEC Complaint" vs "10-K Exhibit") as part of the passage context.
    const passages = hits.map((h) =>
      h.row.doc_metadata_prefix ? `${h.row.doc_metadata_prefix}\n${h.row.text}` : h.row.text,
    );
    const res = await fetch(`${RERANKER_URL}/rerank`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, passages }),
    });
    if (!res.ok) throw new Error(`reranker HTTP ${res.status}`);
    const { scores } = (await res.json()) as { scores: number[] };
    return hits
      .map((h, i) => ({ ...h, score: scores[i] ?? h.score }))
      .sort((a, b) => b.score - a.score);
  } catch {
    return hits; // sidecar unavailable — fall back to RRF ordering
  }
}

function rowToChunk(row: {
  chunk_id: string;
  doc_id: string;
  chunk_index: number;
  page_start: number;
  page_end: number;
  char_start: number;
  char_end: number;
  text: string;
  doc_metadata_prefix: string;
}): Chunk {
  return {
    id: row.chunk_id as ChunkId,
    docId: row.doc_id,
    chunkIndex: row.chunk_index,
    pageStart: row.page_start,
    pageEnd: row.page_end,
    charStart: row.char_start,
    charEnd: row.char_end,
    text: row.text,
    docMetadataPrefix: row.doc_metadata_prefix,
  };
}
