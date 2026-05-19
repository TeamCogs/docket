# Docket LM — Architecture

This is the technical deep-dive companion to the README. For the product
rationale, start with the [main spec](../Docket-SPEC.md). "Docket LM" on
first mention; "Docket" used as shorthand throughout.

## Process model

Tauri 2.0 supervises four long-running children plus short-lived helpers:

```
┌────────────────────── Tauri host ──────────────────────────┐
│                                                            │
│   ┌── Webview (WKWebView on macOS) ──┐                     │
│   │   Next.js 15 frontend            │                     │
│   │   IPC over `invoke()` only       │                     │
│   └──────────────────────────────────┘                     │
│              │                                              │
│              ▼ Tauri IPC                                    │
│   ┌── Rust core ──────────────────────┐                     │
│   │   Audited file/socket surface     │                     │
│   │   Sidecar supervision             │                     │
│   │   Permission gateway              │                     │
│   └───────────────────────────────────┘                     │
│              │                                              │
│      ┌───────┼────────────┬──────────────────┐              │
│      ▼       ▼            ▼                  ▼              │
│  ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐        │
│  │ Ollama │ │ bge-   │ │ Whisper  │ │ Tesseract    │        │
│  │ (LLM + │ │ rerank │ │ (audio   │ │ (per-doc OCR │        │
│  │ embed) │ │ Python │ │ Metal)   │ │ short-lived) │        │
│  │ unix   │ │ FastAPI│ │ sidecar  │ │              │        │
│  │ socket │ │ :8001  │ │          │ │              │        │
│  └────────┘ └────────┘ └──────────┘ └──────────────┘        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

The webview cannot reach the filesystem, the network, or any model directly.
Every operation flows through one of the enumerated IPC commands in
`src-tauri/src/ipc/mod.rs`. That enumeration is the auditable surface that
supports the "no data leaves" claim.

The bge-reranker and Whisper.cpp sidecars lazy-start on first use and idle
between matters. Tesseract is invoked per-document during ingest and exits
when the document finishes.

## Workspace ingestion

The ingestion pipeline forks on source type. Each source produces canonical
text plus metadata that flows into the same downstream chunking / embedding /
indexing pipeline.

```
workspace_ingest
  ↓
  for each source in matter.workspace:
    extract by source_type:
      folder       → unpdf | mammoth | tesseract (PDFs, DOCX, plain text)
      drag         → same as folder
      mail         → emlx | olm | mbox parser → headers + body
      message      → SQLite query on chat.db scoped by handle.id list
      photo        → tesseract OCR pipeline (folder of images)
      audio        → Whisper.cpp transcription (queued through sidecar)
      note         → direct text passthrough
    detect language → skip if non-English in v1
    write to matter/extracted/
  ↓
  chunk (recursive char splitter, ~800 tokens, 100 overlap)
  ↓
  prepend doc-level metadata prefix to each chunk
  ↓
  embed (nomic-embed-text v1.5 via Ollama, batched)
  ↓
  insert into LanceDB chunks table
  ↓
  cluster pass (k-means) → confirm outliers with user
```

iMessage scoping is enforced at the read layer. The lawyer designates which
`handle.id` values (phone numbers or emails) belong to this matter; the
SQLite query is `WHERE handle.id IN (...)`. Docket LM never reads message
threads outside the scoped set.

## Brief generation

```
generate_brief (per matter)
  ↓
  load schema for matter.practice_area:
    probate | family | pi | general
  for each section in schema (8 sections in display order):
    retrieve top-30 chunks (hybrid: 0.6 vector + 0.4 BM25, RRF-fused)
    rerank top-30 → top-8 (bge-reranker-v2-m3 via Python sidecar;
                            falls back to RRF order if sidecar unavailable)
    structured JSON generation (Qwen3-32B, temperature 0.1)
    parse with Zod (per-section schema)
    for each item:
      re-grounding pass:
        tier 1: bigram overlap ≥ 0.4 → grounded
        tier 2: embedding cosine ≥ 0.78 → grounded
        tier 3: LLM-as-judge binary check
      if unsupported: drop, increment suppressedCount
    stream completed section to UI
```

## Ask Anything (Q&A) pipeline

```
ask_followup (matter_id, question)
  ↓
  drafting-intent classifier:
    if question asks for a draft, motion, letter, settlement number, or
    legal strategy → return decline-with-explanation
  ↓
  retrieve → rerank → generate → re-ground (same as brief)
  ↓
  stream answer to UI; append to qa_history.jsonl
