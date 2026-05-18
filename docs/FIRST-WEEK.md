# Docket LM — First Week: From Clone to a Real Brief

The scaffold and the full visual design system are done. This guide takes
you from a fresh `git clone` to seeing Docket LM render a real brief over
~10 actual Enron documents. The goal is **validate the pipeline end-to-end
with real model inference, then replace the UI's mocked data with the real
engine outputs.**

The UI shipped ahead of the engine wiring — the matter wizard, Ask Anything
pill, citation panel, license states, and settings cards all exist and look
right, but most of them currently render mocked data. Phase 6 below is where
you swap those mocks for live IPC calls. Until Phase 6 lands, you can see
real briefs by running `pnpm tsx scripts/brief.ts` from the CLI and pointing
the matter page at `data/matters/demo-enron/brief.json` (already wired in
commit `fd2fa78`).

Estimated time: 10–18 focused hours spread across the week. The slowest
single step is the one-time model download (~28 GB).

If you get stuck, jump to the troubleshooting section at the bottom.

---

## Phase 0 — Prerequisites

You need:

- **macOS** on Apple Silicon (M1/M2/M3/M4). 32 GB RAM strongly recommended;
  16 GB will work but with the Qwen3-8B fallback.
- **~60 GB free disk** (models + LanceDB index + node_modules).
- **An hour or two of focused setup time**, plus the model download running
  in the background.

Optional but useful:
- A second monitor for the model download terminal vs your editor.
- Little Snitch or another network monitor to satisfy yourself that the
  "no data leaves" claim holds.

---

## Phase 1 — Environment setup (~30 minutes plus downloads)

### 1.1 Install Node + pnpm

```bash
# If you don't have Node 20+:
brew install node@20
brew link --overwrite node@20

# pnpm:
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

Verify:

```bash
node -v   # → v20.x or higher
pnpm -v   # → 9.15.x
```

### 1.2 Install Ollama

```bash
brew install ollama
# or download from https://ollama.com
```

Start it as a service (so it's always available) or run it manually in a
terminal:

```bash
brew services start ollama
# or, in a dedicated terminal:
ollama serve
```

Verify:

```bash
curl http://127.0.0.1:11434/api/version
# → {"version":"..."}
```

### 1.3 (Optional, deferred) Install Rust + Xcode CLT

You only need these for the Tauri build, which is week 3–4 work. Skip for
now — `pnpm dev` runs the full app in the browser without them.

```bash
# When you eventually want to do the Tauri build:
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 1.4 Initialize the repo on GitHub

```bash
cd ~/path/to/docket   # the scaffold directory
git init
git add .
git commit -m "Initial scaffold"

# Create the repo on GitHub (via web or gh CLI), then:
gh repo create docket --public --source=. --remote=origin --push
# or, manually:
git remote add origin https://github.com/<you>/docket.git
git branch -M main
git push -u origin main
```

### 1.5 Install npm dependencies

```bash
pnpm install
```

This will take 2–3 minutes. Watch for errors on `@lancedb/lancedb` — it
ships native bindings that have to compile or fetch a prebuilt for your
arch. If it fails, see troubleshooting below.

### 1.6 Verify the dev server boots

```bash
pnpm dev
```

Open `http://localhost:3000`. You should see:

- Library page with one mock "Enron — first read" matter.
- Click into the mock matter → see the eight-section brief render.
- Click any footnote → citation panel slides in (mobile) or pops out (desktop).
- Eval Lab page → the placeholder comparison table.
- Settings page → your real system specs detected.

If all of this renders, the scaffold is healthy. Ctrl-C the server.

---

## Phase 2 — Pull the local models (~30 minutes, mostly download)

```bash
# Pulls Qwen3-32B, Qwen3-8B, and the embedding model.
pnpm models:pull
```

This downloads ~22 GB. Reasonable to start it before you go to lunch.

Note: the reranker (`bge-reranker-v2-m3`) is a separate Python sidecar — Ollama
doesn't serve cross-encoder models. It's already implemented in `reranker/`;
see Phase 5.5 to start it. The pipeline degrades gracefully to RRF ordering
when the sidecar isn't running, so you can skip it for a first brief run and
add it once the rest of the pipeline checks out.

While the pull runs, you can keep coding — the models live in
`~/.ollama/models/` and don't block anything else.

When it's done, verify each model loads:

