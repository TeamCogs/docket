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
  // Function of the matter name so the first query anchors to the right
  // document cluster for any practice area, then subsequent queries cast
  // a wider semantic net.
  retrievalQueries: (matter: string) => string[];
  // Override the default 8-chunk cap. Sections that need to identify many
  // distinct entities (parties, timeline) benefit from a wider net.
  maxChunks?: number;
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
    retrievalQueries: (matter) => [
      `${matter} case overview type description`,
      "complaint petition indictment charges cause of action alleged",
      "fraud breach injury dispute violation misconduct claim",
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
    maxChunks: 10,
    // Five queries spanning every practice area:
    //   [1] matter-anchored on executive/officer titles — pulls complaint/report paragraphs
    //       that name "Kenneth Lay, Chairman and CEO" etc. rather than SPE entity names
    //   [2] CFO/controller/accountant titles — targets Fastow, Causey, Andersen
    //   [3] adversarial roles — litigation (civil + criminal) and regulatory
    //   [4] fiduciary/estate roles — probate, trust, guardianship, conservatorship
    //   [5] counsel and witnesses — universal
    retrievalQueries: (matter) => [
      `${matter} chief executive officer chairman president CEO director board`,
      "chief financial officer CFO controller accountant auditor treasurer comptroller",
      "plaintiff petitioner claimant defendant respondent accused indicted suspect co-conspirator",
      "trustee executor administrator beneficiary guardian conservator heir assignee licensor licensee",
      "counsel attorney law firm retained witness expert deponent whistleblower",
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

One item per named person or organization. Limit to 12 items maximum — prioritize key individuals over minor entities. Use only names that appear in the passages. Do not infer "client" — leave role as "unknown" unless the passages clearly indicate it.`,
  },

  timeline: {
    kind: "timeline",
    maxChunks: 10,
    // Five queries spanning every practice area:
    //   [1] matter-anchored on significant legal/corporate events — "announced resigned filed"
    //       forces the anchor toward material events, not scheduling emails
    //   [2] litigation filings and court orders — civil, criminal, regulatory
    //   [3] corporate and securities events — restatement, bankruptcy, disclosure, SEC filing
    //   [4] employment and personal status events
    //   [5] transactional events — closing, default, foreclosure, settlement
    retrievalQueries: (matter) => [
      `${matter} announced resigned indicted charged restated disclosed filed`,
      "complaint petition filed judgment decree entered arrest arraigned convicted sentenced order",
      "restatement bankruptcy disclosed announced press release 8-K 10-K earnings reported",
      "hired fired terminated resigned appointed promoted died born married divorced naturalized",
      "signed executed closed settled default foreclosure merger acquisition evicted",
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

Only include events for which the passages provide a specific date. If a date is partial (year and month only), use YYYY-MM. Sort by date ascending. Do not invent dates. If multiple passages describe the same event, emit it once.`,
  },

  claims: {
    kind: "claims",
    // Four queries covering the full spectrum of claim types across practice areas
    retrievalQueries: (matter) => [
      `${matter} claim cause of action count alleged`,
      "fraud breach negligence discrimination harassment wrongful retaliation infringement defamation",
      "malpractice personal injury products liability nuisance trespass conversion unjust enrichment",
      "affirmative defense counterclaim motion dismiss denies disputed statute regulation violated",
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
    retrievalQueries: (matter) => [
      `${matter} key fact admission finding`,
      "admitted acknowledged knew aware authorized approved confirmed signed",
      "testified stated declared sworn record evidence exhibit produced",
      "report investigation audit concluded determined findings revealed",
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
    // Five queries covering risk categories across all practice areas:
    //   [1] matter-anchored
    //   [2] executive public statements while knowing contrary internal facts — targets
    //       the Lay/Skilling "everything is fine" vs. internal board materials pattern
    //   [3] concealment and conflicts — corporate fraud, estate self-dealing, divorce hidden assets
    //   [4] capacity, coercion, and consent — estate (undue influence), family, contract
    //   [5] procedural and documentary — universal
    retrievalQueries: (matter) => [
      `${matter} risk red flag adverse contradiction`,
      `${matter} publicly stated represented told while privately knew concealed internal documents show`,
      "undisclosed withheld concealed hidden conflict self-dealing related party asset transfer",
      "undue influence incapacity incompetence duress coercion misrepresentation lack consent",
      "statute limitations deadline expired lapsed unsigned missing signature gap omission",
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

Begin each item with the risk kind tag wrapped in angle brackets, e.g. <contradiction>: description. Only flag risks supported by the passages. Do not speculate about strategy.`,
  },

  open_questions: {
    kind: "open_questions",
    retrievalQueries: (matter) => [
      `${matter} unanswered unclear unresolved disputed contradicts`,
      "referenced exhibit attachment schedule appendix not produced not provided not available",
      "inconsistent conflicts with contradicts differs from earlier statement prior testimony",
      "unknown unclear uncertain not determined not established identity whereabouts motive",
    ],
    userPrompt: (passages, matter) => `Matter: ${matter}

Passages:
${passages}

A lawyer is reviewing this matter for the first time. List open questions they would need answered: missing or unproduced documents, ambiguous or conflicting dates, unresolved contradictions between sources, and factual gaps that affect the legal analysis. Output JSON:
{
  "items": [
    {
      "text": "<missing_exhibit|date_ambiguity|unresolved_contradiction|outlier_document>: <one-sentence description>",
      "chunk_refs": ["<passage ids if relevant>"]
    }
  ]
}

Begin each item with the kind tag wrapped in angle brackets, e.g. <missing_exhibit>: description. Aim for 3–6 items. If there are no meaningful gaps, return 2–3 questions any lawyer new to this matter would want answered before proceeding.`,
  },

  next_steps: {
    kind: "next_steps",
    retrievalQueries: (matter) => [
      `${matter} next step action needed follow up`,
      "document request subpoena obtain acquire production order",
      "interview depose witness examine testimony expert retain",
      "deadline filing date calendar court upcoming schedule",
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
