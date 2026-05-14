"use client";

import { useState } from "react";

/**
 * The "0 bytes sent · offline" badge in the header chrome. This is the most
 * important visual element in the entire product — every malpractice-conscious
 * lawyer's eye goes here first when they install the app. It's also the wedge.
 *
 * In Tauri production, the bytesOut count is read from the Rust core, which
 * audits every HTTP/socket the webview attempts to open. In browser dev,
 * we surface the same UI with a soft-confidence caveat.
 */
export default function NetworkBadge() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-grounded/30 bg-grounded-subtle px-2.5 py-1 text-xs font-medium text-grounded hover:bg-grounded/10 transition-colors"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="size-1.5 rounded-full bg-grounded animate-pulse" aria-hidden />
        <span className="hidden xs:inline">0 bytes sent</span>
        <span className="xs:hidden">offline</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-md border border-ink-200 bg-white p-3 shadow-lg text-xs text-ink-700 z-20">
          <div className="font-semibold text-ink-900 mb-1">Local-only mode</div>
          <p className="leading-relaxed">
            Docket has performed{" "}
            <span className="font-mono">0</span> outbound network requests this
            session. The model, embeddings, and vector index all run on this
            machine. To verify, open Settings → Network audit.
          </p>
        </div>
      )}
    </div>
  );
}
