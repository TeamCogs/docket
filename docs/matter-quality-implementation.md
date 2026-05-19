# Matter Quality Panel — Implementation Prep for Claude Code

This is the engineering handoff for the **Matter Quality** panel
described in [§1.11 of the spec](../Docket-SPEC.md#111-quality-measurement)
and the [UX brief](./MATTER-QUALITY-BRIEF.md). It assumes the v1.0
engine is wired (FIRST-WEEK Phase 6 complete on `main`).

**Stack constraint:** Matter Quality adds no new sidecar, no new
model, no new ingest path. It captures data the existing brief-
generation pipeline already produces but currently throws away
(suppressed claims, citation counts) and exposes a read-only
panel over it.

**This work replaces** the deprecated in-app `/eval` Enron-leaderboard
route. The developer eval harness (`pnpm eval`) stays as a repo-level
artifact and is unchanged.

---

## What's being built, in one paragraph

A per-matter, in-app panel that computes four read-only signals from
the matter's brief and LanceDB index: citation density per section,
the list of model-produced claims the re-grounding pass dropped, the
list of ingested documents the brief never cited, and a per-claim
reviewed-state the lawyer toggles by visiting the source span. All
data is local to the matter, computed on demand and cached in a
`quality.json` file alongside `brief.json`. The panel never aggregates
across matters and never sends anything anywhere.

---

## Pipeline change required: persist re-grounding suppressions

This is the only behavioral change in the brief-generation pipeline
itself. Today the re-grounding pass in `src/lib/ground.ts` drops
claims silently. Matter Quality requires those drops to be written.

```ts
// src/lib/ground.ts — extend the existing re-grounding pass
interface SuppressedClaim {
  id: string;                          // ULID
  brief_version_id: string;            // v1, v2, ... (or 'v1' if Living Matters not yet shipped)
  section_kind: string;
  attempted_claim_text: string;
  attempted_citation_chunk_ids: string[];
  drop_reason: 'no_grounding' | 'weak_grounding' | 'contradiction';
  reason_detail: string | null;        // one-line explanation if the pipeline produced one
  suppressed_at: timestamp;
}
```

Each drop appends to a `suppressed_claims` table in LanceDB. The
brief generation flow becomes:

```
for each section:
  retrieve → rerank → generate → reground
    on drop: append to suppressed_claims, do NOT include in brief
```

No change to the lawyer-facing brief output. Pure write-behind.

---

## Data model additions (LanceDB)

Two new tables. One new on-disk file. Zero changes to existing
tables in v1.0 (the field that ties suppression to brief versions
is forward-compatible with Living Matters but defaults sensibly when
Living Matters isn't shipped).

### `suppressed_claims` (new)

```ts
{
  id: string,                          // ULID
  matter_id: string,
  brief_version_id: string,            // 'v1' default; populated by Living Matters when present
  section_kind: string,
  attempted_claim_text: string,
  attempted_citation_chunk_ids: string[],
  drop_reason: enum,                   // 'no_grounding' | 'weak_grounding' | 'contradiction'
  reason_detail: string | null,
  suppressed_at: timestamp,
}
```

One row per dropped claim. The UX brief Screen 4 reads from this table.

### `claim_reviewed_states` (new)

```ts
{
  matter_id: string,
  claim_id: string,                    // the brief's per-claim ID (already exists; emitted by the generator)
  brief_version_id: string,            // 'v1' default; carries forward across Living Matters versions if claim survives
  reviewed_at: timestamp | null,       // null = unreviewed; setting it = reviewed
  reviewed_via: enum | null,           // 'source_view' | 'direct_toggle'
}
```

One row per claim per brief version. Carry-forward semantics under
Living Matters: when a regen produces a new brief version, any claim
whose text and citations are identical to the prior version's claim
keeps its reviewed-state (the row's `brief_version_id` updates to
the new version with `reviewed_via = 'carried_forward'` — see the
Living Matters interaction section below).

### `quality.json` (new, per-matter on-disk cache)

```ts
{
  matter_id: string,
  brief_version_id: string,            // matches the current brief.json
  computed_at: timestamp,
  citation_density: {
    by_section: {
      [section_kind: string]: {
        claim_count: number,
        single_source_count: number,
        multi_source_count: number,
      }
    },
    total_claims: number,
    total_single_source: number,
    total_multi_source: number,
  },
  document_coverage: {
    total_ingested: number,
    cited_count: number,
    uncited_count: number,
    cited_doc_ids: string[],
    uncited_doc_ids: string[],
  },
  suppression_summary: {
    total_dropped: number,
    by_section: { [section_kind: string]: number },
    // full list lives in suppressed_claims; this is the headline numbers
  },
  verification_summary: {
    total_claims: number,
    reviewed_count: number,
    by_section: {
      [section_kind: string]: { total: number, reviewed: number }
    },
  },
}
```

Computed after each brief generation and after each Living Matters
regen. Cached so the panel opens instantly; recomputed when the
reviewed-state changes (cheap — just the verification block re-
counts).

The cache lives at `~/Library/Application Support/Docket/matters/<matter-id>/quality.json`.
Replaces the now-removed `eval/` subdirectory.

---

## Quality computation, end to end

A single `computeMatterQuality(matterId)` function in
`src/lib/quality.ts` runs after every brief generation and every
Living Matters regen.

```ts
async function computeMatterQuality(matterId: MatterId): Promise<MatterQuality> {
  const brief = await readBrief(matterId);                       // brief.json
  const version_id = brief.version_id ?? 'v1';

  // 1. Citation density — count footnotes per claim, by section.
  const citation_density = aggregateCitationCounts(brief);

  // 2. Document coverage — set difference: ingested doc_ids minus cited doc_ids.
  const ingested = await listIngestedDocIds(matterId);           // from manifest.json
  const cited = collectCitedDocIds(brief);                       // walk all footnote chips
  const document_coverage = {
    total_ingested: ingested.length,
    cited_count: cited.size,
    uncited_count: ingested.length - cited.size,
    cited_doc_ids: [...cited],
    uncited_doc_ids: ingested.filter(d => !cited.has(d)),
  };

  // 3. Suppression — read from the table.
  const suppressed = await db.suppressed_claims
    .where({ matter_id: matterId, brief_version_id: version_id })
    .toArray();
  const suppression_summary = {
    total_dropped: suppressed.length,
    by_section: countBy(suppressed, s => s.section_kind),
  };

  // 4. Verification — read claim_reviewed_states + the brief's claim list.
  const all_claims = collectAllClaimIds(brief);
  const reviewed_rows = await db.claim_reviewed_states
    .where({ matter_id: matterId, brief_version_id: version_id })
    .where({ reviewed_at: { not: null } })
    .toArray();
  const reviewed_set = new Set(reviewed_rows.map(r => r.claim_id));
  const verification_summary = aggregateVerification(brief, reviewed_set);

  const quality = {
    matter_id: matterId,
    brief_version_id: version_id,
    computed_at: new Date().toISOString(),
    citation_density,
    document_coverage,
    suppression_summary,
    verification_summary,
  };

  await writeJson(`matters/${matterId}/quality.json`, quality);
  return quality;
}
```

`computeMatterQuality` runs:
- After `generate_brief` finishes (initial brief).
- After `commit_regeneration` finishes (Living Matters; see below).
- On `mark_claim_reviewed` / `unmark_claim_reviewed` (only the
  verification block re-counts; other blocks are stable).

Latency target: < 200ms for the full computation on a 14-document
matter on M3 Pro.

---

## IPC commands

Five new Tauri commands.

```rust
// Per-matter quality (read-mostly)
get_matter_quality(matter_id: MatterId) -> MatterQuality
get_uncited_documents(matter_id: MatterId) -> Vec<DocSummary>
get_suppressed_claims(matter_id: MatterId, brief_version_id: BriefVersionId)
  -> Vec<SuppressedClaim>

// Verification toggle (the only mutating commands)
mark_claim_reviewed(matter_id: MatterId, claim_id: ClaimId,
                    via: ReviewedVia) -> ()
unmark_claim_reviewed(matter_id: MatterId, claim_id: ClaimId) -> ()
```

`get_matter_quality` reads `quality.json` and returns it directly.
If the file is missing or stale (older than the current brief
version), it triggers a recompute synchronously. Idempotent.

`get_uncited_documents` returns full `DocSummary` records for each
uncited doc — filename, source type, first-page thumbnail path, page
count — so the Screen 5 list renders without extra calls.

`get_suppressed_claims` is paginated (default 50 per page) because a
verbose matter might produce hundreds of suppressions.

`mark_claim_reviewed` accepts `via: 'source_view' | 'direct_toggle'`
and writes `claim_reviewed_states`. Triggers a quality cache update
for the verification block only.

**Removed commands** (deprecated with the `/eval` route):

```rust
// REMOVED — these were the in-app eval surface, not the dev harness
- run_eval(matter_id, golden_set) -> EvalReport
- get_eval_history(matter_id) -> Vec<EvalReport>
```

The dev eval harness (`pnpm eval`) is unaffected — it never went
through IPC; it's a CLI script in the repo.

---

## API routes (Next.js)

```
GET    /api/matter/[matterId]/quality                    → get_matter_quality
GET    /api/matter/[matterId]/quality/uncited            → get_uncited_documents
GET    /api/matter/[matterId]/quality/suppressed         → get_suppressed_claims
POST   /api/matter/[matterId]/claim/[claimId]/reviewed   → mark_claim_reviewed
DELETE /api/matter/[matterId]/claim/[claimId]/reviewed   → unmark_claim_reviewed
```

The source viewer's existing route gains a side-effect: opening
a source span auto-fires `POST .../claim/[claimId]/reviewed` with
`via: 'source_view'` (debounced to avoid spam if the user steps
through citations rapidly).

---

## Component layout

```
src/components/matter-quality/
├── MatterQualityPanel.tsx          # the right-side panel container
├── CitationDensitySection.tsx       # Section 1 of the panel
├── SuppressionListSection.tsx       # Section 2
├── DocumentCoverageSection.tsx      # Section 3
├── VerificationChecklistSection.tsx # Section 4
├── ReviewedStateDot.tsx             # the small dot on citation chips
├── StackedDensityBar.tsx            # inline visualization for Section 1
└── types.ts
```

The `MatterQualityPanel` opens as a `Sheet` from `shadcn/ui` on
desktop (right-side, dismissible by clicking outside or Escape) and
as a full-screen sheet on mobile. The four section components are
collapsible `Collapsible` primitives stacked vertically.

`ReviewedStateDot` lives inside the existing footnote-chip system
in `src/components/`. It is not a separate component physically
placed next to chips; it is a render inside the chip. Modify the
chip component to accept a `reviewedState` prop and render the dot
inside its existing padding.

---

## Routing

Add a new route: `/matter/[matterId]/quality` that renders the panel
fullscreen on direct navigation (deep-linkable) and is also reachable
as a side-sheet from the matter view via a header link.

The panel is opened by:

1. Clicking the "Quality" link in the matter view header (opens as
   a side-sheet, browser URL updates to `?quality=open` but doesn't
   navigate).
2. Direct navigation to `/matter/[matterId]/quality` (fullscreen).
3. Keyboard shortcut `q` while in the matter view (opens the
   side-sheet).

---

## Where this hooks into the existing brief

The brief rendering already emits claims and footnote chips. Two
changes:

1. **The footnote chip component** in `src/components/`
   (currently rendering footnote numbers) gains an internal
   reviewed-state dot. The dot's tint comes from the
   `claim_reviewed_states` row for that claim_id. Toggling is
   click-handled inside the chip.

2. **The source-viewer route** fires `mark_claim_reviewed` with
   `via: 'source_view'` when the user views a source span (debounced
   500ms to avoid firing on the user paging through with j/k).

The brief data model already carries per-claim IDs (today they
emerge from the generator; verify the v1.0 implementation persists
them — if not, add `claim_id: string` to the brief JSON shape).

---

## Living Matters interaction

When Living Matters regenerates a brief version, two carry-forward
rules apply:

### Reviewed-state carries forward when the claim is identical

After `commit_regeneration` produces a new brief version, walk every
claim in the new version. For each claim, look up the prior version's
claim with the same `claim_id` (or fall back to a text-similarity
match if IDs are unstable across versions). If both the claim text
and the citation chunk IDs are identical, copy the prior version's
`claim_reviewed_states` row forward with the new `brief_version_id`
and `reviewed_via = 'carried_forward'`.

If the claim changed (text or citations) it appears unreviewed in
the new version. The lawyer re-reviews it; that's the point.

### Suppression list rolls forward but is partitioned by version

The Screen 4 suppression list, by default, shows the current
version's drops only. A toggle exposes "all versions" for the
matter's lifetime. Counts in `quality.json` are always current-
version-only.

### The quality cache recomputes per version

Each Living Matters regen triggers a fresh `computeMatterQuality`
call. The `brief_version_id` in `quality.json` tracks the current
brief version. Stale-cache detection is just an equality check
between `quality.json.brief_version_id` and `brief.json.version_id`.

---

## Scaffold removal: deleting the old `/eval` route

The current scaffold has:

```
src/app/eval/page.tsx
src/components/eval/EvalTable.tsx
```

Both delete entirely. Also:

- Remove the Eval Lab link from any nav component
  (`src/components/Nav.tsx` or equivalent).
- Remove any mock data the eval page consumed.
- Remove any IPC stubs for `run_eval` / `get_eval_history` if they
  were stubbed in the Rust core.

The `eval/` directory at the repo root **stays.** It hosts the dev
eval harness (`run.ts`, `golden-set.jsonl`, `README.md`,
`promptfoo.yaml`) and is unaffected. The deprecated route is the
in-app surface; the developer artifact persists.

The per-matter `eval/` subdirectory (`matters/<id>/eval/`) is
removed from the file-layout convention; matters now store
`quality.json` in its place.

---

## Migration

Matters created under the pre-Matter-Quality scaffold:

- Have no `quality.json`. On first open of the matter under v1.0
  Phase 8 or later, the panel triggers `computeMatterQuality`
  synchronously, populating the cache.
- Have no `suppressed_claims` rows for prior brief generations
  (the re-grounding pass wasn't yet writing). The panel reads "0
  claims dropped" honestly — explicitly captioned "No suppression
  data available for briefs generated before v1.0 Phase 8" rather
  than implying a clean pipeline.
- Have no `claim_reviewed_states` rows. Every claim starts
  unreviewed; the lawyer can walk through and mark them.

Matters under Living Matters (v1.1):

- Each prior brief version has its own `quality.json`
  reconstructable from the LanceDB tables (suppressed_claims,
  claim_reviewed_states) which carry `brief_version_id`.
- Restoring an older version restores its reviewed-state set, not
  the current version's.

---

## Performance targets

| Operation | Target on M3 Pro |
| --- | --- |
| `computeMatterQuality` end-to-end | ≤ 200 ms |
| Panel first paint after click | ≤ 250 ms (cache hit) / ≤ 450 ms (cache miss) |
| Mark claim reviewed → dot tint shift | ≤ 60 ms (optimistic update, write async) |
| Uncited documents list with thumbnails | ≤ 500 ms for 50 docs |
| Suppressed claims pagination | ≤ 200 ms per page |

These get measured by the dev eval harness's latency budget pass
(extends an existing fixture) and printed alongside the brief-gen
latencies in `docs/evals/<ISO_DATE>.md`.

---

## What we do NOT measure

Worth stating explicitly so it doesn't drift in over time.

- **No "overall quality score."** No headline percentage, no grade,
  no compound metric. The panel reports counts, never composites.
- **No cross-matter aggregation.** No "your average review rate."
  No "your median citation density across matters." These do not
  appear anywhere in the code, the data model, or the UI.
- **No telemetry.** None of the panel's data leaves the device.
  Not for support, not for a future "anonymized improvement
  feedback" feature. The local-only commitment is unconditional.
- **No comparison to the public corpus benchmark.** A lawyer's
  custody brief is not commensurable with the Enron golden set.
  The dev harness measures the engine; this panel measures the
  brief. They share no UI surface for a reason.

---

## Testing strategy

Three layers:

1. **Unit tests** on `computeMatterQuality` — fed synthetic briefs
   and synthetic suppression / reviewed-state tables, asserts
   exact counts.
2. **Integration tests** that generate a brief over a 5-doc
   demo matter, then assert `quality.json` shape and values.
3. **The dev eval harness** (`pnpm eval`) is extended with a
   "Matter Quality cache freshness" check — assert that after a
   brief generation, `quality.json` exists, its `brief_version_id`
   matches, and `computed_at` is within the last minute. This
   doesn't measure quality of the panel; it just keeps the cache
   from rotting silently.

No "evaluation" of the panel itself — there is no notion of "the
panel is correct" because the panel is a deterministic projection
over data, not a probabilistic output. If unit tests pass and the
data shape matches the brief, the panel is correct.

---

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Lawyers interpret the verification checklist as Docket grading them | UI copy hammers "this is a workflow, not a grade." The checklist visualization uses tint shifts, not checkmarks or progress percentages. |
| Suppression list reads as "Docket caught itself lying," shaking confidence | Copy frames it as "here is what the pipeline filtered before it reached you." Read-only and quiet. |
| Uncited-documents list reads as accusatory ("Docket missed these") | Frame as inventory, not error. No "(unused)" or "(not referenced)" framings; just neutral list-with-thumbnail. |
| `quality.json` and `brief.json` go out of sync silently | Brief version ID equality check on every read; synchronous recompute on mismatch. |
| Performance regression on `computeMatterQuality` as matters grow | Cache invalidation only on brief regen and reviewed-state change. Walking citations is O(claims) — bounded. |
| `claim_id` not stable across Living Matters regens, breaking carry-forward | Add an explicit `(claim_text + citation_chunk_ids)` fallback hash for matching across versions when IDs don't match. |

---

## Cross-references

- [`Docket-SPEC.md §1.11`](../Docket-SPEC.md#111-quality-measurement) —
  canonical spec section describing both the dev eval harness and
  the Matter Quality panel.
- [`Docket-SPEC.md §2.7`](../Docket-SPEC.md) — IPC commands.
- [`docs/MATTER-QUALITY-BRIEF.md`](./MATTER-QUALITY-BRIEF.md) — the
  design brief for the surfaces this implementation supports.
- [`docs/living-matters-implementation.md`](./living-matters-implementation.md) —
  the partner v1.1 feature whose `brief_version_id` and section-
  versioning tables this implementation interoperates with.
- [`docs/FIRST-WEEK.md` Phase 7](./FIRST-WEEK.md#phase-7--first-real-eval-run--swap-eval-lab-for-matter-quality-90-minutes) —
  where the deprecated `/eval` route gets removed and the Matter
  Quality scaffold gets stood up.
