# Docket LM

**A fully-local desktop application for solo and small-firm lawyers. Ingest a matter's worth of folders, mail, scoped iMessage threads, photos, audio, and pasted notes. Get a cited first-read brief out, and ask follow-up questions over the same material. Nothing leaves the device.**

---

## Why this exists

A federal judge recently ruled that a defendant's AI chat logs — including his own preparatory legal sessions — could be entered as evidence in court. His defense team didn't realize the platform's terms of service had stripped every expectation of privacy from those conversations the moment their client clicked Accept.

This is the new reality of practicing law alongside AI. Every meaningful legal AI tool in 2026 — Clio Duo, MyCase IQ, CoCounsel, Spellbook, EvenUp, Briefpoint, Eve.legal — runs in the cloud. Their privacy policies are reasonable; some even carry zero-data-retention contracts. None of that changes ABA Model Rule 1.6, which forbids subjecting privileged client material to *avoidable* third-party exposure. Formal Opinion 512 (July 2024) made the test explicit: if a less risky path exists, the lawyer must consider it.

Today, no such path exists for AI-assisted matter review. The ABA's 2023 TechReport found roughly 10% of solos refuse cloud practice management entirely on confidentiality grounds, and a much larger share carve their most sensitive matters out of cloud tools. Those lawyers do not have an AI option. Docket LM is built to be the one they can use.

The model weights live on the lawyer's SSD. Their firewall confirms zero outbound traffic. The Rust core enumerates every IPC command the webview can invoke, so the surface supporting "no data leaves" is a single file someone can audit in fifteen minutes. There is no cloud version of Docket LM, because there cannot be one.

## Who it's for

Solo and small-firm (1–10 attorney) generalists practicing across seven areas Docket LM supports out of the box:

- **Probate** (will contests, estate administration, capacity disputes)
- **Family law** (dissolution, custody, support modification)
- **Personal injury** (motor vehicle, slip-and-fall, products liability)
- **Immigration** (asylum, family-based, removal defense)
- **Employment** (single-plaintiff discrimination, wage-and-hour, wrongful termination)
- **Criminal defense** (state and federal, pre-trial through sentencing)
- **Intellectual property** (trademark prosecution, copyright disputes, small-shop patent matters)

The composite user is a 5–25-year-experience attorney with no IT staff, no in-house knowledge management, no enterprise procurement. They bill in 6-minute increments and personally sign every word they produce. Their pain is universal: every new matter starts with three to twelve hours of unbilled or under-billed reading just to understand who the parties are, what the timeline is, and where the risks live.

## What it does

Open Docket LM. Click **New Matter**. Name it, pick the practice area, and attach the material that belongs to this matter. The workspace model accepts:

