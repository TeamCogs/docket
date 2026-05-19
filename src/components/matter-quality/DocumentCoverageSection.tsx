"use client";

import { FileText, Mail } from "lucide-react";
import { MQSection } from "./MQSection";
import type { MatterQuality, UncitedDoc } from "./types";

export function DocumentCoverageSection({ q }: { q: MatterQuality }) {
  const c = q.coverage;
  return (
    <MQSection
      label="Document coverage"
      subtitle={
        <span>
          {c.citedCount} of {c.totalIngested} ingested documents appear in the brief.{" "}
          {c.uncitedCount === 0
            ? "Every ingested document is referenced in the brief."
            : `${c.uncitedCount} uncited.`}
        </span>
      }
    >
      {c.uncited.length > 0 && (
        <div style={{ padding: "4px 24px 4px" }}>
          <div className="text-micro" style={{ marginBottom: 8, color: "var(--ink-3)" }}>
            Uncited — {c.uncitedCount} total · showing {c.uncited.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {c.uncited.map((d) => (
              <UncitedDocRow key={d.id} doc={d} />
            ))}
          </div>
          <div style={{ padding: "12px 0 4px", color: "var(--ink-3)", fontSize: 11.5, lineHeight: 1.55 }}>
            An uncited document might be irrelevant background — or the surprise
            you wanted to know about. Docket doesn&apos;t infer which.
          </div>
        </div>
      )}
    </MQSection>
  );
}

function UncitedDocRow({ doc }: { doc: UncitedDoc }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "10px 12px",
        background: "var(--surface-2)",
        border: "1px solid var(--rule)",
        borderRadius: 6,
      }}
    >
      <div className="mq-doc-thumb" aria-hidden>
        {doc.kind === "email" ? <Mail size={14} /> : <FileText size={14} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{doc.filename}</div>
        <div style={{ marginTop: 4, fontSize: 11.5, color: "var(--ink-3)" }}>
          <span className="font-mono-sm">{doc.sourceType}</span> · {doc.pageCount}{" "}
          {doc.pageCount === 1 ? "page" : "pages"} · ingested {doc.ingestedAt}
        </div>
        {doc.summary && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5, fontStyle: "italic" }}>
            {doc.summary}
          </div>
        )}
      </div>
    </div>
  );
}
