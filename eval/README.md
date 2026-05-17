# Eval

A hand-curated golden set of question / expected-answer / expected-citation
tuples over the Enron demo corpus. Used by `pnpm eval` to score the retrieval
and grounding pipeline against three baselines.

## Files

- `golden-set.jsonl` — one question per line, conforming to `GoldenQuestion`
  in `src/lib/types.ts`. Ten seed questions are checked in; the v1 target is
  fifty.
- `run.ts` — the harness. `pnpm eval` calls into this.
- `promptfoo.yaml` — optional Promptfoo configuration for running the same
  golden set through Promptfoo's UI for visual diffing.

## What gets measured

| Metric | Definition |
| --- | --- |
| Recall@5 | Did the correct chunk land in the top 5 retrieved? |
| Citation precision | Does the rendered citation actually contain the asserted fact? (LLM-as-judge with the same passage shown to the judge.) |
| Faithfulness | Does the generated claim follow from the cited chunk? (LLM-as-judge.) |
| Suppression rate | Share of generated claims dropped by the re-grounding pass. Too high = pipeline too noisy. Too low = re-grounding ineffective. |
| p50 / p95 latency | Honest performance budget. Published in the README. |

## Why this matters

Most RAG applications don't measure their own quality. Docket does, on every
commit, with numbers committed to the repo. The eval harness is what lets
us defend the citation precision claim with data, makes regressions
unignorable, and gives lawyers a real basis for trust beyond "it looks
about right." It is the artifact the README leads with.
