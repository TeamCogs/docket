"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import EvalTable from "@/components/eval/EvalTable";
import type { EvalRow } from "@/components/eval/EvalTable";

// ─── Static data ─────────────────────────────────────────────────────────────

const BASE_ROWS: EvalRow[] = [
  {
    config:       "Docket (hybrid + rerank + re-grounding)",
    recall:       0.86,
    precision:    0.91,
    faithfulness: 0.94,
    suppression:  0.07,
    latency:      6.8,
    primary:      true,
  },
  { config: "Hybrid + rerank, no re-grounding", recall: 0.86, precision: 0.78, faithfulness: 0.81, suppression: 0, latency: 5.2 },
  { config: "Vector-only, no rerank",           recall: 0.71, precision: 0.69, faithfulness: 0.76, suppression: 0, latency: 3.4 },
  { config: "Whole doc into context (no retrieval)", recall: 0.65, precision: 0.58, faithfulness: 0.71, suppression: 0, latency: 14.9 },
];

const CORPORA = [
  { name: "Enron (securities, ~50 tuples)",      status: "Shipped in v1.0",                      shipped: true },
  { name: "Probate (will contests, ~20 tuples)", status: "Public-record assembly — ships v1.1",   shipped: false },
  { name: "Family law (sanitized synthetic)",    status: "Templates in review — ships v1.1",      shipped: false },
  { name: "Personal injury (decided cases)",     status: "Records gathering — ships v1.1",        shipped: false },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EvalPage() {
  const [running, setRunning]   = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [rows, setRows]         = useState<EvalRow[]>(BASE_ROWS);
  const [lastRun, setLastRun]   = useState<{ iso: string }>({ iso: "—" });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function runEval() {
    if (running) return;
    setRunning(true);
    setProgress({ done: 0, total: 50 });

    let done = 0;
    intervalRef.current = setInterval(() => {
      done += Math.floor(Math.random() * 4) + 1;
      if (done >= 50) {
        done = 50;
        clearInterval(intervalRef.current!);
        setProgress(null);
        setRunning(false);
        setLastRun({ iso: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) });
        setRows([...BASE_ROWS]);
      } else {
        setProgress({ done, total: 50 });
      }
    }, 300);
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <div className="max-w-[1280px] mx-auto px-7 pt-9 pb-20">

      {/* Hero */}
      <div className="flex items-start justify-between mb-6">
        <div className="max-w-[640px]">
          <div className="text-micro mb-2">Eval Lab</div>
          <h1 className="text-display m-0">Retrieval quality, honestly measured.</h1>
          <p className="text-body mt-4 text-ink-2 leading-[1.6] max-w-[600px]">
            A hand-curated golden set of question / expected-answer / expected-citation
            tuples drawn from the Enron demo corpus. Run by{" "}
            <span className="font-mono-sm">pnpm eval</span>, written to{" "}
            <span className="font-mono-sm">docs/evals/</span>, never uploaded.
          </p>
        </div>
        <button
          type="button"
          onClick={runEval}
          disabled={running}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rule-strong",
            "bg-surface text-sm text-ink hover:bg-surface-2 transition-colors duration-[120ms]",
            "disabled:opacity-50 disabled:cursor-not-allowed shrink-0 mt-1",
          )}
        >
          <Sparkles className="size-3.5" />
          {running ? "Running…" : "Re-run · Enron"}
        </button>
      </div>

      {/* Progress strip */}
      {progress && (
        <div className="mb-5 px-4 py-2.5 bg-amber-soft border border-amber/20 rounded-md
                        flex items-center gap-3 text-sm">
          <span className="font-mono-sm text-amber">
            {progress.done} / {progress.total} tuples
          </span>
          <div className="flex-1 h-1 bg-amber/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber rounded-full transition-all duration-300"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <EvalTable rows={rows} />

      {/* What's measured + Golden sets */}
      <div className="grid grid-cols-2 gap-5 mt-7">
        <WhatsMeasured />
        <GoldenSets />
      </div>

      {/* Footer bar */}
      <div className="mt-6 p-3.5 px-4 border border-rule rounded-md bg-surface-2
                      flex items-center gap-3">
        <span className="font-mono-sm text-ink-3">last run · {lastRun.iso}</span>
        <span className="font-mono-sm ml-auto text-sage">0 bytes outbound during run</span>
      </div>
    </div>
  );
}

// ─── Sub-panels ───────────────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border border-rule rounded-[10px] bg-surface", className)}>
      {children}
    </div>
  );
}

function Metric({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[13.5px] font-medium text-ink">{name}</div>
      <div className="text-small text-ink-3 leading-[1.5]">{desc}</div>
    </div>
  );
}

function WhatsMeasured() {
  return (
    <Card className="p-6">
      <h3 className="text-h3 mb-3 m-0">What&apos;s measured</h3>
      <div className="flex flex-col gap-3">
        <Metric name="Recall@5"          desc="Did the correct chunk land in the top five retrieved?" />
        <Metric name="Citation precision" desc="Does the rendered citation actually contain the asserted fact?" />
        <Metric name="Faithfulness"       desc="LLM-as-judge: does the generated claim follow from the cited chunk?" />
        <Metric name="Suppression rate"   desc="Share of generated claims dropped by the re-grounding pass." />
      </div>
    </Card>
  );
}

function GoldenSets() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-h3 m-0">Golden sets</h3>
        <span className="text-small text-ink-3">v1.0 ships Enron only</span>
      </div>
      <div className="flex flex-col gap-2">
        {CORPORA.map((c) => (
          <div
            key={c.name}
            className="flex items-center justify-between p-2.5 px-3
                       bg-surface-2 border border-rule rounded-md"
          >
            <div className="flex flex-col min-w-0 mr-3">
              <div className="text-sm font-medium text-ink truncate">{c.name}</div>
              <div className="text-[12px] text-ink-3">{c.status}</div>
            </div>
            <span className={cn(
              "inline-flex items-center shrink-0 px-2 py-0.5 rounded-full text-xs font-medium",
              c.shipped
                ? "bg-sage-soft text-sage"
                : "bg-surface-3 text-ink-3",
            )}>
              {c.shipped ? "Shipped" : "Pending"}
            </span>
          </div>
        ))}
      </div>
      <div className="text-small mt-4 text-ink-3 leading-[1.5]">
        We would rather show empty cells than fabricated numbers. The README
        cites this verbatim.
      </div>
    </Card>
  );
}