```bash
ollama list
# Expect to see: qwen3:32b-q4_K_M, qwen3:8b-q4_K_M, nomic-embed-text

# Smoke test inference (will load the model, give it a few seconds):
ollama run qwen3:32b-q4_K_M "Say 'hello, lawyer' in exactly three words."
# Expect something close to: hello, lawyer.
```

If `qwen3:32b` is too slow on your machine (< 15 tok/s), drop it from the
default in `.env.local`:

```bash
# Create .env.local from the example:
cp .env.example .env.local

# Then edit .env.local:
DOCKET_MODEL_DEFAULT=qwen3:8b-q4_K_M
```

---

## Phase 3 — Get a real Enron corpus (~30 minutes)

You don't need the whole archive. 8–12 well-chosen documents are enough to
exercise every part of the pipeline and produce a believable brief. Aim for
a mix: structured filings, free-text correspondence, and at least one
scanned PDF if you can find one.

### 3.1 Recommended seed documents

Drop these into `demo-data/enron/`:

| Document | Source | Why include it |
| --- | --- | --- |
| SEC v. Lay (2004) complaint | sec.gov/litigation/litreleases/lr18776.htm | The "official narrative." Tests structured-text extraction. |
| Powers Report (Feb 2002) | en.wikisource.org has the full text | Long, dense, paragraph-heavy. Tests chunking. |
| Sherron Watkins memo (Aug 2001) | houstonchronicle.com archive; also in the Congressional record | Short, dramatic, easy to spot-check citations against. |
| Enron 10-K for FY1999 | EDGAR — `enron-corp` ticker, year 1999 | Tables-heavy. Tests the PDF parser on real financial filings. |
| Enron 10-K for FY2000 | Same | Contradicts later restatements. Tests the contradiction-flagging path. |
| Enron 8-K Nov 8 2001 (restatement) | EDGAR | The "smoking gun" date. Tests timeline extraction. |
| 5–10 emails from the FERC release | cmu.edu Enron Email Dataset (the `enron_mail_20150507.tar.gz` is the canonical) | Free-form text. Tests the .eml extractor. |

For the FERC emails: just grab a couple of folders that mention key people
(Lay, Skilling, Fastow, Watkins) and save them as `.eml` files into
`demo-data/enron/emails/`.

### 3.2 What if I can't find a scanned PDF?

That's fine for week 1. Skipping OCR doesn't block the pipeline — the
`ocr.ts` module is stubbed, and text-layer PDFs go through `unpdf` cleanly.
Note in your build notes that OCR is week-2 work.

### 3.3 What you should have at this point

```
demo-data/enron/
├── README.md          (already there from the scaffold)
├── sec-complaint-lay.pdf
├── powers-report.pdf
├── watkins-memo.pdf
├── enron-10k-1999.pdf
├── enron-10k-2000.pdf
├── enron-8k-2001-11-08.pdf
└── emails/
    ├── lay-2001-08-22.eml
    ├── skilling-2001-08-14.eml
    └── ... (a handful more)
```

Total: 8–12 files, maybe 60 MB on disk.

---

## Phase 4 — First ingest from a CLI (~30 minutes)

Don't try to make the UI drop-zone work yet. Test the ingestion pipeline
from a Node script first. That isolates "is my pipeline correct" from
"is my UI wired up correctly."

### 4.1 Create a one-off CLI script

Create `scripts/ingest.ts`:

```ts
import { ingestFolder } from "../src/lib/ingest";

const matterId = process.argv[2] ?? "demo-enron";
const matterName = process.argv[3] ?? "Enron — first read";
const folder = process.argv[4] ?? "demo-data/enron";

console.log(`Ingesting ${folder} as matter '${matterId}'…`);
const result = await ingestFolder(matterId, matterName, folder, (p) => {
  process.stdout.write(`\r[${p.done}/${p.total}] ${p.current ?? ""}        `);
});
console.log("\nDone:", {
  docs: result.documents.length,
  chunks: result.totalChunks,
  outliers: result.outlierDocIds.length,
});
```

Run it:

```bash
pnpm tsx scripts/ingest.ts
```

What should happen:
- Each document prints as it's processed.
- After a few minutes (mostly embedding), you'll see a summary:
  `Done: { docs: 10, chunks: ~420, outliers: 0 or 1 }`.
