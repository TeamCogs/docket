# Docket LM — UI Brief for Claude Design

> **Status:** Implemented in commit `fd2fa78` (Claude Design Editorial handoff).
> This document is preserved as a reference for the design intent that drove
> the v1.0 visual system. For the current state of the UI, read the components
> in `src/components/` directly. Future redesigns should write a fresh brief
> rather than amend this one.

This was the handoff brief for visual design work. It is intentionally shorter
and more opinionated than the [main spec](../Docket-SPEC.md).

---

## What Docket LM is

Docket LM is a fully-local desktop application for solo and small-firm
lawyers.
The lawyer creates a matter, attaches the relevant material from their machine
(folders, mailbox, scoped iMessage threads, photos, audio, pasted notes), and
Docket produces a practice-area-tuned cited brief plus a conversational Ask
Anything interface over the same material. **Nothing leaves the device. Ever.**

The user is a 5–25-year-experience solo attorney across seven practice areas:
probate, family law, personal injury, immigration, employment, criminal
defense, IP. They are technologically competent but not technical. They bill
in 6-minute increments and personally sign every word they produce. They use
Docket LM because every other AI legal tool sends client material to a cloud
and their reading of ABA Rule 1.6 and Formal Opinion 512 forbids that.

---

## Non-obvious product decisions that should drive the visual language

These are the calls that distinguish Docket LM from a generic legal AI tool.
Each one should be legible in the design without having to be explained.

### 1. Local-only is the entire value proposition

The "no data leaves" claim is what the lawyer is buying. The UI should make
that ambient, not buried. A small **NetworkBadge** — a pill, a chip,
something — should be visible on every screen and read something like
`0 bytes sent · offline mode` or `Local only · no cloud`. Not a celebratory
banner; a quiet, confidence-building presence. Lawyers will notice it.

### 2. Citation is non-negotiable

Every claim Docket renders has a footnote. Every footnote opens a panel
showing the source span with the cited paragraph highlighted. The visual
language should make citations feel like a feature, not an annotation —
think hover affordances on footnote chips, smooth source-panel transitions,
keyboard-shortcut prompts (`j`/`k` to step through). Citations are how the
lawyer trusts Docket; they earn screen real estate accordingly.

### 3. Confidence is shown at the section level, never per-fact

Most RAG tools show numeric confidence per claim. Docket explicitly does
not. The cognitive-bias research says per-fact scores either get ignored or
treated as verdicts, and both are bad outcomes. **Section headers may carry
a confidence chip** (high / medium / low). **Individual facts never do.**
Don't design per-fact score badges; design for "this section is high-
confidence overall" and let the lawyer trust their own reading of the
underlying citations.

### 4. Contradictions are first-class

When Docket finds internal contradictions across documents — "the 2001-08-14
letter says X; the 2001-10-16 email says ¬X" — those don't get buried in
prose. They become **first-class objects in a dedicated panel** with their
own visual treatment. A red dot. A "3 contradictions across documents" chip.
A dedicated Contradictions tab inside the Risks section. Whatever the
design, the contradictions are not a single line of body text.

### 5. The product refuses to draft

Docket is structured extraction + retrieval-and-citation. **It is not a
drafting tool.** Ask Anything answers questions about the material; it does
not generate demand letters, motions, settlement proposals, or strategy
advice. If a lawyer types "draft a motion to compel" into Ask Anything, the
system politely declines and explains the boundary.

The UI implication: Ask Anything's affordance should feel like *querying*
rather than *composing*. Not a big rich-text composer with a "send" button.
A search-like input, a question mark icon, a placeholder that nudges
toward question-shaped prompts ("Ask a question about this matter…").

### 6. Discipline of what we refuse to do

The interesting thing about Docket isn't what it does — it's what it
refuses to do. No legal research. No conflict checks. No billing. No
drafting. No outbound network calls (with one disclosed, opt-in exception
for PACER in v1.1).

The visual language should match the discipline. Not minimalist for
minimalism's sake, but uncluttered, opinionated, calmly confident. Think
*professional reference work* rather than *consumer SaaS* — closer to
Notion's reading mode than to ChatGPT's chat UI. No floating action
buttons. No upsells. No empty-state illustrations of cheerful cartoon
characters.

### 7. The lawyer is the authority, not the AI

Every export carries a watermark: "AI-assisted draft — attorney review
required." Every brief carries a footer bar: "Draft assistance — verify all
citations before relying. You remain responsible for this work product
under ABA Rule 1.1 and Op. 512." These aren't legal-cover decorations.
They're load-bearing UI elements that frame the lawyer's relationship to
the tool. The design should treat them as such — ambient, dignified, never
adversarial or scolding.

---

## Pages and what each is for

The product is intentionally narrow. Five screens in v1.

### Library (`/`)
The list of the lawyer's matters. A grid or list of matter cards: name,
practice area, document count, last activity, status (ingesting / ready /
error). Empty state has a single **New Matter** button. No search bar in v1
(matters are typically few and recent). No filtering in v1. No tagging.

### Matter Wizard (`/new-matter` or modal)
A guided flow for creating a new matter. Three or four steps: name the
matter → choose the practice area (one of seven, plus "other") → attach
workspace sources → review → ingest. This is the **highest-leverage Claude
Design target** because it's how the lawyer's relationship with Docket
starts. The wizard sets the tone: confident, calm, careful.

