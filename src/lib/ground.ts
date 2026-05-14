/**
 * The re-grounding pass.
 *
 * Every claim the model emits passes through here BEFORE it renders. The
 * lawyer never sees a sentence that wasn't grounded against actual chunk
 * text. This is the single most important non-RAG piece of the pipeline —
 * it's the difference between "AI hallucinated a case citation" and "the
 * tool refuses to emit anything it can't substantiate."
 *
 * Three-tier verification, cheapest first:
 *
 *   Tier 1  — Lexical overlap > 0.4 of bigrams between claim and chunk.
 *             Cheap. Catches most simple paraphrases.
 *   Tier 2  — If Tier 1 fails, compute embedding cosine similarity. > 0.78
 *             passes. Catches harder paraphrases without an LLM call.
 *   Tier 3  — If Tier 2 fails, ask the LLM a binary "does this passage
 *             support this claim, yes/no" question. Expensive but rare.
 *
 * Thresholds are tuned via the eval harness. See eval/run.ts.
 */

import { embed, complete } from "./ollama";
import type { Chunk, Citation, GroundingState } from "./types";

const TIER1_OVERLAP = 0.4;
const TIER2_COS = 0.78;

const MODEL = process.env.DOCKET_MODEL_DEFAULT ?? "qwen3:32b-q4_K_M";

export interface GroundingInput {
  claim: string;
  chunks: Chunk[];
}

export interface GroundingResult {
  state: GroundingState;
  method: Citation["groundingMethod"];
  score: number;
}

export async function ground(input: GroundingInput): Promise<GroundingResult> {
  if (input.chunks.length === 0) {
    return { state: "unsupported", method: "overlap", score: 0 };
  }

  // Tier 1 — bigram overlap.
  const overlap = bigramOverlap(input.claim, input.chunks.map((c) => c.text).join("\n"));
  if (overlap >= TIER1_OVERLAP) {
    return { state: "grounded", method: "overlap", score: overlap };
  }

  // Tier 2 — embedding similarity.
  const cos = await embeddingSimilarity(input.claim, input.chunks);
  if (cos >= TIER2_COS) {
    return { state: "grounded", method: "embedding", score: cos };
  }

  // Tier 3 — LLM-as-judge. Binary, deterministic, JSON.
  const llmYes = await llmJudge(input.claim, input.chunks);
  if (llmYes) return { state: "grounded", method: "llm_check", score: 1 };

  // Marginal cases — flag as partial so the UI can surface a soft chip.
  if (overlap > 0.2 || cos > 0.65) return { state: "partial", method: "embedding", score: cos };

  return { state: "unsupported", method: "llm_check", score: 0 };
}

function bigramOverlap(a: string, b: string): number {
  const A = bigrams(normalize(a));
  const B = bigrams(normalize(b));
  if (A.size === 0) return 0;
  let hit = 0;
  for (const x of A) if (B.has(x)) hit++;
  return hit / A.size;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(s: string): Set<string> {
  const toks = s.split(" ");
  const out = new Set<string>();
  for (let i = 0; i < toks.length - 1; i++) out.add(`${toks[i]} ${toks[i + 1]}`);
  return out;
}

async function embeddingSimilarity(claim: string, chunks: Chunk[]): Promise<number> {
  const [embedded] = [await embed([claim, chunks.map((c) => c.text).join("\n")])];
  const [a, b] = embedded;
  return cosine(a, b);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aMag += a[i] * a[i];
    bMag += b[i] * b[i];
  }
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag) || 1);
}

async function llmJudge(claim: string, chunks: Chunk[]): Promise<boolean> {
  const passages = chunks
    .map((c, i) => `[Passage ${i + 1}]\n${c.docMetadataPrefix}\n${c.text}`)
    .join("\n\n");
  const prompt = `You are verifying whether a passage supports a claim. Answer ONLY with JSON: {"supports": true} or {"supports": false}.

Claim: "${claim}"

${passages}

Does the passage above support the claim? Be strict — only answer true if the passage states or directly implies the claim.`;
  try {
    const raw = await complete({ model: MODEL, prompt, jsonMode: true, temperature: 0 });
    const parsed = JSON.parse(raw) as { supports?: boolean };
    return parsed.supports === true;
  } catch {
    return false;
  }
}