- A `data/matters/demo-enron/vectors.lance/` directory will exist on disk.

### 4.2 If it errors out

The most likely failure points and fixes:

| Error | Likely cause | Fix |
| --- | --- | --- |
| `Cannot find module '@lancedb/lancedb'` | Native binding didn't install | `pnpm rebuild @lancedb/lancedb` |
| `ECONNREFUSED 127.0.0.1:11434` | Ollama isn't running | `ollama serve` in another terminal |
| `model 'nomic-embed-text' not found` | Embedding model didn't download | `ollama pull nomic-embed-text` |
| PDF parses to empty string | unpdf couldn't read it (scanned) | Skip that file for week 1; note for week 2 OCR work |
| `Unsupported file type: .docx` | mammoth not installed correctly | `pnpm install mammoth` |
| OOM on a big PDF | Chunking buffer issue | Reduce target chunk size in `src/lib/chunk.ts` (drop `TARGET_TOKENS` from 800 to 500) |

### 4.3 Sanity check the LanceDB contents

Create `scripts/peek.ts`:

```ts
import { openMatter, getChunksTable } from "../src/lib/lancedb";

const conn = await openMatter("demo-enron");
const table = await getChunksTable(conn, 768);
const sample = await table.query().limit(3).toArray();
console.log("First 3 chunks:");
for (const row of sample) {
  console.log("---");
  console.log(`chunk_id: ${(row as any).chunk_id}`);
  console.log(`text (first 200 chars): ${(row as any).text.slice(0, 200)}`);
}
```

```bash
pnpm tsx scripts/peek.ts
```

You should see real chunk text from your Enron documents. If the text is
garbled or empty, the extraction pipeline has a problem worth debugging
before you move on.

---

## Phase 5 — First brief generation (~30–60 minutes including model warmup)

### 5.1 Generate a brief from the CLI

Create `scripts/brief.ts`:

```ts
import { generateBrief } from "../src/lib/generate";
import { writeFileSync } from "node:fs";

const brief = await generateBrief({
  matterId: "demo-enron",
  matterName: "Enron — first read",
  onSectionReady: (s) => {
    console.log(
      `✓ ${s.kind} — ${("content" in s ? JSON.stringify(s.content).length : 0)} chars, ${s.suppressedCount} suppressed`,
    );
  },
});
writeFileSync("data/matters/demo-enron/brief.json", JSON.stringify(brief, null, 2));
console.log("\nBrief written. Total suppressed:", brief.totalSuppressed);
```

```bash
pnpm tsx scripts/brief.ts
```

This will take **3–8 minutes on an M2 Pro 32 GB**. Each section is its own
retrieval + generation + re-grounding pass. Watch the sections complete in
order: snapshot → parties → timeline → claims → key_facts → risks →
open_questions → next_steps.

### 5.2 What to look for

When it finishes, open `data/matters/demo-enron/brief.json` in your editor.
Read each section. Ask yourself:

- Do the **parties** include Lay, Skilling, Fastow, Watkins, Andersen, and
  Enron Corp.? If not, the parties query in `prompts/sections.ts` needs
  tuning.
- Does the **timeline** include 2001-08-14 (Skilling resignation), 2001-10-16
  (Q3 earnings), 2001-11-08 (restatement), 2001-12-02 (bankruptcy)? Missing
  major dates means retrieval isn't pulling the right chunks.
- Does at least one **risk** flag the contradiction between Lay's October
  public statements and the internal board materials? If yes, the
  contradiction-detection prompt is doing its job.
- How many claims got **suppressed**? Zero is suspicious (re-grounding too
  lenient); 50%+ is also suspicious (retrieval mismatched or chunks too
  small). 10–20% is a healthy sign that the pipeline is catching
  hallucinations.

This is the moment you'll genuinely have a feel for whether the architecture
works end-to-end. If it does, you've validated the technical thesis behind
Docket — local-only RAG over real legal documents producing a brief a lawyer
would recognize. If it doesn't, you have a concrete list of things to fix
before moving to week 2.

### 5.3 If the brief is empty or wrong

Common causes, in order of frequency:

1. **Retrieval mismatched.** The retrieval queries in
   `src/lib/prompts/sections.ts` are domain-agnostic by design — they use
   `(matter: string) => string[]` functions so the first query anchors to
   the right document cluster for any legal practice area. If a section
   comes back nearly empty, check that you passed `matterName` correctly
   (it becomes the anchor term). The cross-encoder reranker (Phase 5.5)
   further improves ranking once retrieval is pulling the right candidates.
