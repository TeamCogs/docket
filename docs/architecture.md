# Architecture

This is the technical deep-dive companion to the README. For the product
rationale, start with the [main spec](../Docket-SPEC.md).

## Process model

Tauri 2.0 supervises three children:

```
┌────────────────────── Tauri host ──────────────────────┐
│                                                        │
│   ┌── Webview (WKWebView on macOS) ──┐                 │
│   │   Next.js 15 frontend            │                 │
│   │   IPC over `invoke()` only       │                 │
│   └───────────────────────────────────┘                 │
│              │                                          │
│              ▼ Tauri IPC                                │
│   ┌── Rust core ──────────────────────┐                 │
│   │   Audited file/socket surface     │                 │
│   │   Sidecar supervision             │                 │
│   └───────────────────────────────────┘                 │
│              │                                          │
│      ┌───────┴────────┐                                 │
│      ▼                ▼                                 │
│   ┌───────────┐   ┌─────────────┐                        │
│   │  Ollama   │   │ Tesseract   │                        │
│   │  sidecar  │   │ (per-doc)   │                        │
│   │ (unix sock)│  └─────────────┘                        │
│   └───────────┘                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

The webview cannot reach the filesystem or the model directly. Every
operation flows through one of the enumerated IPC commands in
`src-tauri/src/ipc/mod.rs`. That enumeration is the auditable surface that
supports the "no data leaves" claim.

## RAG pipeline

```
ingest_folder
  ↓
  for each file:
    extract text  (unpdf | mammoth | tesseract fallback)
    detect language → skip if non-English in v1
    write to extracted/
  ↓
  chunk recursive char splitter, ~800 tokens, 100 overlap
  ↓
  prepend doc-level metadata prefix to each chunk
  ↓
  embed (nomic-embed-text-v2-moe, batched)
  ↓
  insert into LanceDB chunks table
  ↓
  cluster pass (k=2) → flag outlier docs

generate_brief (per matter)
  ↓
  for each of 8 sections:
    retrieve top-30 chunks (hybrid: 0.6 vector + 0.4 BM25, RRF-fused)
    rerank top-30 → top-8 (bge-reranker-v2-m3)
    structured JSON generation (Qwen3-32B, temperature 0.1)
    parse with Zod
    for each item:
      re-grounding pass:
        tier 1: bigram overlap ≥ 0.4 → grounded
        tier 2: embedding cosine ≥ 0.78 → grounded
        tier 3: LLM-as-judge binary check
      if unsupported: drop, increment suppressedCount
    stream completed section to UI
```

## Data model

One LanceDB store per matter. Tables:

- `documents` — per-file metadata (filename, page count, ingestion time, OCR flag).
- `chunks` — chunk text, page span, char offsets, embedding.
- `brief_sections` — generated brief sections, model version, latency.
- `citations` — claim → chunk(s) mapping with grounding state.

See `src/lib/types.ts` for the canonical TypeScript types and
`src/lib/lancedb.ts` for the SQL-ish row shapes.

## Citation rendering

Two-pass.

**Pass 1** — Generation. The model receives numbered passages `[1]..[8]` in
its prompt and is asked to emit JSON `{ items: [{ text, chunk_refs: [...] }] }`.

**Pass 2** — Re-grounding. For each emitted item, the pipeline verifies the
claim is actually supported by the cited chunks. Three-tier verification,
cheapest first:

1. **Bigram overlap.** Cheap, catches most paraphrases.
2. **Embedding similarity.** No LLM call. Catches harder paraphrases.
3. **LLM-as-judge.** Binary yes/no, deterministic, used only when 1 and 2
   are inconclusive.

If all three fail, the item is dropped and `suppressedCount` increments.
The Eval Lab counts these aggregate by section, which produces a useful
quality signal over time.

## Why these choices

| Decision | What we picked | What we considered | Why |
| --- | --- | --- | --- |
| LLM | Qwen3-32B Q4_K_M | Llama 3.3 70B Q4, Mistral Small 3, SaulLM | Best quality-per-GB on a 32 GB Mac. 128k context. Apache 2.0. |
| Embeddings | nomic-embed-text-v2-moe | OpenAI, bge-m3, gte-large | MoE = fast + small. Tops MTEB-Legal among sub-1B models. |
| Vector store | LanceDB embedded | pgvector, Qdrant, Chroma, sqlite-vec | File-based, no daemon, native hybrid search, TS-native. |
| RAG framework | Hand-rolled w/ Vercel AI SDK | LangChain.js, LlamaIndex.ts | Auditability + zero framework churn risk + interview legibility. |
| Chunking | Recursive char + metadata prefix | Anthropic contextual retrieval | Contextual retrieval is great but ingest-time-prohibitive on a local model. Deterministic prefix recovers most of the locality signal. |
| PDF parsing | unpdf | pdf-parse, pdfjs, LlamaParse | Modern, tree-shakable, no cloud. |
| OCR | tesseract.js bundled | Apple Vision via Swift bridge | Cross-platform parity; the Vision API is 3-5x faster but breaks Windows port. |
| Shell | Tauri 2.0 | Electron, plain Next.js | 15 MB binary vs 150 MB. Rust audit surface. Native webview. |
