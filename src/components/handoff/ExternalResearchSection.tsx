"use client";

import { ArrowDownToLine } from "lucide-react";
import type { ExternalResearch } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExternalResearchSectionProps {
  findings: ExternalResearch[];
  onBringFindingsBack: () => void;
}

// ─── ExternalResearchSection ──────────────────────────────────────────────────

export default function ExternalResearchSection({
  findings,
  onBringFindingsBack,
}: ExternalResearchSectionProps) {
  return (
    <section className="mb-14 scroll-mt-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-h2 m-0"
          style={{ color: "var(--ink)" }}
        >
          <span
            className="font-mono-sm font-normal mr-3"
            style={{ color: "var(--ink-4)" }}
          >
            09
          </span>
          External Research
        </h2>
        <button
          type="button"
          onClick={onBringFindingsBack}
          className={cn(
            "inline-flex items-center gap-1.5",
            "bg-[var(--surface)] text-[var(--ink)] border border-[var(--rule-strong)]",
            "px-2.5 py-1 rounded-md text-[13px] font-medium",
            "hover:bg-[var(--surface-2)] transition-colors duration-[120ms]",
          )}
        >
          <ArrowDownToLine size={14} />
          Bring findings back
        </button>
      </div>

      {/* Intro paragraph */}
      <p
        className="text-small italic leading-[1.55] mb-5"
        style={{ color: "var(--ink-3)" }}
      >
        Findings imported from cloud-tool research. Cited authorities are verified before they
        land here. External Research is an appendix — it does not feed into brief retrieval or
        Ask Anything.
      </p>

      {/* Findings */}
      {findings.length === 0 ? (
        <p
          className="text-small italic"
          style={{ color: "var(--ink-4)" }}
        >
          No external research has been imported for this matter.
        </p>
      ) : (
        findings.map((finding) => (
          <article
            key={finding.id}
            className="mb-6 p-5 rounded-lg border"
            style={{
              background: "var(--surface)",
              borderColor: "var(--rule)",
            }}
          >
            {/* Meta row */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {/* Source chip */}
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--navy-soft)",
                  color: "var(--navy)",
                }}
              >
                External · {finding.source}
              </span>

              {/* Imported-at timestamp */}
              <span
                className="font-mono-sm text-[11.5px]"
                style={{ color: "var(--ink-4)" }}
              >
                {finding.importedAt}
              </span>

              {/* Brief version chip — right-aligned */}
              <span className="flex-1" />
              <span
                className="text-[11px] px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--surface-3)",
                  color: "var(--ink-3)",
                }}
              >
                under v{finding.briefVersionId}
              </span>
            </div>

            {/* Title */}
            <h3
              className="font-medium text-[16px] mb-2 mt-0"
              style={{ color: "var(--ink)" }}
            >
              {finding.title}
            </h3>

            {/* Body prose */}
            <div
              className="prose-brief text-[15px]"
              style={{ color: "var(--ink)" }}
            >
              {finding.body}
            </div>

            {/* Verified authorities */}
            <div
              className="mt-3 pt-3 border-t"
              style={{ borderColor: "var(--rule)" }}
            >
              <div className="text-micro mb-2" style={{ color: "var(--ink-3)" }}>
                Verified authorities
              </div>
              <div className="flex flex-col gap-1">
                {finding.verifiedCitations.length === 0 ? (
                  <span
                    className="text-small italic"
                    style={{ color: "var(--ink-4)" }}
                  >
                    No citations recorded.
                  </span>
                ) : (
                  finding.verifiedCitations.map((vc, i) => (
                    <div key={i} className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-mono-sm text-[12px] italic"
                        style={{ color: "var(--ink-2)" }}
                      >
                        {vc.text}
                      </span>
                      {vc.verifiedVia ? (
                        <span
                          className="text-[11.5px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: "var(--sage-soft)",
                            color: "var(--sage)",
                          }}
                        >
                          Verified via {vc.verifiedVia}
                        </span>
                      ) : (
                        <span
                          className="text-[11.5px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: "var(--amber-soft)",
                            color: "var(--amber)",
                          }}
                        >
                          unverified
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
