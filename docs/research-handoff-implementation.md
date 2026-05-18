# Research Handoff — Implementation Prep for Claude Code

This is the engineering handoff for the **Research Handoff** feature
described in [§1.15 of the spec](../Docket-SPEC.md#115-research-handoff-v11)
and the [UX brief](./RESEARCH-HANDOFF-BRIEF.md). It assumes Claude Design
has already produced the v1.1 visual handoff bundle (component shells,
typography, the chip system) and the engine wiring from
[FIRST-WEEK.md Phase 6](./FIRST-WEEK.md#phase-6) is complete on `main`.

**Stack constraint:** Research Handoff fits inside Docket LM's existing
local-only architecture. It adds dependencies to the existing Python
sidecar; it does **not** add a new process and **does not** introduce
any outbound network capability.

---

## What's being built, in one paragraph

A pipeline that takes a generated `brief.json` plus its source citations,
runs an NER + regex + coref pass to identify entities, pseudonymizes
them consistently with role-typed counter labels, optionally generalizes
dates and amounts, writes the redacted draft to disk along with an
encrypted reverse-mapping file, surfaces residual-risk items for lawyer
review, and provides a re-import path that reverse-maps placeholders
back to entities and extracts citations for a verification gate. All of
it runs on the lawyer's machine. Docket LM makes no outbound API call
on the lawyer's behalf.

---

## Sidecar changes

### Extend the existing Python sidecar

The bge-reranker FastAPI sidecar at `sidecars/reranker/` becomes the
home for redaction too. Renaming it `sidecars/python/` (or
`sidecars/nlp/`) and giving it two routers is cleaner than spinning a
new process — the lawyer's machine already pays a 1.5–2 GB resident
cost for the legal-bert + rerankers; keeping them co-resident saves
another sidecar's worth of start-up time and supervisor overhead.

**New router:** `app.include_router(redaction_router, prefix="/redact")`

**New endpoints:**

```
POST /redact/analyze
  body:  { text: string, mode: "brief" | "section" }
  reply: { entities: Entity[], coref_clusters: Cluster[], stats: ... }

POST /redact/apply
  body:  { text: string, entities: Entity[], pseudonym_map: PseudoMap,
           generalizations: { dates: "exact" | "quarter" | "year",
                              amounts: "exact" | "bucket" | "redact",
                              locations: "keep" | "regional" } }
  reply: { redacted_text: string, residual_risks: RiskItem[], stats: ... }

POST /redact/reverse
  body:  { text: string, pseudonym_map: PseudoMap }
  reply: { restored_text: string, substitution_diff: SubDiff[] }

POST /redact/extract_citations
  body:  { text: string }
  reply: { citations: Citation[] }
```

The analyze/apply split exists so the preview UI can show entity
classification (analyze result) before the lawyer commits to a
substitution (apply call). It also lets the analyze pass be cached per
brief, since the brief content changes rarely.

### Dependencies to add

In `sidecars/python/requirements.txt`:

```
presidio-analyzer>=2.2
presidio-anonymizer>=2.2
spacy>=3.7
transformers>=4.40
fastcoref>=2.1
cryptography>=42
```

Plus model downloads (handled by the same first-run pull that fetches
Ollama and Whisper weights):

- `en_core_web_trf` (spaCy transformer pipeline, ~440 MB)
- A legal-NER model — start with `nlpaueb/legal-bert-base-uncased`
  loaded via Presidio's `TransformersNlpEngine`. Fine-tuning on
  CourtListener for case/docket/judge entity types is a v1.2 task; the
  base legal-bert is good enough to ship v1.1.
- `fastcoref` weights (~500 MB)

Total new disk footprint: ~1.4 GB. Add to the README's First-run model
download line item (currently ~28 GB → ~29.4 GB).

### Custom recognizers

Inside the redaction module, register Presidio `PatternRecognizer`s for
US legal entity formats:

```python
PATTERNS = {
    "DOCKET_NUMBER": r"\b\d{2}-(?:cv|cr|md|mc|bk)-\d{4,6}\b",
    "CASE_NUMBER":   r"\b(?:No\.|Case\s*No\.)\s*\d{2,}-[A-Z]+-\d+\b",
    "BAR_NUMBER":    r"\b(?:CA|NY|TX|FL)\s*Bar\s*No\.\s*\d{4,7}\b",
    "EIN":           r"\b\d{2}-\d{7}\b",
    "MRN":           r"\b(?:MRN|MR#)\s*\d{6,10}\b",
    "VIN":           r"\b[A-HJ-NPR-Z0-9]{17}\b",
    "POLICY_NUMBER": r"\b(?:Policy\s*(?:No\.|#))\s*[A-Z0-9-]{8,}\b",
    # FRCP 5.2 explicitly flagged categories
    "SSN_LAST_4":    r"\bxxx-xx-\d{4}\b",
}
```

Standard Presidio recognizers handle PERSON, LOCATION, EMAIL, PHONE,
DATE, US_BANK_ACCOUNT, etc. The legal-NER model adds CASE_REFERENCE,
COURT, JUDGE, LAW, ORGANIZATION-with-legal-tuning.

### Coreference pass

Run `fastcoref` over the brief text *before* anonymization. Take the
output cluster heads as canonical entity keys. This ensures "John
Smith," "Mr. Smith," "the plaintiff," and "he" all resolve to the same
`Plaintiff_1` rather than being assigned three different labels.

---

## Pseudonymization scheme

Role-typed counters, keyed by canonical entity, persisted per export:

```ts
type PseudonymMap = {
  exportId: string;
  matterId: string;
  createdAt: ISO8601;
  entities: {
    [canonicalKey: string]: {
      original: string;            // "John Smith"
      type: EntityType;            // "PERSON"
      role: string;                // "Plaintiff" | "Defendant" | "Witness" ...
      pseudonym: string;           // "Plaintiff_1"
      spans: Array<{ start: number; end: number; }>;
    };
  };
};
```

Counter assignment rule: increment per role within a matter, persistent
across re-exports. Once `John Smith` is `Plaintiff_1`, he stays
`Plaintiff_1` in every subsequent export from the same matter — so the
lawyer can do multi-round research with a cloud tool without the
pseudonyms drifting.

Role inference comes from a combination of:

1. Brief section context (the Parties & Roles section gives most of it
   for free — it explicitly names roles).
2. Coref cluster context (whoever is closest to "plaintiff" / "decedent"
   / "respondent" in the cluster head).
3. Lawyer override in the preview screen (Screen 4 of the UX brief).

Entities the system can't classify get a generic label
(`Entity_1`, `Entity_2`) and a flag for the residual-risk panel.

---

## Encryption: the per-export map file

Each export gets a sidecar file at
`matters/<matter_id>/handoff/<export_id>.map`. It's encrypted with
AES-GCM via Python's `cryptography` library. The key is derived from
the matter's existing per-matter encryption key (which already protects
`vectors.lance/` at rest) via HKDF:

```python
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

handoff_key = HKDF(
    algorithm=hashes.SHA256(),
    length=32,
    salt=matter_key,
    info=f"docket-handoff-{export_id}".encode(),
).derive(matter_key)
```

The handoff key never leaves the redaction module. The map file
contains the pseudonym table; nothing else — not the redacted text
(that's in the export artifact), not the original brief (that lives in
`brief.json`).

Lifecycle:

- Created at export time.
- Read at re-import time to reverse the substitutions.
- Persists until the lawyer deletes the matter, or until they
  explicitly "burn" an export's map from the Handoff Audit screen.
- Default TTL: 90 days. After that, the map is auto-burned and the
  matter's audit log retains the export record but loses the ability to
  reverse-map. The UI warns the lawyer at 80 days.

---

## Data model additions (LanceDB)

Add one table to the per-matter LanceDB schema:

```ts
// handoff_exports
{
  export_id: string,                 // ULID
  matter_id: string,
  brief_version_id: string,          // version of the brief this export was generated against
                                     //   (populated unconditionally; if Living Matters
                                     //   hasn't shipped yet, defaults to "v1")
  created_at: timestamp,
  destination_label: string,         // free-text "Claude" / "ChatGPT" / etc.
  format: enum,                      // "markdown" | "plaintext" | "two_pane"
  generalization_dates: enum,        // "exact" | "quarter" | "year"
  generalization_amounts: enum,      // "exact" | "bucket" | "redact"
  generalization_locations: enum,    // "keep" | "regional"
  redaction_counts: jsonb,           // { persons, dates, amounts, ... }
  residual_risks_count: number,
  consent_affirmed_at: timestamp,    // copied from matter-level affirmation
  map_file_path: string,             // matters/<id>/handoff/<eid>.map
  burned_at: timestamp | null,       // null until the map is deleted
}

// external_research (re-imported findings)
{
  research_id: string,
  matter_id: string,
  imported_under_version_id: string, // brief version current at import time
                                     //   (defaults to "v1" if Living Matters not shipped)
  imported_at: timestamp,
  source_destination: string,        // free-text where the lawyer pasted from
  source_export_id: string | null,   // links back to the export, if available
  content_markdown: string,
  citations_verified: jsonb,         // array of { citation, verified_at }
  unverified_citations_count: number,
}
```

The `external_research` rows render as the External Research section in
the matter view (Screen 9 of the UX brief). They live alongside
`brief_sections` but never feed into the standard brief generation
loop — they're appendices.

Add one matter-level field to the matter manifest:

```ts
// matters/<id>/manifest.json
{
  // ... existing fields ...
  cloud_research_consent: {
    affirmed_at: timestamp | null,
    affirmed_by: string,             // email from license payload
    revoked_at: timestamp | null,
  } | null,
}
```

Consent state lives on the matter, not globally, per Op. 512.

---

## IPC commands

Five new Tauri commands. The IPC enumeration at `src-tauri/src/ipc/mod.rs`
is still the auditable surface — every new command is one more line in
the file someone can read in fifteen minutes to verify the local-only
claim.

```rust
// Consent
get_matter_consent(matter_id: MatterId) -> ConsentState
affirm_matter_consent(matter_id: MatterId) -> ConsentState
revoke_matter_consent(matter_id: MatterId) -> ConsentState

// Handoff generation
analyze_brief_for_handoff(matter_id: MatterId) -> AnalysisResult
generate_handoff(
  matter_id: MatterId,
  options: HandoffOptions,
  pseudonym_overrides: Vec<PseudonymOverride>,
) -> HandoffPackage

// Handoff history
list_handoffs(matter_id: MatterId) -> Vec<HandoffSummary>
get_handoff(export_id: ExportId) -> HandoffPackage
burn_handoff_map(export_id: ExportId) -> ()

// Re-import
preview_external_research_import(
  matter_id: MatterId,
  pasted_text: String,
) -> ReverseMapPreview
import_external_research(
  matter_id: MatterId,
  pasted_text: String,
  pseudonym_overrides: Vec<PseudonymOverride>,
  citation_verifications: Vec<CitationVerification>,
) -> ResearchId
```

These flow into the sidecar via the existing supervisor pattern. No new
filesystem permissions are required — Research Handoff only writes
inside the matter directory, which Docket LM already owns.

---

## API routes (Next.js)

The Next.js app proxies sidecar calls through Tauri IPC. The new routes
under `app/api/handoff/`:

```
POST   /api/handoff/[matterId]/consent         → affirm_matter_consent
DELETE /api/handoff/[matterId]/consent         → revoke_matter_consent
GET    /api/handoff/[matterId]/consent         → get_matter_consent

POST   /api/handoff/[matterId]/analyze         → analyze_brief_for_handoff
POST   /api/handoff/[matterId]/generate        → generate_handoff
GET    /api/handoff/[matterId]                 → list_handoffs
GET    /api/handoff/[matterId]/[exportId]      → get_handoff
DELETE /api/handoff/[matterId]/[exportId]/map  → burn_handoff_map

POST   /api/handoff/[matterId]/import/preview  → preview_external_research_import
POST   /api/handoff/[matterId]/import          → import_external_research
```

All routes return JSON. No streaming surface in v1.1 — the redaction
pass takes well under 3 seconds for a typical brief (~5–10K words) and a
single response is simpler than SSE.

---

## File layout additions

Under each matter directory:

```
matters/<matter_id>/
├── ... existing structure ...
└── handoff/
    ├── 2026-05-18T10-30-00Z-clauderesearch.md      # redacted draft, format: markdown
    ├── 2026-05-18T10-30-00Z-clauderesearch.map     # encrypted pseudonym map
    ├── 2026-05-18T10-30-00Z-clauderesearch.json    # export metadata (also in LanceDB)
    ├── 2026-05-22T14-12-00Z-chatgpt.md
    └── ...
```

Filenames include ISO timestamp + lawyer's destination label as a slug.
This makes the directory listing readable even if LanceDB is corrupted
or migrated.

Component layout under `src/components/`:

```
src/components/handoff/
├── ConsentAffirmationModal.tsx         # Screen 2
├── PackageComposer.tsx                  # Screen 3
├── RedactionPreview.tsx                 # Screen 4 (side-by-side diff)
├── ResidualRiskPanel.tsx                # Screen 5
├── CopyShareScreen.tsx                  # Screen 6
├── ResearchImportSurface.tsx            # Screen 7
├── CitationVerificationList.tsx         # Screen 8
├── ExternalResearchSection.tsx          # Screen 9 (renders in matter view)
├── HandoffAuditTable.tsx                # Settings → Handoff Audit
├── chips/
│   ├── PseudonymChip.tsx                # for redacted entities
│   ├── DateChip.tsx                     # generalized dates
│   ├── AmountChip.tsx                   # bucketed amounts
│   └── ResidualRiskChip.tsx             # quasi-identifiers
└── lib/
    ├── handoffClient.ts                 # API wrappers
    ├── chipStyling.ts                   # shared chip variants
    └── citationParsing.ts               # extracts citations from re-imported text
```

The chip components are the highest-reuse — they appear in 4 screens.
They should be small, composable, and styled by the same token system
the rest of the v1.0 UI uses (no new design tokens unless Claude
Design's handoff bundle introduces them).

State management: one Zustand store at `src/lib/handoff-store.ts`,
matching the pattern of `license-store.ts` and `firstrun-store.ts`.

---

## Eval harness additions

Two new metrics for the eval pipeline:

- **Redaction Recall** — over the golden set of redaction targets (a
  hand-curated subset of Enron + a synthetic legal-narrative set), what
  fraction of entities does the redactor catch?
- **False-Positive Rate** — over a hand-curated set of non-identifying
  phrases that look like entities ("Court of Appeals," "Christmas
  2022," "United States"), what fraction does the redactor incorrectly
  redact?

Targets for v1.1 ship:

- Redaction Recall ≥ 0.95 on the golden set.
- False-Positive Rate ≤ 0.05.
- Median redaction latency ≤ 2 seconds for a 5,000-word brief on M3 Pro.

These get printed by `pnpm eval` and committed to
`docs/evals/<date>.md` per run.

---

## What to ship in order

1. Sidecar dependency installs, model auto-pull, `/redact/analyze` and
   `/redact/apply` endpoints, unit tests against a small fixture
   corpus.
2. LanceDB schema migration (additive — both new tables, plus the
   matter-manifest field).
3. IPC commands and the Rust-side glue.
4. Components in priority order: `ConsentAffirmationModal` →
   `RedactionPreview` → `CopyShareScreen`. These three carry the
   forward flow.
5. Re-import surface: `ResearchImportSurface` →
   `CitationVerificationList` → `ExternalResearchSection`.
6. Audit and burn: `HandoffAuditTable` + the burn-map command.
7. Eval harness extensions and the v1.1 golden set.
8. Documentation updates: README pricing section unchanged; new
   sub-section in README under "Features" mentioning Research Handoff;
   architecture.md gets a Redaction sidecar paragraph.

A reasonable target: 2-week sprint. Step 1 is the engineering
unknown — Presidio + legal-bert + coref integration is the one place
where the work could surprise.

---

## What NOT to build

- **No direct API integration** with Harvey, Claude, ChatGPT, Lexis+,
  or any cloud vendor. The paste is the air-gap and the audit trail.
  Don't add a "send to Claude" button. Don't add a "your API key" field
  for any vendor.
- **No automated cloud-tool comparison.** Docket LM doesn't help the
  lawyer pick which cloud tool to use. The destination dropdown is
  text-label-only and the lawyer decides.
- **No re-ingest of cloud findings as searchable chunks.** Imported
  research lives in the External Research section, not in the
  matter's chunk index. It is appendix material, not retrievable
  context for the next brief generation. (If the lawyer wants the
  findings to inform Ask Anything, they paste them into a Note source
  via the existing workspace ingestion path — same as any other
  paste-in note.)
- **No "anonymization" language in code or UI.** Variable names use
  `redact`, `pseudonym`, `placeholder`. Never `anonymize`. The product
  doesn't claim to anonymize and the codebase shouldn't either.

---

## Open questions for the implementer

These are decisions deferred to the build phase, with my recommendation
attached.

1. **Should the legal-NER model be fine-tuned on CourtListener for
   v1.1, or ship with base legal-bert?** — Recommend base for v1.1.
   Fine-tuning adds a training step and a model artifact that lawyers
   can't audit. Save fine-tuning for v1.2 once eval numbers tell us
   whether base is the bottleneck.
2. **Should `fastcoref` run on every export, or be cached per brief?**
   — Cache per brief, invalidate when the brief regenerates. Coref is
   the slowest stage; running it once per brief is the right cost.
3. **Should the consent affirmation expire?** — Recommend yes, 12-month
   TTL. Re-affirm annually per matter. Matches typical engagement
   letter renewal cadence.
4. **Should burned maps leave a tombstone in the audit log, or vanish
   entirely?** — Leave a tombstone. The audit log is for the lawyer's
   own protection if questioned later; an entry that says "map burned
   on 2026-08-12, content of export unrecoverable" is more useful than
   silence.
5. **Should re-import accept attached files, or only pasted text?** —
   v1.1: pasted text only. v1.2: consider drag-in of a `.md` file the
   lawyer downloaded from a cloud tool. Files broaden the surface area
   and we want one ingest path for v1.1.

---

*End of implementation prep.*
