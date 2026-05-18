"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCitationPanel } from "./citation-panel-store";

const GROUNDING_LABEL = {
  grounded: "Grounded",
  partial:  "Partially supported",
  unsupported: "Unsupported",
} as const;

export default function CitationPanel() {
  const { citation, close } = useCitationPanel();
  const [chunkIndex, setChunkIndex] = useState(0);
  const [isNarrow, setIsNarrow] = useState(false);

  // Determine side vs drawer based on viewport.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const update = (e: MediaQueryList | MediaQueryListEvent) => setIsNarrow(e.matches);
    update(mq);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Reset chunk index when a new citation is opened.
  useEffect(() => { setChunkIndex(0); }, [citation?.id]);

  // j / k / Escape keyboard navigation.
  useEffect(() => {
    if (!citation) return;
    function handler(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      const total = citation!.chunkIds.length;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setChunkIndex((i) => Math.min(i + 1, total - 1));
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setChunkIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [citation, close]);

  if (!citation) return null;

  const chunkId   = citation.chunkIds[chunkIndex] ?? citation.chunkIds[0];
  const total     = citation.chunkIds.length;
  const docId     = chunkId?.split("#")[0] ?? "";
  const docLabel  = docId.split(/[-_]/).slice(-1)[0] ?? docId;
  const chunkNum  = chunkIndex + 1;
  const anchor    = chunkId ?? "";

  const mode: "side" | "drawer" = isNarrow ? "drawer" : "side";

  return (
    <>
      {/* Mobile backdrop */}
      {mode === "drawer" && (
        <div
          className="fixed inset-0 bg-ink/20 z-[55]"
          onClick={close}
          aria-hidden
        />
      )}

      <aside
        aria-label="Source panel"
        className={cn(
          "bg-surface overflow-hidden",
          mode === "side"
            ? "sticky top-20 self-start max-h-[calc(100vh-120px)] overflow-y-auto " +
              "border border-rule rounded-[10px] animate-slide-right"
            : "fixed inset-x-0 bottom-0 h-[60vh] z-[60] overflow-y-auto " +
              "border-t border-rule-strong animate-slide-up",
          mode === "drawer" && "shadow-3",
        )}
      >
        {/* Mobile drag handle */}
        {mode === "drawer" && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-8 h-1 rounded-full bg-ink-4" />
          </div>
        )}

        {/* Sticky header */}
        <div className="sticky top-0 z-[2] flex items-center justify-between
                        px-4 py-3 border-b border-rule bg-surface-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-navy-soft text-navy font-mono-sm text-[11px]">
              [{chunkNum}]
            </span>
            <span className="text-micro">Source</span>
          </div>
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={() => setChunkIndex((i) => Math.max(i - 1, 0))}
              disabled={chunkIndex === 0}
              title="Previous source (k)"
              className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-surface-3
                         disabled:opacity-30 disabled:cursor-default transition-colors duration-[120ms]"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChunkIndex((i) => Math.min(i + 1, total - 1))}
              disabled={chunkIndex === total - 1}
              title="Next source (j)"
              className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-surface-3
                         disabled:opacity-30 disabled:cursor-default transition-colors duration-[120ms]"
            >
              <ChevronRight className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={close}
              title="Close (Esc)"
              className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-surface-3
                         transition-colors duration-[120ms]"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {/* Source metadata */}
          <div className="flex items-center gap-3 mb-2">
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
              citation.grounded === "grounded"
                ? "bg-sage-soft text-sage"
                : "bg-amber-soft text-amber",
            )}>
              {GROUNDING_LABEL[citation.grounded]}
            </span>
            <span className="font-mono-sm text-ink-3 capitalize">
              {citation.groundingMethod.replace("_", " ")}
            </span>
          </div>
          <h3 className="text-h3 m-0 leading-tight">
            {docLabel || "Source document"}
          </h3>
          <div className="text-small mt-1 text-ink-3 font-mono-sm truncate">
            {docId}
          </div>

          <div className="h-px bg-rule my-5" />

          {/* Cited paragraph */}
          <div className="text-micro mb-2">
            Cited paragraph · <span className="font-mono-sm">{anchor}</span>
          </div>
          <div className="relative p-4 rounded-md border border-rule bg-[#fefdf8]
                          font-serif text-[15.5px] leading-[1.65] text-ink">
            {/* 3px left navy rail — absolute so corner radii of parent are preserved */}
            <span className="absolute left-[-1px] top-[-1px] bottom-[-1px] w-[3px]
                             bg-navy rounded-l-sm" />
            <em className="not-italic text-ink-3 text-sm">
              The cited paragraph will appear here once{" "}
              <span className="font-mono-sm">get_source_span</span> is wired to
              the Tauri IPC layer.
            </em>
          </div>

          {/* Document context preview */}
          <div className="mt-4">
            <div className="text-micro mb-2">Document context</div>
            <div className="border border-rule rounded-md p-3.5 bg-surface-2
                            font-serif text-[13px] leading-[1.55] text-ink-3
                            max-h-[260px] overflow-y-auto">
              <p className="m-0 mb-2.5">
                … preceding context elided. Full source at{" "}
                <span className="font-mono-sm text-[11px]">{docId}</span>.
              </p>
              <p className="m-0 text-ink font-medium px-3 py-2.5 bg-[#fefdf8] rounded-sm italic">
                [Cited paragraph — loaded from IPC]
              </p>
              <p className="m-0 mt-2.5">
                Following context elided. Press{" "}
                <kbd className="font-mono-sm">⌘O</kbd> to open in system viewer.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rule-strong
                         bg-surface text-sm text-ink hover:bg-surface-2 transition-colors duration-[120ms]"
            >
              <Eye className="size-3.5" />
              Open in source viewer
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-md text-sm text-ink-2
                         hover:text-ink hover:bg-[rgba(20,18,12,0.04)] transition-colors duration-[120ms]"
            >
              Copy citation
            </button>
          </div>

          {/* Keyboard hints — hidden in drawer mode */}
          {mode === "side" && (
            <div className="flex gap-3 mt-4 pt-3.5 border-t border-rule text-[11.5px] text-ink-3">
              <span>
                <span className="font-mono-sm">[{chunkNum}]</span> of {total}
              </span>
              <span>·</span>
              <span>
                <kbd className="font-mono-sm">j</kbd> next ·{" "}
                <kbd className="font-mono-sm">k</kbd> previous ·{" "}
                <kbd className="font-mono-sm">esc</kbd> close
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
