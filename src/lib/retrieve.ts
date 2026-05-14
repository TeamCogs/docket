/**
 * Hybrid retrieval — vector + BM25, with rerank pluggable on top.
 *
 * Why hybrid: dense embeddings handle paraphrase well; BM25 handles exact
 * matches well (party names, statute numbers, dates). Legal documents punish
 * pure-dense retrieval — the lawyer asks "What did Lay say to Watkins about
 * the deal in October 2001?" and the right chunk is one that literally
 * contains "Lay", "Watkins", and "October 2001". Mix early, rerank late.
 *
 * Reranking status: Ollama (as of May 2026) does not serve cross-encoder
 * rerankers. The week-1 build runs without rerank — just the top-K from the
 * RRF-fused hybrid pass. Week 2 work adds a small Python sidecar that loads
 * BAAI/bge-reranker-v2-m3 and exposes a /rerank endpoint. The eval harness
 * is what tells us how much precision we leave on the table by skipping it.
 * See TODO[scott] below.
 */

import { embed } from "./ollama";
import { bm25Search, getChunksTable, openMatter, vectorSearch } from "./lancedb";
import type { Chunk, ChunkId, MatterId } from "./types";

const EMBEDDING_DIM = 768; // nomic-embed-text (Ollama, v1.5)

const HYBRID_TOP_K = 30;
const RERANK_TOP_K = 8;

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
 * Cross-encoder rerank.
 *
 * TODO[scott] week 2: implement this against a Python sidecar that loads
 * BAAI/bge-reranker-v2-m3. The sidecar should expose POST /rerank taking
 * { query: string, passages: string[] } and returning { scores: number[] }.
 * Re-run `pnpm eval` before and after to capture the precision delta on
 * the Enron golden set — the README claim depends on a measured number.
 *
 * For week 1 this is a passthrough so the pipeline runs end-to-end without
 * the reranker. The hybrid-retrieval-only ordering is good enough to
 * demonstrate the rest of the system (grounding, citation rendering, eval).
 */
async function rerankCandidates(
  _query: string,
  hits: Array<{ row: { chunk_id: string; text: string; doc_metadata_prefix: string }; score: number }>,
): Promise<typeof hits> {
  return hits;
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
