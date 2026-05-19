"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BriefVersion, BriefVersionId } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VersionChipProps {
  versions: BriefVersion[];
  currentId: BriefVersionId;
  historical: boolean;
  onOpenHistory: () => void;
}

// ─── VersionChip ─────────────────────────────────────────────────────────────

export default function VersionChip({
  versions,
  currentId,
  historical,
  onOpenHistory,
}: VersionChipProps) {
  const viewed = versions.find((v) => v.id === currentId);
  const n = viewed?.versionNumber ?? 1;
  const updatedDate = viewed
    ? new Date(viewed.generatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  if (historical) {
    return (
      <button
        type="button"
        onClick={onOpenHistory}
        className="inline-flex items-center gap-1 rounded-full py-1 px-2.5"
        style={{
          fontSize: 12,
          background: "var(--amber-soft)",
          border: "1px solid rgba(138,106,43,0.25)",
          color: "var(--amber)",
        }}
      >
        <span className="font-mono-sm font-medium">v{n}</span>
        <span>&middot; viewing prior</span>
        <ChevronRight
          style={{ width: 11, height: 11, opacity: 0.5 }}
          strokeWidth={2}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenHistory}
      className={cn(
        "inline-flex items-center gap-1 rounded-full py-1 px-2.5",
        "transition-colors duration-[120ms]"
      )}
      style={{
        fontSize: 12,
        background: "var(--surface)",
        border: "1px solid var(--rule)",
        color: "var(--ink-2)",
      }}
    >
      <span className="font-mono-sm font-medium">v{n}</span>
      <span>&middot; updated {updatedDate}</span>
      <ChevronRight
        style={{ width: 11, height: 11, opacity: 0.5 }}
        strokeWidth={2}
      />
    </button>
  );
}
