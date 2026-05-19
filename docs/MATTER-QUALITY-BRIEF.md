# Docket LM — Matter Quality Panel: UX Brief for Claude Design

This is a focused brief for the **Matter Quality** panel — a v1.0
surface that replaces an earlier "Eval Lab" page that surfaced
public-corpus benchmark numbers inside the working lawyer's app.
The new panel measures *this brief on this evidence* — the question
the lawyer actually has — and never aggregates across matters.

It is intentionally shorter and more opinionated than the
[main spec section §1.11](../Docket-SPEC.md#111-quality-measurement).
For the existing visual system, read the
[v1.0 UI brief](./UI-BRIEF.md). Matter Quality should extend that
system, not invent a new one.

---

## What this feature is

A per-matter, in-app quality view of the brief that was just
generated. Four read-only signals, all computed locally from the
matter's LanceDB index and the brief, all about *this matter*:

1. **Citation density** — per section, the count of claims with ≥1,
   ≥2, and single-source citations.
2. **Re-grounding suppression** — the read-only list of claims the
   model produced that didn't survive verification.
3. **Document coverage** — workspace items that landed in the
   index but that the brief never cited.
4. **Verification checklist** — every claim has a reviewed-state
   the lawyer flips by visiting its source span.

The panel is read-only and never blocks shipping. Numbers never
aggregate across matters. There is no firm-wide quality dashboard
and there will never be one — that's a different product.

### Why this replaced the Eval Lab

The earlier scaffold had an `/eval` route that surfaced the
public-corpus (Enron) benchmark numbers inside the working lawyer's
app, alongside a "Re-run · Enron" button. That was a category error
hiding in plain sight: a securities-corpus leaderboard doesn't
address the lawyer's question, and no working lawyer is going to
hand-author golden-set tuples for their custody motion. The dev
eval harness stays — as a repository artifact, published on the
GitHub README, for contributors and skeptical firm reviewers. It
is no longer a tab in the app. This panel is what occupies that
slot, and it is about *the lawyer's matter*, not Docket-as-a-product.

---

## How it fits into the rest of Docket LM

| Surface | What changes |
| --- | --- |
| Matter view header | A small **"Quality"** affordance (link / chip) — opens the panel. |
| Matter view (citation chips) | Each citation chip gains a tiny **reviewed-state dot** the lawyer can toggle by visiting the source. |
| Source viewer | After viewing a span, a quiet "Mark claim reviewed" appears in the toolbar. |
| Brief sections | Section headers may show a small "(X of Y reviewed)" count, no badge or grade. |
| Ask Anything | Unaffected. Q&A answers are also citable; their reviewed-state lives in QA history, not in the Matter Quality panel. |
| Library cards | **Unchanged.** The panel does not roll up to the library. |
| Settings | An entry: "Quality measurement — what this panel shows and what the GitHub repo measures separately." Links to the spec and the GitHub README. |

The panel is opened from the matter view, lives next to (not above)
the brief, and closes back into the matter when dismissed.

---

## Non-obvious product decisions that should drive the visual language

These are the calls that distinguish Matter Quality from a generic
"scoring dashboard." Each should be legible in the design without
having to be explained.

### 1. Quality is about *this brief on this evidence*

The lawyer is not asking "how good is Docket." They are asking "what
should I check before I trust this brief in front of opposing
counsel." The panel answers that question and only that question.

Design implication: no chrome that frames the matter as a unit
under test. No "score" headline. No grade. No A-through-F. The panel
opens directly into the four sections with their counts; the *header*
of the panel is the matter name, not the word "Quality" in 32px.

### 2. The panel is read-only and never blocks shipping

The lawyer can hand a brief to a partner with 0% of claims marked
reviewed. Docket does not gate. The panel makes state legible; it
does not enforce. There is no "you must review this before
exporting" interstitial. The lawyer is the professional.

Design implication: no warning iconography. No red. No "incomplete"
labels. The visual register is the register of a librarian's check-
out card, not an exam result.

### 3. The suppression list is transparency, not a brag

When the re-grounding pass drops a model-produced claim, the panel
shows what was dropped. Read-only. The framing is *here is what the
pipeline caught before it reached you*, not *look how many bullets we
shot down*. The lawyer should leave the section feeling more
trustful, not more anxious.

Design implication: no count headline ("23 hallucinations blocked!").
The dropped items are listed plainly with their attempted citations,
in the same type system as a footnote chip — except struck through
or muted, with a small "did not survive re-grounding" label. No
chest-thumping; quiet receipts.

### 4. Single-source claims are a count, not an alarm

A brief in which most claims have one citation is normal in law.
"Single source" is not "low confidence." The panel reports the count
without affixing alarm to it. A lawyer scanning the panel should
read "37 claims cited to one source, 14 to two or more" the way they
read "37 emails, 14 with attachments" — informational.

Design implication: do not use warning colors on the single-source
count. Use the same neutral type as the multi-source counts. The
ordering visual (1-source / 2-source / 3+-source) is a stacked bar
or sorted list — not red / yellow / green.

### 5. Uncited documents are a question, not an error

Some ingested documents won't be cited and that's fine — background
material, draft duplicates, exhibits the brief didn't reach. But
some uncited documents are *the surprise the lawyer wanted to know
about*. The panel surfaces both without judgment; the lawyer decides
which case they're in.

Design implication: the uncited-documents list reads as a sources
inventory, not a "missing items" alert. Each row shows the filename,
short summary (if generated), and one click opens the source viewer
to that document's first page. There is **no** "why wasn't this
cited?" inference — that would be a layer of model uncertainty Docket
is not in a position to surface honestly.

### 6. The verification checklist is a workflow that turns green

This is the only piece of the panel the lawyer actively manipulates.
Each claim has a reviewed-state. The lawyer marks a claim reviewed
either by clicking through to its source span (auto-marks on view)
or by clicking the reviewed-state dot directly on the citation chip.

The brief becomes a checklist. As the lawyer works through it, dots
flip from neutral to a soft positive accent. By the time the brief
is ready to ship, the Matter Quality panel can show "92 of 94
claims reviewed" without ceremony.

Design implication: the reviewed-state dot is **small** and lives
inside the citation chip, not next to it. The transition from
neutral to reviewed is the gentlest possible — a tint shift, not a
checkmark. The lawyer should feel they are *reading*, not *grading*.

### 7. No aggregate across matters. Ever

There is no firm-wide quality dashboard, no "your average citation
density this quarter," no comparison between matters. Two reasons.
First, the moment Docket aggregates, it has implicitly compared
matters that should never be compared (a custody motion's "claims
reviewed" rate is not commensurable with a probate's, and the lawyer
knows it). Second, an aggregate view invites a "score" the
profession will misuse.

Design implication: the panel is reachable only from inside a
matter. There is no top-level "Quality" tab. The library cards do
not show a quality indicator. If you find yourself designing a
roll-up, stop.

### 8. The word "quality" cannot become "score"

Throughout the panel: no compound numerical grade, no percentage
in a hero number, no progress ring around the whole brief. The
*sections* of the panel report counts; the panel as a whole does
not have a headline number. A 92% verified brief and a 12% verified
brief are equally valid states; they are different *workflow stages*,
not different grades.

Design implication: search the design for any place a single number
might tempt the lawyer to read it as a verdict. If one exists,
replace it with a count or a list.

---

## Screens to design

### Screen 1 — The entry point in the matter view header

A small affordance in the matter view header, sibling to the Add to
matter and Export buttons. Label: **"Quality"**. No badge, no
notification dot, no count. It's just a link.

When the brief has not yet been generated (the matter is still
ingesting or the brief generation hasn't started), the affordance
is present but disabled with a tooltip: "Available after the brief
generates."

### Screen 2 — Panel overview

Opens as a right-side panel (desktop) or full-screen sheet (mobile).
Matter name in the header. The four sections render as cards or
banded rows in this order:

1. **Citation density** — sub-header "37 claims cited · 14 to two
   or more sources." A small per-section breakdown follows.
2. **Re-grounding suppression** — sub-header "8 claims dropped before
   they reached the brief." A muted list follows.
3. **Document coverage** — sub-header "11 of 14 ingested documents
   appear in the brief." The 3 uncited are listed with thumbnails.
4. **Verification checklist** — sub-header "12 of 94 claims
   reviewed." Section-by-section progress underneath.

Each section is collapsible. The sections feel parallel — same
header weight, same row treatment — rather than ranked.

### Screen 3 — Citation density detail (expanded section 1)

Per brief section, three counts:

> **Timeline of Material Events**
> 14 claims · 9 cited to ≥2 sources · 5 single-source
>
> **Damages Picture**
> 12 claims · 7 cited to ≥2 sources · 5 single-source

A small inline stacked bar visualizes the proportion. Clicking the
single-source count opens a sub-view listing those claims with
their citations — single-source-only is a useful read-through pass
the lawyer can do, not an alarm.

### Screen 4 — Re-grounding suppression detail (expanded section 2)

The dropped claims, in the order they were produced, with their
attempted citations rendered in the same chip system as the brief
but muted and struck through. Each row shows:

> *"The defendant signed the agreement on March 14, 2024."* —
> attempted cite: [exhibit-7 p. 3] · **did not survive re-grounding**

Below, a one-line explanation per dropped claim if the pipeline
produced one ("the cited span did not contain the date asserted")
— omitted otherwise rather than fabricated.

Design language: muted, not warning. The lawyer reads this section
and walks away calmer, not more anxious. Quiet receipts.

### Screen 5 — Document coverage detail (expanded section 3)

Two lists side by side (or stacked on mobile):

- **Cited (11)** — workspace items the brief cited at least once.
- **Uncited (3)** — workspace items the brief did not cite.

Each row shows the filename, the source type (email / PDF / photo /
transcript), and an "open" affordance that opens the source viewer
to the first page. No inference about *why* a document was uncited
— Docket is not in a position to be honest about that.

### Screen 6 — Verification checklist detail (expanded section 4)

A per-section progress view:

> **Snapshot**            ▓▓▓▓░░░░░░  4 of 10 reviewed
> **Parties & Roles**     ▓▓▓▓▓▓▓░░░  7 of 10 reviewed
> **Timeline**            ░░░░░░░░░░  0 of 14 reviewed

Clicking a row jumps to that brief section. The reviewed-state dots
live on the citation chips themselves; this is just an overview.

A small footer note: "Marking a claim reviewed records that you
clicked through to its source span. Docket does not grade your
review."

### Screen 7 — The reviewed-state dot on a citation chip

The chip itself stays the same shape and type as today. A small
dot appears inside the chip — neutral when unreviewed, a soft
positive accent when reviewed. Hover shows a one-line state label.
The lawyer can click the dot directly to toggle (rare path; the
common path is clicking through to the source).

Transitions: 120ms tint shift on the dot. No checkmark, no
animation flourish, no toast.

### Screen 8 — Empty / edge states

- **No brief generated yet.** Panel shows "The Matter Quality panel
  becomes available after the first brief generates. Until then,
  the matter view shows your ingested workspace items."
- **Brief generated but zero suppressed claims.** Section 2 reads:
  "No claims were dropped during this brief's generation. The
  pipeline produced output it could ground." (Quiet, not
  celebratory.)
- **All documents cited.** Section 3 reads: "Every ingested
  document is referenced in the brief." (Useful, not framed as
  achievement.)