The attach-sources step is the trickiest UX. The lawyer is potentially
adding a folder, a mailbox, scoped phone numbers for iMessage, a photo
folder, audio files, pasted notes — each with its own affordance, each with
its own scoping. Show them as a stackable list of attached sources rather
than a checkbox grid. Each source should clearly show what's in scope ("3
iMessage threads with +1-555-...") and a remove affordance.

### Matter view (`/matter/[id]`)
The brief plus Ask Anything. Two-column on desktop (brief left, citation
panel right, collapsible). Single-column stacked on mobile with the
citation panel as a bottom Sheet that slides up on tap. The eight brief
sections render as accordions on mobile, full-rendered on desktop. Section
headers carry confidence chips where applicable.

Ask Anything lives somewhere on this view. **Where** is a design
decision — a sticky bar at the bottom, a side panel that toggles, a
separate tab — and the choice has real implications for how often it gets
used and whether it feels like part of the same experience as the brief.
Pick a direction and we'll wire it.

### Eval Lab (`/eval`)
The retrieval-quality dashboard. Shows the latest eval run's metrics per
practice area, lets the lawyer (or developer) re-run interactively. This
is more developer-facing than lawyer-facing, but it's also the page that
proves the quality claims aren't adjectives. The design should feel
respectful of that — a clean comparison table, honest about which corpora
have measured numbers and which are pending.

### Settings (`/settings`)
Four sections: **License** (status: Trial 9 days left / Active until
2027-05-17 / Expired; key entry field; link to renew on docketlm.app),
**Sources & Permissions** (Full Disk Access status, Photos access, list of
attached mailboxes and scoped iMessage handles per matter), **Network audit**
(the "verify offline" button that runs `lsof` and prints the result),
**Model** (32B vs 8B selection, export defaults).

---

## License-state UI surfaces

Docket LM is sold as a per-attorney subscription with an offline-validated
license. The license state changes the app's behavior in real ways, and the
visual design needs to handle four distinct states cleanly. Each one should
feel calm and dignified — never adversarial, never sales-y.

### First-run flow
On the very first launch (no license, no trial started), the lawyer sees a
one-screen welcome with three clear paths:

1. **Start 14-day trial** — primary action; instantly unlocks all features;
   no credit card required.
2. **I have a license key** — secondary action; opens a key entry field; on
   valid key, transitions to active state.
3. **Buy a license** — tertiary action; opens the lawyer's default browser to
   docketlm.app pricing page.

Below these three options, the same first-run modal explains the local-only
architecture, lists the system permissions Docket LM will ask for, and shows
the "verify network activity" panel that confirms zero outbound traffic.
License + permissions live on the same screen because they're both "things
the lawyer needs to know before doing real work."

### Active subscription
No banner. No reminders. No upsell prompts. The license is valid; get out of
the lawyer's way. The only persistent license-related surface is the
**Settings → License** section, which shows status and renewal date.

### Trial countdown (last 3 days)
A small ambient pill in the app chrome (top-right, next to the NetworkBadge)
reads `Trial: 2 days left` and links to docketlm.app for purchase. Not
modal. Not adversarial. The lawyer can dismiss it once per session.

### Renewal reminder (last 30 days before expiry)
Same ambient pill pattern, lower urgency: `Renewal due in 23 days · Renew`.
Links to docketlm.app. Dismissible.

### Expired (read-only mode)
A persistent but non-blocking banner at the top of every page:

> **License expired.** Existing matters are read-only. Renew at docketlm.app
> to resume new matter work.

Underneath: a clear "Renew" action that opens the browser. Existing matter
views, briefs, citation panels, and Ask Anything history all remain
fully readable and searchable. What's disabled: the **New Matter** button,
the **Generate brief** action, the **Ask Anything** input, and adding new
workspace sources to existing matters. Disabled controls show a tooltip on
hover: "Requires an active license · Renew." The lawyer cannot lock
themselves out of prior work by letting the license lapse.

### What we're asking Claude Design for, license-wise

1. The **first-run welcome screen** with the three-path layout above.
2. The **Settings → License** section across the four states (Trial / Active /
   Renewal-reminder / Expired) — each state should be a separate frame.
3. The **ambient pill** pattern in app chrome for Trial countdown and
   Renewal reminder.
4. The **expired-mode banner** and the disabled-control treatment that goes
   with it.

The visual language for all four states should match the rest of the app —
calm, professional reference work, never feels like a SaaS upsell. Treat
the license boundary the way a good library card treats a renewal date:
ambient, factual, no shame in the lapse, friction-free to fix.

---

## What we're asking Claude Design for

1. A **visual system** — colors, typography, spacing, component
   conventions — that reads as *professional reference work*. Closer to
   reading a well-typeset book than to using a chat UI. Lawyers care about
   craft; show them craft.
2. **High-fidelity mockups for the five screens above**, with the Matter
   Wizard treated as the highest-leverage screen.
3. **Interaction prototypes** for the two flows that are hardest in static
   mocks: attaching workspace sources in the wizard, and clicking a
   footnote → citation panel → step through with keyboard.
4. **A Claude Code handoff bundle** that ports the visual system back into
   the existing Tailwind / shadcn component tree at `src/components/`.
   The component shells already exist (AppShell, BriefView, CitationPanel,
   DropZone, MatterCard, EvalTable); we'd rather refactor those than
   replace them, so the handoff should reflect the existing structure.

The current repo's `localhost:3000` screenshots show the working scaffold —
the structure, navigation, and IPC wiring are in place. Treat that as the
floor, not the ceiling. The product decisions above should produce a
visual language that's noticeably calmer, more confident, and more
opinionated than the scaffold reads today.
