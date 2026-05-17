import EvalTable from "@/components/eval/EvalTable";

/**
 * The Eval Lab.
 *
 * Surfaces the latest eval run's results and a comparison row against
 * baselines: naive single-pass RAG, whole-doc-in-context, no-rerank,
 * no-regrounding. The goal is to make retrieval-quality concrete —
 * measurable numbers committed to the repo rather than adjectives in a
 * README.
 */
export default function EvalPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="font-sans text-2xl sm:text-3xl tracking-tight font-semibold text-ink-900">
          Eval Lab
        </h1>
        <p className="text-sm sm:text-base text-ink-600 max-w-prose">
          A hand-curated golden set of 50 question / expected-answer /
          expected-citation tuples drawn from the Enron demo corpus. The
          numbers below come from <span className="font-mono text-xs">pnpm eval</span>,
          which prints to terminal and writes to <span className="font-mono text-xs">docs/evals/</span>.
        </p>
      </header>

      <EvalTable />

      <section className="card p-4 space-y-2">
        <h2 className="font-sans text-sm font-medium uppercase tracking-wider text-ink-500">
          What's measured
        </h2>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-ink-700">
          <div>
            <dt className="font-medium text-ink-900">Recall@5</dt>
            <dd>Did the correct chunk land in the top 5 retrieved?</dd>
          </div>
          <div>
            <dt className="font-medium text-ink-900">Citation precision</dt>
            <dd>Does the rendered citation actually contain the asserted fact?</dd>
          </div>
          <div>
            <dt className="font-medium text-ink-900">Faithfulness</dt>
            <dd>LLM-as-judge: does the claim follow from the cited chunk?</dd>
          </div>
          <div>
            <dt className="font-medium text-ink-900">Suppression rate</dt>
            <dd>Share of generated claims dropped by the re-grounding pass.</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
