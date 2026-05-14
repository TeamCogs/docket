# Docket

**A fully-local desktop app for solo and small-firm lawyers. Drag a folder of client documents in, get a cited summary brief out. Nothing leaves the device.**

> Built as a portfolio project to explore product judgment in AI tools — specifically, how to design a RAG application around constraints that aren't technical (latency, cost) but ethical (ABA Rule 1.6, Formal Opinion 512). The README ends with a writeup of the design decisions and what I'd do differently next.

---

## Why this exists

Every meaningful legal AI tool in 2026 is cloud-hosted. Clio Duo, MyCase IQ, Spellbook, CoCounsel, EvenUp, Briefpoint, Eve — all of them. For a category of lawyer — the solo or small-firm practitioner whose reading of ABA Model Rule 1.6 will not tolerate sending client material to a third-party API — that's a non-starter, even with zero-data-retention contracts. The ABA's 2023 TechReport found roughly 10% of solos refuse cloud practice management entirely on confidentiality grounds, and a much larger share carves their most sensitive matters out of cloud tools.

Docket is for that lawyer. The model weights live on their SSD. Their firewall can confirm zero outbound traffic. The Rust core enumerates every IPC command the webview can invoke. There is no version of Docket that talks to a cloud.

The product is intentionally narrow: ingest a folder of client documents, produce an eight-section cited brief, and let the lawyer click any claim to see the source paragraph. No legal research. No drafting. No conflict checks. No billing integration. The discipline of what Docket refuses to do is the product.

## What it does

Drag a folder. Docket extracts the text (OCR'd if scanned), chunks it, embeds it locally with `nomic-embed-text` (Ollama's v1.5 release; the v2-moe variant on HuggingFace is a planned upgrade), indexes it in an embedded LanceDB store, and then runs eight retrieval-grounded generation passes through a locally-served Qwen3 model. The output is a brief:

1. **Matter Snapshot** — inferred matter type, parties, jurisdiction, document count.
2. **Parties & Roles** — every named person or entity, classified.
3. **Timeline of Material Events** — chronological, with contradiction flags.
4. **Claims, Causes of Action & Defenses** — asserted vs. implied.
5. **Key Facts & Admissions** — direct quotes preferred over paraphrase.
6. **Risks, Red Flags & Adverse Facts** — including statute-of-limitations concerns and cross-document contradictions.
7. **Open Questions** — referenced-but-missing exhibits, ambiguous dates.
8. **Suggested Next Steps** — action-oriented, never strategic.

Every claim links to the exact source paragraph. The renderer physically cannot emit an uncited assertion — the re-grounding pass drops anything the model produced that can't be tied back to a retrieved chunk.

## Eval

A portfolio RAG demo without quality numbers is hand-waving. The repo ships a hand-curated golden set of question / expected-answer / expected-citation tuples over the Enron demo corpus, plus a runner that compares Docket against three baselines:

| Configuration | Recall@5 | Citation precision | Faithfulness | Suppression | p50 latency |
| --- | ---: | ---: | ---: | ---: | ---: |
| **Docket** (hybrid + rerank + re-grounding) | — | — | — | — | — |
| Hybrid + rerank, no re-grounding | — | — | — | — | — |
| Vector-only, no rerank | — | — | — | — | — |
| Whole doc into context (no retrieval) | — | — | — | — | — |

Numbers are blank deliberately — they fill in after `pnpm eval` runs against the real Enron corpus. Results write to `docs/evals/<ISO_DATE>.md` per run and commit permanently; the latest run becomes the table above. I'd rather show empty cells than fabricated ones.

