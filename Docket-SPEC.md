# Docket LM — Product Spec & Technical Architecture

*v0.2 · May 2026*

Docket LM is a fully-local desktop application that ingests a lawyer's matter
workspace — folders, mail, scoped iMessage threads, photos, audio, pasted
notes — and produces a cited first-read brief plus a conversational
Ask-Anything interface over the same material. Built for solo and small-firm
lawyers whose reading of ABA Model Rule 1.6 and Formal Opinion 512 will not
tolerate sending privileged client material to a third-party cloud API.

---

## 1. Product Spec

### 1.1 One-line description

Docket LM turns a lawyer's matter workspace into a cited first-read brief and
a conversational interface for follow-up questions — entirely on their
machine. No cloud. No exception.

### 1.2 Target user

Solo and small-firm (1–10 attorney) generalists practicing across seven areas
Docket LM supports out of the box: **probate, family law, personal injury,
immigration, employment, criminal defense, and intellectual property.**

The composite user is a 5–25-year-experience attorney with no IT staff, no
in-house knowledge management, no enterprise procurement. They bill in
6-minute increments and personally sign every word of work product they
produce. They have read ABA Model Rule 1.6 and Formal Opinion 512 and concluded
that sending privileged client material to a third-party API — even one with a
zero-data-retention contract — is an *avoidable* third-party exposure that the
ethics framework forbids.

Their pain: every new matter starts with three to twelve hours of unbilled or
under-billed reading just to understand who the parties are, what the timeline
looks like, and where the risks live. The material is rarely all in one place
— some PDFs on disk, some emails in Apple Mail or Outlook, a folder of
photos a client sent, a few iMessage threads with opposing counsel, voicemails
from the client transcribed by Apple but never read. They want a competent
paralegal who's already sitting at the desk when they arrive with coffee, with
the matter folder open and a marked-up summary ready.

### 1.3 Why this product exists

In 2026, a fraud defendant's preparatory legal sessions with a popular cloud
AI assistant were subpoenaed and entered into the court record. His defense
team didn't realize the platform's terms of service had stripped every
expectation of privacy from those conversations the moment their client
clicked Accept.

For a lawyer, this isn't an abstract risk. ABA Model Rule 1.6 says privileged
material cannot be subjected to *avoidable* third-party exposure. Formal
Opinion 512 (July 2024) made the test explicit: if a less risky path exists,
the lawyer must consider it. Today, every meaningful AI legal tool — Clio Duo,
MyCase IQ, Smokeball IQ, Spellbook, CoCounsel, EvenUp, Briefpoint, Eve.legal —
is cloud-hosted, and every one of them produces session logs that are
discoverable through ordinary civil and criminal process. The most careful
provider contract in the world doesn't change that.

Docket LM exists because there is no less-risky path for AI-assisted matter
review. The model weights live on the lawyer's SSD. The firewall confirms zero
outbound traffic. The Rust core enumerates every command the webview can
invoke, so the auditable surface that supports the "no data leaves" claim is a
single file someone can read in fifteen minutes.

The ABA's 2023 TechReport found roughly 10% of solos refuse cloud practice
management entirely on confidentiality grounds, and a much larger share carve
their most sensitive matters out of cloud tools. Those lawyers do not have an
AI option today. Docket is built to be the one they can use.

### 1.4 Core user flow

1. **Open the app.** Native macOS window. No login. No cloud handshake. The
   first time, a one-screen modal explains the local-only architecture, asks
   for the system permissions Docket LM needs (Full Disk Access for mail and
   iMessage; Photos if the lawyer wants to use the Photos library), and shows
   a "verify network activity" panel that confirms zero outbound traffic.
2. **Click New Matter.** Wizard: name the matter, choose the practice area
   (probate / family law / PI / immigration / employment / criminal defense /
   IP / other), then attach the workspace sources.
