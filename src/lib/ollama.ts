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
  // Uses chat API (not generate) so the qwen3 chat template is applied and
  // /no_think is recognized as a control token, not literal text.
  // Streaming keeps headers flowing immediately, avoiding undici headersTimeout.
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: "/no_think\n\n" + opts.prompt });

  const it = await ollama.chat({
    model: opts.model,
    messages,
    format: opts.jsonMode ? "json" : undefined,
    options: { temperature: opts.temperature ?? 0.1 },
    stream: true,
  });
  let response = "";
  for await (const chunk of it) {
    if (chunk.message?.content) response += chunk.message.content;
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
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: "/no_think\n\n" + opts.prompt });

  const it = await ollama.chat({
    model: opts.model,
    messages,
    options: { temperature: opts.temperature ?? 0.1 },
    stream: true,
  });
  for await (const chunk of it) {
    if (chunk.message?.content) yield chunk.message.content;
  }
}

// nomic-bert hard context limit is 2048 tokens; dot/dash leaders in TOC pages
// tokenize 1:1 and can blow the budget. Collapse runs before embedding.
function normalizeForEmbed(text: string): string {
  return text
    .replace(/[.\-_]{3,}/g, "...")  // collapse long dot/dash/underscore runs
    .replace(/ {2,}/g, " ")         // collapse extra spaces
    .trim()
    .slice(0, 5000);                // nomic-embed-text hard limit is 2048 tokens; 5k chars ≈ 1400 tokens
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