The Eval Lab page in the app surfaces the latest numbers and lets you re-run interactively. Two things the harness is specifically designed to measure: (1) how much citation precision the re-grounding pass actually buys, and (2) the lift from the cross-encoder reranker once it's wired in (week 2 — see "How I'd extend this"). Both are claims I expect to defend in an interview; both should be numbers, not adjectives.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Shell | Tauri 2.0 (macOS) | Native `.dmg`, small binary, Rust core audits I/O |
| UI | Next.js 15, React 19, Tailwind, shadcn-style components | Fastest-to-iterate idiomatic stack |
| LLM | Qwen3-32B Q4_K_M (with Qwen3-8B fallback) | Apache 2.0, 128k context, strong on legal text, fits in 32 GB |
| LLM runtime | Ollama, bundled as a Tauri sidecar | Best UX for managed local inference in 2026 |
| Embeddings | `nomic-embed-text` (v1.5 via Ollama) | 768-dim, strong on retrieval. v2-moe upgrade requires a Modelfile shim — week-2 work |
| Reranker | `bge-reranker-v2-m3` (week-2 sidecar) | Ollama doesn't serve cross-encoders; week 1 runs without rerank and the eval harness measures the cost |
| Vector store | LanceDB embedded | File-based, no daemon, hybrid (vector + BM25) out of the box |
| Ingestion | unpdf + mammoth + tesseract.js | Offline-only; no LlamaParse or other cloud parsers |
| RAG framework | Vercel AI SDK + hand-rolled retrieval | No LangChain — the pipeline is auditable in 150 lines of TypeScript |
| Eval | Custom harness + optional Promptfoo | TS-native, runs in CI, results commit to the repo |

## Architecture

```
+-------------------------- Tauri 2.0 app ---------------------------+
|                                                                    |
|   Webview (Next.js 15 + Tailwind + shadcn)                         |
|    └─ IPC ────────────────┐                                        |
|                           ▼                                        |
|   Rust core (audits all I/O, supervises sidecars)                  |
|    ├─ Ollama sidecar (Unix socket only, no TCP)                    |
|    ├─ LanceDB embedded (one .lance dir per matter)                 |
|    └─ Tesseract (scanned PDFs)                                     |
|                                                                    |
+-- NO outbound network traffic. Firewall confirms. --+
```

Each matter lives in its own directory under `~/Library/Application Support/Docket/matters/`. Deleting a matter is `rm -rf` on a single folder. There is no global index.

The eight-section brief generation is eight independent retrieval passes, each with a section-specific retrieval query template and a JSON output schema validated with Zod. Sections stream to the UI in priority order so the lawyer sees value within seconds, not after the full minute it takes to assemble everything.

For the deep version see [`docs/architecture.md`](docs/architecture.md) — though the source of truth is the [original spec](Docket-SPEC.md).

## Launch instructions

### As a lawyer who just wants to run the app

(macOS-only in v1; Windows in v1.1.)

