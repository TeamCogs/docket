/**
 * Thin wrapper around the Ollama client.
 *
 * Why hand-rolled instead of LangChain.js:
 *   1. No framework churn risk — Ollama's API surface is small and stable.
 *   2. Every call is auditable. The Rust core inspects the request bytes.
 *   3. When an interviewer asks "walk me through your retrieval pipeline,"
 *      I can.
 *
 * This module is server-only — never imported from a client component.
 */

import { Ollama } from "ollama";

const host = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

export const ollama = new Ollama({ host });

/**
 * One-shot generation. Used everywhere a streaming response isn't required —
 * notably the re-grounding NLI check.
 */
export async function complete(opts: {
  model: string;
  prompt: string;
  system?: string;
  jsonMode?: boolean;
  temperature?: number;
}): Promise<string> {
  // stream: true so Ollama sends HTTP headers immediately when generation
  // starts, satisfying undici's 30s headersTimeout. With stream: false,
  // Ollama buffers the full response before sending any headers — on large
  // prompts with a 32B model that exceeds the timeout every time.
  const it = await ollama.generate({
    model: opts.model,
    prompt: opts.prompt,
    system: opts.system,
    format: opts.jsonMode ? "json" : undefined,
    options: { temperature: opts.temperature ?? 0.1 },
    stream: true,
  });
  let response = "";
  for await (const chunk of it) {
    if (chunk.response) response += chunk.response;
  }
  return response;
}

/** Streaming generation. The brief UI consumes this directly. */
export async function* stream(opts: {
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
}): AsyncGenerator<string> {
  const it = await ollama.generate({
    model: opts.model,
    prompt: opts.prompt,
    system: opts.system,
    options: { temperature: opts.temperature ?? 0.1 },
    stream: true,
  });
  for await (const chunk of it) {
    if (chunk.response) yield chunk.response;
  }
}

// nomic-bert hard context limit is 2048 tokens; dot/dash leaders in TOC pages
// tokenize 1:1 and can blow the budget. Collapse runs before embedding.
function normalizeForEmbed(text: string): string {
  return text
    .replace(/[.\-_]{3,}/g, "...")  // collapse long dot/dash/underscore runs
    .replace(/ {2,}/g, " ")         // collapse extra spaces
    .trim();
}

/** Single embedding call. Used during ingest and at query time. */
export async function embed(texts: string[], model = process.env.DOCKET_EMBED_MODEL ?? "nomic-embed-text"): Promise<number[][]> {
  // Send one at a time — older Ollama servers (< 0.3) don't support array
  // input on /api/embed and silently concatenate them, blowing the context.
  const results: number[][] = [];
  for (const text of texts) {
    const res = await ollama.embed({ model, input: normalizeForEmbed(text) });
    results.push(...res.embeddings);
  }
  return results;
}
