/**
 * LanceDB embedded — the local vector store.
 *
 * One LanceDB directory per matter. Deleting a matter is `rm -rf` on a single
 * folder, which keeps the privacy story crisp ("you can hand-delete data;
 * nothing's hidden in a global index").
 *
 * Server-only — must never import this from a client component.
 */

import * as lancedb from "@lancedb/lancedb";
import { join } from "node:path";
import type { Chunk, MatterId } from "./types";

const DATA_DIR = process.env.DOCKET_DATA_DIR ?? "./data/matters";

interface ChunkRow {
  chunk_id: string;
  doc_id: string;
  chunk_index: number;
  page_start: number;
  page_end: number;
  char_start: number;
  char_end: number;
  text: string;
  doc_metadata_prefix: string;
  vector: number[];
}

/** Resolve the LanceDB directory for a matter. */
export function matterPath(matterId: MatterId): string {
  return join(DATA_DIR, matterId, "vectors.lance");
}

/** Open (or create) the LanceDB connection for a matter. */
export async function openMatter(matterId: MatterId): Promise<lancedb.Connection> {
  return lancedb.connect(matterPath(matterId));
}

const CHUNKS_TABLE = "chunks";

/** Get-or-create the chunks table for a matter. */
export async function getChunksTable(
  conn: lancedb.Connection,
  embeddingDim: number,
): Promise<lancedb.Table> {
  const tables = await conn.tableNames();
  if (tables.includes(CHUNKS_TABLE)) {
    return conn.openTable(CHUNKS_TABLE);
  }
  const dummy: ChunkRow = {
    chunk_id: "schema",
    doc_id: "schema",
    chunk_index: 0,
    page_start: 0,
    page_end: 0,
    char_start: 0,
    char_end: 0,
    text: "",
    doc_metadata_prefix: "",
    vector: new Array(embeddingDim).fill(0),
  };
  const table = await conn.createTable(CHUNKS_TABLE, [dummy]);
  // Drop the schema row.
  await table.delete("chunk_id = 'schema'");
  // Build the HNSW vector index.
  await table.createIndex("vector", { config: lancedb.Index.hnswSq({ m: 16, efConstruction: 200 }) });
  // Full-text index for BM25 — hybrid retrieval requires both.
  await table.createIndex("text", { config: lancedb.Index.fts() });
  return table;
}

export async function insertChunks(
  table: lancedb.Table,
  chunks: Chunk[],
  embeddings: number[][],
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error(`chunk/embedding count mismatch: ${chunks.length} vs ${embeddings.length}`);
  }
  const rows: ChunkRow[] = chunks.map((c, i) => ({
    chunk_id: c.id,
    doc_id: c.docId,
    chunk_index: c.chunkIndex,
    page_start: c.pageStart,
    page_end: c.pageEnd,
    char_start: c.charStart,
    char_end: c.charEnd,
    text: c.text,
    doc_metadata_prefix: c.docMetadataPrefix,
    vector: embeddings[i],
  }));
  await table.add(rows);
}

/** Vector search (cosine). */
export async function vectorSearch(
  table: lancedb.Table,
  embedding: number[],
  k: number,
): Promise<ChunkRow[]> {
  const res = await table.search(embedding).limit(k).toArray();
  return res as ChunkRow[];
}

/** Full-text BM25 search. */
export async function bm25Search(table: lancedb.Table, query: string, k: number): Promise<ChunkRow[]> {
  // LanceDB FTS is keyword-style; for BM25-flavored ranking we pass the raw query.
  const res = await (table as unknown as { query: () => { fullTextSearch: (q: string) => { limit: (n: number) => { toArray: () => Promise<unknown[]> } } } })
    .query()
    .fullTextSearch(query)
    .limit(k)
    .toArray();
  return res as ChunkRow[];
}

/** Load a chunk by id, for the source viewer. */
export async function getChunk(table: lancedb.Table, chunkId: string): Promise<ChunkRow | null> {
  const res = await table.query().where(`chunk_id = '${chunkId.replace(/'/g, "''")}'`).limit(1).toArray();
  return (res[0] as ChunkRow) ?? null;
}
