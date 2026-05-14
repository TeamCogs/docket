"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The drag-folder-here primary CTA. On Tauri this triggers the
 * `ingest_folder` IPC command. In browser dev it falls back to a file
 * picker. Both paths funnel into the same ingest pipeline server-side.
 */
export default function DropZone() {
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        // TODO[scott]: wire to the ingest IPC. For scaffolding we no-op so
        // the empty-state UI can be reviewed first.
      }}
      className={cn(
        "card relative border-dashed border-2 px-6 py-10 sm:py-14 text-center transition-colors",
        drag ? "border-navy-400 bg-navy-50/40" : "border-ink-200 bg-white",
      )}
    >
      <div className="space-y-3">
        <div className="mx-auto h-10 w-10 rounded-md bg-navy-100 text-navy-600 grid place-items-center">
          <FolderIcon />
        </div>
        <div className="text-base sm:text-lg font-medium text-ink-800">
          Drop a folder of client documents
        </div>
        <p className="text-sm text-ink-500 max-w-prose mx-auto">
          PDF, DOCX, TXT, EML. Scanned PDFs are OCR'd on-device. Nothing is
          uploaded.
        </p>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-navy-700 hover:bg-navy-800 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          Or choose a folder
        </button>
      </div>
    </div>
  );
}

function FolderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M2 6a2 2 0 0 1 2-2h3.6a2 2 0 0 1 1.4.6L10.6 6H16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" />
    </svg>
  );
}