3. **Compose the workspace.** Drag a folder. Point at an Apple Mail mailbox
   or label. Designate the phone numbers or emails for the iMessage threads
   that belong to this matter (Docket LM only reads scoped threads, never the
   lawyer's full message history). Drop `.eml` or `.mbox` exports. Drag
   individual files. Drop a folder of photos. Drop audio files (voicemails,
   recorded calls, deposition audio) for local Whisper transcription. Paste
   text notes the lawyer typed in another app. Each attached source shows its
   scope and a "remove" affordance.
4. **Confirm cluster.** Docket LM runs a clustering pass against the largest
   semantic cluster. If items appear unrelated to the main matter — an old
   retainer, a duplicate, a personal email — it surfaces them in a five-second
   pre-brief confirmation. Default action: include with a flag in Open
   Questions; the lawyer can exclude individually.
5. **Ingest.** Progress bar. A small badge in the window chrome reads
   `0 bytes sent · offline mode`. Per-source extraction runs (text from PDFs
   and DOCX, OCR for scanned PDFs and photos, transcription for audio).
   Embeddings are computed locally. The matter's LanceDB index builds.
6. **Brief renders.** Practice-area-tuned sections stream into the view in
   priority order — Snapshot first, then the rest in display order. Every
   fact carries an inline footnote linking to the source span.
7. **Ask Anything.** A persistent input at the bottom of the brief lets the
   lawyer ask follow-up questions over the same matter ("what did the client
   say in the August 14 voicemail about the deductible?"). Every answer is
   cited the same way the brief is. The system retrieves and cites; it never
   drafts.
8. **Explore.** Click any footnote → side panel slides in with the source
   document or message open to the cited paragraph, that paragraph
   highlighted. Hover any party name → quick chip with role, first appearance,
   last appearance.
9. **Export.** PDF or DOCX of the brief with citations preserved and a footer
   watermark: "AI-assisted draft — attorney review required."

### 1.5 Workspace ingestion model

The lawyer composes a matter from one or more local sources. No source ever
leaves the device. Docket LM does not have, and cannot have, an outbound
network surface for ingestion.

| Source | v1 status | Mechanism | Scoping |
| --- | --- | --- | --- |
| Folder (any local path) | ✅ Core | Recursive scan + dedup by sha256 | Includes cloud-synced folders (iCloud Drive, Dropbox, etc.) since they're local files |
| Apple Mail / Outlook local store | ✅ v1.0 | Reads `.emlx` (Apple Mail) and `.olm` (Outlook for Mac) on-disk archives | Per-mailbox / per-label / per-sender scoping |
| `.eml` / `.mbox` imports | ✅ v1.0 | Direct file parse | Lawyer selects which messages |
| Drag-in from Finder | ✅ v1.0 | Per-file ingest | One file at a time |
| Pasted text / scratch notes | ✅ v1.0 | Textarea creates a synthetic doc with timestamp | Lawyer-authored, single-paste |
| Photos / image folders | ✅ v1.0 | Folder scan + OCR pipeline | Folder selection or Photos.app smart-album reference |
| Apple Messages (iMessage) | ✅ v1.0 | Reads scoped threads from `~/Library/Messages/chat.db` | **Scoped by lawyer-designated phone numbers or emails per matter.** Docket LM does not ingest the lawyer's full message history. |
| Audio transcription | ✅ v1.0 | Whisper.cpp sidecar transcribes dropped audio files locally | Lawyer drops files; Docket LM never opens the microphone |
| PACER / EDGAR live import | ⏭ v1.1 | Plugin pattern, opt-in, flagged as the one allowed outbound call | Per-docket retrieval |
| Practice mgmt cloud APIs (Clio, MyCase, PracticePanther) | ❌ Out | Lawyer exports matter to folder; folder ingest reads it | n/a |
| Web fetch / URL paste / Westlaw clippings | ❌ Out | Violates local-only commitment | n/a |

The build stages this honestly. v1 week-1 ships folder + `.eml` ingest + the
general-default brief. Mail-store reading, pasted notes, photos, iMessage,
audio, and the bespoke practice-area schemas land across weeks 2–4. See §3.

### 1.6 Practice areas and matter-aware briefs

The retrieval engine is practice-agnostic. What varies per matter type is the
brief section vocabulary, the section-level retrieval prompt, and the Risk
section's specific concerns. Three practice areas ship in v1.0 with bespoke
schemas; the other four run on a general-default schema in v1.0 and gain
bespoke vocabularies in v1.1–v1.2.

| Practice area | v1 schema | Tuned for in v1.x |
| --- | --- | --- |
| Probate | Bespoke (v1.0) | Capacity, will contests, asset disposition |
| Family law (dissolution) | Bespoke (v1.0) | Custody, marital estate, iMessage-heavy evidence |
| Personal injury | Bespoke (v1.0) | Damages, causation, coverage, medical-record-heavy ingestion |
| Immigration | General-default | Bespoke in v1.1 |
| Employment (single-plaintiff) | General-default | Bespoke in v1.1 |
| Criminal defense | General-default | Bespoke in v1.2 |
| Intellectual property | General-default | Bespoke in v1.2 |

A matter classified as "other" runs the general-default schema with the
practice area noted as `unknown` for analytics.

### 1.7 Brief schemas

Each schema is eight sections in display order. The first three are roughly
parallel across schemas (snapshot, parties/entities, timeline); sections 4–8
differ.

**Probate schema:**
1. Matter Snapshot — decedent, estate value where surfaced, beneficiary count,
   will status (testate / intestate / contested), document count, date range.
2. Beneficiaries & Heirs — named beneficiaries with shares, contingent
   beneficiaries, intestate heirs if applicable, with citation.
3. Estate Assets & Disposition — real property, financial accounts, business
   interests, personal property, with cited disposition per asset.
4. Capacity & Validity Concerns — capacity flags, undue influence indicators,
   execution issues, prior wills, lost-will issues.
5. Tax Picture — estate tax exposure, prior gifts, business succession, RMDs.
6. Outstanding Probate Steps — notices to publish, accounting deadlines,
   distribution constraints.
7. Open Questions — referenced-but-missing exhibits (codicils, account
   statements), unresolved capacity questions.
8. Suggested Next Steps — file petition, demand accounting, depose, etc.

**Family law (dissolution) schema:**
1. Matter Snapshot — parties, jurisdiction, filing date, children count,
   marriage length.
2. Parties & Roles — spouses, children with ages, prior counsel, expert
   witnesses.
3. Conflict Timeline — major events and communications, with iMessage threads
   integrated chronologically alongside email and filings.
4. Marital Estate — assets, debts, characterization (community / separate),
   valuation status.
5. Income & Support Picture — earnings each side, imputed-income flags,
   business income complications, prior support.
6. Custody-Relevant Facts — caretaking history, school enrollment,
   allegations, evaluator reports.
7. Risks & Red Flags — restraining orders, allegations of abuse, financial
   discovery issues, prior counsel issues, communication patterns of concern.
8. Open Questions & Next Steps — missing financial disclosures, expert needs,
   calendar items.

**Personal injury schema:**
1. Matter Snapshot — client, accident date, mechanism, jurisdiction, primary
   insurance carrier.
2. Parties & Roles — defendants, treating providers, witnesses, experts.
3. Mechanism of Injury — facts of the accident, scene description, sequence.
4. Treatment Timeline — medical visits, procedures, diagnoses,
   gaps-in-treatment flags.
5. Damages Picture — medical bills, lost wages, future-care indicators, pain
   and suffering factors.
6. Causation Evidence — medical opinions, pre-existing conditions, gap
   analysis, expert reports.
7. Insurance Coverage — policy limits, additional insureds, UM/UIM,
   coverage-position correspondence.
8. Outstanding Records & Next Steps — missing medical records, prior-history
   records to subpoena, expert retention, demand strategy.

**General-default schema (immigration, employment, criminal defense, IP, and
"other" in v1):**
1. Matter Snapshot
2. Parties & Roles
3. Timeline of Material Events
4. Claims, Causes of Action & Defenses (surfaced from documents, never
   inferred from law)
5. Key Facts & Admissions (direct quotes preferred over paraphrase)
6. Risks, Red Flags & Adverse Facts
7. Open Questions / Information Gaps
8. Suggested Next Steps (action-oriented, never strategic)

### 1.8 Ask Anything (Q&A)

After the brief renders, a persistent input at the bottom of the matter view
lets the lawyer ask follow-up questions over the same matter material. The
question runs through the same retrieval → rerank → generation → re-grounding
pipeline the brief uses. Every answer is cited to source spans the lawyer can
click to verify.

The discipline of Ask Anything: **it retrieves and cites; it never drafts.**
The system will not generate a demand letter, draft a motion, propose a
settlement number, or recommend a legal strategy. Briefpoint, EvenUp, and
Spellbook own those lanes; competing there dilutes Docket's wedge and the
authority issues are different. If the lawyer asks for a draft, the system
politely declines and explains the boundary.

Q&A history persists per matter in `qa_history.jsonl` inside the matter
directory. The lawyer can scroll back through prior questions and answers.
Nothing uploads.

### 1.9 Ethics surface

Five places ABA Op. 512 obligations live in the product, not just the
marketing site.

**First-run modal.** One-screen explanation of the local-only architecture
with a "verify network activity" panel that opens an offline-mode confirmation
view. Requests the system permissions Docket needs (Full Disk Access for mail
and iMessage; Photos if the lawyer wants Photos library access) and explains
what each unlocks. Includes a plain-English summary of the lawyer's ongoing
obligations under Op. 512 — competence, confidentiality, supervision, billing
honesty — none of which Docket relieves them of.

**Persistent footer bar on every brief and Ask Anything view.** "Draft
assistance — verify all citations before relying. You remain responsible for
this work product under ABA Rule 1.1 and Op. 512." Ambient, not a popup.

**Citation-first rendering.** No claim displays without a source link. The
renderer literally refuses to emit an uncited assertion; if the re-grounding
pass fails, the claim is dropped and the section logs an
"ungrounded extraction suppressed" note.

**Export watermark.** PDF/DOCX exports carry "AI-assisted draft — attorney
review required" in the footer. Watermark cannot be removed from the UI; the
lawyer can edit the file post-export but the original artifact carries the
warning.

**No legal conclusions.** The brief never recommends litigation, settlement,
or legal strategy. Ask Anything answers questions about the material, not
about the law. It surfaces facts and flags.

### 1.10 Two hard product decisions

These are the two decisions that distinguish thinking about a user's workflow
from thinking about a model's behavior, and they shape the product more than
any technical choice.

**A) Confidence and contradictions without inducing automation bias.** Naive
design shows a numeric confidence score per fact. Lawyers will either ignore
it ("the AI thinks") or treat it as a verdict ("87% — good enough to quote").
Both outcomes degrade their work product. The resolution: confidence is
surfaced *only* at the section level (matter-type classification, party
identification, custody-relevant date confidence) where it has a defensible
meaning. Individual facts have no numeric score. Contradictions are
first-class objects in their own panel ("3 contradictions across documents —
review"), not buried in prose. Citation density is shown ambient — single-
source claims render with one footnote, corroborated claims render with
multiple. This is the calibration / automation-bias literature applied to an
actual product surface, rather than the dashboard-of-scores pattern most RAG
tools default to.

**B) Handling documents that appear unrelated to the matter.** Real client
material is noisy: an old retainer from a different matter, a personal email
accidentally in the folder, a duplicate, a thread that wandered off-topic.
Three options exist: silently exclude, include everything, or cluster-and-ask.
Silent exclusion is dangerous (the noise might be the smoking gun).
Include-everything pollutes the brief. The resolution: ingest everything, run
a clustering pass against the largest cluster's centroid, present a
five-second pre-brief confirmation showing "38 items in main cluster, 2
outliers — review?" The lawyer confirms quickly. Default action: include
outliers but flag them in the Open Questions section so they don't disappear.

### 1.11 Eval harness

A `pnpm eval` command runs a hand-curated golden set of question / expected-
answer / expected-citation tuples and prints results to the terminal and to
`docs/evals/<ISO_DATE>.md` per run.

Measured per run:

- **Retrieval recall@5** — did the correct chunk land in the top five?
- **Citation precision** — does the rendered citation actually contain the
  asserted fact?
- **Faithfulness (LLM-as-judge)** — does the generated claim follow from the
  cited chunk?
- **Ungrounded-claim suppression rate** — how often does the re-grounding pass
  catch hallucinations?
- **Latency per brief section** — keeps the performance budget honest.

Baseline comparisons committed to the repo:

- Naive single-pass RAG (no rerank, no re-grounding)
- Hybrid + rerank, no re-grounding
- Vector-only, no rerank, no re-grounding
- Whole-doc-into-context (no retrieval)

v1 ships the Enron golden set (~50 tuples) as the primary eval corpus. Probate,
family law, and PI golden sets are assembled from public-record material and
ship in v1.1; until they do, the README is explicit that the published numbers
are Enron-only. We would rather show empty cells than fabricated ones.

### 1.12 Out of scope

The discipline of Docket LM is what it refuses to do.

- **No outbound network calls of any kind.** Not for telemetry. Not for crash
  reporting. Not for "anonymized" anything. The PACER plugin (v1.1) is the
  only exception, opt-in, and the README documents it explicitly.
- **No legal research.** No case law. No Westlaw replacement. No citator.
- **No conflict checks.** No firm-wide party database.
- **No billing or time tracking.** No LEDES export. No Clio integration.
- **No e-discovery production.** No Bates stamping, no privilege logs.
- **No multi-user or matter sharing** in v1. Single user, single machine.
- **No drafting.** The brief is structured extraction; Q&A is retrieval-and-
  citation. No demand letters, motions, settlement proposals, or strategy
  advice. Briefpoint, EvenUp, and Spellbook own those lanes.
- **No call recording.** Audio transcription operates on files the lawyer
  drops in. Docket LM never opens the microphone.
- **No in-app payment.** Subscription purchase and renewal happen on the
  Docket LM website. The app validates license keys locally; it never makes
  a billing or auth API call.
- **No handwritten document recognition** in v1.
- **No non-English documents** in v1.
- **No deadline calculation.** The brief surfaces dates as facts; it never
  computes a statute of limitations or filing deadline.

### 1.13 Demo and golden-eval corpora

The Enron document set is the primary v1.0 golden-eval corpus — fully
public, narratively rich, multiple parties, real internal contradictions,
mixed text-layer PDFs and scanned exhibits, zero copyright risk. The shipped
subset is ~60 curated documents drawn from:

- Selected emails from the Federal Energy Regulatory Commission release
- SEC complaints against Lay, Skilling, Fastow
- Selected DOJ filings from *United States v. Skilling*
- The Powers Report (internal Enron investigation, public)
- Two 10-K filings (FY1999, FY2000)
- Press releases and analyst notes from 2001

For v1.1, additional public-record corpora for probate, family law, and PI are
under assembly:

- **Probate**: Public-record will contest cases (decided opinions plus the
  underlying filings where available via PACER).
- **Family law**: Sanitized synthetic corpus built from publicly available
  templates (real family law records are not public).
- **PI**: Decided slip-and-fall and motor-vehicle cases where the underlying
  medical and insurance correspondence is part of the appellate record.

The corpora live in `demo-data/<area>/` and load with one click from the
empty-state.

### 1.14 Licensing & business model

**License model.** Docket LM is sold as a per-attorney subscription with
offline-validated keys. There is no auth server, no usage telemetry, no
phone-home — license validation runs entirely on the lawyer's machine
against a cryptographic signature.

**Pricing.**
- $19.95 / month or $199.95 / year per attorney.
- Annual pricing is roughly 16% cheaper than monthly × 12 ($239.40 → $199.95).
- License is per-attorney, not per-machine. The same key activates Docket LM
  on the lawyer's office Mac and their laptop at home.

**Trial.**
- 14-day full-feature trial. No credit card required at trial start.
- All features unlocked during trial — every workspace source type, every
  practice-area schema, full Ask Anything, full audio transcription.
- At day 10, an ambient banner notes "Trial ends in 4 days · upgrade." Not
  blocking, not modal.
- At trial expiry: the app enters read-only mode (see Expiry behavior below).

**Activation.**
- The lawyer purchases on the Docket LM website (`docketlm.app`). Stripe
  Checkout handles the payment; we never touch card data.
- After purchase, the lawyer receives a license key by email. The key is an
  RSA signature over `(email, expiry_date, plan, feature_flags)`.
- The lawyer pastes the key into Settings → License. The app verifies the
  signature against the public key bundled with the binary. **No network
  call.** The verification happens entirely on-device.
- License keys are portable across the lawyer's own devices but tied to
  their email; transferring a key to another person is a license violation
  even though it's technically possible.

**Expiry behavior.**
- At 30 days before expiry, an ambient renewal reminder banner appears.
- At expiry, Docket LM enters **read-only mode**:
  - Existing matters remain viewable. Briefs, citations, source documents,
    and Ask Anything history all stay readable and searchable.
  - **No new matter creation. No new ingestion. No new brief generation.
    No new Ask Anything queries.** The lawyer cannot accidentally lock
    themselves out of work they've already done — only forward-going
    activity requires the renewal.
- Crucially, read-only mode is still entirely local. Nothing changes about
  what data leaves the device (still nothing). Expired-license behavior is
  a feature gate enforced locally, not a data-access gate.
- Renewal is via the website. The lawyer pays, gets a new key, pastes it
  in. The app re-enables full functionality.

**Source license.** Docket LM is licensed under **AGPL v3** for the source
code. The reasoning:
- Lawyers (and anyone) can read and audit the source to verify the
  local-only architecture themselves.
- Anyone is free to fork, study, modify, and self-distribute the code.
- A commercial competitor cannot lift the engine into a closed-source SaaS
  product without releasing their source under AGPL — which a commercial
  SaaS practically cannot do.
- The signed/notarized `.dmg` distribution and the support that comes with
  the subscription is what the lawyer is paying for. Anyone who would
  rather build from source can.

**Trademark.** "Docket LM" is a registered trademark for legal software.
Forks of the code base must rebrand (the way Debian's repackage of Firefox
was historically called Iceweasel). This prevents brand-confusion attacks
where a cloud-hosted fork could pretend to be Docket LM.

**Commercial licensing.** A separate commercial license is available on
request for organizations that need to integrate the Docket LM engine into
their own proprietary products (which AGPL would otherwise forbid).
Contact for terms. This is a v1.x revenue line, not a v1.0 priority.

**Subscription terms summary** (full terms live at docketlm.app/terms):
- License is per-attorney, on the honor system. A firm with 4 attorneys
  buys 4 licenses.
- Cancel anytime; refund pro-rated through the current period.
- No vendor lock-in on the lawyer's data — every matter directory is a
  plain folder of files; the lawyer can copy or migrate it at any time.

### 1.15 Research Handoff (v1.1)

After Docket LM produces a first-read brief, a real lawyer's day-two work is
almost never further extraction — it's *legal* research. Statutes. Case law.
Jurisdiction-specific procedural rules. Damages comparables. Expert
witnesses. None of that lives in the matter folder; all of it lives in
Westlaw, Lexis, CourtListener, or — increasingly — in a frontier model
trained on a vast corpus of legal text.

Docket LM stays on the machine. The lawyer doesn't have to, and pretending
they will is dishonest. Research Handoff is the feature that admits the
reality and structures the boundary safely: Docket LM produces a **redacted
draft** of the brief plus a list of research questions, suitable for the
lawyer to paste into the cloud tool of their choice (Claude, ChatGPT,
Lexis+ AI, Paxton, Spellbook, Harvey if their firm has it). Docket LM itself
makes no outbound call. The lawyer is the air-gap.

**What the package contains.**
- A **redacted brief** with every direct identifier pseudonymized
  consistently: `Plaintiff_1`, `Defendant_1`, `Employer_1`, `Hospital_2`,
  etc. Role-typed counters preserve readability and relationships
  (`Plaintiff_1_Spouse`, `Defendant_2_Counsel`) without leaking names.
- A **list of research questions** extracted from the brief's Open
  Questions section plus the gaps the brief itself surfaced — framed as
  questions an outside model can productively answer ("In a [jurisdiction]
  family-law dissolution, what's the standard for imputed income when a
  party voluntarily reduces work hours after filing?").
- **Non-identifying procedural context**: jurisdiction, court level,
  practice area, procedural posture, key statutes already in play.
- **Optional generalizations**: dates rounded to quarters by default
  (`Q4 2022` rather than `2022-11-14`); dollar amounts bucketed by default
  (`under $50K` / `$50K–$250K` / `over $250K`); specific small-venue
  locations replaced with regional descriptors.

**What the package never contains.**
- Real client names, addresses, phone numbers, emails, account numbers.
- Case numbers, docket numbers, bar numbers, EINs, medical record
  numbers, VINs.
- iMessage handles or email-thread metadata.
- Raw source documents or chunks — only the synthesized brief content
  passes through redaction; the matter's underlying material never leaves
  the redaction sidecar, let alone the machine.

**Redaction approach.**
- Microsoft Presidio (open-source, MIT) runs inside the existing Python
  sidecar that already hosts the bge-reranker. Adds dependencies but no
  new process.
- A legal-domain NER model (LegNER, or `legal-bert` fine-tuned on the
  CourtListener/FindLaw corpora) loaded via Presidio's
  `TransformersNlpEngine` provides legal entity recognition the
  general-purpose recognizers miss.
- Custom `PatternRecognizer`s for case-number formats, docket numbers,
  bar numbers, EIN, MRN, VIN, FRCP-5.2-flagged identifiers.
- Coreference resolution (fastcoref) collapses `he`, `Mr. Smith`,
  `the plaintiff` to a single canonical entity *before* pseudonymization,
  so the role label stays consistent across the document.

**Residual-risk surface.** No NER catches everything. Unique fact patterns
("the November 2022 fire at the only chemical plant in [small county]")
function as quasi-identifiers that re-identify the matter even with names
scrubbed. The export preview includes a **Residual Risk** panel that lists
remaining dates, amounts, and rare entities the model is least confident
about, with one-click generalization. The lawyer is the final filter.

**Re-import.** When the lawyer brings cloud-tool findings back, they paste
the text into the matter's External Research section. Docket LM runs a
reverse-substitution pass using a local **encrypted entity map** (AES-GCM,
key derived from the matter key via HKDF) stored at
`matters/<id>/handoff/<export_id>.map`. Pseudonyms swap back to real
names; the lawyer reviews the substitution diff before saving. Any case
citations in the imported findings are extracted and surfaced in a
**Verify Citations** step — the lawyer must click each one to mark it
verified (Westlaw, CourtListener, or "I read the opinion") before it can
land in the matter. This is the Mata v. Avianca guardrail: no cloud-model
citation enters a Docket matter unverified.

**Ethics rails** (anchored on ABA Formal Opinion 512 and California's
Practical Guidance on the Use of Generative AI, the most directly
applicable state-bar guidance):
- **Per-matter informed-consent affirmation.** Before the first export
  on a given matter, the lawyer affirms they have obtained informed
  client consent for cloud-tool research on this matter. This is a
  checkbox in a one-screen modal that quotes the relevant Op. 512
  language and links to a sample disclosure the lawyer can adapt for
  their engagement letter.
- **Preview-and-approve.** The redacted draft renders in a side-by-side
  preview (original brief left, redacted draft right) before the lawyer
  copies anything. Nothing is on the clipboard until the lawyer explicitly
  copies it.
- **Disclaimer language.** The feature is consistently called
  "Redacted Draft for Outside Research," not "anonymized." Copy on every
  surface: "This reduces but does not eliminate confidentiality risk.
  You remain responsible for client consent and verification."
- **No auto-send.** Docket LM never makes an outbound API call on the
  lawyer's behalf. The paste step is the air-gap and the audit trail.
- **Audit trail.** Each export logs a row in `handoff_exports` (export
  ID, matter, timestamp, redaction counts, lawyer's destination
  selection, consent affirmation timestamp) so the lawyer can answer
  "what did I share, when, where" if the question ever arises.

**Why this is in v1.1, not v1.0.** The redaction pass should be evaluated
against real shipped briefs before the feature goes to a lawyer. Building
it before the engine's brief output is stable would tune Presidio against
mocks. The eval harness needs a Redaction Recall metric (did we catch
every identifier in the golden set?) and a False-Positive metric (did we
over-redact and destroy legibility?) before this ships. See the UX brief
at [`docs/RESEARCH-HANDOFF-BRIEF.md`](../docs/RESEARCH-HANDOFF-BRIEF.md)
and the implementation prep at
[`docs/research-handoff-implementation.md`](../docs/research-handoff-implementation.md).

**Out-of-scope additions tied to this feature.**
- No direct API integration with Harvey, Claude, ChatGPT, or any cloud
  vendor. The handoff is paste-driven, deliberately.
- No automatic "best model" suggestion. Docket LM doesn't recommend cloud
  tools; the lawyer chooses.
- No re-importing of raw documents fetched from the cloud (the lawyer can
  always add a folder to the matter the conventional way).

### 1.16 Living Matters: brief updates as new material arrives (v1.1)

A matter is not a snapshot. A probate is filed, then a codicil surfaces six
weeks later. A PI case is in treatment, and the lawyer receives a new
batch of medical records every two weeks. A family-law dissolution
generates new iMessage threads, school-meeting recordings, and discovery
responses across months. The v1.0 wizard-only ingestion path treats each
matter as a one-shot event; **Living Matters** is the v1.1 surface that
fits the real shape of how matters unfold.

**Add Material — three entry points, one flow.**
1. **Matter view button.** A persistent "Add to matter" affordance at
   the foot of the matter view next to Export and Research Handoff.
2. **Drag-onto-matter.** Dragging any file from Finder onto the matter
   view opens the Add Material panel pre-populated with the dropped
   item.
3. **Settings → Sources for this matter → Add source.** The full-fidelity
   path for adding non-file sources (an Apple Mail label that just
   accumulated 12 new messages, an iMessage handle that started a new
   thread, a paste-in note, an audio file, a Photos smart album).

All three converge on the same Add Material flow: select source → confirm
scope → ingest → see impact.

**The change-detector.** After new chunks are embedded and indexed,
Docket LM runs an **impact detection** pass section by section against
the current brief:

- Re-run each section's existing retrieval query (the queries are stored
  per-section in `brief_sections` already). If any of the new chunks rank
  in the top-N of any section, that section is flagged as *retrieval-
  affected*.
- For each retrieval-affected section, run a lightweight LLM pass that
  classifies the new chunks vs. the section's current items into one of
  four labels: **supports** (corroborates an existing claim), **adds**
  (introduces a new fact the section should include), **contradicts**
  (conflicts with an existing claim), or **noise** (retrieved but doesn't
  change the section's content).
- A section with zero new chunks of label `adds` or `contradicts` is
  flagged as *no material change* — the lawyer can skip regenerating it.

The detector is the cheap pass that lets the lawyer answer "do I even
need to look at this update?" in seconds, not minutes.

**Section-level regeneration, lawyer-approved.** Living Matters does not
silently regenerate the brief. The lawyer sees:

> 3 sections affected by the new material:
>   • **Timeline of Material Events** — 2 new items, 1 contradicts.
>   • **Damages Picture** — 4 new items, 2 supports, 2 adds.
>   • **Open Questions** — 1 resolution (a question was answered).
>
> [ Regenerate these 3 sections ] · [ Show me the changes per section ]

Clicking **Regenerate** runs the standard section pipeline (retrieve →
rerank → generate → re-ground) on just the flagged sections, then surfaces
a section-by-section diff before saving. The lawyer accepts each section
or rejects (in which case the section keeps its prior content but the new
chunks remain indexed for retrieval and Ask Anything).

**Versioning.** Each brief generation creates a new version row in a
`brief_versions` archive. The matter view always renders the latest
version by default; a small **version chip** in the matter header reads
"v3 · updated 2026-06-14" and opens a version history drawer:

> **Versions**
> v3 · 2026-06-14 · +medical records batch, 3 sections regenerated
> v2 · 2026-05-29 · +deposition transcript, Timeline regenerated
> v1 · 2026-05-13 · initial brief from wizard

Clicking any prior version renders the brief as it was at that point in
time, including the citations it had then. The default action on a prior
version view is "View only"; the lawyer can "Restore as current" if they
want to revert.

**Contradictions are first-class, again.** When the detector finds a
`contradicts` chunk, the regenerated section includes a contradiction
object the same way the v1.0 brief surfaces contradictions across the
original documents — but tagged as **NEW**:

> ⚠ NEW contradiction (added 2026-06-14):
> The 2026-06-12 medical record reports recovery to baseline by 2026-04
> [cit-44]; prior brief item asserts ongoing treatment as of 2026-05
> [cit-12]. Review.

This is the closest thing to a "smoking gun" surface the product has,
and the lawyer should never miss it.

**Ask Anything across versions.** Prior Q&A is preserved as-of-the-time-
it-was-asked — `qa_history.jsonl` is append-only. The Ask Anything view
gains a small affordance next to each prior answer: "Re-ask with current
material." Clicking it re-runs the same question against the latest
indexed chunks; the new answer appends alongside the original, with both
timestamps visible. The lawyer can compare answers at-a-glance.

**Research Handoff staleness.** When a brief regenerates, any
`handoff_exports` rows whose `brief_version_id` is no longer the latest
are flagged as **stale** in the Handoff Audit table. The lawyer can
re-export with the current material in two clicks. Pseudonym maps
persist across versions, so the labels stay consistent — `Plaintiff_1`
remains John Smith in v3 just as he did in v1.

**External Research preservation.** External Research sections imported
under a prior version stay attached to that version *and* surface in
the current matter view (the lawyer's research from May is still
relevant in June). Each External Research block carries a "(imported
under v2)" tag for provenance.

**Out-of-scope for Living Matters in v1.1.**
- **No auto-regeneration.** The detector runs automatically after ingest;
  the *regen* step is always lawyer-initiated. (A "regenerate on add"
  toggle is a v1.2 candidate if user research shows lawyers want it.)
- **No background polling of folders, mailboxes, or threads.** Living
  Matters is pull-driven — the lawyer presses Add Material when they
  have something to add. Watching a folder for changes is a v1.2 idea
  that needs its own ethics analysis (what happens when a privileged
  doc is dropped in and the lawyer hasn't reviewed it yet?).
- **No automatic deletion of stale chunks.** If the lawyer wants to
  remove a source entirely, that's a separate "Remove source" flow on
  the matter's Sources screen. Add Material is additive only.
- **No notion of a "closed" matter.** A matter is open or it isn't in
  v1.1. Archive states with their own UI treatment are a v1.2 nicety.

**Why this is in v1.1, not v1.0.** The v1.0 IPC surface already supports
`workspace_add_source` — the mechanical "add a source" exists. What
v1.1 adds is the **impact detector**, **partial regeneration**,
**versioning**, and the **diff UI**, all of which compound on top of
the v1.0 brief generation pipeline. Building them before v1.0 ships
would tune them against pre-stabilization code. See the UX brief at
[`docs/LIVING-MATTERS-BRIEF.md`](../docs/LIVING-MATTERS-BRIEF.md) and
the implementation prep at
[`docs/living-matters-implementation.md`](../docs/living-matters-implementation.md).

---

## 2. Technical Architecture

### 2.1 High-level component diagram

```
+----------------------------- Tauri 2.0 app -----------------------------+
|                                                                         |
|   +---- Webview (Next.js 15 + React 19 + Tailwind + shadcn/ui) ----+   |
|   |                                                                |   |
|   |   Surfaces: Library · Matter Wizard · Brief · Source Viewer    |   |
|   |             Ask Anything · Eval Lab · Settings                 |   |
|   |   IPC: invoke('workspace_add_source', ...) etc.                |   |
|   +------------------------------|---------------------------------+   |
|                                  |                                     |
|   +-------------------- Rust core (Tauri) ----------------------+      |
|   |  ipc_commands::*  filesystem  permissions  sidecar_supervisor|     |
|   +------------------------|------------------------------------+      |
|                            |                                            |
|   +-- Ollama --+ +-- Reranker (Python) --+ +-- Whisper.cpp --+         |
|   | qwen3:32b  | | bge-reranker-v2-m3    | | local audio    |         |
|   | nomic-emb  | | (week-2 sidecar)      | | transcription  |         |
|   +------------+ +-----------------------+ +-----------------+         |
|                                                                         |
|   +-- Tesseract (per-document OCR, short-lived) --+                     |
|   +------------------------------------------------+                    |
|                                                                         |
|   +-- LanceDB embedded (one .lance dir per matter) --+                  |
|   +---------------------------------------------------+                 |
|                                                                         |
+-------------------- NO outbound network. Firewall confirms. -----------+
```

### 2.2 Process model

Tauri supervises four long-running children plus short-lived helpers:

- **Next.js webview** — UI in the system webview (WKWebView on macOS); IPC
  client to the Rust core.
- **Ollama sidecar** — spawned on app start. Listens on a Unix socket (not
  TCP) for additional isolation. Hosts the LLM (`qwen3:32b-q4_K_M` default,
  `qwen3:8b-q4_K_M` fallback) and the embedding model (`nomic-embed-text`).
- **bge-reranker sidecar** — small Python / FastAPI process running
  `BAAI/bge-reranker-v2-m3` for cross-encoder reranking of retrieval
  candidates. Auto-starts on first brief generation; idles between matters.
- **Whisper.cpp sidecar** — local audio transcription for dropped voice
  memos, voicemails, deposition audio. Apple Silicon Metal-accelerated. Idles
  when no audio is queued.
- **Tesseract** — invoked per-document during the OCR phase of ingest;
  short-lived child processes.

The Rust core mediates all I/O. The webview cannot reach the filesystem, the
network, or any model directly. Every operation flows through one of the
enumerated IPC commands in `src-tauri/src/ipc/mod.rs`. That enumeration is the
auditable surface that supports the "no data leaves" claim.

### 2.3 Stack

| Layer | Choice |
| --- | --- |
| Shell | Tauri 2.0 (macOS-only in v1.0, Windows in v1.2) |
| UI | Next.js 15 (static export inside Tauri), React 19, Tailwind, shadcn/ui |
| State | Zustand (UI state) + LanceDB queries (data) |
| LLM runner | Ollama 0.5+ bundled as sidecar |
| LLM default | Qwen3-32B Q4_K_M (~20 GB) — Ollama tag `qwen3:32b-q4_K_M` |
| LLM fallback | Qwen3-8B Q4_K_M (~5 GB) — Ollama tag `qwen3:8b-q4_K_M` |
| Embeddings | `nomic-embed-text` v1.5 via Ollama (768-dim). v2-moe upgrade lives on HuggingFace and requires a Modelfile shim (v1.1 work) |
| Reranker | `BAAI/bge-reranker-v2-m3` via Python sidecar |
| Audio transcription | `whisper.cpp` (large-v3 weights, ~3 GB) via local sidecar with Metal acceleration |
| Vector store | LanceDB embedded, hybrid (vector + BM25) |
| Mail parsing | Custom Apple Mail `.emlx` reader; `mbox` parser; `mailparser` for `.eml` |
| iMessage parsing | Direct read from `~/Library/Messages/chat.db` (SQLite) scoped by `handle.id` |
| PDF (text) | `unpdf` |
| DOCX | `mammoth` |
| OCR | `tesseract.js` with bundled English language pack |
| RAG framework | Vercel AI SDK + hand-rolled retrieval (no LangChain) |
| Eval | Custom harness + optional Promptfoo adapter |
| Code-signing | Apple Developer ID, notarized `.dmg` |

### 2.4 Filesystem layout

```
~/Library/Application Support/Docket/
├── models/                          # Model caches (Ollama, Whisper, reranker)
├── matters/
│   ├── 2026-05-13-smith-probate/
│   │   ├── workspace/
│   │   │   ├── folder/              # Copies of files from ingested folders
│   │   │   ├── mail/                # Extracted email bodies + headers
│   │   │   ├── messages/            # Scoped iMessage threads (per matter)
│   │   │   ├── photos/              # Image files for OCR pipeline
│   │   │   ├── audio/               # Original audio + transcripts
│   │   │   └── notes/               # Pasted-text notes
│   │   ├── extracted/               # Per-item extracted text + page maps
│   │   ├── vectors.lance/           # LanceDB tables for this matter
│   │   ├── brief.json               # Latest brief output
│   │   ├── qa_history.jsonl         # Persistent Ask Anything history
│   │   ├── eval/                    # Eval results if run
│   │   └── manifest.json            # Inventory, ingest log, file hashes
│   └── ...
└── logs/                            # Local-only; never uploaded
```

One matter = one directory = one LanceDB instance. No global index. Deleting a
matter is `rm -rf` on a single directory. Permissions and sources are tracked
in the per-matter `manifest.json`, including the iMessage handle.id list
authorizing the scoped threads.

### 2.5 Data model (LanceDB tables)

```ts
// documents (one row per ingested item, regardless of source type)
{
  doc_id: string,                    // sha256 of canonical content
  source_type: enum,                 // 'folder' | 'mail' | 'message' |
                                     // 'photo' | 'audio' | 'note' | 'drag'
  source_ref: string,                // path / message-id / handle / etc.
  filename_or_label: string,
  mime_type: string,
  page_count: number,                // 1 for messages/notes
  ingested_at: timestamp,
  ocr_used: boolean,
  transcribed: boolean,              // true if Whisper produced this
  workspace_path: string,            // path inside matter/workspace/
}

// chunks
{
  chunk_id: string,                  // doc_id + "#" + chunk_index
  doc_id: string,
  chunk_index: number,
  page_start: number,
  page_end: number,
  char_start: number,
  char_end: number,
  text: string,
  doc_metadata_prefix: string,
  embedding: vector<768>,
}

// brief_sections
{
  section_id: string,
  matter_id: string,
  section_kind: string,              // schema-dependent; see §1.7
  schema_version: enum,              // 'probate' | 'family' | 'pi' | 'general'
  generated_at: timestamp,
  confidence_chip: enum,             // 'high' | 'medium' | 'low' | null
  model_version: string,
  content_json: jsonb,
}

// citations
{
  citation_id: string,
  section_id: string,
  claim_text: string,
  chunk_ids: string[],
  grounded: boolean,
  grounding_method: string,          // 'overlap' | 'embedding' | 'llm_check'
}

// qa_history
{
  qa_id: string,
  matter_id: string,
  asked_at: timestamp,
  question: string,
  answer_json: jsonb,                // items with chunk_refs, same shape as brief items
  suppressed_count: number,
  latency_ms: number,
}
```

### 2.6 RAG pipeline

```
workspace_ingest
  ↓
  for each source in matter.workspace:
    extract by source_type:
      folder/drag → unpdf | mammoth | tesseract (PDFs, DOCX, images)
      mail        → emlx/olm/mbox parser → headers + body
      message     → SQLite query against chat.db scoped by handle.id
      photo       → tesseract OCR pipeline
      audio       → whisper.cpp transcription
      note        → direct text
    detect language → skip if non-English in v1
    write to matter/extracted/
  ↓
  chunk recursive char splitter, ~800 tokens, 100 overlap
  ↓
  prepend doc-level metadata prefix to each chunk
  ↓
  embed (nomic-embed-text v1.5 via Ollama, batched)
  ↓
  insert into LanceDB chunks table
  ↓
  cluster pass (k-means on embeddings) → confirm outliers with user

generate_brief
  ↓
  load schema for matter.practice_area  (probate | family | pi | general)
  for each section in schema:
    retrieve top-30 chunks (hybrid: 0.6 vector + 0.4 BM25, RRF-fused)
    rerank top-30 → top-8 (bge-reranker-v2-m3 sidecar; falls back to RRF order
                            if sidecar unavailable)
    structured prompt to Qwen3 with chunks numbered [1]..[8]
      → JSON: { items: [{ text, chunk_refs: [...] }] }
    re-grounding pass per item:
      tier 1: bigram overlap ≥ 0.4 → grounded
      tier 2: embedding cosine ≥ 0.78 → grounded
      tier 3: LLM-as-judge binary check → grounded / not
    drop ungrounded items, increment suppressedCount
  ↓
  write brief.json; stream sections to UI as they complete

ask_followup (Ask Anything)
  ↓
  retrieve → rerank → generate → re-ground (same pipeline)
  drafting-intent detector: if question asks for a draft/motion/letter/strategy,
    return decline-with-explanation instead of generating
  append to qa_history.jsonl (local; never uploaded)
```

### 2.7 IPC surface (Tauri commands)

```rust
// Workspace + matter lifecycle
create_matter(name: String, practice_area: PracticeArea) -> MatterId
list_matters() -> Vec<MatterSummary>
get_matter(matter_id: MatterId) -> MatterSummary
delete_matter(matter_id: MatterId) -> ()

workspace_add_source(matter_id: MatterId, source: WorkspaceSource) -> SourceId
workspace_list_sources(matter_id: MatterId) -> Vec<WorkspaceSource>
workspace_remove_source(matter_id: MatterId, source_id: SourceId) -> ()

// Permissions
check_permission(kind: PermissionKind) -> PermissionStatus
request_permission(kind: PermissionKind) -> PermissionStatus

// Ingest + brief
ingest_workspace(matter_id: MatterId) -> IngestStream
generate_brief(matter_id: MatterId) -> BriefStream
get_brief(matter_id: MatterId) -> Brief

// Ask Anything
ask(matter_id: MatterId, question: String) -> AnswerStream
get_qa_history(matter_id: MatterId) -> Vec<QA>

// Source viewer
get_source_span(chunk_id: ChunkId) -> SourceSpan
open_source_at_page(doc_id: DocId, page: u32) -> ()

// Eval
run_eval(matter_id: MatterId, golden_set: PathBuf) -> EvalReport
get_eval_history(matter_id: MatterId) -> Vec<EvalReport>

// Verification
verify_offline() -> NetworkAudit
```

If a command isn't in the enum, the webview cannot do it. The Rust file
holding the enum is the auditable surface — fifteen minutes of reading
confirms the local-only claim end-to-end.

### 2.8 UI surfaces

Mobile-responsive even though the primary deployment is a desktop Tauri app,
so screenshots and the in-browser preview look right on phones too.

**Library.** Top-level list of matters. Empty state has a single
"New Matter" button rather than a drag-zone (the wizard handles source
attachment). Per-matter card: name, practice area, doc count, last activity,
status (ingesting / ready / error).

**Matter Wizard.** Modal or step-flow: name → practice area → attach workspace
sources (folder, mail, iMessage scope, etc.) → review → ingest. The wizard's
visual design is the highest-leverage Claude Design handoff target.

**Brief.** Two-column on desktop (brief left, citation panel right,
collapsible). Single-column stacked on mobile with citation panel as a bottom
Sheet. Practice-area-appropriate section accordions. Section headers carry
the confidence chip where applicable.

**Ask Anything.** Persistent input affordance on the matter view. UI shape
(inline at brief bottom vs. sticky panel vs. separate route) is a Claude
Design decision; the IPC contract is `ask(matter_id, question)` regardless.

**Source viewer.** PDF / message / transcript / image rendered inline with
the cited span highlighted. Adjacent panel shows the claim that cited it.
Keyboard shortcuts `j`/`k` to step through citations.

**Eval Lab.** A `/eval` route showing the golden set, last run results per
practice area, and a "run now" button. Honest about which practice areas have
their golden sets shipped vs. which are pending.

**Settings.** Sources & Permissions section (Full Disk Access status, Photos
access, mail-store paths, scoped iMessage handle lists per matter), Network
audit (verify offline), model selection (32B vs 8B), export defaults.

### 2.9 Streaming model

The brief is generated as eight independent sectionwise calls, not one
monolithic prompt. Each section runs its own retrieval, generation, and
re-grounding pass. Sections stream to the UI in priority order — Snapshot
first, then the schema-defined ordering — so the lawyer sees value within
seconds, not after a minute. Ask Anything answers stream the same way.

### 2.10 Performance budget

| Stage | Target on M3 Pro 36 GB |
| --- | --- |
| Ingest 60 mixed-source items (PDFs, mail, photos, ~5 min audio) | ≤ 120 seconds |
| Embedding 800 chunks | ≤ 20 seconds |
| Audio transcription, per minute of audio | ≤ 15 seconds (Whisper-large-v3 on MPS) |
| First brief section visible | ≤ 8 seconds after "Generate brief" |
| Full 8-section brief | ≤ 60 seconds |
| Ask Anything answer (cold) | ≤ 8 seconds |
| Ask Anything answer (warm, model loaded) | ≤ 4 seconds |
| Citation viewer open | ≤ 200 ms |

These get measured by the eval harness and printed in the README.

### 2.11 Hardware floor

| Tier | Spec | Behavior |
| --- | --- | --- |
| Recommended | M2 Pro / M3 / M4, 32 GB RAM, 60 GB free | Qwen3-32B default, Whisper-large-v3, full quality |
| Minimum | M1, 16 GB RAM, 40 GB free | Auto-fallback to Qwen3-8B + Whisper-small, slower briefs |
| Not supported in v1 | Intel Macs, < 16 GB RAM | App refuses to install |

First-run model download is approximately 28 GB across Qwen3-32B (~20 GB),
Qwen3-8B (~5 GB), nomic-embed (~270 MB), bge-reranker (~1.1 GB), and Whisper-
large-v3 (~3 GB).

### 2.12 Build, sign, ship

- **Dev:** `pnpm install && pnpm tauri dev`. Sidecars start on demand. Models
  auto-pull on first launch.
- **Build:** `pnpm tauri build` → `Docket-1.0.0.dmg` in
  `src-tauri/target/release/bundle/`.
- **Sign:** Apple Developer ID Application certificate via `codesign`.
  Notarize via `xcrun notarytool`. Staple the ticket.
- **Distribute:** Direct `.dmg` download from the project page. No Mac App
  Store in v1.0 (sidecar process supervision conflicts with sandboxing).
- **CI:** GitHub Actions matrix builds on macOS runners. Releases are tagged.

### 2.13 Cross-platform browser path

For developers and contributors on Linux or Windows: `pnpm dev` starts the
Next.js app in browser mode with all IPC commands proxied to a Node-side
adapter that runs the same logic through a CLI wrapper. This is the browser
build the GitHub repo's screenshots come from. Native Windows ships as v1.2.
Linux is community-supported via the browser build.

---

## 3. Build plan (multi-week)

Four weeks, each ending in a demoable state. The plan stages the workspace
scope honestly — v1.0 doesn't ship all eight ingest sources in week one.

**Week 1 — Foundations + first ingest + general brief.**
- Next.js 15 scaffold with Tailwind, shadcn/ui, Vercel AI SDK.
- Tauri 2.0 wrapper, Ollama sidecar integration, model auto-pull.
- LanceDB embedded integration, schemas defined.
- Folder ingest + `.eml` import. unpdf + mammoth + tesseract.js. File
  hashing + dedup.
- General-default brief schema generation end-to-end.
- Citation rendering with chunk-to-source mapping.
- **Demoable:** Drag a folder of Enron documents, see a full 8-section
  general brief render with clickable citations.

**Week 2 — Practice-area schemas + reranker + Q&A.**
- Probate, family law, PI bespoke schemas wired (section prompts, retrieval
  prompts, JSON validation).
- Matter Wizard with practice-area selector.
- bge-reranker-v2-m3 Python sidecar.
- Ask Anything pipeline + UI affordance.
- Apple Mail `.emlx` reader.
- **Demoable:** Switch between schemas for the same Enron-shaped matter,
  measure brief quality lift from rerank, ask follow-up questions.

**Week 3 — Workspace expansion + first-run + permissions.**
- iMessage scoped reader against `chat.db` with the contact-scoping UI.
- Pasted-text notes ingest.
- Photo folder ingest with OCR.
- Drag-in from Finder.
- First-run modal + permissions flow (FDA, Photos).
- Settings page Sources & Permissions section.
- **Demoable:** Build a family-law matter from a folder + scoped iMessage
  threads + a paste-in note + a photo, see the brief integrate everything.

**Week 4 — Audio + eval + sign + ship.**
- Whisper.cpp sidecar.
- Audio ingest (voicemails, depo recordings dropped in).
- 50-question Enron golden eval set, run committed to `docs/evals/`.
- Probate golden set (smaller, ~20 tuples) committed.
- README finalized with eval numbers.
- Tauri build, code-sign, notarize, GitHub Release with `.dmg`.
- **Demoable:** Public GitHub repo with installable `.dmg`, eval leaderboard,
  honest staging notes for v1.1 work (additional practice areas, v2-moe
  embeddings, Windows port).

---

## 4. Risk register

| Risk | Mitigation |
| --- | --- |
| Qwen3-32B inference too slow on average M-series | Auto-fallback to Qwen3-8B for sub-32 GB machines; measure and publish per-section latency |
| OCR quality on scanned PDFs and photos lower than acceptable | "Low-confidence OCR" badge on affected items; manual correction via source viewer |
| Re-grounding pass too aggressive, drops valid claims | Tune thresholds via eval harness; expose `--strict` / `--lenient` in Eval Lab |
| Whisper.cpp transcription quality on poor-audio voicemails | Show per-segment confidence; allow per-segment lawyer correction |
| Apple notarization rejects bundled sidecar binaries | Build entitlements list early; budget extra days for first-time signing; validate each sidecar binary independently |
| iMessage FDA permission request scares away users | First-run modal explains exactly what is and isn't read; scoping shown clearly per matter |
| Sidecar process supervision under macOS sandboxing | Sidecars run outside the sandbox container; document the entitlements |
| Three sidecars consume too much RAM together | Lazy-start: reranker and Whisper idle until used; offer model swap in Settings |
| Eval numbers underperform cloud baselines | Be transparent. Publish what's measured. Local-only is the value proposition, not raw quality. |

---

*End of spec.*
