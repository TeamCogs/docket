/**
 * Brief generation — orchestrates retrieve → prompt → JSON parse → reground →
 * suppress for each of the eight sections.
 *
 * Each section is its own retrieval pass. The hot path looks like this:
 *
 *   for kind in [snapshot, parties, timeline, claims, key_facts, risks, open_questions, next_steps]:
 *     chunks = retrieve(matter, recipe.retrievalQueries)
 *     raw    = llm(system + recipe.userPrompt(chunks))
 *     parsed = SectionRawSchema.parse(raw)
 *     for item in parsed.items:
 *       g = ground(item.text, chunks_by_id[item.chunk_refs])
 *       if g.state == 'unsupported': suppressedCount++; continue
 *       emit Claim{ text, citation }
 *
 * Sections stream to the UI in priority order so the lawyer sees value
 * within seconds, not after a 60-second wait.
 */

import { complete } from "./ollama";
import { retrieve, type RetrievedChunk } from "./retrieve";
import { ground } from "./ground";
import { SYSTEM_PROMPT } from "./prompts/system";
import { RECIPES, formatPassages } from "./prompts/sections";
import { SectionRawSchema } from "./types";
import type {
  Brief,
  BriefSection,
  BriefSectionKind,
  Chunk,
  Claim,
  Citation,
  MatterId,
} from "./types";
import { shortId } from "./utils";

const SECTION_ORDER: BriefSectionKind[] = [
  "snapshot",
  "parties",
  "timeline",
  "claims",
  "key_facts",
  "risks",
  "open_questions",
  "next_steps",
];

const MODEL = process.env.DOCKET_MODEL_DEFAULT ?? "qwen3:32b-q4_K_M";

export interface GenerateOptions {
  matterId: MatterId;
  matterName: string;
  onSectionReady?: (section: BriefSection) => void;
}

export async function generateBrief(opts: GenerateOptions): Promise<Brief> {
  const sections: BriefSection[] = [];
  let totalSuppressed = 0;
  const latencyMs = Object.fromEntries(SECTION_ORDER.map((k) => [k, 0])) as Record<BriefSectionKind, number>;

  for (const kind of SECTION_ORDER) {
    const t0 = Date.now();
    const section = await generateSection(kind, opts);
    latencyMs[kind] = Date.now() - t0;
    sections.push(section);
    totalSuppressed += section.suppressedCount;
    opts.onSectionReady?.(section);
  }

  return {
    matterId: opts.matterId,
    generatedAt: new Date().toISOString(),
    modelVersion: MODEL,
    sections,
    totalSuppressed,
    latencyMs,
  };
}

async function generateSection(
  kind: BriefSectionKind,
  opts: GenerateOptions,
): Promise<BriefSection> {
  const recipe = RECIPES[kind];

  // Multi-query retrieval — union the top results from each query.
  const retrievedById = new Map<string, RetrievedChunk>();
  for (const q of recipe.retrievalQueries) {
    const hits = await retrieve(opts.matterId, q);
    for (const h of hits) retrievedById.set(h.chunk.id, h);
  }
  const chunks = [...retrievedById.values()].slice(0, 8).map((r) => r.chunk);

  const passages = formatPassages(chunks);
  const userPrompt = recipe.userPrompt(passages, opts.matterName);

  let raw = "";
  try {
    raw = await complete({
      model: MODEL,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      jsonMode: true,
      temperature: 0.1,
    });
  } catch (err) {
    // LLM failed entirely — emit an empty section. The UI shows a soft error.
    console.error(`Section ${kind} generation failed:`, err);
  }

  let items: Array<{ text: string; chunk_refs: string[] }> = [];
  try {
    const parsed = SectionRawSchema.parse(JSON.parse(raw));
    items = parsed.items;
  } catch {
    // Schema violation — log and proceed with no items. Eval Lab counts these.
  }

  const chunkById = new Map(chunks.map((c) => [c.id, c]));
  const claims: Claim[] = [];
  let suppressed = 0;

  for (const item of items) {
    const referencedChunks = item.chunk_refs
      .map((ref) => resolveChunkRef(ref, chunks, chunkById))
      .filter((c): c is Chunk => c !== null);

    if (referencedChunks.length === 0) {
      suppressed++;
      continue;
    }

    const g = await ground({ claim: item.text, chunks: referencedChunks });
    if (g.state === "unsupported") {
      suppressed++;
      continue;
    }

    const citation: Citation = {
      id: shortId("cit"),
      chunkIds: referencedChunks.map((c) => c.id),
      grounded: g.state,
      groundingMethod: g.method,
      internalScore: g.score,
    };
    claims.push({ text: item.text, citation });
  }

  return buildSection(kind, claims, suppressed);
}

/**
 * The LLM tends to emit chunk_refs as either "[3]" or "3". Coerce.
 * Also accept full chunk_ids (matter##doc#idx).
 */
