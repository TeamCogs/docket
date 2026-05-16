/**
 * Docket — canonical type definitions.
 *
 * Every cross-module contract lives here. The eight-section brief schema, the
 * citation model, and the matter/document/chunk taxonomy are all defined once
 * in this file so the UI, the RAG pipeline, and the IPC layer can't drift.
 *
 * If you change a type here, run `pnpm typecheck` before anything else.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

export type MatterId = string;
export type DocId = string; // sha256 of file bytes
export type ChunkId = string; // `${docId}#${chunkIndex}`
export type CitationId = string;
export type SectionId = string;

/**
 * Section-level confidence chip. We deliberately do NOT expose per-fact
 * numeric scores — see the spec, section 1.7(A): automation-bias literature
 * argues numeric per-fact confidence trains over-reliance.
 */
export type ConfidenceChip = "high" | "medium" | "low";

/**
 * The grounding state attached to every claim. "Grounded" means the
 * re-grounding pass confirmed the cited chunk(s) actually support the claim.
 * "Partially supported" means at least one chunk overlaps but the
 * verification didn't fully land. "Unsupported" claims never render —
 * they're dropped at render time. We still log the count.
 */
export type GroundingState = "grounded" | "partial" | "unsupported";

// ─────────────────────────────────────────────────────────────────────────────
// Matter / Document / Chunk
// ─────────────────────────────────────────────────────────────────────────────

export interface MatterSummary {
  id: MatterId;
  name: string; // user-editable; defaults to inferred matter name
  createdAt: string; // ISO-8601
  docCount: number;
  status: "ingesting" | "ready" | "error";
  matterTypeGuess?: string; // e.g., "Securities enforcement"
  matterTypeConfidence?: ConfidenceChip;
  dateRangeCovered?: { from: string; to: string };
}

export interface Document {
  id: DocId;
  matterId: MatterId;
  filename: string;
  mimeType: string;
  pageCount: number;
  ingestedAt: string;
  ocrUsed: boolean;
  sourcePath: string; // absolute path inside matter/source/
  // If clustering flagged this as an outlier, we surface it in Open Questions.
  isOutlierCluster: boolean;
}

export interface Chunk {
  id: ChunkId;
  docId: DocId;
  chunkIndex: number;
  pageStart: number;
  pageEnd: number;
  charStart: number; // byte offset within extracted text — used for span-level citation rendering
  charEnd: number;
  text: string;
  docMetadataPrefix: string; // "[Case: ... | Doc: ... | Page: ...]"
  // Embedding is stored in LanceDB; we don't ship it across IPC.
}

// ─────────────────────────────────────────────────────────────────────────────
// Citations
// ─────────────────────────────────────────────────────────────────────────────

export interface Citation {
  id: CitationId;
  // Every claim that renders must point at >= 1 chunk.
  chunkIds: ChunkId[];
  grounded: GroundingState;
  // How the re-grounding pass made its call. Useful in the Eval Lab.
  groundingMethod: "overlap" | "embedding" | "llm_check";
  // 0..1 — internal only. Not surfaced to the lawyer.
  internalScore: number;
}

/**
 * A renderable claim. Sections are made of these. If the claim's citation is
 * "unsupported", the renderer drops it and increments the section's
 * `suppressedCount`. Hallucinations get caught here, not in the LLM.
 */