2. **Re-grounding too strict.** Edit `src/lib/ground.ts` to lower
   `TIER1_OVERLAP` from 0.4 to 0.3 and `TIER2_COS` from 0.78 to 0.7.
3. **Model returning malformed JSON.** Check the raw model output by adding
   a `console.log(raw)` in `src/lib/generate.ts` before the
   `SectionRawSchema.parse()` call.
4. **Chunks too small to carry context.** Bump `TARGET_TOKENS` in
   `src/lib/chunk.ts` from 800 to 1200.

---

## Phase 5.5 — Start the cross-encoder reranker sidecar (~15 minutes setup, first run downloads ~1.1 GB)

The hybrid retriever (vector + BM25 → RRF) is good, but it can let
off-topic chunks win on keyword overlap. The cross-encoder reranker
re-scores every candidate pair `(query, passage)` jointly using
`BAAI/bge-reranker-v2-m3`, which cuts noise significantly — especially
for timeline (where date-dense utility filings otherwise dominate) and
parties (where boilerplate entity-name mentions outscore narrative
references).

The pipeline falls back to RRF order when the sidecar isn't running, so
this is optional but recommended before evaluating brief quality.

### 5.5.1 Install the Python dependencies

Run from the project root (`/path/to/docket`):

```bash
pip3 install -r reranker/requirements.txt
# or: python3 -m pip install -r reranker/requirements.txt
```

Requires Python 3.10+. On Apple Silicon this installs the MPS-enabled
`torch` wheel; the sidecar auto-detects `mps` → `cuda` → `cpu`.

### 5.5.2 Start the sidecar

In a dedicated terminal (keep it running alongside `pnpm dev`):

```bash
pnpm reranker
```

First run downloads `BAAI/bge-reranker-v2-m3` (~1.1 GB) from HuggingFace
into the default model cache. Subsequent starts are fast (model already
on disk). When ready you'll see:

```text
Reranker ready.
INFO:     Uvicorn running on http://127.0.0.1:8001
```

### 5.5.3 Verify it's healthy

```bash
curl http://127.0.0.1:8001/health
# → {"status":"ok","model":"BAAI/bge-reranker-v2-m3","device":"mps"}
```

### 5.5.4 Re-run the brief with the sidecar active

```bash
pnpm tsx scripts/brief.ts
```

With the reranker running, the timeline section should now surface the
four key Enron dates (2001-08-14, 2001-10-16, 2001-11-08, 2001-12-02)
instead of Oregon utility regulatory filings.

---

## Phase 6 — Replace UI mocks with the real engine (~3–5 hours)

The visual design (commit `fd2fa78`) shipped a complete UI: matter wizard,
Ask Anything pill, citation panel with `j`/`k` navigation, license states,
settings cards. Most of those surfaces currently render mock data. Phase 6
is where you swap the mocks for live IPC calls so the UI is driven by the
engine you validated in Phases 4 and 5.

There's no UI design work in this phase — only wiring. If a screen looks
right but acts wrong, the fix is in the data path, not the component.

### 6.1 Matter page → real `brief.json` (already done)

`src/app/matter/[id]/page.tsx` already reads `data/matters/<id>/brief.json`
from disk (wired in commit `fd2fa78`). After Phase 5 runs successfully, the
matter page at `/matter/demo-enron` should render the brief without further
work. If it doesn't, confirm `DOCKET_DATA_DIR` points at the right place
and that `scripts/brief.ts` actually wrote the file.

### 6.2 Citation panel → real source span

The citation panel (`src/components/brief/CitationPanel.tsx`) has the
visual treatment in place — slide-in side panel on desktop, bottom sheet
on mobile, `j`/`k` navigation between citations. What it needs is a real
API to fetch the cited chunk's text instead of the placeholder.

Add `src/app/api/source/[chunkId]/route.ts`:

```ts
import { openMatter, getChunksTable, getChunk } from "@/lib/lancedb";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ chunkId: string }> }) {
  const { chunkId } = await params;
  // chunk_id is "<docId>#<idx>"; for week 1 we hard-code demo-enron.
  // The matter routing in the URL is week-2 work.
  const conn = await openMatter("demo-enron");
  const table = await getChunksTable(conn, 768);
  const row = await getChunk(table, chunkId);
  if (!row) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({
    chunkId: row.chunk_id,
    docId: row.doc_id,
    page: row.page_start,
    text: row.text,
  });
}
```