```

Q&A history is per-matter, local, append-only. Nothing uploads. The lawyer
can scroll back through prior questions on the matter view.

## Data model

One LanceDB store per matter. Tables:

- `documents` — per-source-item metadata (filename or label, source type,
  source ref, page count, ingestion time, OCR flag, transcription flag).
- `chunks` — chunk text, page span, char offsets, embedding (768-dim).
- `brief_sections` — generated brief sections with `schema_version` flag
  identifying which practice-area schema produced them.
- `citations` — claim → chunk(s) mapping with grounding state.
- `qa_history` — Ask Anything questions and answers, per matter.

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

If all three fail, the item is dropped, `suppressedCount` increments, and
the dropped claim is written to the `suppressed_claims` table. The Matter
Quality panel surfaces this per-matter (see [`MATTER-QUALITY-BRIEF.md`](./MATTER-QUALITY-BRIEF.md));
the dev eval harness rolls it up across the public-corpus golden set.

## Practice-area schemas

Each practice area's brief schema is defined in `src/lib/schemas/`:

```
src/lib/schemas/
├── probate.ts
├── family.ts
├── pi.ts
└── general.ts        # immigration, employment, criminal defense, IP, other in v1
```

Each schema file exports:

```ts
export const schema = {
  practice_area: 'probate',
  sections: [
    {
      kind: 'matter_snapshot',
      label: 'Matter Snapshot',
      retrieval_prompts: (matterName: string) => [...],
      output_schema: SnapshotSchema,
      confidence_chip: true,
    },
    // ...seven more
  ],
}
```

The retrieval prompts are functions of matter name so the dense retriever
anchors to the right document cluster. Adding a new practice area is the
work of writing one schema file (8 section definitions) and a golden eval
set.

## Why these choices

| Decision | What we picked | What we considered | Why |
| --- | --- | --- | --- |
| LLM | Qwen3-32B Q4_K_M | Llama 3.3 70B Q4, Mistral Small 3, SaulLM | Best quality-per-GB on a 32 GB Mac. 128k context. Apache 2.0. |
| Embeddings | nomic-embed-text v1.5 (Ollama) | OpenAI, bge-m3, gte-large, nomic v2-moe | What Ollama actually ships. 768-dim, decent on retrieval. v2-moe upgrade is a v1.1 Modelfile task. |
| Reranker | bge-reranker-v2-m3 (Python sidecar) | rerank-in-LLM, bge-m3, ColBERT | Ollama has no rerank endpoint; the sidecar pattern is small and the eval harness shows meaningful precision lift. |
| Audio transcription | whisper.cpp large-v3 (sidecar) | Apple Speech, Vosk, Faster-Whisper Python | C++ binary, Metal acceleration on Apple Silicon, no Python runtime needed for the audio path. |
| Vector store | LanceDB embedded | pgvector, Qdrant, Chroma, sqlite-vec | File-based, no daemon, native hybrid search, TS-native. |
| RAG framework | Hand-rolled w/ Vercel AI SDK | LangChain.js, LlamaIndex.ts | Auditability + zero framework churn risk. |
| Chunking | Recursive char + metadata prefix | Anthropic contextual retrieval | Contextual retrieval is great but ingest-time-prohibitive on a local model. Deterministic prefix recovers most of the locality signal. v1.1 work to add contextual retrieval using the 8B model. |
| PDF parsing | unpdf | pdf-parse, pdfjs, LlamaParse | Modern, tree-shakable, no cloud. |
| Mail parsing | Custom emlx + olm + mbox readers | IMAP, Apple's Mail.app framework | All-local, parses the on-disk store directly. |
| iMessage | Direct SQLite read of chat.db, scoped by handle.id | Apple's Messages framework, third-party exporters | Direct read is auditable; scoping is enforceable at the query layer. |
| OCR | tesseract.js bundled | Apple Vision via Swift bridge | Cross-platform parity; Vision is faster but breaks Windows port. |
| Shell | Tauri 2.0 | Electron, plain Next.js | 15 MB binary vs 150 MB. Rust audit surface. Native webview. |

## Permissions model

Docket LM asks for the minimum macOS permissions its workspace sources
require:

| Permission | What it unlocks | Default behavior without it |
| --- | --- | --- |
| Full Disk Access | Apple Mail, Outlook, iMessage on-disk reads | Mail / iMessage sources unavailable; folder + drag + notes + audio still work |
| Photos | Photos library smart-album as a source | Drag-a-folder-of-photos still works |
| Microphone | (Not requested — Docket LM never records audio) | n/a |
| Network | (Not requested — Docket LM has no outbound network surface) | n/a |

The first-run modal explains each permission in plain English and shows
exactly which workspace source types it unlocks. The lawyer can grant
selectively and Docket degrades cleanly per missing permission.

## Design system & offline guarantee

The UI uses a CSS custom-property token system layered under a semantic
Tailwind palette. Tokens like `--paper`, `--ink`, `--ink-2`, `--surface`,
`--rule`, and `--accent` are defined once in `src/app/globals.css` and
referenced through Tailwind classes (`bg-paper`, `text-ink`, `border-rule`).
Light/dark mode and any future theme variants are a single block of token
overrides, not a per-component refactor.

Two architecturally important constraints on the design layer:

1. **Fonts are self-hosted via `next/font/google`.** Next's font loader
   downloads the font files at build time and serves them from the same
   origin as the app. At runtime, the browser never reaches out to
   `fonts.googleapis.com` or `fonts.gstatic.com`. This preserves the
   zero-outbound-bytes guarantee for the Tauri offline build — a Google
   Fonts `<link>` tag would otherwise be an outbound request every cold
   load and would break the firewall audit.

2. **No external CDNs for any asset.** Every script, stylesheet, font,
   and image either ships in the bundle or is bundled at build time. The
   `pnpm verify:offline` check is the source of truth on this; if it
   ever reports a non-loopback connection, the design or component layer
   has introduced a regression.

The component-level visual language is documented in
[`docs/UI-BRIEF.md`](UI-BRIEF.md) (preserved as the design intent for the
v1.0 system). The current implementation lives in `src/components/`.

## Cross-platform notes

- **macOS** is the v1.0 target. All sidecars are validated on Apple Silicon.
- **Windows** is v1.2 work. The Tauri shell ports cleanly; the per-format
  readers need Windows equivalents: Outlook `.pst` instead of `.olm`, no
  direct iMessage analog, Whisper.cpp builds on Windows but without Metal.
- **Linux** is community-supported via the browser build (`pnpm dev`); the
  native shell isn't a v1 target.
- The browser build (`pnpm dev`) runs on any platform and proxies the
  Tauri IPC commands to a Node adapter. It's the build the README's
  screenshots are taken on.
