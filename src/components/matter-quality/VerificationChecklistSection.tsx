"use client";

import { MQSection } from "./MQSection";
import { ProgressTrack } from "./ProgressTrack";
import type { MatterQuality } from "./types";

export function VerificationChecklistSection({
  q,
  onJump,
}: {
  q: MatterQuality;
  onJump?: (sectionId: string) => void;
}) {
  const allReviewed = q.totalReviewed === q.total && q.total > 0;

  return (
    <MQSection
      label="Verification checklist"
      subtitle={
        allReviewed ? (
          <span>
            All {q.total} claims have been reviewed. The brief is ready to ship
            at your discretion.
          </span>
        ) : (
          <span>
            {q.totalReviewed} of {q.total} claims reviewed
            {q.carryForward && q.carryForward.carried > 0 && (
              <> · {q.carryForward.carried} carried forward from {q.carryForward.fromVersion}</>
            )}
            .
          </span>
        )
      }
    >
      <div style={{ padding: "4px 24px 4px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {q.sectionsOrdered.map((s) => (
            <button
              key={s.sectionId}
              type="button"
              onClick={() => onJump?.(s.sectionId)}
              className="mq-row"
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{s.sectionKind}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--ink-3)" }}>
                  {s.reviewed} of {s.total} reviewed
                </div>
              </div>
              <ProgressTrack value={s.total === 0 ? 0 : s.reviewed / s.total} />
            </button>
          ))}
        </div>
        <div style={{ padding: "8px 12px 4px", color: "var(--ink-3)", fontSize: 11.5, lineHeight: 1.55 }}>
          Marking a claim reviewed records that you clicked through to its source
          span. Docket does not grade your review.
        </div>
      </div>
    </MQSection>
  );
}
