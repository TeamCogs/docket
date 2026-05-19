"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import SidePanel from "./SidePanel";
import NetworkBadge from "@/components/layout/NetworkBadge";

// ─── Stages ───────────────────────────────────────────────────────────────────

const STAGES = [
  { from: 0.0,  to: 0.18, label: "Hashing and extracting text" },
  { from: 0.18, to: 0.55, label: "Chunking and embedding (nomic-embed-text)" },
  { from: 0.55, to: 0.80, label: "Writing to LanceDB index" },
  { from: 0.80, to: 1.0,  label: "Impact detection across 8 sections" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface IngestingPanelProps {
  onDone: () => void;
}

// ─── IngestingPanel ───────────────────────────────────────────────────────────

export default function IngestingPanel({ onDone }: IngestingPanelProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const increment = 0.03 + Math.random() * 0.02; // 3–5% per tick
        const next = Math.min(prev + increment, 1);
        if (next >= 1) {
          clearInterval(interval);
          setTimeout(onDone, 280);
        }
        return next;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [onDone]);

  const pct = Math.round(progress * 100);

  // Determine the current active stage index
  const activeStageIndex = STAGES.findIndex(
    (s) => progress >= s.from && progress < s.to
  );

  return (
    <SidePanel
      title="Ingesting locally"
      subtitle="The Rust core verifies zero outbound traffic during this run."
    >
      <div className="flex flex-col gap-5">
        {/* Network badge */}
        <div>
          <NetworkBadge />
        </div>

        {/* Progress bar */}
        <div className="flex flex-col gap-1.5">
          <div
            className="w-full rounded overflow-hidden"
            style={{
              height: 4,
              background: "var(--surface-3)",
            }}
          >
            <div
              className="h-full rounded"
              style={{
                width: `${pct}%`,
                background: "var(--navy)",
                transition: "width 80ms linear",
              }}
            />
          </div>
          <p
            className="text-right font-mono-sm"
            style={{ fontSize: 12.5, color: "var(--ink-3)" }}
          >
            {pct}%
          </p>
        </div>

        {/* Stage checklist */}
        <ol className="flex flex-col gap-3">
          {STAGES.map((stage, i) => {
            const isDone = progress >= stage.to;
            const isActive = i === activeStageIndex;

            return (
              <li key={stage.label} className="flex items-center gap-3">
                {/* Stage circle */}
                <div
                  className={cn(
                    "flex-shrink-0 rounded-full flex items-center justify-center",
                    isActive && "animate-docket-pulse"
                  )}
                  style={{
                    width: 16,
                    height: 16,
                    background: isDone
                      ? "var(--sage)"
                      : isActive
                        ? "var(--navy-soft)"
                        : "var(--surface-2)",
                    border: isDone
                      ? "none"
                      : isActive
                        ? "1.5px solid var(--navy)"
                        : "1.5px solid var(--rule)",
                  }}
                  aria-hidden="true"
                >
                  {isDone && (
                    <Check
                      style={{ width: 9, height: 9, color: "#ffffff" }}
                      strokeWidth={2.8}
                    />
                  )}
                </div>

                {/* Stage label */}
                <span
                  className="text-[13px] leading-[1.45]"
                  style={{
                    color: isDone
                      ? "var(--ink-2)"
                      : isActive
                        ? "var(--ink)"
                        : "var(--ink-4)",
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </SidePanel>
  );
}
