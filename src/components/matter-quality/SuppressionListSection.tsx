"use client";

import { useState } from "react";
import { MQSection } from "./MQSection";
import type { MatterQuality, SuppressedClaim } from "./types";

export function SuppressionListSection({
  q,
  onOpenCite,
}: {
  q: MatterQuality;
  onOpenCite?: (chunkId: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <MQSection
      label="Re-grounding suppression"
      subtitle={
        q.suppressed.length === 0 ? (
          <span>
            No claims were dropped during this brief&apos;s generation. The pipeline
            produced output it could ground.
          </span>
        ) : (
          <span>
            {q.suppressed.length} claims dropped before they reached the brief.
            Read-only · the model&apos;s first drafts.
          </span>
        )
      }
    >
      {q.suppressed.length > 0 && (
        <div style={{ padding: "4px 24px 4px" }}>
          {q.suppressed.map((s) => (
            <SuppressedRow
              key={s.id}
              s={s}
              expanded={activeId === s.id}
              onToggle={() => setActiveId(activeId === s.id ? null : s.id)}
              onOpenCite={onOpenCite}
            />
          ))}
        </div>
      )}
    </MQSection>
  );
}

function SuppressedRow({
  s,
  expanded,
  onToggle,
  onOpenCite,
}: {
  s: SuppressedClaim;
  expanded: boolean;
  onToggle: () => void;
  onOpenCite?: (chunkId: string) => void;
}) {
  return (
    <div className="mq-suppressed">
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%", textAlign: "left", padding: "12px 0",
          background: "transparent", display: "flex", alignItems: "flex-start", gap: 12,
        }}
      >
        <span className="mq-strike" style={{ flex: 1, minWidth: 0 }}>
          &ldquo;{s.text}&rdquo;
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
          <span className="text-micro" style={{ fontSize: 10, color: "var(--ink-4)" }}>
            did not survive re-grounding
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {s.attemptedCites.map((c, i) => (
              <span key={c} className="fn-chip fn-muted">
                {i + 1}
              </span>
            ))}
          </div>
        </div>
      </button>
      {expanded && (
        <div
          style={{
            padding: "10px 14px 14px",
            background: "var(--surface-2)",
            border: "1px solid var(--rule)",
            borderRadius: 6,
            marginBottom: 8,
          }}
        >
          <div className="text-micro" style={{ marginBottom: 8, color: "var(--ink-3)" }}>
            {s.sectionKind} · dropped {s.droppedAt}
          </div>
          {s.reason ? (
            <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
              The cited paragraph couldn&apos;t ground this claim — {s.reason}.
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.55, fontStyle: "italic" }}>
              The pipeline did not produce a one-line reason for this drop.
            </div>
          )}
          {onOpenCite && s.attemptedCites.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {s.attemptedCites.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onOpenCite(c)}
                  style={{
                    padding: "4px 10px", borderRadius: 4,
                    border: "1px solid var(--rule-strong)",
                    background: "var(--surface)", fontSize: 12,
                    color: "var(--ink-2)", cursor: "pointer",
                  }}
                >
                  Open [{i + 1}]
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
