# Docket LM — Living Matters: UX Brief for Claude Design

This is a focused brief for the **Living Matters** feature — a v1.1
surface that lets a lawyer add new material to an existing matter and
have the brief update materially in response, with the lawyer in
control of every regeneration.

It is intentionally shorter and more opinionated than the
[main spec section §1.16](../Docket-SPEC.md#116-living-matters-brief-updates-as-new-material-arrives-v11).
For the existing visual system, read the
[v1.0 UI brief](./UI-BRIEF.md). Living Matters should extend that
system, not invent a new one.

---

## What this feature is

A matter is not a snapshot. New documents arrive across the life of a
case — a follow-up email, a deposition transcript, a return-receipt
photo, a new round of medical records, a codicil that surfaces six
weeks late. The v1.0 wizard-only ingestion path treats each matter as
a one-shot event; Living Matters fits the real shape of how matters
unfold.

The feature gives the lawyer four things:

1. **A persistent way to add material** to any matter, from three
   equivalent entry points.
2. **A change detector** that tells them whether a given piece of new
   material actually affects the brief — and which sections.
3. **Section-level regeneration** with a side-by-side diff the lawyer
   reviews before saving.
4. **A version history** so the lawyer can see the brief as it
   appeared at any prior moment in the matter's life.

---

## How it fits into the rest of Docket LM

| Surface | What changes |
| --- | --- |
| Matter view header | A new **version chip** ("v3 · updated 2026-06-14") that opens version history. |
| Matter view footer | A new **Add to matter** button alongside Export and Research Handoff. |
| Matter view (drag target) | Dragging any file from Finder onto the matter view opens the Add Material panel. |
| Settings → Sources (per matter) | Existing sources list gains an "Add source" affordance. |
| Brief sections | After a regen, sections carry a small **updated** indicator with the version stamp. |
| Contradictions panel | NEW contradictions (added by a regen) carry a distinct tag for the first 30 days. |
| Ask Anything history | Each prior answer gains a "Re-ask with current material" affordance. |
| Research Handoff Audit | Exports made before the latest brief version are flagged **stale**. |

---

## Non-obvious product decisions that should drive the visual language

These are the calls that distinguish Living Matters from a generic
"add document and regenerate" feature. Each should be legible in the
design without having to be explained.

### 1. The lawyer initiates every regeneration

The detector runs automatically. **The regeneration does not.** The
product never presents the lawyer with a brief that silently changed
under them. After ingest, the impact report is the only thing on
screen until the lawyer presses "Regenerate" — and even then, they
review the section diffs before save.

Design implication: the "Regenerate" button is the primary action on
the impact-report screen and is *bright but not aggressive* — a calm
primary, not a "Save" / "Submit" pattern. The cancel path is
equivalently weighted.

### 2. "Add Material" reads as low-friction, not high-stakes

Dropping a file on the matter view is the lowest-effort gesture in the
product. The design should reward that — the drag target acquires a
quiet but unmistakable highlight, a single drop confirms the source,
and the rest happens in a side panel that never leaves the matter view.
**No modal dialog opens.** No "are you sure?" The mistake-recovery
path is the Sources list, where the lawyer can remove anything at any
time.

### 3. The impact report is the marquee surface, not the brief itself

After ingest, the lawyer lands on the impact report — not on the
matter view. The impact report reads like a thoughtful colleague
saying *"here's what I'd want you to know before you re-read this."*
A list of affected sections with one-line summaries. A count of new
items per category (`adds`, `supports`, `contradicts`). A prominent
"Regenerate these sections" action. The lawyer's time-to-value on the
update should be under fifteen seconds.

### 4. Contradictions added by a regen are the second-most important surface

When a regenerated section includes a `contradicts` finding — new
material conflicts with a prior brief claim — it carries a distinct
**NEW** tag and surfaces twice: in its section and in the matter-wide
Contradictions panel. The tag should be visible enough that a lawyer
scanning the page can't miss it but quiet enough not to read as alarm.
After 30 days, the NEW tag fades to plain contradiction styling.

### 5. Version history reads like a casebook ledger, not a Google Docs sidebar

The version chip in the matter header opens a drawer. The drawer reads
like a librarian's ledger — a list of versions, each with date,
trigger ("+medical records batch"), and which sections regenerated.
Clicking any prior version renders the brief as it was, with citations
that existed then, and a subtle but unmissable banner: "You are
viewing v2 of this brief (current is v3). [ View current ]
[ Restore this version ]."

The visual treatment should be deliberately understated. This is
research-aid history, not collaborative-editing history.

### 6. Section-level diffs read as proofreading, not as Track Changes

The section regeneration preview is two columns: the prior section
content on the left, the regenerated content on the right. The lawyer
accepts or rejects each section. Within a section, individual item-
level changes are shown but not surgically actionable in v1.1 — accept
is whole-section, reject is whole-section. (Item-level accept/reject
is a v1.2 candidate if eval data says regeneration is good enough that
the lawyer mostly wants whole-section accept.)

The visual language: subdued accent for additions, struck-through for
removals, both in the same type system as the rest of the brief. Not
red and green. Not balloon comments. Just a calm proofread.

### 7. The drag target is the matter view, not a dedicated drop zone

The whole matter view is a drop target when the lawyer is dragging a
file. The drop affordance — a thin glow at the edges, a subtle
overlay tag in the upper right saying "Drop to add to this matter" —
appears only during drag. There is no permanent "drag files here"
zone on the matter view, because that real estate belongs to the
brief.

---

## The screens

Six screens, in flow order. Most extend existing v1.0 surfaces; only
two are genuinely new pages.

### Screen 1 — Add Material entry points (three of them)

**A) Matter view footer button.** "Add to matter" — tertiary visual
weight, alongside Export, Share, Research Handoff. Click opens the
Add Material side panel.

