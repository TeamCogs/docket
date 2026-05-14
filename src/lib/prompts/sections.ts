/**
 * Per-section user prompts.
 *
 * Each section has its own retrieval query template and its own JSON schema.
 * Keeping them in one file makes the schema/prompt relationship auditable
 * at a glance — important when an interviewer asks you to walk through how
 * the brief is generated.
 */

import type { BriefSectionKind, Chunk } from "../types";

export interface SectionRecipe {
  kind: BriefSectionKind;
  // The query used to fetch passages for this section. Sometimes literal text,
  // sometimes a query crafted to bias retrieval toward the right material.
  retrievalQueries: string[];
  // The user prompt template. {{passages}} is replaced with the formatted
  // retrieved passages. {{matter}} is the matter name.
  userPrompt: (passages: string, matter: string) => string;
}

const passagesBlock = (chunks: Chunk[]): string =>
  chunks
    .map((c, i) => `[${i + 1}] ${c.docMetadataPrefix}\n${c.text}`)
    .join("\n\n");

export function formatPassages(chunks: Chunk[]): string {
  return passagesBlock(chunks);
}

export const RECIPES: Record<BriefSectionKind, SectionRecipe> = {
  snapshot: {
    kind: "snapshot",
    retrievalQueries: [
      "case name parties caption complaint",
      "court venue jurisdiction docket number",
      "matter type cause of action",
    ],
    userPrompt: (passages, matter) => `Matter: ${matter}

Passages:
${passages}

Produce a Matter Snapshot. Output JSON of the form:
{
  "items": [
    {
      "text": "Matter type: <inferred from passages>. Parties: <list from passages>. Jurisdiction: <from passages, if present>.",
      "chunk_refs": ["<passage ids you used>"]
    }
  ]
}

Keep the snapshot to ONE item, three to five sentences total. If you cannot infer the matter type from the passages, say so explicitly.`,
  },

  parties: {
    kind: "parties",
    retrievalQueries: [
      "parties plaintiff defendant",
      "counsel of record attorney for",
      "witness deponent testified",
    ],
    userPrompt: (passages, matter) => `Matter: ${matter}

Passages:
${passages}

Identify the parties and their roles. Output JSON of the form:
{
  "items": [
    {
      "text": "<Name> — <role: client/adverse/third_party/counsel/witness>. First appears in passage [N].",
      "chunk_refs": ["<passage ids>"]
    }
  ]
}

One item per party. Use only names that appear in the passages. Do not infer "client" — leave role as "unknown" unless the passages clearly indicate it.`,
  },

  timeline: {
    kind: "timeline",
    retrievalQueries: [
      "date event meeting occurred",
      "letter sent received correspondence dated",
      "filed complaint motion order dated",
    ],
    userPrompt: (passages, matter) => `Matter: ${matter}

Passages:
${passages}

Extract material events with dates. Output JSON of the form:
{
  "items": [
    {
      "text": "YYYY-MM-DD: <one-sentence event description>",
      "chunk_refs": ["<passage ids>"]
    }
  ]
}

Only include events for which the passages provide a specific date. If a date is partial (year and month only), use YYYY-MM. Sort by date ascending. Do not invent dates.`,
  },

  claims: {
    kind: "claims",
    retrievalQueries: [
      "cause of action claim count alleges",
      "defense affirmative defense denies",
      "statute violation breach",
    ],
    userPrompt: (passages, matter) => `Matter: ${matter}

Passages:
${passages}

Identify claims, causes of action, and defenses surfaced in the passages. Output JSON of the form:
{
  "items": [
    {
      "text": "<asserted|implied>: <claim or defense label>. <one-sentence explanation drawn from the passage>",
      "chunk_refs": ["<passage ids>"]
    }
  ]
}

"asserted" means the claim is in a pleading. "implied" means it is mentioned in correspondence or notes but not yet pled. Use only labels that appear in the passages — do not infer statutes.`,
  },

  key_facts: {
    kind: "key_facts",
    retrievalQueries: [
      "admitted acknowledged confirmed",
      "stated testified declared",
      "key fact material",
    ],
    userPrompt: (passages, matter) => `Matter: ${matter}

Passages:
${passages}

Extract the most material facts and admissions. Prefer direct quotes. Output JSON:
{
  "items": [
    {
      "text": "<direct quote or close paraphrase, with quotation marks for direct quotes>",
      "chunk_refs": ["<passage ids>"]
    }
  ]
}

Limit to 8 items. Order by importance to a first-read.`,
  },

  risks: {
    kind: "risks",
    retrievalQueries: [
      "statute of limitations deadline expired",
      "missing signature unsigned",
      "contradiction inconsistent inconsistency",
      "adverse fact damaging unfavorable",
    ],
    userPrompt: (passages, matter) => `Matter: ${matter}

Passages:
${passages}

Identify risks, red flags, adverse facts, and contradictions. Output JSON:
{
  "items": [
    {
      "text": "<sol|missing_signature|admission|jurisdiction|prior_counsel|contradiction|other>: <one-sentence description>",
      "chunk_refs": ["<passage ids>"]
    }
  ]
}

Begin each item with the risk kind tag in angle brackets. Only flag risks supported by the passages. Do not speculate about strategy.`,
  },

  open_questions: {
    kind: "open_questions",
    retrievalQueries: [
      "exhibit attached enclosed missing",
      "see attached referenced",
      "unclear unknown to be determined",
    ],
    userPrompt: (passages, matter) => `Matter: ${matter}

Passages:
${passages}

List information gaps: documents referenced but missing, ambiguous dates, unresolved contradictions. Output JSON:
{
  "items": [
    {
      "text": "<missing_exhibit|date_ambiguity|unresolved_contradiction|outlier_document>: <one-sentence description>",
      "chunk_refs": ["<passage ids if relevant>"]
    }
  ]
}

Begin each item with the kind tag. If the gap is a missing document, chunk_refs may be empty.`,
  },

  next_steps: {
    kind: "next_steps",
    retrievalQueries: [
      "next step request investigate",
      "interview witness deposition needed",
      "deadline calendar date",
    ],
    userPrompt: (passages, matter) => `Matter: ${matter}

Passages:
${passages}

Suggest next steps. Action-oriented. NEVER recommend a legal strategy or outcome. Output JSON:
{
  "items": [
    {
      "text": "<request_document|interview|calendar_date|other>: <one-sentence action>",
      "chunk_refs": ["<passage ids if relevant>"]
    }
  ]
}

Limit to 6 items. Examples of acceptable items: "request_document: Obtain Exhibit C referenced in the 9/14/2001 letter." Examples of FORBIDDEN items: "Consider filing for summary judgment." (legal strategy)`,
  },
};