function resolveChunkRef(ref: string, ordered: Chunk[], byId: Map<string, Chunk>): Chunk | null {
  if (byId.has(ref)) return byId.get(ref)!;
  const numeric = ref.replace(/[\[\]\s]/g, "");
  const idx = parseInt(numeric, 10);
  if (Number.isFinite(idx) && idx >= 1 && idx <= ordered.length) return ordered[idx - 1];
  return null;
}

/**
 * Each kind packages its claims into the section-specific content shape.
 * For v1, claim arrays map directly into the schema. v1.1 will introduce
 * richer per-section post-processing (e.g., timeline sort, party dedup).
 */
function buildSection(kind: BriefSectionKind, claims: Claim[], suppressed: number): BriefSection {
  const base = {
    id: shortId("sec"),
    generatedAt: new Date().toISOString(),
    modelVersion: MODEL,
    suppressedCount: suppressed,
  };
  switch (kind) {
    case "snapshot":
      return {
        ...base,
        kind,
        content: parseSnapshot(claims),
      };
    case "parties":
      return {
        ...base,
        kind,
        content: { parties: parseParties(claims) },
      };
    case "timeline":
      return {
        ...base,
        kind,
        content: { events: parseTimeline(claims) },
      };
    case "claims":
      return {
        ...base,
        kind,
        content: { claims: parseClaimsItems(claims) },
      };
    case "key_facts":
      return { ...base, kind, content: { facts: claims } };
    case "risks":
      return { ...base, kind, content: { risks: parseRisks(claims) } };
    case "open_questions":
      return { ...base, kind, content: { questions: parseOpenQuestions(claims) } };
    case "next_steps":
      return { ...base, kind, content: { steps: parseNextSteps(claims) } };
  }
}

// ─── tiny per-section parsers ────────────────────────────────────────────────

function parseSnapshot(claims: Claim[]) {
  const first = claims[0]?.text ?? "";
  return {
    matterTypeGuess: first.split(".")[0] ?? "Unknown",
    matterTypeConfidence: (claims.length ? "medium" : "low") as "high" | "medium" | "low",
    parties: [],
    jurisdiction: undefined,
    documentCount: 0,
    dateRange: { from: "", to: "" },
  };
}

function parseParties(claims: Claim[]) {
  return claims.map((c) => {
    const m = c.text.match(/^(.+?)\s*[—-]\s*(.+?)(?:\.|\s+First|$)/);
    return {
      name: m?.[1]?.trim() ?? c.text.split(/[—-]/)[0].trim(),
      role: (m?.[2]?.toLowerCase()?.includes("adverse") ? "adverse" : "unknown") as
        | "client"
        | "adverse"
        | "third_party"
        | "counsel"
        | "witness"
        | "unknown",
      firstAppearance: c.citation,
      lastAppearance: c.citation,
    };
  });
}

function parseTimeline(claims: Claim[]) {
  return claims
    .map((c) => {
      const dateMatch = c.text.match(/^(\d{4}(?:-\d{2}){0,2})/);
      const date = dateMatch?.[1] ?? "";
      const description = c.text.replace(/^\S+:\s*/, "");
      return { id: shortId("evt"), date, description, citation: c.citation };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function parseClaimsItems(claims: Claim[]) {
  return claims.map((c) => {
    const m = c.text.match(/^(asserted|implied):\s*(.+?)\.\s*(.+)/i);
    return {
      label: m?.[2] ?? c.text,
      status: ((m?.[1]?.toLowerCase() as "asserted" | "implied") ?? "asserted"),
      text: m?.[3] ?? c.text,
      citation: c.citation,
    };
  });
}

function parseRisks(claims: Claim[]) {
  const kinds = ["sol", "missing_signature", "admission", "jurisdiction", "prior_counsel", "contradiction", "other"] as const;
  return claims.map((c) => {
    const tag = (c.text.match(/^<(\w+)>:/i)?.[1] ?? "other").toLowerCase();
    const kind = (kinds as readonly string[]).includes(tag) ? (tag as (typeof kinds)[number]) : "other";
    return { kind, text: c.text.replace(/^<[^>]+>:\s*/, ""), citation: c.citation };
  });
}

function parseOpenQuestions(claims: Claim[]) {
  const kinds = ["missing_exhibit", "date_ambiguity", "unresolved_contradiction", "outlier_document"] as const;
  return claims.map((c) => {
    const tag = (c.text.match(/^<(\w+)>:/i)?.[1] ?? "missing_exhibit").toLowerCase();
    const kind = (kinds as readonly string[]).includes(tag)
      ? (tag as (typeof kinds)[number])
      : "missing_exhibit";
    return { kind, text: c.text.replace(/^<[^>]+>:\s*/, ""), citation: c.citation };
  });
}

function parseNextSteps(claims: Claim[]) {
  const kinds = ["request_document", "interview", "calendar_date", "other"] as const;
  return claims.map((c) => {
    const tag = (c.text.match(/^<(\w+)>:/i)?.[1] ?? "other").toLowerCase();
    const kind = (kinds as readonly string[]).includes(tag)
      ? (tag as (typeof kinds)[number])
      : "other";
    return { kind, text: c.text.replace(/^<[^>]+>:\s*/, "") };
  });
}