**B) Drag onto matter view.** During a drag-over event, the matter
view gets a thin highlight border and a small overlay tag in the
upper right: "Drop to add to this matter." Drop opens the Add Material
panel pre-populated with the dropped file.

**C) Settings → Sources (per matter).** The matter's Sources list (the
same surface that exists today for reviewing what's in a matter) gains
an "Add source" button at the bottom. This is the full-fidelity path
for adding non-file sources — mail labels with new messages, iMessage
handles starting new threads, paste-in notes, audio files, Photos
smart albums.

### Screen 2 — Add Material side panel

Slides in from the right (or bottom on mobile). Shows:

- The source being added (file, mail scope, iMessage handle, etc.)
- A small preview where possible (filename + first line for text;
  thumbnail for images; transcript snippet for audio after Whisper
  runs)
- An optional "Notes" field for the lawyer to annotate why they're
  adding this ("Plaintiff's response to interrogatories, received
  2026-06-14")
- Primary action: "Ingest and detect changes" · Secondary: "Cancel"

The panel does not promise regeneration — it promises ingestion plus
impact detection. The lawyer chooses to regenerate on the next screen.

### Screen 3 — Ingest progress and impact report

After confirmation, the panel transitions to a progress view (similar
to the v1.0 wizard's ingest stage), then to the **Impact Report**:

> **3 new chunks indexed from `2026-06-12-mri-report.pdf`.**
>
> 2 sections affected:
>
> ▌ **Damages Picture** — 1 supports, 1 adds
>     The new MRI report corroborates the prior cervical strain
>     finding and adds a new lumbar finding not previously in the
>     brief.
>
> ▌ **Treatment Timeline** — 1 adds
>     New imaging study, 2026-06-12.
>
> 1 question potentially resolved:
>
> ▌ **Open Questions** — "MRI study pending" (from v1) appears
>     resolved by this material.
>
> [ Regenerate these 3 sections ] · [ Show me what changed ]
> [ Don't regenerate — just keep indexed ]

The third option matters: sometimes the lawyer wants the chunks in the
index for Ask Anything but doesn't want a brief change. Living
Matters preserves that affordance.

### Screen 4 — Section-by-section regeneration preview

The marquee surface. The lawyer steps through affected sections one
at a time. Each section view is two columns:

- **Left: current section**, exactly as it reads in the matter now,
  with footnote chips.
- **Right: regenerated section**, with the same footnote-chip
  treatment, additions in a subdued accent, removals struck through.

A persistent header for the section: section name, change summary
("+1 adds, +1 supports"), and three buttons: **Accept** · **Reject**
· **Skip for now**.

Between sections, a small breadcrumb: "Section 2 of 3 · Damages
Picture."

After the final section, a summary screen:

> Accepted: Timeline of Material Events (was v2, now v3)
> Accepted: Damages Picture (was v2, now v3)
> Rejected: Open Questions (kept v2 content)
>
> [ Save as v3 ] · [ Cancel and discard regen ]

### Screen 5 — Version history drawer

Opened from the version chip in the matter header. A vertical timeline:

> ▢ **v3 (current)** · 2026-06-14 · 10:42
>    Added: 2026-06-12-mri-report.pdf
>    Regenerated: Damages Picture, Treatment Timeline
>    Kept: Open Questions
>
> ▢ **v2** · 2026-05-29 · 14:08
>    Added: smith-deposition-transcript.docx
>    Regenerated: Timeline of Material Events, Parties & Roles
>
> ▢ **v1** · 2026-05-13 · 09:15
>    Initial brief from matter wizard.
>    Sources: 14 documents from `~/Cases/Smith-PI/`.

Clicking any version label loads the matter view in **historical mode**
— a banner appears at the top:

> You are viewing v2 of this brief. Current is v3.
> [ View current ] [ Restore this version as current ]

Historical mode is read-only; the lawyer can read, click citations,
and step through the source viewer, but can't edit, Ask Anything, or
generate a Research Handoff against a historical version. Those
actions require returning to the current version.

### Screen 6 — Re-ask with current material (Ask Anything diff)

In the Ask Anything history view, each prior answer gains a small
clock-arrow icon labeled "Re-ask with current material." Clicking it
re-runs the same question against the current chunk index. The
result appends below the original, with both timestamps:

> **Q: "Did the client report neck pain after the accident?"** ·
> asked 2026-05-14
>
> A: Yes — see [cit-7] and [cit-12]. (Original answer, generated
> 2026-05-14 using v1 of the matter.)
>
> ────
>
> **Re-asked 2026-06-14 with current material:**
>
> Yes, plus the 2026-06-12 MRI report now shows lumbar findings
> consistent with that mechanism — see [cit-7], [cit-12], [cit-44].

The Re-ask is purely additive. The original answer is preserved
exactly. The lawyer reads both side by side and decides which one to
quote in their work product.

---

## License-state interactions

Living Matters is included in the standard subscription (no separate
SKU, no add-on pricing).

- **Trial:** Available with no restrictions.
- **Active:** Available.
- **Renewal-reminder (last 30 days):** Available. The Add Material
  affordance is unaffected by the renewal pill.
- **Expired (read-only):** **Disabled.** Add Material buttons show
  the same tooltip pattern as other gated controls: "Requires an
  active license · Renew." Existing brief versions remain viewable.
  Version history opens. Historical-mode read-only behavior matches
  the expired-mode read-only behavior — both are the same code path,
  intentionally.

---

## What we're asking Claude Design for

1. **The drag-target treatment for the matter view.** A subtle
   highlight on drag-over, a single overlay tag in the corner.
   Should feel like the matter view is *consenting* to the drop, not
   "click here to upload."
2. **The Impact Report layout (Screen 3).** This is the most
   information-dense new surface — affected sections, change
   categories, resolved questions, primary/secondary/tertiary
   actions. Make it readable in fifteen seconds and visually distinct
   from the brief itself, so the lawyer knows immediately *this is a
   summary of changes, not the brief.*
3. **The section-by-section diff (Screen 4).** Two-column layout with
   the right type system for additions and removals. No red and
   green. No balloon comments. Just clean proofreading.
4. **The version chip and the version history drawer (Screen 5).**
   Small chip in the matter header, drawer that reads like a
   library checkout card.
5. **The "Re-ask with current material" affordance.** Small icon in
   the Ask Anything history view, transitions to a paired-answer
   layout cleanly.
6. **A Claude Code handoff bundle** that fits Living Matters
   components into the existing tree at `src/components/`,
   probably under `src/components/living-matters/`. Reuse
   `Sheet`, `Dialog`, `Tabs`, the existing footnote-chip system, and
   whatever diff primitives Claude Design built for Research Handoff
   (the two features share a chip-based diff vocabulary).
7. **Copy review.** Living Matters operates on a matter that's "alive"
   — the language should match: "updates," "new material," "added,"
   "regenerated." Avoid: "sync," "refresh," "reload," "merge." The
   product is not a CRM or a Git client.

The visual language should match the v1.0 system — calm, professional
reference work — and add a careful, deliberate "this changed since
you last looked at it" register to the new surfaces. The change is
the feature.
