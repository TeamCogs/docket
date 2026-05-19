"use client";

import { Clock } from "lucide-react";
import type { Citation, Claim } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReAskAnswer {
  asked: string;
  askedAgainstVersion: number;
  answer: Claim[];
}

interface PairedAnswerStripProps {
  reask: ReAskAnswer;
  onCite: (c: Citation) => void;
}

// ─── PairedAnswerStrip ────────────────────────────────────────────────────────

export default function PairedAnswerStrip({ reask, onCite }: PairedAnswerStripProps) {
  const { asked, askedAgainstVersion, answer } = reask;

  // Trim to ISO date-time for display, or raw if short
  const askedDisplay = asked.length > 10 ? asked.slice(0, 16).replace("T", " ") : asked;

  return (
    <div
      className="mt-4 pt-4 border-t border-dashed"
      style={{ borderColor: "var(--rule-strong)" }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2.5 mb-3">
        <Clock
          aria-hidden="true"
          style={{ width: 13, height: 13, color: "var(--ink-3)", flexShrink: 0 }}
        />
        <span className="text-micro" style={{ color: "var(--ink-3)" }}>
          Re-asked with current material
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <span
            className="font-mono-sm"
            style={{ fontSize: 11, color: "var(--ink-4)" }}
          >
            {askedDisplay}
          </span>
          <span
            className="px-2 py-px rounded-full"
            style={{
              background: "var(--surface-3)",
              color:      "var(--ink-3)",
              fontSize:   10.5,
            }}
          >
            asked against v{askedAgainstVersion}
          </span>
        </div>
      </div>

      {/* Answer */}
      <div
        className="prose-brief flex flex-col gap-2"
        style={{ fontSize: 15 }}
      >
        {answer.map((claim, idx) => (
          <p key={idx} className="m-0">
            {claim.text}
            {claim.citation && (
              <button
                type="button"
                className="fn-chip"
                onClick={() => onCite(claim.citation)}
                title="Source"
                aria-label={`View source ${idx + 1}`}
              >
                {idx + 1}
              </button>
            )}
          </p>
        ))}
      </div>
    </div>
  );
}