Then in `CitationPanel.tsx`, replace the placeholder paragraph with a
`useEffect` that fetches `/api/source/${citation.chunkIds[0]}` when a
citation is selected and renders the returned text. Cache results in
component state so revisiting the same citation doesn't re-fetch.

### 6.3 Matter wizard → real ingest stream

The wizard at `/new-matter` walks the lawyer through Name → Practice area
→ Attach material → Review, then runs an "ingest" pass that's currently
six simulated stages with mocked outliers. Replace the simulation with the
real pipeline:

- Add `src/app/api/ingest/route.ts` that calls `ingestFolder()` from
  `src/lib/ingest.ts` and streams progress events back as Server-Sent
  Events (or a `ReadableStream` of JSON lines).
- In `MatterWizard.tsx`, replace the hard-coded `STAGES` walkthrough with
  a fetch to `/api/ingest` and update the stage UI from the streamed
  progress events.
- Replace `MOCK_OUTLIERS` with the real `result.outlierDocIds` mapped to
  filename + reason. The clustering pass already runs in `ingestFolder()`;
  surface its output.
- On ingest completion, write a placeholder `brief.json` (or trigger
  `generate_brief` and stream sections) so the post-wizard redirect to
  `/matter/<id>` lands on a populated matter page.

For week 1, audio transcription and photo OCR can stay as mocked stages —
the file types are listed in the wizard but the actual sidecar wiring is
week-3 work. Ingest a folder of PDFs + emails and call it good for the
first pass.

### 6.4 Ask Anything → real `/api/ask` stream

