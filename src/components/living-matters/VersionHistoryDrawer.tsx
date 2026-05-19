"use client";

import SidePanel from "./SidePanel";
import type { BriefVersion, BriefVersionId, BriefSectionKind } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VersionHistoryDrawerProps {
  versions: BriefVersion[];
  viewingId: BriefVersionId;
  latestId: BriefVersionId;
  onClose: () => void;
  onJump: (versionId: BriefVersionId) => void;
  onRestoreAsCurrent: (versionId: BriefVersionId) => void;
}

// ─── Section label map ────────────────────────────────────────────────────────

const SECTION_LABEL: Partial<Record<BriefSectionKind, string>> = {
  snapshot:       "Matter Snapshot",
  parties:        "Parties & Roles",
  timeline:       "Timeline",
  claims:         "Claims",
  key_facts:      "Key Facts",
  risks:          "Risks",
  open_questions: "Open Questions",
  next_steps:     "Next Steps",
};

// ─── VersionHistoryDrawer ─────────────────────────────────────────────────────

export default function VersionHistoryDrawer({
  versions,
  viewingId,
  latestId,
  onClose,
  onJump,
  onRestoreAsCurrent,
}: VersionHistoryDrawerProps) {
  // Render in reverse order (newest first)
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <SidePanel
      title="Version history"
      subtitle="Each version is the brief at a moment in this matter's life."
      onClose={onClose}
    >
      <ol
        className="list-none p-0 m-0"
        aria-label="Brief version history"
      >
        {sorted.map((version, idx) => {
          const isLatest   = version.id === latestId;
          const isViewing  = version.id === viewingId;
          const isLastItem = idx === sorted.length - 1;

          const formattedDate = new Date(version.generatedAt).toLocaleDateString("en-US", {
            month: "short",
            day:   "numeric",
            year:  "numeric",
          });

          const sectionLabels = version.sectionsRegenerated
            .map((k) => SECTION_LABEL[k] ?? k)
            .filter(Boolean);

          return (
            <li key={version.id} className="relative pl-7 pb-[22px]">
              {/* Vertical rail */}
              {!isLastItem && (
                <div
                  className="absolute"
                  style={{
                    left: 7,
                    top: 22,
                    bottom: 0,
                    width: 1,
                    background: "var(--rule)",
                  }}
                  aria-hidden="true"
                />
              )}

              {/* Timeline dot */}
              <div
                className="absolute flex items-center justify-center rounded-full"
                style={{
                  left:       0,
                  top:        6,
                  width:      16,
                  height:     16,
                  background: isLatest ? "var(--navy)" : "var(--surface)",
                  border:     isLatest
                    ? "1.5px solid var(--navy)"
                    : "1.5px solid var(--rule-strong)",
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {isLatest && (
                  <span
                    className="rounded-full"
                    style={{
                      width:      6,
                      height:     6,
                      background: "#ffffff",
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col gap-1">
                {/* Row: version label + chips + date */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="font-mono-sm font-medium"
                      style={{
                        color: isLatest ? "var(--navy)" : "var(--ink)",
                      }}
                    >
                      v{version.versionNumber}
                    </span>

                    {isLatest && (
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--sage-soft)",
                          color:      "var(--sage)",
                          fontSize:   10.5,
                        }}
                      >
                        Current
                      </span>
                    )}

                    {isViewing && !isLatest && (
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--amber-soft)",
                          color:      "var(--amber)",
                          fontSize:   10.5,
                        }}
                      >
                        Viewing
                      </span>
                    )}
                  </div>

                  <span
                    className="font-mono-sm shrink-0"
                    style={{ fontSize: 11.5, color: "var(--ink-3)" }}
                  >
                    {formattedDate}
                  </span>
                </div>

                {/* Trigger summary */}
                {version.triggerSummary && (
                  <p
                    style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}
                  >
                    {version.triggerSummary}
                  </p>
                )}

                {/* Sections regenerated */}
                {sectionLabels.length > 0 && (
                  <p
                    className="text-small mt-0.5"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Regenerated: {sectionLabels.join(" · ")}
                  </p>
                )}

                {/* Actions for non-latest versions */}
                {!isLatest && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => onJump(version.id)}
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
                      View v{version.versionNumber}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRestoreAsCurrent(version.id)}
                      className="text-sm px-3 py-1.5 rounded-md transition-colors duration-[120ms]"
                      style={{ color: "var(--ink-3)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(20,18,12,0.04)";
                        e.currentTarget.style.color = "var(--ink)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--ink-3)";
                      }}
                    >
                      Restore as current
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </SidePanel>
  );
}
