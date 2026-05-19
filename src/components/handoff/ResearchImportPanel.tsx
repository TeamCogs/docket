"use client";

import { useState } from "react";
import { ChevronRight, Check } from "lucide-react";
import SidePanel, { SidePanelFooter } from "@/components/living-matters/SidePanel";
import { cn } from "@/lib/utils";
import type { PseudonymEntry } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportStep = "paste" | "reverse" | "verify";

export interface ResearchImportPanelProps {
  onClose: () => void;
  onSave: (finding: { title: string; body: string; citations: string[] }) => void;
  recentDestination?: string;
  pseudonyms: PseudonymEntry[];
}

// ─── Fake citation extraction ─────────────────────────────────────────────────

function extractCitations(text: string): string[] {
  if (!text.trim()) {
    return [
      "Matrixx Initiatives, Inc. v. Siracusano, 563 U.S. 27 (2011)",
      "Tellabs, Inc. v. Makor Issues & Rights, Ltd., 551 U.S. 308 (2007)",
      "Basic Inc. v. Levinson, 485 U.S. 224 (1988)",
    ];
  }
  // Simple heuristic: look for anything that looks like a U.S. citation
  const citePattern = /[A-Z][^.]+,\s+\d+\s+(?:U\.S\.|F\.\d[a-z]+|F\.Supp\.\d[a-z]+)\s+\d+[^,.]*/g;
  const found = text.match(citePattern);
  if (found && found.length > 0) {
    return found.slice(0, 3).map((c) => c.trim());
  }
  return [
    "Matrixx Initiatives, Inc. v. Siracusano, 563 U.S. 27 (2011)",
    "Tellabs, Inc. v. Makor Issues & Rights, Ltd., 551 U.S. 308 (2007)",
  ];
}

// ─── Apply reverse substitutions ─────────────────────────────────────────────

function applyReverseSubstitutions(text: string, pseudonyms: PseudonymEntry[]): string {
  let result = text;
  for (const entry of pseudonyms) {
    // Replace pseudonyms with canonical names (case-sensitive)
    result = result.split(entry.pseudonym).join(entry.canonical);
  }
  return result;
}

// ─── CitationVerifyRow ────────────────────────────────────────────────────────

type VerifySource = "CourtListener" | "Westlaw" | "I read the opinion";

function CitationVerifyRow({
  citation,
  onVerify,
}: {
  citation: string;
  onVerify: (source: VerifySource) => void;
  verified: boolean;
  verifiedVia: VerifySource | null;
}) {
  return null; // rendered inline below to access state
}
// (unused — rendered inline in VerifyStep)
void CitationVerifyRow;

interface VerifyState {
  verified: boolean;
  source: VerifySource | null;
}

// ─── PasteStep ────────────────────────────────────────────────────────────────

function PasteStep({
  from,
  setFrom,
  pastedText,
  setPastedText,
  onNext,
  onCancel,
}: {
  from: string;
  setFrom: (v: string) => void;
  pastedText: string;
  setPastedText: (v: string) => void;
  onNext: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-4 p-5">
        {/* From */}
        <div>
          <label className="text-micro block mb-1.5">From</label>
          <input
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="e.g., ChatGPT, Westlaw AI, Lexis+"
            className="w-full text-[14px] border border-rule rounded-md px-3 py-2 bg-surface outline-none focus:border-rule-strong"
          />
        </div>

        {/* Paste area */}
        <div>
          <label className="text-micro block mb-1.5">Paste cloud-tool response</label>
          <textarea
            rows={10}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste the full response from the cloud tool here…"
            className="w-full border border-rule rounded-md px-3 py-3 text-[14px] font-serif resize-y bg-surface outline-none focus:border-rule-strong"
          />
        </div>
      </div>

      <SidePanelFooter>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-ink-2 px-3 py-1.5 rounded-md text-sm hover:text-ink hover:bg-[rgba(20,18,12,0.04)] transition-colors duration-[120ms]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-1.5 bg-navy text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-navy-2 transition-colors duration-[120ms]"
        >
          Reverse substitutions
        </button>
      </SidePanelFooter>
    </>
  );
}

