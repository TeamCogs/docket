"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import OverlayShell, { OverlayFooter } from "./OverlayShell";
import UpdatedTag from "./UpdatedTag";
import type { BriefSectionKind } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiffItem {
  text: string;
  op: "added" | "removed" | "kept";
}

export interface SectionDiff {
  sectionId: string;
  sectionKind: BriefSectionKind;
  title: string;
  summary: string;
  prior: { items: DiffItem[] };
  next: { items: DiffItem[] };
  priorVersionLabel: string;
  nextVersionLabel: string;
  nextRegenDate: string;
}

export type Decision = "accept" | "reject" | "skip";

interface RegenerationPreviewProps {
  sections: SectionDiff[];
  onClose: () => void;
  onCommit: (decisions: Record<string, Decision>) => void;
}

// ─── DiffMarker ───────────────────────────────────────────────────────────────

function DiffMarker({ op }: { op: DiffItem["op"] }) {
  const config = {
    added:   { bg: "var(--navy-soft)",  color: "var(--sage)",   char: "+" },
    removed: { bg: "var(--navy-soft)",  color: "var(--brick)",  char: "−" },
    kept:    { bg: "var(--navy-soft)",  color: "var(--ink-4)",  char: "·" },
  };
  const c = config[op];

  return (
    <span
      className="flex-shrink-0 inline-flex items-center justify-center rounded-[3px] font-mono text-[10px] font-medium select-none"
      style={{
        width: 16,
        height: 16,
        background: c.bg,
        color: c.color,
        marginTop: 2,
      }}
      aria-hidden="true"
    >
      {c.char}
    </span>
  );
}

// ─── DiffItemRow ─────────────────────────────────────────────────────────────

function DiffItemRow({ item }: { item: DiffItem }) {
  const textStyles: Record<DiffItem["op"], React.CSSProperties> = {
    added: {
      background: "var(--sage-soft)",
      boxShadow: "inset 0 -2px 0 var(--sage-soft-2)",
      color: "var(--ink)",
    },
    removed: {
      textDecoration: "line-through",
      color: "var(--ink-3)",
    },
    kept: {
      color: "var(--ink-2)",
    },
  };

  return (
    <div className="flex gap-2">
      <DiffMarker op={item.op} />
      <span
        className="prose-brief"
        style={{
          fontSize: 14.5,
          ...textStyles[item.op],
        }}
      >
        {item.text}
      </span>
    </div>
  );
}

// ─── DiffColumn ──────────────────────────────────────────────────────────────

interface DiffColumnProps {
  label: string;
  items: DiffItem[];
  regenDate?: string;
  isNext?: boolean;
}

