import type { ConfidenceChip, MatterSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function MatterCard({ matter }: { matter: MatterSummary }) {
  return (
    <article className="card p-4 sm:p-5 space-y-3 hover:border-ink-300 transition-colors">
      <header className="flex items-start justify-between gap-3">
        <h3 className="font-sans font-medium text-ink-900 leading-snug">
          {matter.name}
        </h3>
        <StatusDot status={matter.status} />
      </header>
      {matter.matterTypeGuess && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-500">Matter type:</span>
          <span className="text-xs font-medium text-ink-800">{matter.matterTypeGuess}</span>
          {matter.matterTypeConfidence && <ConfidenceTag c={matter.matterTypeConfidence} />}
        </div>
      )}
      <dl className="grid grid-cols-2 gap-2 text-xs text-ink-500">
        <div>
          <dt className="font-medium text-ink-400 uppercase tracking-wider">Docs</dt>
          <dd className="text-ink-800 text-sm">{matter.docCount}</dd>
        </div>
        {matter.dateRangeCovered && (
          <div>
            <dt className="font-medium text-ink-400 uppercase tracking-wider">Range</dt>
            <dd className="text-ink-800 text-sm tabular-nums">
              {matter.dateRangeCovered.from.slice(0, 4)}–{matter.dateRangeCovered.to.slice(0, 4)}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}

function StatusDot({ status }: { status: MatterSummary["status"] }) {
  return (
    <span
      className={cn(
        "size-2 rounded-full mt-1.5",
        status === "ready" && "bg-grounded",
        status === "ingesting" && "bg-amber-500 animate-pulse",
        status === "error" && "bg-flag",
      )}
      aria-label={status}
    />
  );
}

function ConfidenceTag({ c }: { c: ConfidenceChip }) {
  if (c === "high") return <span className="chip-grounded">high confidence</span>;
  if (c === "low") return <span className="chip-flag">low confidence</span>;
  return <span className="chip-neutral">medium confidence</span>;
}
