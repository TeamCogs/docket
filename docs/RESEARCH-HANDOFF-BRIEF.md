# Docket LM — Research Handoff: UX Brief for Claude Design

This is a focused brief for the **Research Handoff** feature — a v1.1
surface that lets a lawyer export a redacted draft of their matter brief
for use in cloud research tools (Claude, ChatGPT, Lexis+ AI, Paxton,
Harvey if their firm has it), then re-import the findings safely.

It is intentionally shorter and more opinionated than the [main spec
section §1.15](../Docket-SPEC.md#115-research-handoff-v11). For the
existing visual system, read the
[v1.0 UI brief](./UI-BRIEF.md) — Research Handoff should extend that
system, not invent a new one.

---

## What this feature is

Docket LM ships local-only because ABA Rule 1.6 and Formal Opinion 512
won't tolerate routine cloud exposure of privileged client material.
That's the v1.0 promise.

But a lawyer's day-two work — after the brief renders — is almost
entirely *legal* research: statutes, case law, jurisdiction-specific
procedural rules, expert witness searches, damages comparables. None of
that lives in the matter folder. All of it lives in cloud tools.

Research Handoff is the feature that lets the lawyer cross that boundary
safely on their own terms. Docket LM produces:

1. A **redacted draft** of the brief, with every direct identifier
   pseudonymized consistently (`Plaintiff_1`, `Defendant_1`,
   `Employer_1`).
2. A **list of research questions** distilled from the brief's Open
   Questions and gaps.
3. **Procedural context** that isn't client-identifying (jurisdiction,
   court level, statutes in play, procedural posture).

The lawyer copies the package, pastes it into the cloud tool of their
choice, brings findings back, and Docket LM swaps the pseudonyms back to
real entities on re-import. **Docket LM never makes the outbound call
itself.** The paste is the air-gap.

---

## How it fits into the rest of Docket LM

| Surface | What changes |
| --- | --- |
| Matter view | A new "Research Handoff" affordance lives at the foot of the brief, alongside Export and Share. |
| Matter view (after re-import) | A new **External Research** section appears beneath the standard brief sections, with its own Verify Citations gate. |
| Settings | New **Handoff Audit** section shows a per-matter log of every export. |
| First-run | No change. Research Handoff is matter-scoped, not app-scoped. |
| Ask Anything | No change. Q&A stays local. |
| Dev eval harness (repo) | New row for Redaction Recall and False-Positive rate in the `pnpm eval` output (contributor surface, not in-app, not for Claude Design). |

---

## Non-obvious product decisions that should drive the visual language

These are the calls that distinguish Research Handoff from a generic
"export with redactions" feature. Each should be legible in the design
without having to be explained.

### 1. The word is "Redacted Draft," not "Anonymized"

The product never claims to anonymize. ABA Op. 512 and California's
Practical Guidance both make clear that scrubbing identifiers doesn't
discharge Rule 1.6 — unique fact patterns re-identify. The product
copy, the button labels, the file names, the export header all use
**Redacted Draft for Outside Research**. The word "anonymized" should
not appear anywhere in the UI. This is a discipline of language and the
design system needs to enforce it.

### 2. The lawyer is the final filter — and the design should feel that way

Every redaction is reviewable. Every substitution is shown. The lawyer
clicks through a side-by-side preview before anything lands on the
clipboard. The visual treatment should feel like a **proof read**, not
a *fait accompli*. Think track-changes in Word, not a "Generate" button
that produces an opaque artifact.

### 3. Residual risk is a first-class panel, not a footnote

The product can scrub names. It can't scrub the *shape* of a story.
When a brief reads "the November 14, 2022 fire at the only chemical
plant in Greene County," changing "John Smith" to `Plaintiff_1` doesn't
help. The export preview includes a **Residual Risk** panel that lists
specific dates, amounts, and rare entities still in the redacted draft,
with one-click generalization (date → `Q4 2022`, dollar → `$50K–$250K`,
location → `regional descriptor`). This panel should feel substantial
— it's the difference between the feature being honest and being
malpractice-adjacent.

### 4. Consent affirmation is per-matter, surfaced as a checklist, not a EULA

ABA Op. 512 says boilerplate engagement-letter consent is not enough
for GenAI use. Before the first export on any matter, the lawyer
affirms — via an explicit checklist, not a "I agree to the terms" — that
they have obtained informed client consent for cloud-tool research on
*this matter*. After affirmation, subsequent exports on the same matter
skip the gate but show a quiet "Consent on file · [date]" reminder. If
the lawyer wants to revoke consent on a matter, they click a link in
Settings. Design language: librarian, not lawyer.

### 5. Re-import is a verification ritual, not a paste

