"use client";

import type { HandoffExport } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HandoffAuditSectionProps {
  exports: HandoffExport[];
  onBurnMap: (exportId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genString(e: HandoffExport): string {
  const d = e.generalizationDates;
  const a = e.generalizationAmounts;
  const l = e.generalizationLocations;
  return `d:${d} · $:${a} · l:${l}`;
}

function formatCreatedAt(iso: string): string {
  // Format as "YYYY-MM-DD HH:mm"
  try {
    const date = new Date(iso);
    const yyyy = date.getFullYear();
    const mm   = String(date.getMonth() + 1).padStart(2, "0");
    const dd   = String(date.getDate()).padStart(2, "0");
    const hh   = String(date.getHours()).padStart(2, "0");
    const min  = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch {
    return iso;
  }
}

// ─── HandoffAuditSection ──────────────────────────────────────────────────────

export default function HandoffAuditSection({
  exports,
  onBurnMap,
}: HandoffAuditSectionProps) {
  return (
    <div
      className="border rounded-[10px] p-5"
      style={{
        borderColor: "var(--rule)",
        background: "var(--surface)",
      }}
    >
      {/* Header */}
      <div className="text-micro mb-1" style={{ color: "var(--ink-3)" }}>
        Handoff Audit
      </div>
      <div className="text-h3 mt-1 mb-4" style={{ color: "var(--ink)" }}>
        Export history
      </div>

      {/* Empty state */}
      {exports.length === 0 ? (
        <p className="text-small italic" style={{ color: "var(--ink-4)" }}>
          No exports recorded for this matter.
        </p>
      ) : (
        <>
          {/* Table */}
          <div
            className="border rounded-md overflow-hidden"
            style={{ borderColor: "var(--rule)" }}
          >
            {/* Header row */}
            <div
              className="grid grid-cols-[120px_1fr_80px_140px_100px_80px] px-3 py-2 border-b text-micro"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--rule)",
                color: "var(--ink-3)",
              }}
            >
              <span>Created</span>
              <span>Destination</span>
              <span>Brief</span>
              <span>Generalization</span>
              <span>Map</span>
              <span />
            </div>

            {/* Data rows */}
            {exports.map((e, idx) => {
              const isStale = idx > 0; // prototype: all non-first rows are stale
              return (
                <div
                  key={e.id}
                  className="grid grid-cols-[120px_1fr_80px_140px_100px_80px] px-3 py-2.5 border-b last:border-0 text-[13px] items-center"
                  style={{ borderColor: "var(--rule)" }}
                >
                  {/* Created */}
                  <span
                    className="font-mono-sm text-[11.5px]"
                    style={{ color: "var(--ink-2)" }}
                  >
                    {formatCreatedAt(e.createdAt)}
                  </span>

                  {/* Destination */}
                  <span
                    className="truncate"
                    style={{ color: "var(--ink)" }}
                  >
                    {e.destination}
                  </span>

                  {/* Brief version + optional stale chip */}
                  <div className="flex items-center gap-1 min-w-0">
                    <span
                      className="font-mono-sm text-[11.5px] shrink-0"
                      style={{ color: "var(--ink-2)" }}
                    >
                      v{e.briefVersionId}
                    </span>
                    {isStale && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-px rounded shrink-0",
                        )}
                        style={{
                          background: "var(--amber-soft)",
                          color: "var(--amber)",
                        }}
                      >
                        stale
                      </span>
                    )}
                  </div>

                  {/* Generalization string */}
                  <span
                    className="font-mono-sm text-[11.5px] truncate"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {genString(e)}
                  </span>

                  {/* Map status */}
                  <div>
                    {e.mapRetained ? (
                      <span
                        className="text-[10.5px] px-2 py-px rounded-full font-medium"
                        style={{
                          background: "var(--sage-soft)",
                          color: "var(--sage)",
                        }}
                      >
                        retained
                      </span>
                    ) : (
                      <span
                        className="font-mono-sm text-[11.5px]"
                        style={{ color: "var(--ink-4)" }}
                      >
                        burned
                        {e.mapBurnedAt ? ` · ${e.mapBurnedAt.slice(0, 10)}` : ""}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div>
                    {e.mapRetained && (
                      <button
                        type="button"
                        onClick={() => onBurnMap(e.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          "text-[12.5px] px-2 py-1 rounded-md",
                          "transition-colors duration-[120ms]",
                        )}
                        style={{ color: "var(--ink-3)" }}
                        onMouseEnter={(ev) => {
                          (ev.currentTarget as HTMLButtonElement).style.color = "var(--brick)";
                          (ev.currentTarget as HTMLButtonElement).style.background = "transparent";
                        }}
                        onMouseLeave={(ev) => {
                          (ev.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)";
                          (ev.currentTarget as HTMLButtonElement).style.background = "transparent";
                        }}
                      >
                        Burn map
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <p
            className="text-small leading-[1.5] mt-3 mb-0"
            style={{ color: "var(--ink-3)" }}
          >
            Map files are encrypted locally. Auto-burn after 90 days. Manually burning a map
            leaves a tombstone row — the audit entry is not deleted, per Op.&nbsp;512.
          </p>
        </>
      )}
    </div>
  );
}
