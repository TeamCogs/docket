"use client";

import { AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCitationPanel } from "./citation-panel-store";
import type { Citation } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────
// These will move to lib/types.ts once the pipeline exposes them on the section
// payload. For now they live here so ContradictionsPanel is self-contained.

export interface ContradictionSide {
  label:  string;   // role label, not author name — e.g. "Public statement"
  date:   string;   // ISO date rendered in mono
  source: string;   // human-readable source name / file anchor
  text:   string;   // direct quote, renderer adds the quotation marks
  cite:   string;   // chunk_id — wrapped into a minimal Citation below
}

export interface Contradiction {
  id:        string;
  headline:  string;
  a:         ContradictionSide;
  b:         ContradictionSide;
  note?:     string;
  noteCite?: string;   // chunk_id for the bridging note
}

// Wrap a raw chunk_id into a minimal Citation so FootnoteChip / the panel store
// can handle it without knowing about ContradictionsPanel internals.
function wrapChunkId(chunkId: string): Citation {
  return {
    id:              chunkId,
    chunkIds:        [chunkId],
    grounded:        "grounded",
    groundingMethod: "overlap",
    internalScore:   1,
  };
}

// ─── Container ────────────────────────────────────────────────────────────────

export default function ContradictionsPanel({
  contradictions,
}: {
  contradictions: Contradiction[];
}) {
  if (contradictions.length === 0) return null;

  return (
    <div className="mb-6 bg-surface border border-brick-soft-2 rounded-[10px] overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-3
                         bg-brick-soft border-b border-brick-soft-2">
        <AlertOctagon className="size-4 text-brick shrink-0" strokeWidth={2.2} />
        <span className="font-medium text-brick text-sm">
          {contradictions.length} contradiction{contradictions.length !== 1 ? "s" : ""} across documents
        </span>
        <span className="text-small text-brick/70 ml-auto">
          Surfaced by the re-grounding pass
        </span>
      </header>

      <div className="p-1">
        {contradictions.map((c, i) => (
          <ContradictionRow key={c.id} contradiction={c} index={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Single contradiction ─────────────────────────────────────────────────────

function ContradictionRow({
  contradiction: c,
  index,
}: {
  contradiction: Contradiction;
  index: number;
}) {
  const openCitation = useCitationPanel((s) => s.open);

  return (
    <div
      className={cn(
        "p-4 rounded-md",
        index > 0 && "border-t border-rule",
      )}
    >
      {/* Headline */}
      <div className="flex items-center gap-2 mb-3">
        <span className="size-[18px] rounded-sm bg-brick text-white
                         grid place-items-center text-[11px] font-medium tabular-nums shrink-0">
          {index + 1}
        </span>
        <span className="font-medium text-[14.5px] text-ink">{c.headline}</span>
      </div>

      {/* Diff — 3-col grid: side A · vs · side B */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
        <DiffSide side={c.a} onCite={() => openCitation(wrapChunkId(c.a.cite))} />
        <div className="grid place-items-center text-brick font-serif italic text-lg px-1">
          vs.
        </div>
        <DiffSide side={c.b} onCite={() => openCitation(wrapChunkId(c.b.cite))} />
      </div>

      {/* Optional note */}
      {c.note && (
        <div className="text-small mt-3 pl-3.5 border-l-2 border-rule text-ink-2 leading-[1.55]">
          {c.note}
          {c.noteCite && (
            <ChipInline
              chunkId={c.noteCite}
              onCite={() => openCitation(wrapChunkId(c.noteCite!))}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Diff side ────────────────────────────────────────────────────────────────

function DiffSide({
  side,
  onCite,
}: {
  side: ContradictionSide;
  onCite: () => void;
}) {
  return (
    <div className="bg-surface-2 border border-rule rounded-md p-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="text-micro text-[10.5px] truncate">{side.label}</span>
        <span className="font-mono-sm text-[11px] text-ink-3 shrink-0">{side.date}</span>
      </div>
      <div className="font-serif italic text-[14px] leading-[1.5] text-ink">
        &ldquo;{side.text}&rdquo;
      </div>
      <div className="flex items-center justify-between mt-2 gap-2">
        <span className="text-[11.5px] text-ink-3 truncate">{side.source}</span>
        <ChipInline chunkId={side.cite} onCite={onCite} />
      </div>
    </div>
  );
}

// ─── Inline footnote chip (local, doesn't need the full FootnoteChip prop set) ─

function ChipInline({ chunkId, onCite }: { chunkId: string; onCite: () => void }) {
  const activeCitation = useCitationPanel((s) => s.citation);
  const isActive = activeCitation?.chunkIds.includes(chunkId);

  // Derive a short display index from the chunk ID's numeric suffix.
  const suffix = chunkId.split("#")[1];
  const label  = suffix != null ? String(parseInt(suffix, 10) + 1) : "·";

  return (
    <button
      type="button"
      className="fn-chip shrink-0"
      data-active={isActive || undefined}
      onClick={(e) => { e.stopPropagation(); onCite(); }}
      title={chunkId}
    >
      {label}
    </button>
  );
}