- **All claims reviewed.** Section 4 reads: "All 94 claims have been
  reviewed. The brief is ready to ship at your discretion."
  Docket still does not gate.
- **Brief regenerated under Living Matters.** Reviewed-state on
  claims that survive the regen carries forward; new claims appear
  unreviewed. The panel makes this explicit: "94 claims · 12
  reviewed (8 of which were carried forward from v2)."

---

## License-state interactions

The Matter Quality panel is included in the standard subscription
(no separate SKU, no add-on pricing).

- **Trial:** Available with no restrictions.
- **Active:** Available.
- **Renewal-reminder (last 30 days):** Available. Unaffected by
  the renewal pill.
- **Expired (read-only):** **Panel opens read-only.** All four
  sections render. The reviewed-state toggle is disabled with the
  same tooltip pattern as other gated edit controls: "Requires an
  active license · Renew." The lawyer can still see the citation
  density, suppression list, and document coverage as a reference
  artifact for an in-flight matter.

---

## Copy guidance

- **Use:** "reviewed," "cited," "ingested," "appears in the brief,"
  "did not survive re-grounding."
- **Avoid:** "approved," "verified" (too binding-sounding for what
  it is), "passed," "failed," "score," "grade," "rating,"
  "confidence%," "missing," "incomplete," "hallucination" (the word
  is correct but the affect is wrong — the panel is calm
  transparency, not virology).