When the lawyer brings findings back from the cloud, the surface is
deliberately slower than copy-paste-save. Pseudonyms get reverse-mapped
and shown as a diff. Any case citations in the imported text get
extracted into a **Verify Citations** step, and the lawyer has to mark
each one verified before it lands in the matter. This is the Mata v.
Avianca guardrail: no cloud-tool citation enters a Docket matter
unverified. Design should treat this as a feature surface, not a chore
— a numbered checklist with citation chips that turn from yellow to
green as the lawyer ticks them off.

### 6. No cloud vendor logos. Anywhere.

The destination dropdown lists "Claude," "ChatGPT," "Lexis+ AI,"
"Paxton," "Spellbook," "Harvey," "Other" as text labels. **No logos, no
brand colors, no vendor screenshots.** Docket LM doesn't endorse any
cloud tool and the lawyer's compliance posture is theirs alone. The
visual treatment is a plain `<select>` with text labels, in the same
type system as the rest of Settings.

### 7. The audit trail looks like a librarian's checkout card

The Handoff Audit screen in Settings is a per-matter log of every
export: timestamp, destination text label, redaction counts, consent
affirmation date. It should feel like a library checkout card — a
calm, neutral, factual record the lawyer can show a bar regulator,
opposing counsel, or themselves a year later. Not a "compliance
dashboard." Not a "security center." A piece of paper with a date
stamp.

---

## The screens

Nine screens, in flow order. Several share components with the existing
v1.0 system; the new ones are flagged.

### Screen 1 — Export affordance in the matter view

At the foot of the rendered brief, alongside the existing PDF/DOCX
Export buttons, a **Research Handoff** button. Tertiary visual weight
(it's not the primary action on a matter; it's a sometimes-action).
Hover tooltip: "Generate a redacted draft for use in outside research
tools."

### Screen 2 — Consent affirmation (first export on a matter only)

One-screen modal. Header: "Before you export — informed consent." Body:
~3 sentences quoting Op. 512 in plain language. A 3-item checklist the
lawyer ticks:

- [ ] I have explained to my client how I use AI tools in their matter.
- [ ] I have obtained informed consent for cloud-tool research on this
      matter specifically.
- [ ] I understand redaction reduces but does not eliminate
      confidentiality risk.

A "Show sample disclosure language" disclosure-triangle expands a
paragraph the lawyer can adapt for their engagement letter. Primary
button: "I've obtained consent · Continue." Secondary: "Cancel — not
yet." No "Don't show me this again" toggle — consent is per-matter,
and the lawyer can confirm again in 2 seconds for a matter where they
already gave consent.

### Screen 3 — Package composition

Two-column layout. Left column: what's going in the package, as a list
of toggleable section chips:

- [x] Brief — all sections (redacted)
- [x] Open Questions (these become "research questions")
- [x] Procedural posture
- [ ] Suggested Next Steps (off by default — these were Docket LM's
      suggestions, lawyer can include if useful)

Right column: a small **Generalization options** panel:

- Dates: ( ) keep exact · (•) round to quarter · ( ) round to year
- Amounts: ( ) keep exact · (•) bucket · ( ) "redact"
- Specific locations: (•) keep · ( ) regional descriptor

These defaults reflect the "safer than the lawyer asked for" posture —
quarter-rounding and bucketing are on by default; the lawyer opts in to
sharper precision.

Primary action: "Generate redacted draft." A subtle progress indicator
(probably the same animation pattern the brief uses on first generation).
Should take under 3 seconds for a typical brief.

### Screen 4 — Preview (side-by-side diff)

The marquee screen. Two scrollable columns:

- **Left: original brief**, exactly as the lawyer reads it today.
- **Right: redacted draft**, with substitutions highlighted in a
  semantic accent color — `Plaintiff_1` chips replacing names,
  `[Q4 2022]` chips replacing dates, etc.

Hovering a chip in either column highlights the corresponding span in
the other. The lawyer can click any chip to:

- See what type the redactor classified it as
- See the role label that will be used
- Override (e.g., "redact this entirely" or "use a different label")

A persistent panel at the bottom of the right column reports counts:

> Redacted: 47 names · 12 dates · 8 amounts · 3 case numbers · 5
> employer references · 2 case citations preserved.

### Screen 5 — Residual Risk

A separate tab or accordion within the preview, **not a footer**. Shows
items the redactor flagged as residual risk:

- **Dates still in the draft** — specific dates that weren't generalized
  (with one-click "Generalize all to quarter")
- **Amounts** — specific dollar figures (with one-click bucket option)
- **Rare entities** — entities the NER classified as Unknown but flagged
  as potentially identifying (a small-town venue, an obscure employer, a
  rare medical condition). The lawyer can redact each manually.
- **Fact patterns** — a short paragraph the redactor identified as
  potentially unique enough to re-identify the matter, with a "manually
  generalize" affordance.

