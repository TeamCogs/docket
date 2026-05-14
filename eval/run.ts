/**
 * Eval harness — `pnpm eval` entry point.
 *
 * Walks the golden set, runs each question through the full Docket pipeline,
 * and prints a table comparing the configured pipeline against three
 * baselines:
 *
 *   1. Naive single-pass RAG (no rerank, no re-grounding).
 *   2. Vector-only retrieval (no BM25 fusion).
 *   3. Whole-doc-in-context (no retrieval).
 *
 * Results are written to docs/evals/<ISO_DATE>.md so each run is permanent.
 * The README leaderboard auto-updates from the most recent file.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { GoldenQuestion, EvalRun } from "../src/lib/types";

interface CliArgs {
  matterId: string;
  goldenPath: string;
  outDir: string;
}

const args: CliArgs = {
  matterId: process.argv[2] ?? "demo-enron",
  goldenPath: process.argv[3] ?? "eval/golden-set.jsonl",
  outDir: process.argv[4] ?? "docs/evals",
};

async function main() {
  const raw = await readFile(args.goldenPath, "utf-8");
  const questions: GoldenQuestion[] = raw
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as GoldenQuestion);

  console.log(`\nDocket eval — ${questions.length} questions, matter=${args.matterId}\n`);

  // TODO[scott]: wire to the real retrieve() and generateBrief() over the
  // Enron corpus once ingestion has run. For now we report a stubbed result
  // so the harness shape is testable.
  const run: EvalRun = {
    id: `run_${Date.now()}`,
    matterId: args.matterId,
    runAt: new Date().toISOString(),
    modelVersion: process.env.DOCKET_MODEL_DEFAULT ?? "qwen3:32b-instruct-q4_K_M",
    goldenSetVersion: "v0.1",
    metrics: {
      retrievalRecallAt5: 0,
      citationPrecision: 0,
      faithfulness: 0,
      suppressionRate: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
    },
    perQuestion: [],
  };

  const md = renderMarkdown(run, questions.length);
  const outPath = join(args.outDir, `${run.runAt.slice(0, 10)}.md`);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, md, "utf-8");
  console.log(md);
  console.log(`\nWrote ${outPath}`);
}

function renderMarkdown(run: EvalRun, total: number): string {
  return `# Eval run ${run.runAt}

- Matter: \`${run.matterId}\`
- Model: \`${run.modelVersion}\`
- Golden set: \`${run.goldenSetVersion}\` (${total} questions)

| Metric | Value |
| --- | --- |
| Retrieval recall@5 | ${(run.metrics.retrievalRecallAt5 * 100).toFixed(1)}% |
| Citation precision | ${(run.metrics.citationPrecision * 100).toFixed(1)}% |
| Faithfulness | ${(run.metrics.faithfulness * 100).toFixed(1)}% |
| Suppression rate | ${(run.metrics.suppressionRate * 100).toFixed(1)}% |
| p50 latency | ${(run.metrics.p50LatencyMs / 1000).toFixed(1)}s |
| p95 latency | ${(run.metrics.p95LatencyMs / 1000).toFixed(1)}s |
`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
