"use client";

import { useRef, useState } from "react";
import { ArrowUp, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCitationPanel } from "./brief/citation-panel-store";
import { useReadOnly } from "@/lib/license-store";
import ReAskButton from "@/components/living-matters/ReAskButton";
import PairedAnswerStrip from "@/components/living-matters/PairedAnswerStrip";
import type { Citation, Claim, MatterId } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReAskResult {
  asked: string;
  askedAgainstVersion: number;
  answer: Claim[];
}

interface QAEntry {
  id:        string;
  question:  string;
  asked:     string;
  declined:  boolean;
  answer:    Claim[];
  suppressed: number;
  reask?: ReAskResult;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AskAnything({ matterId }: { matterId: MatterId }) {
  const readOnly      = useReadOnly();
  const openCitation  = useCitationPanel((s) => s.open);
  const citationOpen  = useCitationPanel((s) => s.isOpen);

  const [q, setQ]             = useState("");
  const [open, setOpen]       = useState(false);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<QAEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-ask: runs the same question against the current chunk index.
  // The original answer is preserved; the new answer appears below it.
  async function reAsk(qaId: string) {
    const entry = history.find((e) => e.id === qaId);
    if (!entry || entry.reask) return; // already re-asked

    const placeholder: ReAskResult = {
      asked: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      askedAgainstVersion: 1, // will be read from brief payload in production
      answer: [],
    };

    setHistory((h) =>
      h.map((e) => (e.id === qaId ? { ...e, reask: placeholder } : e)),
    );

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matterId, question: entry.question }),
      });
      const data = (await res.json()) as {
        answer: Array<{ text: string; citation: { chunkIds: string[]; grounded: "grounded" | "partial" } }>;
      };

      const claims: Claim[] = (data.answer ?? []).map((item, i) => ({
        text: item.text,
        citation: {
          id:              `${qaId}-reask-${i}`,
          chunkIds:        item.citation.chunkIds,
          grounded:        item.citation.grounded,
          groundingMethod: "embedding" as const,
          internalScore:   0,
        },
      }));

      setHistory((h) =>
        h.map((e) =>
          e.id === qaId
            ? { ...e, reask: { ...placeholder, answer: claims } }
            : e,
        ),
      );
    } catch {
      setHistory((h) =>
        h.map((e) =>
          e.id === qaId
            ? {
                ...e,
                reask: {
                  ...placeholder,
                  answer: [{
                    text: "Re-ask could not be completed. Check that Ollama is running.",
                    citation: {
                      id: `${qaId}-reask-err`,
                      chunkIds: [],
                      grounded: "partial" as const,
                      groundingMethod: "overlap" as const,
                      internalScore: 0,
                    },
                  }],
                },
              }
            : e,
        ),
      );
    }
  }

  async function ask() {
    const question = q.trim();
    if (!question || running || readOnly) return;
    setQ("");
    setRunning(true);
    setOpen(true);

    // Optimistic placeholder entry while streaming.
    const placeholder: QAEntry = {
      id:        `qa-${Date.now()}`,
      question,
      asked:     new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      declined:  false,
      answer:    [],
      suppressed: 0,
    };
    setHistory((h) => [placeholder, ...h]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matterId, question }),
      });
      const data = (await res.json()) as {
        answer: Array<{ text: string; citation: { chunkIds: string[]; grounded: "grounded" | "partial" } }>;
        declined?: boolean;
      };

      const claims: Claim[] = (data.answer ?? []).map((item, i) => ({
        text: item.text,
        citation: {
          id:              `${placeholder.id}-${i}`,
          chunkIds:        item.citation.chunkIds,
          grounded:        item.citation.grounded,
          groundingMethod: "embedding" as const,
          internalScore:   0,
        },
      }));

      setHistory((h) =>
        h.map((entry) =>
          entry.id === placeholder.id
            ? { ...entry, answer: claims, declined: data.declined ?? false }
            : entry,
        ),
      );
    } catch {
      setHistory((h) =>
        h.map((entry) =>
          entry.id === placeholder.id
            ? {
                ...entry,
                declined: false,
                answer: [{
                  text: "The request could not be completed. Check that Ollama is running.",
                  citation: {
                    id: `${placeholder.id}-err`,
                    chunkIds: [],
                    grounded: "partial" as const,
                    groundingMethod: "overlap" as const,
                    internalScore: 0,
                  },
                }],
              }
            : entry,
        ),
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      {/* History drawer — slides up above the pill */}
      {open && (
        <div
          className="fixed inset-x-0 bottom-16 z-[55] max-h-[55vh] overflow-y-auto
                     bg-paper/95 backdrop-blur-md border-t border-rule animate-slide-up"
        >
          <div className="max-w-[880px] mx-auto px-7 py-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Search className="size-3.5 text-ink-3" />
                <span className="text-micro">Ask Anything · question history</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-surface-3
                           transition-colors duration-[120ms]"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-small text-ink-4 italic">No questions yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {history.map((qa, i) => (
                  <QAItem
                    key={qa.id}
                    qa={qa}
                    index={i}
                    running={running && i === 0}
                    onCite={openCitation}
                    onReAsk={reAsk}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pill — fixed bottom center, shifts right when citation panel open */}
      <div
        className="fixed inset-x-0 bottom-8 z-[56] pointer-events-none px-7
                   transition-[padding-right] duration-[240ms] ease-out-soft"
        style={{ paddingRight: citationOpen ? "480px" : undefined }}
      >
        <div className="max-w-[720px] mx-auto pointer-events-auto
                        flex items-center gap-2.5
                        bg-surface border border-rule-strong rounded-full
                        p-1.5 pl-4 shadow-2">
          <Search className="size-4 text-ink-3 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => history.length > 0 && setOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ask a question about this matter…"
            disabled={readOnly || running}
            className="flex-1 bg-transparent border-none outline-none
                       text-[14.5px] py-2.5 placeholder:text-ink-4
                       disabled:cursor-not-allowed"
          />
          {history.length > 0 && !open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="px-3 py-1 rounded-full text-sm text-ink-3
                         hover:text-ink hover:bg-surface-3 transition-colors duration-[120ms]"
            >
              {history.length} prior
            </button>
          )}
          <button
            type="button"
            onClick={ask}
            disabled={!q.trim() || running || readOnly}
            title="Ask (Enter)"
            className={cn(
              "grid place-items-center size-8 rounded-full shrink-0",
              "transition-colors duration-[120ms]",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              q.trim() && !running && !readOnly
                ? "bg-navy text-white hover:bg-navy-2"
                : "bg-surface-3 text-ink-3",
            )}
          >
            {running
              ? <span className="font-mono-sm text-[11px]">…</span>
              : <ArrowUp className="size-3.5" />
            }
          </button>
        </div>

        <p className="text-center mt-2 text-[11px] text-ink-3 pointer-events-none">
          Docket answers questions about this material. It will not draft motions, letters, or strategy.
        </p>
      </div>
    </>
  );
}

// ─── QAItem ───────────────────────────────────────────────────────────────────

function QAItem({
  qa,
  index,
  running,
  onCite,
  onReAsk,
}: {
  qa: QAEntry;
  index: number;
  running: boolean;
  onCite: (c: Citation) => void;
  onReAsk: (qaId: string) => void;
}) {
  return (
    <div className="rounded-md border border-rule bg-surface p-4 shadow-1">
      {/* Question row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="size-[18px] rounded-sm bg-surface-3 text-ink-2
                         grid place-items-center font-serif italic text-xs shrink-0">
          Q
        </span>
        <span className="text-sm font-medium text-ink flex-1 min-w-0">{qa.question}</span>
        <span className="font-mono-sm text-[11px] text-ink-4 shrink-0">{qa.asked}</span>
      </div>

      {/* Declined chip */}
      {qa.declined && (
        <span className="inline-flex items-center mb-3 px-2 py-0.5 rounded-full
                         bg-amber-soft text-amber text-xs font-medium">
          Drafting declined
        </span>
      )}

      {/* Answer — skeleton while streaming */}
      {running && qa.answer.length === 0 ? (
        <div className="flex flex-col gap-2 mt-1">
          <div className="h-3 bg-surface-3 rounded animate-docket-pulse w-[92%]" />
          <div className="h-3 bg-surface-3 rounded animate-docket-pulse w-[80%]" />
          <div className="h-3 bg-surface-3 rounded animate-docket-pulse w-[60%]" />
        </div>
      ) : (
        <div className="prose-brief text-[15px] flex flex-col gap-2">
          {qa.answer.map((claim, i) => (
            <p key={i} className="m-0">
              {claim.text}
              {claim.citation.chunkIds.length > 0 && (
                <span className="inline-flex gap-0.5 ml-0.5 align-baseline">
                  <button
                    type="button"
                    className="fn-chip"
                    onClick={(e) => { e.stopPropagation(); onCite(claim.citation); }}
                    title={`Source ${index + 1}.${i + 1}`}
                  >
                    {i + 1}
                  </button>
                </span>
              )}
            </p>
          ))}
        </div>
      )}

      {/* Suppressed count */}
      {qa.suppressed > 0 && (
        <div className="text-small mt-2 text-ink-3">
          {qa.suppressed} ungrounded claim{qa.suppressed > 1 ? "s" : ""} suppressed
          by the re-grounding pass.
        </div>
      )}

      {/* Re-ask affordance — only shown once answer is ready */}
      {!running && qa.answer.length > 0 && (
        <div className="flex justify-end mt-3">
          <ReAskButton
            reasked={!!qa.reask}
            reaskedAgainstVersion={qa.reask?.askedAgainstVersion}
            onClick={() => onReAsk(qa.id)}
          />
        </div>
      )}

      {/* Paired answer strip — shown after re-ask completes */}
      {qa.reask && (
        <PairedAnswerStrip reask={qa.reask} onCite={onCite} />
      )}
    </div>
  );
}