Visual weight: substantial. This screen is the honesty surface.

### Screen 6 — Copy / format / paste-to

Header: "Ready to share." A radio-group for output format:

- (•) Markdown (best for Claude, ChatGPT, Paxton)
- ( ) Plain text (best for Harvey, Lexis+)
- ( ) Two-pane (research questions first, then redacted context)

A text-only destination picker:

> I'm sending this to: [ Claude ▾ ]

Primary button: "Copy to clipboard." On click, a transient confirmation:
"Copied. 4,820 characters. Audit logged."

Below the button, a small reminder: "Docket LM does not send anything
to [destination]. Paste into your browser tab manually."

### Screen 7 — Re-import (paste surface)

Reached from the matter view → "Paste outside research." A wide textarea
labeled "Paste research findings from [Claude · ChatGPT · …] here."
Once the lawyer pastes, an inline panel runs the reverse-substitution
pass:

> Detected substitutions: `Plaintiff_1 → John Smith`, `Q4 2022 →
> Nov 14, 2022`, `Hospital_2 → St. Vincent's`. Review before saving.

The lawyer reviews the diff (side-by-side: pasted text with placeholders
| same text with real names) and can override individual substitutions.

### Screen 8 — Citation verification

After the substitution review, before save, a numbered checklist of
every case citation Docket LM extracted from the pasted text:

> [ ] **Doe v. Roe, 123 F.3d 456 (9th Cir. 2009)** — verify before
>     including ⓘ
>
> [ ] **Smith v. Acme, 2022 WL 12345** — verify before including ⓘ

The ⓘ tooltip explains: "Cloud tools sometimes invent citations that
look real. Open this case in Westlaw, Lexis, or CourtListener and
confirm it exists before checking the box."

Save button is disabled until all citations are checked. Below the
button, a "Mark all citations verified" affordance with a confirmation
modal: "You're affirming you've personally verified every citation in
this text. (Mata v. Avianca was a $5,000 sanction for skipping this
step.)" Friction-on-purpose.

### Screen 9 — External Research section in the matter view

After save, a new section appends to the matter brief: **External
Research** with a subtitle showing source ("Claude · 2026-05-18") and
the lawyer's verification stamp. The section renders the imported text
the same way the brief renders, with citations as clickable chips that
open the original cloud-tool output (stored locally as a per-export
artifact). Visually distinct from Docket-generated sections — perhaps a
different rule color, a left margin band, or a small "External" tag —
because the provenance is different.

---

## License-state interactions

Research Handoff is included in the standard subscription (no separate
SKU, no add-on pricing).

- **Trial:** Available with no restrictions. Counts against nothing.
- **Active:** Available.
- **Renewal-reminder (last 30 days):** Available. The handoff
  affordance is unaffected by the renewal pill.
- **Expired (read-only):** **Disabled.** The Research Handoff button
  shows the same tooltip pattern as other gated controls: "Requires an
  active license · Renew." Existing exports remain viewable in the
  Handoff Audit log; existing External Research sections stay readable.
  The lawyer cannot generate a new export or re-import findings.

The locked-state visual treatment should match the rest of the
expired-mode disabled controls — not a separate paywall pattern.

---

## What we're asking Claude Design for

1. **A visual treatment for the redaction chip system.** This is the
   most distinctive new component — pseudonym chips, date chips,
   amount chips. They appear in the side-by-side preview, the
   re-import diff, and the External Research section. The treatment
   needs to read as "this was changed, deliberately, by software you
   audited" — not as "this is a hyperlink" or "this is a tag."
2. **High-fidelity mockups for Screens 2–9.** Screen 4 (side-by-side
   preview) and Screen 8 (citation verification) are the highest
   leverage. They're also the two surfaces most likely to be
   screenshot for compliance documentation.
3. **The Residual Risk visual language** specifically. It needs to
   feel substantial and serious without being alarming. Not a red
   warning banner. Not a yellow caution stripe. Something closer to
   how a careful editor marks a manuscript.
4. **A Claude Code handoff bundle** that fits Research Handoff
   components into the existing component tree at `src/components/`
   (probably under `src/components/handoff/`). Reuse `Sheet`, `Dialog`,
   `Tabs`, `Diff` (we may need a new diff component) wherever possible
   — extend the v1.0 system, don't fork it.
5. **Copy review.** The product is allergic to the word "anonymized";
   it's allergic to "safe"; it's allergic to "secure." It uses
   "redacted draft," "reduces risk," "you remain responsible." A pass
   over every string in this brief plus the implementation doc would
   catch anything that drifts back toward marketing language.

The visual language should match the v1.0 system — calm, professional
reference work — and add a careful, deliberate, *slightly slower than
you might expect* register for the export and re-import flows. The
extra friction is the feature.