// ─── ReverseStep ─────────────────────────────────────────────────────────────

function ReverseStep({
  pastedText,
  pseudonyms,
  restoredText,
  onBack,
  onNext,
}: {
  pastedText: string;
  pseudonyms: PseudonymEntry[];
  restoredText: string;
  onBack: () => void;
  onNext: () => void;
}) {
  // Only show pseudonyms that actually appear in the pasted text
  const activePseudonyms = pseudonyms.filter(
    (p) => pastedText.includes(p.pseudonym),
  );

  // Highlight substituted names in the restored text
  function renderRestoredText() {
    if (!restoredText) return <span className="text-ink-4 italic">No text to display.</span>;

    let remaining = restoredText;
    const parts: { text: string; highlight: boolean }[] = [];

    const canonicals = pseudonyms.map((p) => p.canonical).filter((c) => restoredText.includes(c));

    if (canonicals.length === 0) {
      return <span>{restoredText}</span>;
    }

    // Build segments
    const pattern = new RegExp(`(${canonicals.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
    const segments = restoredText.split(pattern);
    for (const seg of segments) {
      if (canonicals.includes(seg)) {
        parts.push({ text: seg, highlight: true });
      } else {
        parts.push({ text: seg, highlight: false });
      }
    }
    return (
      <>
        {parts.map((p, i) =>
          p.highlight ? (
            <mark
              key={i}
              className="bg-navy-soft text-navy rounded px-0.5 not-italic"
              style={{ fontStyle: "normal" }}
            >
              {p.text}
            </mark>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </>
    );
    void remaining;
  }

  return (
    <>
      <div className="p-5">
        {/* Substitution rows */}
        <div className="text-micro mb-2">Substitutions applied</div>
        {activePseudonyms.length === 0 ? (
          <p className="text-small text-ink-4 italic mb-4">
            No pseudonyms found in the pasted text.
          </p>
        ) : (
          <div className="flex flex-col mb-4">
            {activePseudonyms.map((entry, i) => (
              <div
                key={i}
                className="bg-surface-2 border border-rule rounded-md p-2.5 flex items-center gap-3 mb-2"
              >
                <span className="font-mono-sm text-navy text-[13px]">{entry.pseudonym}</span>
                <ChevronRight size={14} className="text-ink-4" />
                <span className="text-[13.5px] text-ink font-medium">{entry.canonical}</span>
              </div>
            ))}
          </div>
        )}

        {/* Restored text */}
        <div className="text-micro mt-4 mb-2">Restored text · review before saving</div>
        <div className="bg-surface-2 border border-rule rounded-lg p-3.5 max-h-[200px] overflow-y-auto text-[14px] font-serif leading-[1.6] text-ink">
          {renderRestoredText()}
        </div>
      </div>

      <SidePanelFooter>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 bg-surface text-ink border border-rule-strong px-3 py-1.5 rounded-md text-sm font-medium hover:bg-surface-2 transition-colors duration-[120ms]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-1.5 bg-navy text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-navy-2 transition-colors duration-[120ms]"
        >
          Verify citations
        </button>
      </SidePanelFooter>
    </>
  );
}

// ─── VerifyStep ───────────────────────────────────────────────────────────────

function VerifyStep({
  citations,
  restoredText,
  from,
  onBack,
  onSave,
}: {
  citations: string[];
  restoredText: string;
  from: string;
  onBack: () => void;
  onSave: (finding: { title: string; body: string; citations: string[] }) => void;
}) {
  const [verifyStates, setVerifyStates] = useState<Record<number, VerifyState>>(
    Object.fromEntries(citations.map((_, i) => [i, { verified: false, source: null }])),
  );

  const allVerified = citations.every((_, i) => verifyStates[i]?.verified);

  function verify(index: number, source: VerifySource) {
    setVerifyStates((prev) => ({
      ...prev,
      [index]: { verified: true, source },
    }));
  }

  function handleSave() {
    const verifiedCitations = citations.filter((_, i) => verifyStates[i]?.verified);
    onSave({
      title: `Research findings from ${from || "cloud tool"}`,
      body: restoredText,
      citations: verifiedCitations,
    });
  }

  return (
    <>
      <div className="p-5">
        <div className="text-micro mb-1">Citation verification</div>
        <p className="text-small text-ink-3 leading-[1.5] mb-4">
          This is the <em>Mata v. Avianca</em> guardrail. No cloud-tool citation lands in a
          Docket matter unverified.
        </p>

        {citations.map((citation, i) => {
          const state = verifyStates[i] ?? { verified: false, source: null };
          return (
            <div
              key={i}
              className={cn(
                "border rounded-lg p-3 mb-2 transition-colors duration-[120ms]",
                state.verified
                  ? "bg-sage-soft/50 border-sage-soft-2"
                  : "bg-surface-2 border-rule",
              )}
            >
              <p className="font-mono-sm text-[12px] text-ink-2 italic mb-2 m-0">
                {citation}
              </p>
              {state.verified ? (
                <span className="inline-flex items-center gap-1 bg-sage-soft text-sage px-2 py-0.5 rounded text-[11.5px] font-medium border border-sage-soft-2">
                  <Check size={10} strokeWidth={2.5} />
                  Verified via {state.source}
                </span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(["CourtListener", "Westlaw", "I read the opinion"] as VerifySource[]).map(
                    (source) => (
                      <button
                        key={source}
                        type="button"
                        onClick={() => verify(i, source)}
                        className="inline-flex items-center gap-1.5 bg-surface text-ink border border-rule-strong px-2.5 py-1 rounded-md text-[12px] font-medium hover:bg-surface-2 transition-colors duration-[120ms]"
                      >
                        {source}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SidePanelFooter>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 bg-surface text-ink border border-rule-strong px-3 py-1.5 rounded-md text-sm font-medium hover:bg-surface-2 transition-colors duration-[120ms]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!allVerified}
          className="inline-flex items-center gap-1.5 bg-navy text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-navy-2 transition-colors duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save to External Research
        </button>
      </SidePanelFooter>
    </>
  );
}

// ─── ResearchImportPanel ──────────────────────────────────────────────────────

export default function ResearchImportPanel({
  onClose,
  onSave,
  recentDestination = "",
  pseudonyms,
}: ResearchImportPanelProps) {
  const [step, setStep] = useState<ImportStep>("paste");
  const [from, setFrom] = useState(recentDestination);
  const [pastedText, setPastedText] = useState("");
  const [restoredText, setRestoredText] = useState("");
  const [citations, setCitations] = useState<string[]>([]);

  function handleReverseStep() {
    const restored = applyReverseSubstitutions(pastedText, pseudonyms);
    setRestoredText(restored);
    setStep("reverse");
  }

  function handleVerifyStep() {
    const extracted = extractCitations(pastedText);
    setCitations(extracted);
    setStep("verify");
  }

  return (
    <SidePanel
      title="Bring findings back"
      subtitle="Reverse pseudonym substitution and verify every citation before saving."
      onClose={onClose}
    >
      {step === "paste" && (
        <PasteStep
          from={from}
          setFrom={setFrom}
          pastedText={pastedText}
          setPastedText={setPastedText}
          onNext={handleReverseStep}
          onCancel={onClose}
        />
      )}
      {step === "reverse" && (
        <ReverseStep
          pastedText={pastedText}
          pseudonyms={pseudonyms}
          restoredText={restoredText}
          onBack={() => setStep("paste")}
          onNext={handleVerifyStep}
        />
      )}
      {step === "verify" && (
        <VerifyStep
          citations={citations}
          restoredText={restoredText}
          from={from}
          onBack={() => setStep("reverse")}
          onSave={(finding) => {
            onSave(finding);
            onClose();
          }}
        />
      )}
    </SidePanel>
  );
}
