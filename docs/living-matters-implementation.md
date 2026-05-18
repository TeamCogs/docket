# Living Matters — Implementation Prep for Claude Code

This is the engineering handoff for the **Living Matters** feature
described in [§1.16 of the spec](../Docket-SPEC.md#116-living-matters-brief-updates-as-new-material-arrives-v11)
and the [UX brief](./LIVING-MATTERS-BRIEF.md). It assumes the v1.0
engine is wired (FIRST-WEEK Phase 6 complete on `main`) and may ship
alongside or after Research Handoff in v1.1.

**Stack constraint:** Living Matters does not add any new sidecar. It
extends the existing brief-generation pipeline with an impact detector
and a versioned brief store. No new processes, no new network
capability, no new model downloads.

---

## What's being built, in one paragraph

A pipeline that takes a new source added to an existing matter, runs
the standard ingestion path (extract → chunk → embed → index), then
runs an **impact detection pass** that asks "which brief sections does
this new material affect?" — by re-running each section's stored
retrieval query against the updated index and classifying the new
chunks against the section's current items. A lawyer-approved
section-by-section regeneration produces a new brief version; prior
versions persist in a `brief_versions` archive table; the matter view
gains version history, an impact-report screen, and a section-level
diff preview. Research Handoff exports made under prior versions get
flagged stale.

---

## Data model additions (LanceDB)

Three new tables. One field added to existing `brief_sections`.

### `brief_versions` (new, archive table)

```ts
{
  version_id: string,                  // ULID
  matter_id: string,
  version_number: number,              // 1, 2, 3, ... per matter
  generated_at: timestamp,
  trigger: enum,                       // 'initial' | 'add_source' | 'manual_regen'
  trigger_source_ids: string[],        // SourceIds that triggered this regen
  trigger_summary: string,             // human-readable: "+medical records batch"
  sections_regenerated: string[],      // section_kinds touched in this version
  sections_carried_forward: string[],  // section_kinds untouched but copied
  schema_version: enum,                // 'probate' | 'family' | 'pi' | 'general'
  model_version: string,
  prior_version_id: string | null,     // chains back to v_{n-1}
}
```

One row per brief version, ever. Never deleted (unless the matter is
deleted). The version chip in the matter header reads from this table.

### `brief_section_versions` (new, archive table)

```ts
{
  section_version_id: string,
  version_id: string,                  // → brief_versions
  section_kind: string,                // 'snapshot' | 'parties' | ...
  content_json: jsonb,                 // same shape as brief_sections.content_json today
  confidence_chip: enum,
  was_regenerated: boolean,            // true if this section was regen'd in this version; false if carried forward
  carried_from_version_id: string | null,
}
```

One row per section per version. Carrying a section forward across
versions duplicates the row with `was_regenerated = false` and the
`carried_from_version_id` set to the version it last regenerated in.
The duplication is cheap and keeps the read path uniform — rendering
v3 of a matter is always `WHERE version_id = 'v3'` regardless of which
sections were touched.

### `brief_section_diffs` (new)

```ts
{
  diff_id: string,
  version_id: string,                  // the new version being introduced
  prior_version_id: string,            // the version being diffed against
  section_kind: string,
  added_items_json: jsonb,             // items present in new, absent in prior
  removed_items_json: jsonb,           // items present in prior, absent in new
  modified_items_json: jsonb,          // items present in both but with different content
  new_contradictions_json: jsonb,      // contradiction items added by this regen
  generated_at: timestamp,
}
```

Populated when a section regenerates. Read by the section-by-section
diff preview screen (Screen 4 of the UX brief). The lawyer's
accept/reject choices are recorded by writing or not-writing the
corresponding `brief_section_versions` row.

### `chunks` (existing) — additive field

Add one nullable column:

```ts
impact_classification: enum | null     // 'supports' | 'adds' | 'contradicts' | 'noise'
classified_against_version_id: string | null
classified_at: timestamp | null
```

The impact detector writes these. Chunks not yet classified against any
brief version have `impact_classification = null`. Chunks classified
against an older version get re-classified if the relevant section
regenerates.

### `handoff_exports` (existing, from Research Handoff) — additive field

```ts
brief_version_id: string               // the version the export was generated against
```

Drives the **stale** badge in the Handoff Audit table.

### `external_research` (existing, from Research Handoff) — additive field

```ts
imported_under_version_id: string      // the version that was current when imported
```

Drives the "(imported under v2)" tag in the External Research section.

### `qa_history` (existing) — additive field

```ts
asked_against_version_id: string       // the version current when the Q was asked
```

Plus a new optional companion row for re-asks:

```ts
{
  qa_id: string,                       // new ULID for the re-ask
  matter_id: string,
  parent_qa_id: string,                // the original Q being re-asked
  asked_at: timestamp,
  asked_against_version_id: string,
  question: string,                    // same as parent
  answer_json: jsonb,
  // ... rest of qa_history fields
}
```

The "Re-ask with current material" affordance inserts one of these.

---

## The impact detector

The cheap pass that lets the lawyer answer "do I even need to look at
this update?" Runs after ingest completes for new sources.

```
on workspace_add_source_complete(new_chunk_ids):
  current_version ← get_current_brief_version(matter_id)
  affected_sections ← []
  for section in current_version.sections:
    candidates ← retrieve(matter_id, section.retrieval_query, top_n=30)
    new_in_top ← candidates ∩ new_chunk_ids
    if len(new_in_top) > 0:
      classifications ← classify_chunks_against_section(
        chunks=new_in_top,
        section_items=section.content_json.items,
      )
      if any(c in {'adds', 'contradicts'} for c in classifications):
        affected_sections.append({
          section_kind: section.section_kind,
          new_in_top,
          classifications,
          summary: summarize(classifications),
        })
        write_chunk_classifications(new_in_top, classifications, current_version.id)
  return ImpactReport(matter_id, current_version, affected_sections)
```

The `classify_chunks_against_section` step runs a single LLM call per
section per new-chunk-batch, with a tight structured-output prompt:

```
You are classifying new evidence chunks against the existing brief
section's items. For each chunk, output exactly one label:

- supports: corroborates an existing item without adding new facts
- adds: introduces a fact the section should include
- contradicts: conflicts with an existing item in this section
- noise: retrieved but doesn't change the section's content

Output JSON: { classifications: [{chunk_id, label, brief_note}] }
```

Use Qwen3-8B for this. It's a lightweight classification, not a
generation task. Latency target: ≤ 3 seconds per affected section on
M3 Pro.

The Open Questions section gets a specialized classifier prompt that
also detects **resolutions** (new material answers a previously open
question). Resolved questions go into the impact report's "resolved
questions" subsection.

---

## Partial regeneration

When the lawyer presses "Regenerate these sections":

```
on regenerate_sections(matter_id, section_kinds):
  prior_version ← get_current_brief_version(matter_id)
  new_version ← create_brief_version(
    matter_id,
    version_number=prior_version.version_number + 1,
    trigger='add_source',
    trigger_source_ids=last_added_source_ids,
    prior_version_id=prior_version.version_id,
  )
  for section_kind in prior_version.sections.keys():
    if section_kind in section_kinds:
      new_section ← run_section_pipeline(  // existing retrieve→rerank→generate→reground
        matter_id,
        section_kind,
        schema=prior_version.schema_version,
      )
      write_brief_section_version(new_version, section_kind, new_section,
                                  was_regenerated=true)
      write_brief_section_diff(new_version, prior_version, section_kind, new_section)
    else:
      // carry forward without re-running the pipeline
      copy_brief_section_version(prior_version, new_version, section_kind)
  return RegenerationPreview(new_version, diffs)
```

The lawyer reviews the section diffs (Screen 4 of the UX brief) and
accepts or rejects each. Acceptance saves the `brief_section_versions`
row as-is; rejection deletes the new row and re-copies the
prior-version row with `was_regenerated = false`.

The `run_section_pipeline` function is the same one v1.0 uses — no
new code path. The only addition is the trigger context and the
versioned write.

---

## IPC commands

Eight new Tauri commands.

```rust
// Versioning
list_brief_versions(matter_id: MatterId) -> Vec<BriefVersionSummary>
get_brief_version(version_id: BriefVersionId) -> BriefVersion
get_current_brief_version(matter_id: MatterId) -> BriefVersion
restore_brief_version(version_id: BriefVersionId) -> BriefVersionId  // creates a new vN+1 that copies vM

// Add material + impact
add_material(matter_id: MatterId, source: WorkspaceSource) -> AddMaterialResult
  // = workspace_add_source + ingest + impact detection
get_impact_report(matter_id: MatterId, since_version: BriefVersionId)
  -> ImpactReport

// Regeneration
preview_section_regeneration(matter_id: MatterId, section_kinds: Vec<String>)
  -> RegenerationPreview
commit_regeneration(matter_id: MatterId, accepted_section_kinds: Vec<String>,
                    rejected_section_kinds: Vec<String>) -> BriefVersionId

// Q&A re-ask
reask_question(matter_id: MatterId, parent_qa_id: QaId) -> AnswerStream
```

Add `add_material` as a thin convenience wrapper rather than expecting
clients to call `workspace_add_source` + `ingest_workspace` + a
separate `detect_impact`. The convenience matters — three IPC calls
where one will do is fragile.

---

## API routes (Next.js)

```
POST   /api/matter/[matterId]/material            → add_material (multipart for file)
GET    /api/matter/[matterId]/impact              → get_impact_report
POST   /api/matter/[matterId]/regenerate/preview  → preview_section_regeneration
POST   /api/matter/[matterId]/regenerate/commit   → commit_regeneration

GET    /api/matter/[matterId]/versions            → list_brief_versions
GET    /api/matter/[matterId]/versions/[versionId] → get_brief_version
POST   /api/matter/[matterId]/versions/[versionId]/restore → restore_brief_version

POST   /api/ask/reask                              → reask_question (streaming)
```

The `/api/matter/[matterId]/material` route is the one that accepts
multipart file uploads (for drag-onto-matter and the side-panel file
picker). Other source types (mail label, iMessage handle, paste-in
note) post structured JSON.

---

## File layout additions

No additions under each matter directory — `brief_versions` lives
entirely in LanceDB. The existing `brief.json` file on disk continues
to mirror the *current* version for backward-compatibility with the
v1.0 read path (`src/app/matter/[id]/page.tsx`), and gets overwritten
on each regeneration. Historical versions are reconstructed from
LanceDB.

Component layout under `src/components/`:

```
src/components/living-matters/
├── AddMaterialButton.tsx                # Matter-view footer button
├── AddMaterialPanel.tsx                  # Side panel (Screen 2)
├── DragOverlay.tsx                       # Matter-view drag-target highlight
├── ImpactReport.tsx                      # Screen 3 (post-ingest)
├── RegenerationPreview.tsx               # Screen 4 (section-by-section diff)
├── SectionDiffView.tsx                   # Two-column diff per section
├── VersionChip.tsx                       # Matter-header chip
├── VersionHistoryDrawer.tsx              # Screen 5 (history)
├── HistoricalModeBanner.tsx              # Banner when viewing prior version
├── ReAskAffordance.tsx                   # Icon on Ask Anything history items
├── PairedAnswerView.tsx                  # Original + re-asked answer side-by-side
├── chips/
│   ├── UpdatedTag.tsx                    # "updated" indicator on sections
│   ├── NewContradictionTag.tsx           # NEW tag on regen-added contradictions
│   └── StaleHandoffBadge.tsx             # On handoff_exports flagged stale
└── lib/
    ├── livingMattersClient.ts            # API wrappers
    ├── impactSummarization.ts            # Human-readable summaries from classification stats
    └── diffRendering.ts                  # Section diff rendering helpers
```

State management: one Zustand store at `src/lib/living-matters-store.ts`,
matching the pattern of `license-store.ts`, `firstrun-store.ts`, and
(if Research Handoff lands first) `handoff-store.ts`.

---

## Eval harness additions

Three new metrics for the eval pipeline:

- **Impact detection precision** — over a golden set of (matter, new
  source, expected affected sections) tuples, what fraction of detected
  affected sections are correct?
- **Impact detection recall** — what fraction of expected affected
  sections does the detector catch?
- **Regen quality lift** — for a regenerated section, does the new
  section content score higher on faithfulness and recall@5 than the
  prior section did, against questions whose answers are in the newly
  added material?

Targets for v1.1 ship:

- Impact detection precision ≥ 0.85
- Impact detection recall ≥ 0.90
- Regen quality lift on questions resolved by new material: ≥ 0.20
  retrieval recall improvement, not worse on faithfulness.
- Median impact-detection latency ≤ 3 seconds per affected section on
  M3 Pro.
- Median full-regen latency ≤ 60 seconds for a typical 3-section
  regeneration on M3 Pro.

These get printed by `pnpm eval` and committed to
`docs/evals/<date>.md` per run.

---

## Migration considerations

Living Matters introduces brief versioning to a v1.0 codebase that
treats `brief.json` as the source of truth. The migration:

1. **On first load of a matter under v1.1**, the existing `brief.json`
   becomes `v1` in the new `brief_versions` table. Trigger is
   `'initial'`. This is a one-time backfill, idempotent.
2. **The on-disk `brief.json`** continues to be written by the current
   version, so any code path that reads it still works without changes.
   New components read from LanceDB directly when version-aware (the
   version-history drawer, historical mode).
3. **No data loss is possible** under any failure mode — the prior
   `brief.json` is read-only until the new version commits, then
   atomically replaced. Mid-regen failure leaves the prior version
   intact.

---

## What to ship in order

1. LanceDB schema migration (additive). Add the three new tables and
   the new fields on existing tables. Include the backfill that promotes
   existing matters' `brief.json` to `v1`.
2. The impact detector — `classify_chunks_against_section` LLM call,
   `get_impact_report` end-to-end. Unit-test against a fixture of
   prior brief + new chunks.
3. Partial-regen plumbing — `preview_section_regeneration`,
   `commit_regeneration`, the `brief_section_diffs` write path.
4. IPC commands and Next.js route handlers.
5. Components in priority order:
   `AddMaterialButton` + `AddMaterialPanel` → `ImpactReport` →
   `RegenerationPreview` + `SectionDiffView`. These three carry the
   forward flow.
6. Versioning UI: `VersionChip` + `VersionHistoryDrawer` +
   `HistoricalModeBanner`.
7. Re-ask: `ReAskAffordance` + `PairedAnswerView` + the reask IPC and
   API route.
8. Cross-feature staleness: `StaleHandoffBadge` in the Handoff Audit
   (depends on `brief_version_id` field on `handoff_exports` from
   Research Handoff).
9. Eval harness extensions and v1.1 golden set.
10. Documentation: architecture.md gets a "Versioning" subsection;
    README mentions Living Matters as a v1.1 feature.

A reasonable target: 2-week sprint. The hardest engineering surface is
the impact classifier — false positives create noise the lawyer has
to ignore, false negatives create updates the lawyer misses. The eval
harness targets above are the discipline.

---

## What NOT to build

- **No auto-regeneration in v1.1.** The detector runs automatically;
  the regen step is always lawyer-initiated. A "regenerate on add"
  toggle is a v1.2 candidate if user research justifies it.
- **No folder-watching, mailbox-polling, or thread-watching.** Add
  Material is pull-driven. Background watchers raise ethics questions
  (a privileged draft accidentally dropped into a watched folder
  would auto-ingest before the lawyer reviewed it) that we don't want
  to answer in v1.1.
- **No item-level accept/reject in section diffs.** Accept or reject
  is whole-section in v1.1. If eval data shows regenerations are
  mostly good with small individual issues, item-level controls
  become a v1.2 candidate.
- **No automatic cross-matter outlier learning.** A new source added
  to matter X doesn't update a "what's normal for me" baseline that
  affects matter Y. Single-matter scope only.
- **No "closed matter" archive state.** Matters are open or deleted
  in v1.1; archive states with their own UI come later.

---

## Open questions for the implementer

These are decisions deferred to the build phase, with my recommendation
attached.

1. **Should regeneration use the same model that produced the original
   section?** — Recommend yes. Mixing model versions across sections
   in a single brief makes diff comparison weird and the eval
   confound non-trivial. If the model upgrades mid-matter, the next
   regen uses the new model and the diff captures that.
2. **How long should `brief_section_diffs` rows persist?** — Recommend
   indefinitely. The diff is small (a JSON payload per section) and
   it's the lawyer's audit trail of what changed when. Auto-delete is
   user-hostile.
3. **Should `restore_brief_version` actually create a new vN+1 or
   just flip a "current" pointer back?** — Recommend create a new
   vN+1 that copies vM's content. Preserves linear history; the
   "Restore" action is itself a versioned event the lawyer can see
   later.
4. **What happens to in-flight Ask Anything queries when a regen
   commits?** — Recommend they complete against the version they
   started against. The matter view auto-refreshes to the new current
   version after the query completes.
5. **Should the impact detector also re-classify chunks that were
   classified against earlier versions?** — Recommend no. Old
   classifications are historical fact. The detector classifies new
   chunks against current version only. If the lawyer wants to see
   "everything that ever affected the Damages section," the version-
   history drawer plus per-version diffs already provide that.

---

*End of implementation prep.*
