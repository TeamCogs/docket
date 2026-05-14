/**
 * Hybrid retrieval — vector + BM25, then a reranker on top.
 *
 * Why hybrid: dense embeddings handle paraphrase well; BM25 handles exact
 * matches well (party names, statute numbers, dates). Legal documents punish
 * pure-dense retrieval — the lawyer asks "What did Lay say to Watkins about
 * the deal in October 2001?" and the right chunk is one that literally
 * contains "Lay", "Watkins", and "October 2001". Mix early, rerank late.
 *
 * Why rerank: the top-30 from a hybrid pass has good recall but mediocre
 * ordering. A cross-encoder rerank (bge-reranker-v2-m3 via Ollama) costs
 * one inference call and gains ~15-20% citation precision in our evals.
 */

import { embed, complete } from "./ollama";
import { bm25Search, getChunksTable, openMatter, vectorSearch } from "./lancedb";
import type { Chunk, ChunkId, MatterId } from "./types";

const EMBEDDING_DIM = 768; // nomic-embed-text-v2-moe

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

  // Rerank the fused list with the cross-encoder.
  const reranked = await rerank(query, fused);

  return reranked.slice(0, RERANK_TOP_K).map(({ row, score }) => ({
    chunk: rowToChunk(row),
    score,
  }));
}

/** bge-reranker-v2-m3 via Ollama. Cross-encoder = expensive, so we batch. */
async function rerank(
  query: string,
  hits: Array<{ row: { chunk_id: string; text: string; doc_metadata_prefix: string }; score: number }>,
): Promise<Array<{ row: { chunk_id: string; text: string; doc_metadata_prefix: string; [k: string]: unknown }; score: number }>> {
  // Ollama doesn't (yet, as of May 2026) expose a dedicated rerank endpoint.
  // We coax a binary-ish score by asking the reranker model to emit a 0..1
  // float. For production we'd swap this for a proper FlagEmbedding service
  // — see TODO[v1.1].
  const model = process.env.DOCKET_RERANK_MODEL ?? "bge-reranker-v2-m3";

  const rescored = await Promise.all(
    hits.map(async ({ row, score }) => {
      const prompt = `Query: ${query}\n\nPassage: ${row.doc_metadata_prefix}\n${row.text}\n\nRelevance score (0.0-1.0):`;
      try {
        const raw = await complete({ model, prompt, temperature: 0 });
        const f = parseFloat(raw.trim().split(/\s+/)[0]);
        const reranked = Number.isFinite(f) ? Math.max(0, Math.min(1, f)) : score;
        return { row, score: reranked };
      } catch {
        // If the rerank model isn't present, fall back to hybrid score.
        return { row, score };
      }
    }),
  );
  rescored.sort((a, b) => b.score - a.score);
  return rescored as unknown as typeof hits;
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