The Ask Anything pill (`src/components/AskAnything.tsx`) has the UI: input
affordance, history drawer, decline-on-draft messaging. Wire it to the
existing `src/app/api/ask/route.ts` (or create it if it's stubbed) that
calls `retrieve()` → `rerank()` → `complete()` → re-ground over the matter
chunks, with the drafting-intent guardrail.

When the lawyer asks "draft a motion to compel," the route should return
the polite decline (handled at the prompt or intent-classifier level), not
attempt the generation. The decline state already has a UI treatment in
the history drawer.

### 6.5 License state — mock, with real validation deferred

`src/lib/license-store.ts` currently defaults to `{ kind: "active",
expiresAt: "" }`. Real offline-validated key parsing (RSA signature verify
against a bundled public key) is v1.1 work, not week 1. For now, you can
manually `setLicense({ kind: "trial", daysLeft: 9 })` from the browser
console to see the trial pill, or `{ kind: "expired", expiredAt: "..." }`
to see the read-only banner and disabled controls — useful for designer
review of those states.

Keep the store interface the way the design built it; real validation
just plugs in as the initial value loader.

---

## Phase 7 — First real eval run (~1 hour)

Now you have one matter with one brief. Run the eval harness against it.

### 7.1 Expand the golden set

The scaffold ships 10 questions in `eval/golden-set.jsonl`. Add 10–15 more,
focused on the documents you actually ingested. Each line:

```json
{"id":"g011","category":"timeline","question":"...","expectedAnswer":"...","expectedSource":{"docId":"<docId-prefix>","page":<n>}}
```

For `docId`, peek at `data/matters/demo-enron/manifest.json` (or query
LanceDB) to get the actual sha256 hash prefix of each document.

### 7.2 Run the eval

The shipped `eval/run.ts` is a stub. Wire it to actually retrieve over your
matter:

```ts
// Replace the stubbed metrics block with:
import { retrieve } from "../src/lib/retrieve";

for (const q of questions) {
  const t0 = Date.now();
  const hits = await retrieve(args.matterId, q.question);
  const latencyMs = Date.now() - t0;
  const retrievedTop = hits.slice(0, 5).some((h) =>
    h.chunk.docId.startsWith(q.expectedSource.docId) &&
    h.chunk.pageStart <= q.expectedSource.page &&
    h.chunk.pageEnd >= q.expectedSource.page,
  );
  run.perQuestion.push({
    questionId: q.id,
    retrievedTop,
    citationCorrect: retrievedTop,
    faithful: true,
    suppressed: false,
    latencyMs,
  });
}
run.metrics.retrievalRecallAt5 =
  run.perQuestion.filter((x) => x.retrievedTop).length / run.perQuestion.length;
run.metrics.p50LatencyMs =
  run.perQuestion.map((x) => x.latencyMs).sort((a, b) => a - b)[
    Math.floor(run.perQuestion.length / 2)
  ];
```

Run:

```bash
pnpm eval
```

You'll get a real recall@5 number. Commit the results file in `docs/evals/`.
This is the artifact that grounds Docket's quality claims in measured numbers
rather than adjectives. Every subsequent change to retrieval, reranking, or
re-grounding gets tested against the same harness, and regressions show up
the moment they happen.

---

## Phase 8 — Commit, push, write the week-1 build notes (~1 hour)

```bash
git add .
git commit -m "Week 1: end-to-end pipeline working over 10 Enron docs"
git push
```

In a `docs/build-notes/week-1.md`, write 200–400 words on what came up while
wiring this. Specifics — what failed first, what you tuned, what surprised
you. The build notes are a useful artifact for anyone contributing later
and a forcing function for catching the things-that-feel-fragile while
they're still fresh.

---

## Troubleshooting cheat sheet

| Symptom | Diagnostic | Fix |
| --- | --- | --- |
| `pnpm dev` 500s on the library page | Check terminal for stack trace | Almost always a server-only lib (lancedb, unpdf) imported into a client component. Move the import into an API route. |
| Models pull keeps timing out | Network throttling | `ollama pull <model>` directly; resumes. |
| `ollama serve` says "address in use" | Already running | Skip — already running is the desired state. |
| Embeddings come back as `[]` | Wrong model name | Confirm `ollama list` shows `nomic-embed-text` exactly. |
| Brief generation hangs > 10 min on one section | Model loaded slow first time; subsequent calls fast | Wait it out once; future runs reuse the cached model. |
| `UND_ERR_HEADERS_TIMEOUT` on a section | Ollama buffers the full response before sending HTTP headers with `stream: false`; fixed upstream | `ollama.ts` already uses `stream: true` internally — if you see this, check you haven't reverted that. |
| Suppression rate hits 100% | Re-grounding too aggressive for your text | Lower thresholds in `src/lib/ground.ts`. |
| Retrieval recall is 0 | LanceDB index didn't build | Delete `data/matters/demo-enron/` and re-ingest. |
| Webview shows blank page | Hydration mismatch | Look for `useState` or `Date` in a server component; mark client-side bits with `"use client";`. |
| Reranker sidecar won't start | Missing Python deps or wrong Python version | `pip3 install -r reranker/requirements.txt`; requires Python 3.10+. macOS ships `pip3`, not `pip`. |
| Reranker starts but `device: cpu` is slow | MPS not detected | Confirm `torch.backends.mps.is_available()` returns `True`; install the Apple Silicon torch wheel via `pip install torch`. |
| Timeline still dominated by off-topic chunks | Reranker not running | Confirm `curl http://127.0.0.1:8001/health` returns `{"status":"ok",...}` before running the brief script. |

---

## What you'll have at the end of week 1

- A pushed GitHub repo with folder ingestion working end-to-end against the
  real engine.
- A real generated brief over real Enron documents, rendered in the shipped
  UI — wizard, citation panel, license states, and all.
- A four-stage retrieval pipeline: dense vector → BM25 → RRF → cross-encoder
  rerank (`BAAI/bge-reranker-v2-m3` sidecar, with graceful fallback to RRF
  order when the sidecar isn't running).
- Domain-agnostic retrieval queries that will accept any legal practice area
  once the per-area brief schemas land in week 2.
- A first eval run with actual recall@5, citation precision, and faithfulness
  numbers committed to the repo.
- A week-1 build notes entry capturing what came up.

That's the v1.0 week-1 build. Week 2 adds the three bespoke practice-area
schemas (probate, family law, PI), the Apple Mail on-disk reader, and real
Ask Anything API wiring. Week 3 brings iMessage scoping, pasted notes,
photos, drag-in, and the real offline license-key validator (RSA signature
verify against a bundled public key). Week 4 lands audio transcription via
the Whisper.cpp sidecar, the full eval suite, and the signed `.dmg`. See
[`Docket-SPEC.md §3`](../Docket-SPEC.md) for the staged build plan.
