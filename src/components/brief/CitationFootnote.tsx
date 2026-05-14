"use client";

import { useCitationPanel } from "./citation-panel-store";
import type { Citation } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Footnote marker rendered inline next to every claim. Clicking opens the
 * citation panel on desktop, or slides up a bottom sheet on mobile.
 *
 * Visual codes:
 *   • grounded → navy underline, neutral
 *   • partial → amber underline, "soft" treatment
 *   • unsupported → never rendered (claim is dropped before this component sees it)
 */
export default function CitationFootnote({
  citation,
  index,
}: {
  citation: Citation;
  index: number;
}) {
  const open = useCitationPanel((s) => s.open);
  return (
    <button
      type="button"
      onClick={() => open(citation)}
      className={cn(
        "footnote-link align-super text-[0.7em] ml-0.5",
        citation.grounded === "partial" && "text-amber-600 decoration-amber-300",
      )}
      aria-label={`Citation ${index}`}
    >
      [{index}]
    </button>
  );
}