- Folders of files (PDFs, DOCX, plain text — including cloud-synced folders like iCloud Drive or Dropbox, which are just local files)
- An Apple Mail or Outlook mailbox, label, or folder — read directly from the on-disk store, no IMAP / no cloud
- Individual `.eml` or `.mbox` exports
- Drag-in files from anywhere in Finder
- Pasted text notes (for "client said on the phone..." style scratch)
- Folders of photos (scene photos, document photos, evidence images — OCR'd locally)
- iMessage threads, **scoped per matter** to the phone numbers or emails the lawyer designates — Docket never ingests the lawyer's full message history
- Audio files for local transcription (voicemails, recorded calls with consent, deposition audio) via a bundled Whisper.cpp sidecar

Docket extracts text from each source (OCR'ing scanned PDFs and photos, transcribing audio with Whisper-large-v3), chunks it, embeds it locally with `nomic-embed-text`, indexes it in an embedded LanceDB store, runs a clustering pass to flag items that look unrelated to the main matter, and then generates a **practice-area-tuned cited brief** through Qwen3 served locally by Ollama.

Each practice area has its own brief schema. A probate matter generates *Estate Assets & Disposition*, *Beneficiaries & Heirs*, *Capacity & Validity Concerns*, *Tax Picture*. A family law matter generates *Marital Estate*, *Income & Support Picture*, *Custody-Relevant Facts*, *Conflict Timeline* (with iMessage threads integrated chronologically alongside emails and filings). A personal injury matter generates *Mechanism of Injury*, *Treatment Timeline*, *Damages Picture*, *Causation Evidence*, *Insurance Coverage*. The other four practice areas (immigration, employment, criminal defense, IP) run on a general-default schema in v1.0; bespoke schemas ship in v1.1–v1.2.

Every claim in the brief links to the exact source span. The renderer physically cannot emit an uncited assertion — the re-grounding pass drops anything the model produced that can't be tied back to a retrieved chunk.

After the brief renders, an **Ask Anything** input lets the lawyer query the matter conversationally. "What did the client say in the August 14 voicemail about the deductible?" "Which exhibits does the November 8 letter reference that aren't in the folder?" Every answer is cited the same way the brief is. The discipline of Ask Anything: it retrieves and cites; it never drafts. No demand letters, no motions, no strategy advice. Briefpoint, EvenUp, and Spellbook own those lanes.

## Eval

The repository ships a hand-curated golden set of question / expected-answer / expected-citation tuples over the Enron demo corpus, plus a runner that compares Docket against three baselines:

| Configuration | Recall@5 | Citation precision | Faithfulness | Suppression | p50 latency |
| --- | ---: | ---: | ---: | ---: | ---: |
| **Docket** (hybrid + rerank + re-grounding) | — | — | — | — | — |
| Hybrid + rerank, no re-grounding | — | — | — | — | — |
| Vector-only, no rerank | — | — | — | — | — |
| Whole doc into context (no retrieval) | — | — | — | — | — |

Numbers are blank deliberately — they fill in after `pnpm eval` runs against the real Enron corpus. Results write to `docs/evals/<ISO_DATE>.md` per run and commit permanently; the latest run becomes the table above.

v1.0 publishes Enron numbers only. Probate, family law, and PI golden sets are under assembly from public-record material and ship in v1.1. The README will be transparent about which practice areas have measured numbers as those evals come online; better to show empty cells than fabricated ones.

The Eval Lab page in the app surfaces the latest numbers per practice area and lets you re-run interactively. Two things the harness is specifically designed to measure: (1) how much citation precision the re-grounding pass actually buys, and (2) the lift from the cross-encoder reranker. Both are claims that should be numbers, not adjectives.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Shell | Tauri 2.0 (macOS in v1.0, Windows in v1.2) | Native `.dmg`, small binary, Rust core audits I/O |
| UI | Next.js 15, React 19, Tailwind, shadcn-style components | Fastest idiomatic stack to iterate in |
| LLM | Qwen3-32B Q4_K_M (with Qwen3-8B fallback) | Apache 2.0, 128k context, strong on legal text, fits in 32 GB |
| LLM runtime | Ollama, bundled as a Tauri sidecar | Best UX for managed local inference in 2026 |
| Embeddings | `nomic-embed-text` v1.5 via Ollama | 768-dim, strong on retrieval. v2-moe upgrade requires a Modelfile shim — v1.1 work |
| Reranker | `BAAI/bge-reranker-v2-m3` via Python sidecar | Cross-encoder reranking on RRF candidates; Ollama doesn't serve cross-encoders |
| Audio transcription | `whisper.cpp` with large-v3 weights via sidecar | Local audio transcription, Apple Silicon Metal acceleration |
| Vector store | LanceDB embedded | File-based, no daemon, hybrid (vector + BM25) out of the box |
| Ingestion | unpdf + mammoth + tesseract.js + custom mail and iMessage readers | All offline; no LlamaParse or other cloud parsers |
| RAG framework | Vercel AI SDK + hand-rolled retrieval | No LangChain — the pipeline is auditable in 150 lines of TypeScript |
| Eval | Custom harness + optional Promptfoo | TypeScript-native, runs in CI, results commit to the repo |

## Architecture

```
+-------------------------- Tauri 2.0 app --------------------------+
|                                                                   |
|   Webview (Next.js 15 + Tailwind + shadcn)                        |
|    └─ IPC ────────────────┐                                       |
|                           ▼                                       |
|   Rust core (audits all I/O, supervises sidecars)                 |
|    ├─ Ollama sidecar (Unix socket, LLM + embeddings)              |
|    ├─ bge-reranker sidecar (Python, cross-encoder rerank)         |
|    ├─ Whisper.cpp sidecar (local audio transcription)             |
|    ├─ LanceDB embedded (one .lance dir per matter)                |
|    └─ Tesseract (per-document OCR, short-lived)                   |
|                                                                   |
+-- NO outbound network traffic. Firewall confirms. ----------------+
```

Each matter lives in its own directory under `~/Library/Application Support/Docket/matters/`. The directory contains the workspace (folder copies, extracted mail bodies, scoped iMessage threads, audio with transcripts, pasted notes, photos), the LanceDB vector index, the generated brief, and the Ask Anything history. Deleting a matter is `rm -rf` on a single folder. There is no global index, and no two matters share data.

The brief is eight independent retrieval-grounded generation passes — one per section — each with a section-specific retrieval query template and a JSON output schema validated with Zod. Sections stream to the UI in priority order so the lawyer sees value within seconds, not after the full minute it takes to assemble everything.

For the deep version see [`docs/architecture.md`](docs/architecture.md). The source of truth is [`Docket-SPEC.md`](Docket-SPEC.md).

## Launch instructions

### As a lawyer who just wants to run the app

(macOS-only in v1.0; Windows in v1.2.)

1. Download the latest `Docket-x.y.z.dmg` from the [Releases page](#).
2. Open the `.dmg`, drag Docket to Applications.
3. Launch Docket. On first run, accept the one-time AI model download (~28 GB; takes 10–40 minutes depending on internet).
4. Grant the system permissions Docket asks for. Full Disk Access unlocks Apple Mail and Messages reading; Photos access unlocks the Photos library as a workspace source. Each permission is explained on the first-run modal, and Docket works without any of them — they only unlock additional workspace source types.
5. Click **New Matter**, name it, choose the practice area, and attach the workspace sources for that matter.
6. Click "Generate brief."
7. Click any footnote to see the source paragraph. Use the Ask Anything box for follow-up questions.

All documents, all answers, all model inference stays on the lawyer's computer.

### As a developer who wants to run from source

```bash
git clone https://github.com/<you>/docket.git
cd docket

# 1. Install dependencies.
pnpm install

# 2. Install Ollama from https://ollama.com — required for local inference.

# 3. Pull the local models (one-time, ~25 GB).
pnpm models:pull

# 4. Install the reranker sidecar's Python deps.
pip3 install -r reranker/requirements.txt

# 5. (Optional, for audio) install Whisper.cpp:
brew install whisper-cpp

# 6a. Browser dev (works on macOS, Linux, Windows):
pnpm dev
# Open http://localhost:3000

# 6b. Native macOS app (requires Rust + Xcode CLT):
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
| Recommended | M2 Pro or better, 32 GB RAM, 60 GB free | Qwen3-32B default, Whisper-large-v3, full quality |
| Minimum | M1, 16 GB RAM, 40 GB free | Auto-fallback to Qwen3-8B + Whisper-small, slower briefs |
| Not supported | Intel Macs, < 16 GB RAM | Install refuses with a clean error |

## Verifying it's actually offline

While Docket is running:

```bash
pnpm verify:offline
```

This shells out to `lsof` and prints any non-loopback connections opened by the app. Expected output: `(none — local-only confirmed)`. Independent verification: Little Snitch on macOS, or any host-based firewall.

## Pricing

Docket LM is sold as a per-attorney subscription:

- **$19.95 / month** or **$199.95 / year** (about 16% cheaper annually)
- **14-day full-feature trial**, no credit card required
- License is **per-attorney, not per-machine** — activate on your office Mac and your laptop with the same key

License keys are offline-validated. Activation, validation, and expiry checks all run on your machine; the app never makes a billing or auth API call. Purchase and renewal happen on the [docketlm.app](https://docketlm.app) website, and your license key arrives by email.

If your license expires, Docket enters **read-only mode** — existing matters, briefs, and Ask Anything history stay viewable and searchable, but new ingestion and brief generation pause until you renew. Read-only mode is still entirely local; nothing changes about what leaves the device (nothing).

The source is AGPL v3 and lives on GitHub. If you'd rather build from source than pay for the signed binary, you can — both paths produce the same app, the subscription pays for the signed `.dmg`, ongoing model updates, new practice-area schemas, and support. Cancel anytime; we'll pro-rate the refund through your current period.

## Roadmap

What's coming in v1.1 and v1.2:

1. **Bespoke schemas for the remaining four practice areas** (immigration, employment, criminal defense, IP). v1.0 runs these on the general-default eight-section schema; v1.1 adds tuned section vocabularies and per-area retrieval prompts.
2. **v2-moe embeddings.** `nomic-embed-text-v2-moe` (HuggingFace) preserves 768-dim output with a stronger MoE architecture and better legal-domain MTEB scores. Requires a Modelfile shim to register with Ollama. v1.1 swap.
3. **Per-task model routing.** Re-grounding NLI checks don't need 32B parameters. Routing those calls to Qwen3-8B should knock meaningful latency off brief generation at no answer-quality cost — the harness will tell us how much.
4. **Contextual retrieval at ingest.** The eval harness shows we leave retrieval-quality points on the table by skipping per-chunk contextualization. The reason we skip it is ingest time; using the 8B model for the contextualization pass even when the brief uses 32B for generation is a clever workaround.
5. **Multi-matter outlier learning.** The clustering pass that flags "items that don't belong" is single-matter today. Over time, a solo's "what's normal for me" baseline drifts — the system should adapt. Done carefully (without leaking facts across matters), this is a meaningful product expansion.
6. **PACER plugin** (opt-in, the one allowed outbound call). For litigators who pull dockets daily, an in-app PACER fetch beats save-to-folder. Documented explicitly as the one network call Docket makes, and only with the lawyer's per-matter consent.
7. **Windows port** (v1.2). The Tauri shell ports cleanly; the per-format mail and iMessage readers need Windows equivalents (Outlook PST, no direct iMessage analog).

What Docket will not add: anything that drifts the scope. No drafting. No legal research. No conflict checks. No outbound calls (except the optional, opt-in PACER plugin). The product wins by being uncompromising about what it refuses to do.

## Notes on the build

The interesting decisions in Docket are product decisions, not engineering ones. The hardest one — surfacing AI confidence in a way that doesn't induce automation bias — landed at "section-level confidence chips only, never per-fact numeric scores, contradictions as first-class objects in their own panel." That's not how most RAG tools render uncertainty, but it's the call the cognitive-bias literature on calibration argues for.

The second hard call was what to do with material in a matter workspace that doesn't belong to that matter — a duplicate, an old retainer, a thread that wandered off-topic, a personal email accidentally pulled in. The naive options are "include everything" (pollutes the brief) or "silently exclude" (the noise might be the smoking gun). Docket runs a clustering pass against the largest semantic cluster and surfaces a five-second pre-brief confirmation. Default action: include outliers but flag them in the Open Questions section so they don't disappear.

The third was Ask Anything's discipline — retrieve and cite, never draft. The temptation when adding a conversational interface is to let it generate prose freely. Doing so would turn Docket into a worse version of CoCounsel. The boundary is enforced at the prompt level (no drafting), at the rendering level (citation required for every claim), and at the intent-detector level (questions asking for a draft return a polite decline).

The fourth — surfacing all seven practice areas as first-class rather than positioning Docket as litigation software with extras — was the most consequential. Solo lawyers don't sort themselves by "litigation vs. transactional." They have probate matters, family matters, PI cases, and the occasional employment dispute, often the same week. A tool that wins their trust on probate gets to be the AI tool they reach for everywhere.

## License

The Docket LM source code is licensed under **AGPL v3**. You can read it, audit it, fork it, modify it, and self-distribute it. If you build a derivative work and offer it to others (including as a hosted service), the AGPL requires you to release your modified source under AGPL too. This is intentional — it prevents the local-only engine from being lifted into a closed-source cloud product.

Full license text is in [`LICENSE`](LICENSE). Additional terms — trademark restriction under AGPL §7(e), commercial licensing, and third-party component attributions — are in [`NOTICE`](NOTICE).

"Docket LM" is a registered trademark for legal software. Forks must rebrand. (Anyone can fork the code; no one else can call their fork Docket LM.)

A separate commercial license is available on request for organizations that need to integrate the engine into their own proprietary product — contact through [docketlm.app](https://docketlm.app) for terms.

The Enron demo corpus is public record. The model weights live under their respective licenses (Qwen3: Apache 2.0; nomic-embed: Apache 2.0; bge-reranker: MIT; Whisper: MIT).