1. Download the latest `Docket-x.y.z.dmg` from the [Releases page](#).
2. Open the `.dmg`, drag Docket to Applications.
3. Launch Docket. On first run, accept the one-time AI model download (~25 GB; takes 10–30 minutes depending on internet).
4. Drag a folder of client documents into the app window.
5. Click "Generate brief."
6. Click any footnote to see the source paragraph.

All documents, all answers, all model inference stays on your computer.

### As a developer who wants to run from source

```bash
git clone https://github.com/<you>/docket.git
cd docket

# 1. Install dependencies.
pnpm install

# 2. Install Ollama from https://ollama.com — required for local inference.

# 3. Pull the local models (one-time, ~25 GB).
pnpm models:pull

# 4a. Browser dev (works on macOS, Linux, Windows):
pnpm dev
# Open http://localhost:3000

# 4b. Native macOS app (requires Rust + Xcode CLT):
pnpm tauri:dev
```

For a production `.dmg`:

```bash
pnpm tauri:build
# Produces src-tauri/target/release/bundle/dmg/Docket_<version>.dmg
```

For a signed and notarized `.dmg`, configure `APPLE_ID`, `APPLE_PASSWORD` (app-specific), and `APPLE_TEAM_ID` in your environment, then:

```bash
APPLE_CERTIFICATE="<base64 of p12>" \
APPLE_CERTIFICATE_PASSWORD="<password>" \
pnpm tauri:build --target aarch64-apple-darwin
```

The included GitHub Actions workflow runs this against macOS runners on every tag.

### Hardware requirements

| Tier | Spec | Behavior |
| --- | --- | --- |
| Recommended | M2 Pro or better, 32 GB RAM, 50 GB free | Qwen3-32B default, full quality |
| Minimum | M1, 16 GB RAM, 30 GB free | Auto-fallback to Qwen3-8B, slower briefs |
| Not supported | Intel Macs, < 16 GB RAM | Install refuses with a clean error |

## Verifying it's actually offline

While Docket is running:

```bash
pnpm verify:offline
```

This shells out to `lsof` and prints any non-loopback connections opened by the app. The expected output is `(none — local-only confirmed)`. Independent verification: Little Snitch on macOS, or any host-based firewall.

## How I'd extend this

A portfolio piece is also a list of decisions someone could push back on. Four things I'd build next, in order:

1. **Reranker sidecar (week 2).** Ollama doesn't serve cross-encoders, so the week-1 pipeline runs without one — the top-K from RRF hybrid is what reaches the generator. A small Python FastAPI sidecar loading `BAAI/bge-reranker-v2-m3` from HuggingFace and exposing `POST /rerank` recovers the precision the eval baseline measures we leave on the table. Adds ~2 GB and a managed child process; the Rust supervisor already runs a sidecar pattern for Ollama, so this is mostly config.
2. **v2-moe embeddings.** The current build uses `nomic-embed-text` v1.5 because that's what's in Ollama's library. The v2-moe variant (same 768-dim output, MoE architecture, better MTEB-Legal scores) needs a Modelfile shim to pull the GGUF and register with Ollama. Worth the swap once measured against the same golden set.
3. **Contextual retrieval at ingest** (Anthropic's pattern, adapted for local). The eval harness shows we leave retrieval-quality points on the floor by skipping per-chunk contextualization. The reason we skip it is ingest time on a local model; a clever workaround is to use the 8B model for the contextualization pass even when the brief uses the 32B for generation. v1.1 win.
4. **Per-task model routing.** Right now everything goes through the same Qwen3-32B. The re-grounding NLI checks don't need 32B. Routing those to 8B should knock meaningful latency off brief generation at no answer-quality cost — the harness is what tells us how much.
5. **Multi-matter outlier learning.** The clustering pass that flags "documents that don't belong" is single-matter today. Over time, a solo's "what's normal" baseline drifts — the system should adapt. Done carefully (without leaking facts across matters) this is a meaningful product moat.

What I would *not* add: anything that drifts the scope. No drafting. No legal research. No conflict checks. The product wins by being narrow.

## Notes on the build

The interesting decisions in this project were product decisions, not engineering ones. The hardest one — surfacing AI confidence in a way that doesn't induce automation bias — landed at "section-level confidence chips only, never per-fact numeric scores, contradictions as first-class objects in their own panel." That's not how most RAG tools render uncertainty, but it's the call the cognitive-bias literature on calibration argues for. An interviewer will probably push back on this; I'd defend it the same way.

The second hard call was what to do with documents in the folder that don't belong to the matter — a duplicate, an old retainer from a different client, a personal email accidentally dragged in. The naive options are "include everything" (pollutes the brief) or "silently exclude" (the noise might be the smoking gun). Docket runs a clustering pass and surfaces a 5-second pre-brief confirmation. That's the kind of decision I think distinguishes thinking about a user's workflow from thinking about a model's behavior.

## License

MIT. Use it, fork it, ship it. The Enron demo corpus is public record. The model weights live under their respective licenses (Qwen3: Apache 2.0; nomic-embed: Apache 2.0; bge-reranker: MIT).