- The word **"quality"** is the panel's name and appears in the
  affordance label. It does not appear inside the panel as a
  scoring concept.

---

## What we're asking Claude Design for

1. **The entry-point affordance** in the matter view header. A
   "Quality" link sized at parity with Add to matter and Export.
   No badge.
2. **The panel layout.** Four sections of parallel weight, each
   collapsible, each with a count sub-header and a typed-out
   sentence in the same register as the brief itself.
3. **The reviewed-state dot.** A small in-chip dot that toggles
   neutral → soft positive accent on click or on source-span view.
   Match the existing citation chip system in `src/components/`.
4. **The suppression-list type treatment.** Muted, struck-through
   versions of the same chip system used in the brief. The visual
   should feel like "here is what the pipeline filtered" — quiet,
   not alarmed.
5. **The single-source-count visualization.** A small inline
   stacked bar per brief section that does *not* read as a meter.
6. **The empty-state copy and treatment** for the eight edge cases
   above.
7. **A Claude Code handoff bundle** that fits the panel into the
   existing tree at `src/components/`, probably under
   `src/components/matter-quality/`. Reuse the existing footnote-
   chip system, `Sheet`, and `Tabs`. No new design primitives
   should be required.
8. **Copy review.** Hold the line on "no score, no grade, no
   verdict." If the design starts to imply a compound numerical
   quality, that is the failure mode to catch.

The visual language should match the v1.0 system — calm,
professional reference work — and add a careful "transparency about
how the brief was built" register to this surface. The panel
exists so that the lawyer feels they understand what is in front of
them, not so that they feel scored by it.

---

## Cross-references

- [`Docket-SPEC.md §1.11`](../Docket-SPEC.md#111-quality-measurement) —
  canonical spec section: the dev eval harness and the Matter
  Quality panel as a paired set.
- [`Docket-SPEC.md §2.7`](../Docket-SPEC.md) — IPC commands for
  Matter Quality (`get_matter_quality`, `mark_claim_reviewed`,
  `get_uncited_documents`, `get_suppressed_claims`).
- [`Docket-SPEC.md §2.8`](../Docket-SPEC.md) — UI surfaces; the
  Matter Quality panel replaces the earlier Eval Lab entry.
- [`docs/UI-BRIEF.md`](./UI-BRIEF.md) — the v1.0 visual system this
  panel extends.
- [`docs/matter-quality-implementation.md`](./matter-quality-implementation.md) —
  the engineering prep covering the LanceDB additions, the
  `quality.json` cache shape, the IPC commands, and how this hooks
  into Living Matters.
