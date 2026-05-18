"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConfidenceChip, MatterSummary } from "@/lib/types";

export default function MatterCard({ matter }: { matter: MatterSummary }) {
  const router = useRouter();

  const range = matter.dateRangeCovered
    ? `${matter.dateRangeCovered.from.slice(0, 4)}–${matter.dateRangeCovered.to.slice(0, 4)}`
    : null;

  const lastActivity = new Date(matter.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article
      onClick={() => router.push(`/matter/${matter.id}`)}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/matter/${matter.id}`)}
      role="button"
      aria-label={matter.name}
      className="rounded-md border border-rule bg-surface p-[18px_20px]
                 min-h-[180px] flex flex-col gap-3.5 cursor-pointer
                 transition-[border-color,box-shadow] duration-[160ms]
                 hover:border-rule-strong hover:shadow-2"
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-h3 m-0 leading-tight">{matter.name}</h3>
          {matter.matterTypeGuess && (
            <div className="text-small">{matter.matterTypeGuess}</div>
          )}
        </div>
        {matter.status === "ready" && matter.matterTypeConfidence && (
          <ConfidenceChipBadge level={matter.matterTypeConfidence} />
        )}
        {matter.status === "ingesting" && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-3 border border-rule text-xs font-medium text-ink-2">
            <span className="size-1.5 rounded-full bg-amber animate-docket-pulse" />
            Ingesting
          </span>
        )}
      </div>

      {matter.status === "ingesting" ? (
        <div className="flex flex-col gap-2 mt-auto">
          <div className="h-1 bg-surface-3 rounded-sm overflow-hidden">
            <div
              className="h-full bg-navy transition-[width] duration-[200ms]"
              style={{ width: "0%" }}
            />
          </div>
          <div className="text-small">{lastActivity}</div>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="flex items-start gap-6 mt-1.5">
            <Stat label="Documents" value={String(matter.docCount)} mono />
            {range && <Stat label="Range" value={range} mono small />}
          </div>

          <div className="text-small mt-auto text-ink-3">{lastActivity}</div>
        </>
      )}
    </article>
  );
}

export function NewMatterCard({
  disabled = false,
  onClick,
}: {
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-dashed border-rule-strong
                 p-5 min-h-[180px]
                 flex flex-col items-center justify-center gap-2.5
                 text-ink-2 disabled:opacity-55 disabled:cursor-not-allowed
                 hover:bg-surface-2/40 transition-colors duration-[160ms]"
    >
      <span className="grid place-items-center size-9 rounded-md bg-surface border border-rule text-navy">
        <Plus className="size-[18px]" />
      </span>
      <div className="font-medium text-ink">New matter</div>
      <div className="text-small">Drag a folder, mailbox, or scoped messages</div>
    </button>
  );
}

function ConfidenceChipBadge({ level }: { level: ConfidenceChip }) {
  const styles: Record<ConfidenceChip, string> = {
    high:   "bg-sage-soft text-sage",
    medium: "bg-amber-soft text-amber",
    low:    "bg-brick-soft text-brick",
  };
  const labels: Record<ConfidenceChip, string> = {
    high:   "High confidence",
    medium: "Medium",
    low:    "Low",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        styles[level],
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {labels[level]}
    </span>
  );
}

function Stat({
  label,
  value,
  mono = false,
  small = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className="text-micro">{label}</div>
      <div
        className={cn(
          mono && "font-mono-sm",
          small ? "text-[13.5px]" : "text-[15px]",
          "text-ink mt-0.5",
        )}
      >
        {value}
      </div>
    </div>
  );
}
