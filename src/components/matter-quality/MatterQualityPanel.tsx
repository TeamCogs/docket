"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { CitationDensitySection } from "./CitationDensitySection";
import { SuppressionListSection } from "./SuppressionListSection";
import { DocumentCoverageSection } from "./DocumentCoverageSection";
import { VerificationChecklistSection } from "./VerificationChecklistSection";
import { useReviewedClaims } from "./ReviewedClaimsContext";
import type { MatterQuality } from "./types";

const MOCK_QUALITY: MatterQuality = {
  matterId: "",
  versionId: "v1",
  total: 0,
  totalSingle: 0,
  totalMulti: 0,
  totalReviewed: 0,
  sectionsOrdered: [],
  suppressed: [],
  coverage: { totalIngested: 0, citedCount: 0, uncitedCount: 0, uncited: [] },
  carryForward: null,
};

export function MatterQualityPanel({
  matterId,
  open,
  onClose,
  onJumpToSection,
  onOpenCite,
  quality,
}: {
  matterId: string;
  open: boolean;
  onClose: () => void;
  onJumpToSection?: (sectionId: string) => void;
  onOpenCite?: (chunkId: string) => void;
  quality?: MatterQuality;
}) {
  const { reviewed } = useReviewedClaims();
  const q = quality ?? MOCK_QUALITY;

  // Recompute reviewed count against current reviewed set
  const liveQ = useMemo<MatterQuality>(() => {
    if (!quality) return q;
    const totalReviewed = q.sectionsOrdered.reduce((acc, s) => acc + s.reviewed, 0);
    return { ...q, totalReviewed };
  }, [q, reviewed]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(20,18,12,0.18)",
        zIndex: 70,
        animation: "docket-fade-in 200ms ease",
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute", top: 0, bottom: 0, right: 0,
          width: "min(560px, 100%)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--rule-strong)",
          boxShadow: "var(--shadow-3)",
          display: "flex", flexDirection: "column",
          animation: "docket-slide-right 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {/* Panel header */}
        <div
          style={{
            padding: "18px 24px 14px",
            borderBottom: "1px solid var(--rule)",
            background: "var(--surface-2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="text-micro">Quality · this brief</div>
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: 6,
                background: "transparent", border: "none",
                color: "var(--ink-3)", cursor: "pointer",
                transition: "background 120ms",
              }}
            >
              <X size={14} />
            </button>
          </div>
          <h2 className="text-h3" style={{ margin: "6px 0 0" }}>{matterId}</h2>
          <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12.5, color: "var(--ink-3)" }}>
            <span className="font-mono-sm">brief {liveQ.versionId}</span>
            <span>·</span>
            <span>{liveQ.total} claims</span>
            <span>·</span>
            <span>{liveQ.totalReviewed} of {liveQ.total} reviewed</span>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 32px" }}>
          {liveQ.total === 0 ? (
            <div style={{ padding: "32px 24px", color: "var(--ink-3)", fontSize: 14, lineHeight: 1.6 }}>
              No brief generated yet. Run the brief pipeline and return here to
              see citation density, suppression details, and document coverage.
            </div>
          ) : (
            <>
              <CitationDensitySection q={liveQ} onJump={onJumpToSection} />
              <SuppressionListSection q={liveQ} onOpenCite={onOpenCite} />
              <DocumentCoverageSection q={liveQ} />
              <VerificationChecklistSection q={liveQ} onJump={onJumpToSection} />
            </>
          )}

          {/* Quiet footer */}
          <div
            style={{
              margin: "20px 24px 0",
              padding: "12px 14px",
              border: "1px dashed var(--rule)",
              borderRadius: 6,
              fontSize: 12, lineHeight: 1.55,
              color: "var(--ink-3)",
            }}
          >
            Counts are local to this matter. Nothing on this panel is aggregated
            across matters and nothing leaves the device. The engine-level
            benchmark numbers live in{" "}
            <span className="font-mono-sm">docs/evals/</span> on the GitHub
            repo — separate audience, separate purpose.
          </div>
        </div>
      </aside>
    </div>
  );
}
