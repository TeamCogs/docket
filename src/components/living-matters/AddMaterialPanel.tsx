"use client";

import { useState } from "react";
import { FileText, ArrowRight } from "lucide-react";
import SidePanel, { SidePanelFooter } from "./SidePanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddMaterialPanelProps {
  onClose: () => void;
  onIngest: (notes: string) => void;
  sourceLabel: string;
  sourceDetected: string;
  sourcePreview: string;
}

// ─── AddMaterialPanel ─────────────────────────────────────────────────────────

export default function AddMaterialPanel({
  onClose,
  onIngest,
  sourceLabel,
  sourceDetected,
  sourcePreview,
}: AddMaterialPanelProps) {
  const [notes, setNotes] = useState("");

  return (
    <SidePanel
      title="Add source to matter"
      subtitle="This document will be indexed locally and compared against your brief."
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        {/* Source preview card */}
        <div
          className="rounded-lg p-4 border flex flex-col gap-3"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--rule)",
          }}
        >
          {/* File row */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-md flex-shrink-0"
              style={{
                width: 32,
                height: 32,
                background: "var(--navy-soft)",
              }}
            >
              <FileText
                style={{ width: 15, height: 15, color: "var(--navy)" }}
                strokeWidth={1.8}
              />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className="font-medium truncate"
                style={{ fontSize: 14, color: "var(--ink)" }}
              >
                {sourceLabel}
              </span>
              <span
                className="font-mono-sm"
                style={{ fontSize: 11.5, color: "var(--ink-3)" }}
              >
                {sourceDetected}
              </span>
            </div>
          </div>

          {/* Preview block */}
          <div
            className="rounded p-2.5 italic border"
            style={{
              background: "#fefdf8",
              borderColor: "var(--rule)",
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "var(--ink-2)",
            }}
          >
            {sourcePreview}
          </div>
        </div>

        {/* Notes textarea */}
        <div className="flex flex-col gap-1.5">
          <label
            className="text-micro"
            htmlFor="add-material-notes"
            style={{ color: "var(--ink-3)" }}
          >
            Notes (optional)
          </label>
          <textarea
            id="add-material-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any context about this source…"
            className="w-full rounded-md border px-3 py-2 text-[13.5px] leading-[1.55] transition-colors duration-[120ms]"
            style={{
              borderColor: "var(--rule)",
              background: "var(--surface)",
              color: "var(--ink)",
              resize: "vertical",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--navy-soft-2)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--rule)")}
          />
        </div>

        {/* What happens next */}
        <div className="flex flex-col gap-2">
          <span className="text-micro" style={{ color: "var(--ink-3)" }}>
            What happens next
          </span>
          <ol
            className="flex flex-col gap-1.5 list-decimal list-inside"
            style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)" }}
          >
            <li>
              The Rust core extracts and chunks the document locally — zero bytes leave your machine.
            </li>
            <li>
              The impact detector compares new chunks against your existing brief sections.
            </li>
            <li>
              You review an Impact Report and choose which sections to regenerate.
            </li>
          </ol>
        </div>
      </div>

      <SidePanelFooter>
        <button
          type="button"
          onClick={onClose}
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
          Cancel
        </button>

        <button
          type="button"
          onClick={() => onIngest(notes)}
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
          Ingest and detect changes
          <ArrowRight className="size-3.5" strokeWidth={2} />
        </button>
      </SidePanelFooter>
    </SidePanel>
  );
}
