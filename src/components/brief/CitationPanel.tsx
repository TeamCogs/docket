"use client";

import { useEffect } from "react";
import { useCitationPanel } from "./citation-panel-store";
import { cn } from "@/lib/utils";

/**
 * The source viewer surface. On desktop, this renders as a right-hand
 * sidebar that slides in when a footnote is clicked. On mobile, it
 * becomes a bottom-sheet — sidebars die on mobile.
 *
 * The contents (the cited paragraph in context) come from an IPC call to
 * `get_source_span`. For scaffolding we display a placeholder so the
 * layout can be validated before the source pipeline lands.
 */
export default function CitationPanel() {
  const { citation, isOpen, close } = useCitationPanel();

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!isOpen || !citation) return null;

  return (
    <>
      {/* mobile backdrop */}
      <div
        className="fixed inset-0 bg-ink-900/30 z-30 lg:hidden"
        onClick={close}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed z-40 bg-white border-ink-200 shadow-xl",
          // mobile: bottom sheet
          "inset-x-0 bottom-0 rounded-t-2xl border-t max-h-[75vh] overflow-y-auto",
          // desktop: right sidebar
          "lg:inset-y-0 lg:right-0 lg:bottom-auto lg:rounded-none lg:border-l lg:border-t-0 lg:max-h-none lg:w-[420px] xl:w-[480px]",
        )}
      >
        <header className="sticky top-0 bg-white/95 backdrop-blur px-4 py-3 border-b border-ink-100 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs uppercase tracking-wider font-medium text-ink-500">
              Source
            </div>
            <div className="text-sm font-medium text-ink-900">
              {citation.chunkIds[0]?.split("#")[0] ?? "—"}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-1 rounded-md hover:bg-ink-100 text-ink-600"
            aria-label="Close source"
          >
            ✕
          </button>
        </header>
        <div className="px-4 py-4 space-y-3">
          <div className="text-xs text-ink-500 flex items-center gap-2">
            <span
              className={cn(
                "chip",
                citation.grounded === "grounded" && "chip-grounded",
                citation.grounded === "partial" && "chip-flag",
              )}
            >
              {citation.grounded === "grounded" ? "Grounded" : "Partially supported"}
            </span>
            <span>· Method: {citation.groundingMethod}</span>
          </div>
          <div className="rounded-md border border-ink-200 bg-ink-50 p-3 font-serif text-sm text-ink-800 leading-relaxed">
            {/* TODO[scott]: fetch via IPC get_source_span(chunk_id). Until then,
                this is the part of the UI that needs polish during week 2. */}
            <em className="text-ink-400 not-italic">
              The cited paragraph will render here, with the supporting sentence
              highlighted. Click "Open in document" to jump to the page.
            </em>
          </div>
          <button
            type="button"
            className="text-xs text-navy-600 hover:text-navy-800 underline underline-offset-2"
          >
            Open in document →
          </button>
        </div>
      </aside>
    </>
  );
}
