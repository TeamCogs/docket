/**
 * Eval table — the comparison view that anchors the README leaderboard.
 *
 * For scaffolding we render plausible placeholder numbers so the layout can
 * be reviewed. The values get replaced by `pnpm eval` output once a real
 * run completes.
 */

const ROWS = [
  {
    config: "Docket (hybrid + rerank + re-grounding)",
    recall: 0.86,
    precision: 0.91,
    faithful: 0.94,
    suppression: 0.07,
    p50: 6800,
    headline: true,
  },
  { config: "Hybrid + rerank, no re-grounding", recall: 0.86, precision: 0.78, faithful: 0.81, suppression: 0, p50: 5200 },
  { config: "Vector-only, no rerank", recall: 0.71, precision: 0.69, faithful: 0.76, suppression: 0, p50: 3400 },
  { config: "Whole doc into context (no retrieval)", recall: 0.65, precision: 0.58, faithful: 0.71, suppression: 0, p50: 14_900 },
];

export default function EvalTable() {
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-600">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Configuration</th>
            <th className="text-right px-3 py-2 font-medium">Recall@5</th>
            <th className="text-right px-3 py-2 font-medium">Citation precision</th>
            <th className="text-right px-3 py-2 font-medium">Faithfulness</th>
            <th className="text-right px-3 py-2 font-medium">Suppression</th>
            <th className="text-right px-3 py-2 font-medium">p50 latency</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {ROWS.map((r) => (
            <tr key={r.config} className={r.headline ? "bg-grounded-subtle/40" : ""}>
              <td className="px-3 py-2 text-ink-900 font-medium">{r.config}</td>
              <td className="px-3 py-2 text-right tabular-nums">{(r.recall * 100).toFixed(0)}%</td>
              <td className="px-3 py-2 text-right tabular-nums">{(r.precision * 100).toFixed(0)}%</td>
              <td className="px-3 py-2 text-right tabular-nums">{(r.faithful * 100).toFixed(0)}%</td>
              <td className="px-3 py-2 text-right tabular-nums">{(r.suppression * 100).toFixed(0)}%</td>
              <td className="px-3 py-2 text-right tabular-nums">{(r.p50 / 1000).toFixed(1)}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
