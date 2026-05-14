/**
 * Follow-up Q&A. Spec §1.4 step 7: "Ask follow-up questions in a
 * 'More on this matter' input at the bottom, also cited."
 *
 * Scope decision (per Scott's defaults): chunks only — the follow-up
 * pipeline does not see the brief sections. Keeps citation story crisp.
 */

import { retrieve } from "@/lib/retrieve";
import { ground } from "@/lib/ground";
import { complete } from "@/lib/ollama";
import { SYSTEM_PROMPT } from "@/lib/prompts/system";
import { formatPassages } from "@/lib/prompts/sections";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.DOCKET_MODEL_DEFAULT ?? "qwen3:32b-instruct-q4_K_M";

export async function POST(req: NextRequest) {
  const { matterId, question } = (await req.json()) as { matterId: string; question: string };

  const hits = await retrieve(matterId, question);
  const chunks = hits.map((h) => h.chunk);
  const passages = formatPassages(chunks);

  const prompt = `Question: ${question}

Passages:
${passages}

Answer the question using ONLY the passages. Output JSON of the form:
{
  "items": [
    { "text": "<one sentence>", "chunk_refs": ["<passage ids>"] }
  ]
}

If the passages do not answer the question, return { "items": [] }.`;

  const raw = await complete({ model: MODEL, system: SYSTEM_PROMPT, prompt, jsonMode: true });

  let items: Array<{ text: string; chunk_refs: string[] }> = [];
  try {
    items = (JSON.parse(raw) as { items?: Array<{ text: string; chunk_refs: string[] }> }).items ?? [];
  } catch {
    /* swallow */
  }

  // Re-ground each item.
  const grounded = [];
  for (const it of items) {
    const refs = it.chunk_refs
      .map((r) => chunks[parseInt(r.replace(/[\[\]]/g, ""), 10) - 1])
      .filter(Boolean);
    if (refs.length === 0) continue;
    const g = await ground({ claim: it.text, chunks: refs });
    if (g.state === "unsupported") continue;
    grounded.push({ text: it.text, citation: { chunkIds: refs.map((c) => c.id), grounded: g.state } });
  }

  return Response.json({ answer: grounded });
}
