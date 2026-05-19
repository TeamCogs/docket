"use client";

import type { BriefVersion } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoricalBannerProps {
  viewingVersion: BriefVersion;
  currentVersion: BriefVersion;
  onViewCurrent: () => void;
  onRestoreAsCurrent: () => void;
}

// ─── HistoricalBanner ────────────────────────────────────────────────────────

export default function HistoricalBanner({
  viewingVersion,
  currentVersion,
  onViewCurrent,
  onRestoreAsCurrent,
}: HistoricalBannerProps) {
  const viewingDate = new Date(viewingVersion.generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="w-full border-b py-3 px-7"
      style={{
        background: "var(--amber-soft)",
        borderColor: "rgba(138,106,43,0.25)",
      }}
    >
      <div className="max-w-[1280px] mx-auto flex justify-between items-center gap-4">
        {/* Left side */}
        <div className="flex items-center gap-2.5" style={{ color: "var(--amber)" }}>
          {/* Amber dot */}
          <span
            className="flex-shrink-0 rounded-full"
            style={{
              width: 6,
              height: 6,
              background: "var(--amber)",
            }}
            aria-hidden="true"
          />
          <p className="text-[13.5px] leading-[1.5]">
            You are viewing{" "}
            <strong className="font-semibold">v{viewingVersion.versionNumber}</strong> of
            this brief, generated {viewingDate}. Current is{" "}
            <strong className="font-semibold">v{currentVersion.versionNumber}</strong>.
          </p>
        </div>

        {/* Right side: action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onViewCurrent}
            className="border text-sm px-3 py-1.5 rounded-md transition-colors duration-[120ms]"
            style={{
              borderColor: "var(--rule-strong)",
              background: "var(--surface)",
              color: "var(--ink)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--surface-2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--surface)")
            }
          >
            View current
          </button>
          <button
            type="button"
            onClick={onRestoreAsCurrent}
            className="text-sm px-3 py-1.5 rounded-md transition-colors duration-[120ms]"
            style={{ color: "var(--ink-2)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(20,18,12,0.04)";
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--ink-2)";
            }}
          >
            Restore as current
          </button>
        </div>
      </div>
    </div>
  );
}
