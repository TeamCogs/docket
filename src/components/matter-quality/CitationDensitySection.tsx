"use client";

import { MQSection } from "./MQSection";
import { StackedDensityBar } from "./StackedDensityBar";
import type { MatterQuality } from "./types";

export function CitationDensitySection({
  q,
  onJump,
}: {
  q: MatterQuality;
  onJump?: (sectionId: string) => void;
}) {
  return (
    <MQSection
      label="Citation density"
      subtitle={
        <span>
          {q.total} claims cited ·{" "}
          <span style={{ color: "var(--ink-2)" }}>{q.totalMulti}</span> to two or more sources ·{" "}
          <span style={{ color: "var(--ink-2)" }}>{q.totalSingle}</span> single-source
        </span>
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
                  {s.total} {s.total === 1 ? "claim" : "claims"} ·{" "}
                  <span style={{ color: "var(--ink-2)" }}>{s.multi}</span> multi-source ·{" "}
                  <span style={{ color: "var(--ink-2)" }}>{s.single}</span> single-source
                </div>
              </div>
              <StackedDensityBar single={s.single} multi={s.multi} />
            </button>
          ))}
        </div>
        <div style={{ padding: "8px 12px 4px", color: "var(--ink-3)", fontSize: 11.5, lineHeight: 1.55 }}>
          Single-source isn&apos;t low confidence — it&apos;s normal in law. Treat as a read-through pass.
        </div>
      </div>
    </MQSection>
  );
}
