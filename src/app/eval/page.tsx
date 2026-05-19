"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export default function EvalLabDeprecated() {
  return (
    <div className="max-w-[760px] mx-auto px-7 pt-20 pb-20">
      <div
        className={cn(
          "border border-rule rounded-[10px] bg-surface p-8",
          "flex flex-col gap-5",
        )}
      >
        <div>
          <div className="text-micro mb-2">Removed in v1.0</div>
          <h1 className="text-h1 m-0">The in-app Eval Lab has moved out of the app.</h1>
        </div>

        <p className="text-body text-ink-2 leading-[1.6] m-0">
          The Enron leaderboard was a developer artifact that surfaced in the
          wrong place — a working lawyer's matter view. It's been split into
          two surfaces with separate audiences:
        </p>

        <div className="flex flex-col gap-3">
          <SubsectionRow chipText="In-app" chipKind="sage" label="Matter Quality · per matter">
            Citation density, re-grounding suppression, document coverage, and a
            per-claim verification checklist. About <em>this</em> brief on{" "}
            <em>this</em> evidence. Open from any matter view header.
          </SubsectionRow>
          <SubsectionRow chipText="Repo" chipKind="neutral" label="Dev eval harness · GitHub repo">
            Recall@5, citation precision, faithfulness, suppression rate against
            the Enron golden set. Runs via{" "}
            <code className="font-mono-sm bg-surface-3 px-1.5 py-0.5 rounded">pnpm eval</code>
            ; results land in{" "}
            <code className="font-mono-sm bg-surface-3 px-1.5 py-0.5 rounded">docs/evals/</code>{" "}
            and the GitHub README. Contributor artifact, never a tab in this app.
          </SubsectionRow>
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rule-strong
                       bg-surface text-sm text-ink hover:bg-surface-2 transition-colors duration-[120ms]"
          >
            Open a matter
          </Link>
        </div>
      </div>
    </div>
  );
}

function SubsectionRow({
  label,
  chipKind,
  chipText,
  children,
}: {
  label: string;
  chipKind: "sage" | "neutral";
  chipText: string;
  children: React.ReactNode;
}) {
  const chipColors = {
    sage:    "bg-sage-soft text-sage",
    neutral: "bg-surface-3 text-ink-3",
  };
  return (
    <div className="p-4 bg-surface-2 border border-rule rounded-md flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
          chipColors[chipKind],
        )}>
          {chipText}
        </span>
        <span className="text-sm font-medium text-ink">{label}</span>
      </div>
      <p className="text-small text-ink-2 leading-[1.55] m-0">{children}</p>
    </div>
  );
}
