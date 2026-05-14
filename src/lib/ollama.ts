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
  const res = await ollama.generate({
    model: opts.model,
    prompt: opts.prompt,
    system: opts.system,
    format: opts.jsonMode ? "json" : undefined,
    options: {
      temperature: opts.temperature ?? 0.1,
    },
    stream: false,
  });
  return res.response;
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

/** Single embedding call. Used during ingest and at query time. */
export async function embed(texts: string[], model = process.env.DOCKET_EMBED_MODEL ?? "nomic-embed-text-v2-moe"): Promise<number[][]> {
  const res = await ollama.embed({ model, input: texts });
  return res.embeddings;
}