export interface Claim {
  text: string;
  citation: Citation;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brief — the eight sections
// ─────────────────────────────────────────────────────────────────────────────

export type BriefSectionKind =
  | "snapshot"
  | "parties"
  | "timeline"
  | "claims"
  | "key_facts"
  | "risks"
  | "open_questions"
  | "next_steps";

interface BriefSectionBase<K extends BriefSectionKind, C> {
  id: SectionId;
  kind: K;
  generatedAt: string;
  modelVersion: string;
  // Suppressed (ungrounded) claims — count only, never the content.
  // Surfaced in the Eval Lab and aggregated into the section's logs.
  suppressedCount: number;
  content: C;
}

// 1. Snapshot
export interface MatterSnapshotContent {
  matterTypeGuess: string;
  matterTypeConfidence: ConfidenceChip;
  parties: string[]; // top-level only
  jurisdiction?: string;
  documentCount: number;
  dateRange: { from: string; to: string };
}
export type MatterSnapshotSection = BriefSectionBase<"snapshot", MatterSnapshotContent>;

// 2. Parties & Roles
export interface PartyRow {
  name: string;
  role: "client" | "adverse" | "third_party" | "counsel" | "witness" | "unknown";
  firstAppearance: Citation;
  lastAppearance: Citation;
}
export type PartiesSection = BriefSectionBase<"parties", { parties: PartyRow[] }>;

// 3. Timeline of Material Events
export interface TimelineEvent {
  date: string; // ISO-8601, may be partial: "2001-10" if day is unknown
  partyIds?: string[]; // refs into Parties section by name
  description: string;
  citation: Citation;
  // Set when this event conflicts with another event in the same timeline.
  conflictsWith?: string[]; // event IDs
  id: string;
}
export type TimelineSection = BriefSectionBase<"timeline", { events: TimelineEvent[] }>;

// 4. Claims / Causes / Defenses
export interface ClaimItem {
  label: string; // e.g., "Securities Fraud (15 U.S.C. § 78j(b))"
  // `asserted` = pleaded; `implied` = mentioned in correspondence but not pled.
  status: "asserted" | "implied";
  text: string;
  citation: Citation;
}
export type ClaimsSection = BriefSectionBase<"claims", { claims: ClaimItem[] }>;

// 5. Key Facts & Admissions
export type KeyFactsSection = BriefSectionBase<"key_facts", { facts: Claim[] }>;

// 6. Risks, Red Flags, Adverse Facts
export interface RiskItem {
  kind: "sol" | "missing_signature" | "admission" | "jurisdiction" | "prior_counsel" | "contradiction" | "other";
  text: string;
  // Contradictions point at the events/claims that disagree.
  relatedIds?: string[];
  citation: Citation;
}
export type RisksSection = BriefSectionBase<"risks", { risks: RiskItem[] }>;

// 7. Open Questions / Information Gaps
export interface OpenQuestion {
  kind: "missing_exhibit" | "date_ambiguity" | "unresolved_contradiction" | "outlier_document";
  text: string;
  citation?: Citation; // may be absent for "missing exhibit" cases
}
export type OpenQuestionsSection = BriefSectionBase<"open_questions", { questions: OpenQuestion[] }>;

// 8. Suggested Next Steps
export interface NextStep {
  kind: "request_document" | "interview" | "calendar_date" | "other";
  text: string;
  // Next steps generally don't cite; they're inferred from gaps elsewhere.
  // If they do cite, the link points back at the question that motivated them.
  motivatedBy?: SectionId;
}
export type NextStepsSection = BriefSectionBase<"next_steps", { steps: NextStep[] }>;

export type BriefSection =
  | MatterSnapshotSection
  | PartiesSection
  | TimelineSection
  | ClaimsSection
  | KeyFactsSection
  | RisksSection
  | OpenQuestionsSection
  | NextStepsSection;

export interface Brief {
  matterId: MatterId;
  generatedAt: string;
  modelVersion: string;
  sections: BriefSection[];
  // Total suppressed claims across all sections. Visible in Eval Lab.
  totalSuppressed: number;
  // Per-section latency, for the performance budget in the README.
  latencyMs: Record<BriefSectionKind, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Follow-up Q&A
// ─────────────────────────────────────────────────────────────────────────────

export interface FollowUp {
  id: string;
  matterId: MatterId;
  question: string;
  answer: Claim[]; // every sentence carries a citation, same model as the brief
  askedAt: string;
  latencyMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Source viewer
// ─────────────────────────────────────────────────────────────────────────────

export interface SourceSpan {
  docId: DocId;
  filename: string;
  pageStart: number;
  pageEnd: number;
  charStart: number;
  charEnd: number;
  text: string; // the cited paragraph
  // Path to the original file so the renderer can load it.
  sourcePath: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Eval
// ─────────────────────────────────────────────────────────────────────────────

export interface GoldenQuestion {
  id: string;
  question: string;
  expectedAnswer: string;
  // The docId + page that the correct citation must hit. If retrieval misses
  // this entirely, recall@k fails for this question.
  expectedSource: { docId: DocId; page: number };
  // Free-form tag for grouping results in the README leaderboard.
  category: "timeline" | "parties" | "claims" | "risk" | "key_fact" | "open_question";
}

export interface EvalRun {
  id: string;
  matterId: MatterId;
  runAt: string;
  modelVersion: string;
  goldenSetVersion: string;
  metrics: {
    retrievalRecallAt5: number;
    citationPrecision: number;
    faithfulness: number; // LLM-as-judge
    suppressionRate: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
  };
  perQuestion: Array<{
    questionId: string;
    retrievedTop: boolean;
    citationCorrect: boolean;
    faithful: boolean;
    suppressed: boolean;
    latencyMs: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// System / hardware detection (drives model routing — see spec 2.11)
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemSnapshot {
  os: "macos" | "windows" | "linux" | "unknown";
  chip:
    | "apple_m1"
    | "apple_m2"
    | "apple_m2_pro_or_better"
    | "apple_m3_or_better"
    | "intel_mac"
    | "windows_x64"
    | "linux_x64"
    | "unknown";
  totalRamGb: number;
  freeDiskGb: number;
  recommendedTier: "default" | "fallback" | "unsupported";
  recommendedModel: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas for runtime validation of LLM JSON output
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The LLM emits structured JSON for each section. We validate it with Zod
 * before any rendering happens. If validation fails the section is dropped
 * and we log it — a great signal for the Eval Lab.
 */
export const RawClaimSchema = z.object({
  text: z.string().min(1),
  chunk_refs: z.array(z.string()).min(1),
});
export type RawClaim = z.infer<typeof RawClaimSchema>;

// Preprocess: the model sometimes returns the array under a key other than
// "items" (e.g. "claims", "events", "facts"). Find the first array value and
// normalise it to { items: [...] } so the rest of the pipeline is unaffected.
export const SectionRawSchema = z.preprocess((val) => {
  if (typeof val === "object" && val !== null) {
    const v = val as Record<string, unknown>;
    if (Array.isArray(v.items)) return val;
    const arrayKey = Object.keys(v).find((k) => Array.isArray(v[k]));
    if (arrayKey) return { items: v[arrayKey] };
  }
  return val;
}, z.object({ items: z.array(RawClaimSchema).default([]) }));
