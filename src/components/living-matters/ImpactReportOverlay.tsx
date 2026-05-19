"use client";

import { ArrowRight, Check, X } from "lucide-react";
import OverlayShell, { OverlayFooter } from "./OverlayShell";
import type { ImpactReport, AffectedSectionImpact } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImpactReportOverlayProps {
  report: ImpactReport;
  onClose: () => void;
  onSkip: () => void;
  onShowChanges: () => void;
  onRegenerate: () => void;
}

// ─── ChangeChip ──────────────────────────────────────────────────────────────

type ChangeChipKind = "contradicts" | "adds" | "supports";

interface ChangeChipProps {
  kind: ChangeChipKind;
  count: number;
}

function ChangeChip({ kind, count }: ChangeChipProps) {
  const styles: Record<ChangeChipKind, { bg: string; color: string; label: string }> = {
    contradicts: { bg: "var(--brick-soft)",  color: "var(--brick)",  label: "contradicts" },
    adds:        { bg: "var(--navy-soft)",   color: "var(--navy)",   label: "adds" },
    supports:    { bg: "var(--sage-soft)",   color: "var(--sage)",   label: "supports" },
  };

  const s = styles[kind];

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 font-medium"
      style={{
        fontSize: 11,
        background: s.bg,
        color: s.color,
      }}
    >
      {count} {s.label}
    </span>
  );
}

// ─── AffectedSectionRow ───────────────────────────────────────────────────────

function AffectedSectionRow({ section }: { section: AffectedSectionImpact }) {
  return (
    <div
      className="rounded-lg p-3.5 border flex flex-col gap-2"
      style={{
        background: "var(--surface-2)",
        borderColor: "var(--rule)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="font-medium"
          style={{ fontSize: 14.5, color: "var(--ink)" }}
        >
          {section.title}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {section.contradicts > 0 && (
            <ChangeChip kind="contradicts" count={section.contradicts} />
          )}
          {section.adds > 0 && (
            <ChangeChip kind="adds" count={section.adds} />
          )}
          {section.supports > 0 && (
            <ChangeChip kind="supports" count={section.supports} />
          )}
        </div>
      </div>
      <p className="text-small leading-[1.55]" style={{ color: "var(--ink-2)" }}>
        {section.summary}
      </p>
    </div>
  );
}

// ─── ImpactReportOverlay ──────────────────────────────────────────────────────

export default function ImpactReportOverlay({
  report,
  onClose,
  onSkip,
  onShowChanges,
  onRegenerate,
}: ImpactReportOverlayProps) {
  const { newSource, againstVersion, affected, unchangedCount, resolved } = report;
  const nextVersionN = againstVersion.n + 1;

  return (
    <OverlayShell onClose={onClose} maxWidth={780}>
      {/* Header */}
      <div className="px-8 py-7 pb-5">
        {/* Micro label row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-micro" style={{ color: "var(--ink-3)" }}>
            Impact report &middot; v{againstVersion.n} &rarr; v{nextVersionN}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-[120ms]"
            style={{ color: "var(--ink-3)" }}
            aria-label="Close"
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>

        {/* h1 headline */}
        <h1 className="text-h1 mb-3" style={{ color: "var(--ink)" }}>
          {newSource.newChunks} new chunks indexed.
        </h1>

        {/* Body paragraph */}
        <p className="text-body" style={{ color: "var(--ink-2)", lineHeight: 1.55 }}>
          The detector found{" "}
          <strong className="font-semibold" style={{ color: "var(--ink)" }}>
            {affected.length} sections
          </strong>{" "}
          materially affected by{" "}
          <code
            className="font-mono-sm px-1 py-px rounded"
            style={{ background: "var(--surface-2)", color: "var(--ink-2)" }}
          >
            {newSource.label}
          </code>
          . {unchangedCount} section{unchangedCount !== 1 ? "s" : ""} show no
          material change.
        </p>
      </div>

      {/* Sections block */}
      <div className="px-8 pb-5 flex flex-col gap-4">
        {/* Affected sections */}
        {affected.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="text-micro" style={{ color: "var(--ink-3)" }}>
              Sections affected
            </span>
            <div className="flex flex-col gap-2">
              {affected.map((s) => (
                <AffectedSectionRow key={s.sectionId} section={s} />
              ))}
            </div>
          </div>
        )}

        {/* Resolved questions */}
        {resolved.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="text-micro" style={{ color: "var(--ink-3)" }}>
              Open questions potentially resolved
            </span>
            <div className="flex flex-col gap-2">
              {resolved.map((r, idx) => (
                <div
                  key={idx}
                  className="rounded-lg p-3 flex flex-col gap-1.5"
                  style={{
                    background: "var(--sage-soft)",
                    border: "1px solid var(--sage-soft-2)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Check
                      style={{ width: 13, height: 13, color: "var(--sage)", flexShrink: 0 }}
                      strokeWidth={2.2}
                    />
                    <span
                      className="font-medium"
                      style={{ fontSize: 13.5, color: "var(--sage)" }}
                    >
                      Resolution candidate
                    </span>
                  </div>
                  <p
                    className="italic"
                    style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)" }}
                  >
                    &ldquo;{r.question}&rdquo;
                  </p>
                  <p
                    style={{ fontSize: 12.5, color: "var(--ink-3)" }}
                  >
                    {r.resolvedBy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <OverlayFooter>
        {/* Left: skip */}
        <button
          type="button"
          onClick={onSkip}
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
          Don&rsquo;t regenerate &mdash; just keep indexed
        </button>

        {/* Right: show changes + regenerate */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShowChanges}
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
            Show me the changes
          </button>
          <button
            type="button"
            onClick={onRegenerate}
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
            Regenerate {affected.length} section{affected.length !== 1 ? "s" : ""}
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </button>
        </div>
      </OverlayFooter>
    </OverlayShell>
  );
}