function DiffColumn({ label, items, regenDate, isNext }: DiffColumnProps) {
  return (
    <div
      className="rounded-lg flex flex-col gap-3 overflow-y-auto"
      style={{
        background: isNext ? "#fefdf8" : "var(--surface-2)",
        border: isNext ? "1px solid var(--rule-strong)" : "1px solid var(--rule)",
        padding: "18px",
        maxHeight: 540,
      }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0">
        <span className="text-micro" style={{ color: "var(--ink-3)" }}>
          {label}
        </span>
        {isNext && regenDate && <UpdatedTag at={regenDate} />}
      </div>

      {/* Diff items */}
      <div className="flex flex-col gap-2.5">
        {items.map((item, i) => (
          <DiffItemRow key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

// ─── Progress strip ───────────────────────────────────────────────────────────

interface ProgressStripProps {
  total: number;
  current: number;
  decisions: Record<string, Decision>;
  sectionIds: string[];
}

function ProgressStrip({ total, current, decisions, sectionIds }: ProgressStripProps) {
  return (
    <div className="flex items-center gap-0.5">
      {sectionIds.map((id, i) => {
        const dec = decisions[id];
        const isCurrentSection = i === current;
        let bg = "var(--surface-3)"; // undecided
        if (isCurrentSection) bg = "var(--navy)";
        else if (dec === "accept") bg = "var(--sage)";
        else if (dec === "reject") bg = "var(--brick)";
        else if (dec === "skip") bg = "var(--ink-4)";

        return (
          <div
            key={id}
            className="rounded-sm"
            style={{
              width: 28,
              height: 4,
              background: bg,
              transition: "background 200ms",
            }}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

// ─── RegenerationPreview ─────────────────────────────────────────────────────

export default function RegenerationPreview({
  sections,
  onClose,
  onCommit,
}: RegenerationPreviewProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const section = sections[currentIdx];
  const total = sections.length;
  const sectionIds = sections.map((s) => s.sectionId);

  function decide(d: Decision) {
    setDecisions((prev) => ({ ...prev, [section.sectionId]: d }));
  }

  function goNext() {
    if (currentIdx < total - 1) setCurrentIdx((i) => i + 1);
  }

  function goPrev() {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  }

  const currentDecision = decisions[section.sectionId];
  const isLast = currentIdx === total - 1;

  // Count accepted sections for "Save as v{n}" label
  const acceptedCount = Object.values(decisions).filter((d) => d === "accept").length;

  return (
    <OverlayShell onClose={onClose} maxWidth={1180}>
      {/* Sticky header */}
      <div
        className="px-7 py-5 border-b flex items-start justify-between gap-5 flex-shrink-0 sticky top-0"
        style={{
          borderColor: "var(--rule)",
          background: "var(--surface)",
          zIndex: 10,
        }}
      >
        {/* Left: labels */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-micro" style={{ color: "var(--ink-3)" }}>
            Regeneration preview
          </span>
          <h2 className="text-h2" style={{ color: "var(--ink)" }}>
            {section.title}
          </h2>
          <p className="text-small" style={{ color: "var(--ink-3)" }}>
            {section.summary}
          </p>
        </div>

        {/* Right: counter + close + progress strip */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span
              className="font-mono-sm"
              style={{ fontSize: 12.5, color: "var(--ink-3)" }}
            >
              Section {currentIdx + 1} of {total}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-[120ms]"
              style={{ color: "var(--ink-3)" }}
              aria-label="Close"
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--surface-2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          </div>
          <ProgressStrip
            total={total}
            current={currentIdx}
            decisions={decisions}
            sectionIds={sectionIds}
          />
        </div>
      </div>

      {/* Body: 2-col diff */}
      <div
        className="grid gap-5 px-7 py-5"
        style={{
          gridTemplateColumns: "1fr 1fr",
          minHeight: 480,
        }}
      >
        <DiffColumn
          label={section.priorVersionLabel}
          items={section.prior.items}
        />
        <DiffColumn
          label={section.nextVersionLabel}
          items={section.next.items}
          regenDate={section.nextRegenDate}
          isNext
        />
      </div>

      {/* Footer */}
      <OverlayFooter>
        {/* Left: navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIdx === 0}
            className={cn(
              "flex items-center gap-1 text-sm px-3 py-1.5 rounded-md transition-colors duration-[120ms]",
              currentIdx === 0 && "opacity-40 cursor-not-allowed"
            )}
            style={{ color: "var(--ink-2)" }}
            onMouseEnter={(e) => {
              if (currentIdx > 0) {
                e.currentTarget.style.background = "rgba(20,18,12,0.04)";
                e.currentTarget.style.color = "var(--ink)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--ink-2)";
            }}
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
            Previous
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={currentIdx === total - 1}
            className={cn(
              "flex items-center gap-1 text-sm px-3 py-1.5 rounded-md transition-colors duration-[120ms]",
              currentIdx === total - 1 && "opacity-40 cursor-not-allowed"
            )}
            style={{ color: "var(--ink-2)" }}
            onMouseEnter={(e) => {
              if (currentIdx < total - 1) {
                e.currentTarget.style.background = "rgba(20,18,12,0.04)";
                e.currentTarget.style.color = "var(--ink)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--ink-2)";
            }}
          >
            Next
            <ChevronRight className="size-4" strokeWidth={2} />
          </button>
        </div>

        {/* Right: decisions */}
        <div className="flex items-center gap-2">
          {/* Skip */}
          <button
            type="button"
            onClick={() => { decide("skip"); goNext(); }}
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
            Skip for now
          </button>

          {/* Reject */}
          <button
            type="button"
            onClick={() => { decide("reject"); goNext(); }}
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
            Reject regen
          </button>

          {/* Accept / Commit */}
          {isLast ? (
            <button
              type="button"
              onClick={() => {
                const final = { ...decisions, [section.sectionId]: "accept" as Decision };
                onCommit(final);
              }}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors duration-[120ms]"
              style={{
                background: "var(--navy)",
                color: "#ffffff",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--navy-2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--navy)")
              }
            >
              Save as v{acceptedCount > 0 ? acceptedCount + 1 : 2}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { decide("accept"); goNext(); }}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors duration-[120ms]"
              style={{
                background: "var(--navy)",
                color: "#ffffff",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--navy-2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--navy)")
              }
            >
              Accept this section
            </button>
          )}
        </div>
      </OverlayFooter>
    </OverlayShell>
  );
}
