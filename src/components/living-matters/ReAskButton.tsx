"use client";

import { Clock } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReAskButtonProps {
  reasked: boolean;
  reaskedAgainstVersion?: number;
  onClick: () => void;
}

// ─── ReAskButton ─────────────────────────────────────────────────────────────

export default function ReAskButton({
  reasked,
  reaskedAgainstVersion,
  onClick,
}: ReAskButtonProps) {
  if (reasked) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border"
        style={{
          background:  "var(--surface-2)",
          borderColor: "var(--rule)",
          color:       "var(--ink-3)",
          fontSize:    11.5,
        }}
      >
        <Clock className="size-[11px]" aria-hidden="true" />
        Re-asked with v{reaskedAgainstVersion}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-colors duration-[120ms]"
      style={{
        borderColor: "var(--rule)",
        color:       "var(--ink-2)",
        fontSize:    11.5,
      }}
      title="Re-ask this question against the current brief version"
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--surface-2)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "transparent")
      }
    >
      <Clock className="size-[11px]" aria-hidden="true" />
      Re-ask with current material
    </button>
  );
}
