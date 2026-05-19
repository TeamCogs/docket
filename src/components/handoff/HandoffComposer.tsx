"use client";

import { useState } from "react";
import { X, ArrowRight, ArrowLeft, Check, Copy } from "lucide-react";
import OverlayShell, { OverlayFooter } from "@/components/living-matters/OverlayShell";
import { cn } from "@/lib/utils";
import type {
  MatterId,
  PseudonymEntry,
  ResidualRisk,
  HandoffGeneralizationDates,
  HandoffGeneralizationAmounts,
  HandoffGeneralizationLocations,
} from "@/lib/types";

// ─── Step types ───────────────────────────────────────────────────────────────

type HandoffStep = "compose" | "preview" | "risk" | "done";

export interface HandoffOpts {
  destination: string;
  dates: HandoffGeneralizationDates;
  amounts: HandoffGeneralizationAmounts;
  locations: HandoffGeneralizationLocations;
}

export interface HandoffComposerProps {
  matterId: MatterId;
  pseudonyms: PseudonymEntry[];
  risks: ResidualRisk[];
  briefSnapshotText: string;
  onClose: () => void;
  onCopyComplete: (opts: HandoffOpts) => void;
}

// ─── HandoffSteps ─────────────────────────────────────────────────────────────

const STEP_LABELS: { id: HandoffStep; label: string }[] = [
  { id: "compose", label: "Compose" },
  { id: "preview", label: "Preview" },
  { id: "risk",    label: "Residual risk" },
  { id: "done",    label: "Copy" },
];

const STEP_ORDER: HandoffStep[] = ["compose", "preview", "risk", "done"];

function HandoffSteps({ current }: { current: HandoffStep }) {
  const currentIdx = STEP_ORDER.indexOf(current);

  return (
    <div className="flex items-center gap-0">
      {STEP_LABELS.map(({ id, label }, idx) => {
        const isPast    = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={id} className="flex items-center">
            {/* Connector line (not before first) */}
            {idx > 0 && (
              <div className="w-4 h-px bg-rule-strong mx-0" />
            )}

            {/* Step circle + label */}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0",
                  isPast    && "bg-navy text-white",
                  isCurrent && "bg-ink text-white",
                  !isPast && !isCurrent && "bg-surface-3 text-ink-3",
                )}
              >
                {isPast ? (
                  <Check size={10} strokeWidth={2.5} />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-[12.5px]",
                  isCurrent ? "font-medium text-ink" : "font-normal text-ink-3",
                )}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── RecommendedChip ──────────────────────────────────────────────────────────

function RecommendedChip() {
  return (
    <span className="inline-flex px-1.5 py-px rounded text-[10px] font-medium bg-sage-soft text-sage border border-sage-soft-2 ml-1.5">
      recommended
    </span>
  );
}

// ─── GeneralizationBlock ──────────────────────────────────────────────────────

interface GenOption<T extends string> {
  value: T;
  label: string;
  desc: string;
  recommended?: boolean;
}

interface GeneralizationBlockProps<T extends string> {
  title: string;
  options: GenOption<T>[];
  value: T;
  onChange: (v: T) => void;
}

function GeneralizationBlock<T extends string>({
  title,
  options,
  value,
  onChange,
}: GeneralizationBlockProps<T>) {
  return (
    <div>
      <div className="text-micro mb-2">{title}</div>
      <div className="flex flex-col gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-2.5 rounded-md border text-left text-[13.5px] transition-all duration-[120ms]",
              value === opt.value
                ? "border-navy bg-navy-soft"
                : "border-rule bg-surface-2 hover:border-rule-strong",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center min-w-0">
                <span className={cn("text-[13px] font-medium", value === opt.value ? "text-navy" : "text-ink")}>
                  {opt.label}
                </span>
                {opt.recommended && <RecommendedChip />}
              </div>
              <span className={cn("font-mono-sm text-[11.5px] shrink-0", value === opt.value ? "text-navy/70" : "text-ink-3")}>
                {opt.desc}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── ComposerBody ─────────────────────────────────────────────────────────────

const DATES_OPTIONS: GenOption<HandoffGeneralizationDates>[] = [
  { value: "exact",   label: "Exact",   desc: "2026-08-14" },
  { value: "quarter", label: "Quarter", desc: "Q3 2026", recommended: true },
  { value: "year",    label: "Year",    desc: "2026" },
];

const AMOUNTS_OPTIONS: GenOption<HandoffGeneralizationAmounts>[] = [
  { value: "exact",  label: "Exact",    desc: "$2,450,000" },
  { value: "bucket", label: "Bucketed", desc: "under $50K · $50K–$250K · over $250K", recommended: true },
  { value: "redact", label: "Redact",   desc: "[redacted]" },
];

const LOCATIONS_OPTIONS: GenOption<HandoffGeneralizationLocations>[] = [
  { value: "keep",     label: "Keep",     desc: "Southern District of New York" },
  { value: "regional", label: "Regional", desc: "[federal district court]", recommended: true },
];

interface ComposerBodyProps {
  destination: string;
  onDestinationChange: (v: string) => void;
  dates: HandoffGeneralizationDates;
  onDatesChange: (v: HandoffGeneralizationDates) => void;
  amounts: HandoffGeneralizationAmounts;
  onAmountsChange: (v: HandoffGeneralizationAmounts) => void;
  locations: HandoffGeneralizationLocations;
  onLocationsChange: (v: HandoffGeneralizationLocations) => void;
  pseudonyms: PseudonymEntry[];
  onNext: () => void;
  onCancel: () => void;
}

function ComposerBody({
  destination,
  onDestinationChange,
  dates,
  onDatesChange,
  amounts,
  onAmountsChange,
  locations,
  onLocationsChange,
  pseudonyms,
  onNext,
  onCancel,
}: ComposerBodyProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-7 px-7 py-6">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Destination */}
          <div>
            <div className="text-micro mb-1">Destination</div>
            <p className="text-small text-ink-3 mb-2 leading-[1.45]">
              Free-text. Docket does not recommend cloud tools. The label is recorded in your audit log.
            </p>
            <input
              type="text"
              value={destination}
              onChange={(e) => onDestinationChange(e.target.value)}
              placeholder="e.g., ChatGPT, Westlaw AI, Lexis+"
              className="w-full border border-rule rounded-md px-3 py-2 text-[14px] focus:ring-0 focus:border-rule-strong bg-surface outline-none"
            />
          </div>

          <GeneralizationBlock
            title="Dates"
            options={DATES_OPTIONS}
            value={dates}
            onChange={onDatesChange}
          />
          <GeneralizationBlock
            title="Amounts"
            options={AMOUNTS_OPTIONS}
            value={amounts}
            onChange={onAmountsChange}
          />
          <GeneralizationBlock
            title="Locations"
            options={LOCATIONS_OPTIONS}
            value={locations}
            onChange={onLocationsChange}
          />
        </div>

        {/* Right column — Pseudonym map preview */}
        <div>
          <div className="text-micro mb-1">Pseudonym map preview</div>
          <p className="text-small text-ink-3 leading-[1.5] mb-3">
            Named entities identified by Microsoft Presidio + legal-bert + fastcoref in the
            local Python sidecar. The map file is AES-GCM encrypted (HKDF-derived from the
            matter key).
          </p>

          {/* Table */}
          <div className="max-h-[260px] overflow-y-auto border border-rule rounded-md">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_100px_50px] text-micro px-3 py-2 bg-surface-2 border-b border-rule sticky top-0">
              <span>Canonical</span>
              <span>Role</span>
              <span>Pseudonym</span>
              <span className="text-right">Uses</span>
            </div>
            {/* Rows */}
            {pseudonyms.length === 0 ? (
              <div className="px-3 py-4 text-small text-ink-4 italic">No entities detected.</div>
            ) : (
              pseudonyms.map((p, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_80px_100px_50px] px-3 py-2 border-b border-rule last:border-0 text-[13px]"
                >
                  <span className="text-ink truncate">{p.canonical}</span>
                  <span className="text-ink-3">{p.role}</span>
                  <span className="font-mono-sm text-navy text-[12px]">{p.pseudonym}</span>
                  <span className="text-ink-4 text-right">{p.useCount}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <OverlayFooter>
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
          disabled={!destination.trim()}
          className="inline-flex items-center gap-1.5 bg-navy text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-navy-2 transition-colors duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Generate preview
          <ArrowRight size={14} />
        </button>
      </OverlayFooter>
    </>
  );
}

// ─── RedactedChip ─────────────────────────────────────────────────────────────

type RedactedChipKind = "person" | "entity" | "date" | "amount" | "loc";

function RedactedChip({ text, kind }: { text: string; kind: RedactedChipKind }) {
  const colors: Record<RedactedChipKind, string> = {
    person: "bg-navy-soft text-navy",
    entity: "bg-surface-3 text-ink-3",
    date:   "bg-amber-soft text-amber",
    amount: "bg-sage-soft text-sage",
    loc:    "bg-brick-soft text-brick",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[12.5px] font-medium font-mono-sm mx-0.5",
        colors[kind],
      )}
    >
      {text}
    </span>
  );
}

// ─── PreviewBody ──────────────────────────────────────────────────────────────

interface PreviewBodyProps {
  briefSnapshotText: string;
  pseudonyms: PseudonymEntry[];
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
}

function PreviewBody({
  briefSnapshotText,
  pseudonyms,
  onBack,
  onNext,
  onCancel,
}: PreviewBodyProps) {
  const chipPseudonyms = pseudonyms.slice(0, 4);

  return (
    <>
      <div className="grid grid-cols-2 gap-5 px-7 py-6">
        {/* Left: original */}
        <div>
          <div className="bg-surface-2 border border-rule rounded-lg p-4 max-h-[440px] overflow-y-auto">
            <div className="text-micro mb-3">Original — your matter (stays local)</div>
            <div className="font-serif text-[15px] text-ink leading-[1.65] italic">
              {briefSnapshotText || (
                <span className="text-ink-3">
                  No brief snapshot text provided. The original matter text would appear here
                  with entity names rendered in italic.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: redacted draft */}
        <div>
          <div
            className="border border-rule-strong rounded-lg p-4 max-h-[440px] overflow-y-auto"
            style={{ backgroundColor: "#fefdf8" }}
          >
            <div className="text-micro mb-3">Redacted draft (would go to clipboard)</div>
            <div className="font-serif text-[15px] text-ink leading-[1.65]">
              {briefSnapshotText ? (
                <>
                  {briefSnapshotText.slice(0, 120)}
                  {chipPseudonyms.length > 0 && (
                    <>
                      {" "}
                      {chipPseudonyms.slice(0, 2).map((p, i) => (
                        <RedactedChip
                          key={i}
                          text={p.pseudonym}
                          kind={p.role === "Defendant" || p.role === "Plaintiff" || p.role === "Witness" || p.role === "Counsel" ? "person" : "entity"}
                        />
                      ))}
                    </>
                  )}
                  {briefSnapshotText.length > 120 && (
                    <>
                      {" "}
                      {briefSnapshotText.slice(120, 260)}
                      {chipPseudonyms.length > 2 && (
                        <>
                          {" "}
                          <RedactedChip text="Q3 2026" kind="date" />
                          {" "}
                          <RedactedChip text="under $50K" kind="amount" />
                          {" "}
                          <RedactedChip text="[federal district court]" kind="loc" />
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <span className="text-ink-3 italic">
                  The redacted version would appear here with{" "}
                  <RedactedChip text="Defendant_1" kind="person" />{" "}
                  <RedactedChip text="Issuer_1" kind="entity" />{" "}
                  <RedactedChip text="Q4 2001" kind="date" />{" "}
                  <RedactedChip text="under $50K" kind="amount" />{" "}
                  <RedactedChip text="[federal district court]" kind="loc" />{" "}
                  in place of identified entities.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Research questions */}
      <div className="px-7 pb-6">
        <div className="text-micro mb-2">Research questions (extracted from Open Questions)</div>
        <ol className="list-decimal list-inside space-y-1.5 m-0 pl-0">
          {[
            "Under which circuit's standard does the issuer's restatement disclosure obligation arise, and does the Ninth Circuit's materiality threshold differ from the Second Circuit's?",
            "What is the current split of authority on the scienter pleading standard for securities fraud in the wake of Tellabs v. Makor Issues & Rights?",
            "Are there analogous cases where a defendant's pattern of late disclosure was treated as evidence of fraudulent intent?",
          ].map((q, i) => (
            <li key={i} className="font-serif italic text-[14px] text-ink-2 leading-[1.55]">
              {q}
            </li>
          ))}
        </ol>
      </div>

      <OverlayFooter>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 bg-surface text-ink border border-rule-strong px-3 py-1.5 rounded-md text-sm font-medium hover:bg-surface-2 transition-colors duration-[120ms]"
        >
          <ArrowLeft size={14} />
          Back
        </button>
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
          Review residual risk
          <ArrowRight size={14} />
        </button>
      </OverlayFooter>
    </>
  );
}

// ─── RiskKindChip ─────────────────────────────────────────────────────────────

function RiskKindChip({ kind }: { kind: string }) {
  return (
    <span className="bg-surface-3 text-ink-3 px-2 py-0.5 rounded text-[11px] font-medium capitalize shrink-0">
      {kind.replace(/_/g, " ")}
    </span>
  );
}

// ─── RiskBody ─────────────────────────────────────────────────────────────────

interface RiskBodyProps {
  risks: ResidualRisk[];
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
}

function RiskBody({ risks, onBack, onNext, onCancel }: RiskBodyProps) {
  const [generalizedIds, setGeneralizedIds] = useState<Set<string>>(new Set());

  function toggleGeneralized(id: string) {
    setGeneralizedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const displayRisks =
    risks.length > 0
      ? risks
      : [
          {
            id: "r1",
            kind: "specific_date" as const,
            excerpt: "The restatement was filed on the same day as the SEC subpoena.",
            note: "A date this specific, combined with an SEC action, may narrow the matter to a handful of public filings.",
            suggestion: "Generalize → Q3 2026",
          },
          {
            id: "r2",
            kind: "rare_geography" as const,
            excerpt: "Plaintiffs are organized under the laws of the State of Delaware, operating principally in Puerto Rico.",
            note: "The Puerto Rico + Delaware combination is unusual and may identify the issuer even without names.",
            suggestion: "Generalize → U.S. territory",
          },
          {
            id: "r3",
            kind: "unique_fact_pattern" as const,
            excerpt: "A whistleblower complaint was filed before the first public disclosure.",
            note: "Whistleblower-before-disclosure is a rare chronology. Cross-referencing SEC tips databases could identify the matter.",
            suggestion: "Consider omitting from the research prompt.",
          },
        ];

  return (
    <>
      <div className="px-7 py-6">
        {/* Label + amber info */}
        <div className="text-micro mb-2">Residual risk</div>
        <div
          className="bg-amber-soft rounded-lg p-3 text-small text-amber leading-[1.5] mb-4"
          style={{ border: "1px solid rgba(138,106,43,0.25)" }}
        >
          Named-entity redaction does not catch everything. Unique fact patterns, rare dates,
          and specific geography can re-identify even with names removed. You are the final
          filter.{" "}
          <strong>
            This is a Redacted Draft for Outside Research, not an anonymized document.
          </strong>
        </div>

        {/* Risk rows */}
        <div className="flex flex-col gap-2">
          {displayRisks.map((risk) => {
            const isGeneralized = generalizedIds.has(risk.id);
            return (
              <div
                key={risk.id}
                className={cn(
                  "border rounded-lg p-3.5 transition-colors duration-[120ms]",
                  isGeneralized
                    ? "bg-sage-soft/30 border-sage-soft-2"
                    : "bg-surface border-rule",
                )}
              >
                {/* Top row */}
                <div className="flex items-start gap-2.5 mb-1.5">
                  <RiskKindChip kind={risk.kind} />
                  <p className="font-serif italic text-[13.5px] text-ink-2 leading-[1.5] flex-1 m-0">
                    &ldquo;{risk.excerpt}&rdquo;
                  </p>
                  {isGeneralized ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="inline-flex items-center gap-1 bg-sage-soft text-sage px-2 py-0.5 rounded text-[11.5px] font-medium border border-sage-soft-2">
                        <Check size={10} strokeWidth={2.5} />
                        generalized
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleGeneralized(risk.id)}
                        className="inline-flex items-center gap-1.5 text-ink-2 px-2.5 py-1 rounded-md text-[12px] hover:text-ink hover:bg-[rgba(20,18,12,0.04)] transition-colors duration-[120ms]"
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleGeneralized(risk.id)}
                      className="inline-flex items-center gap-1.5 bg-surface text-ink border border-rule-strong px-2.5 py-1 rounded-md text-[12px] font-medium hover:bg-surface-2 transition-colors duration-[120ms] shrink-0"
                    >
                      {risk.suggestion}
                    </button>
                  )}
                </div>

                {/* Bottom note */}
                <p className="text-small text-ink-3 leading-[1.5] m-0 pl-0">{risk.note}</p>
              </div>
            );
          })}
        </div>
      </div>

      <OverlayFooter>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 bg-surface text-ink border border-rule-strong px-3 py-1.5 rounded-md text-sm font-medium hover:bg-surface-2 transition-colors duration-[120ms]"
        >
          <ArrowLeft size={14} />
          Back to preview
        </button>
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
          Acknowledge and continue
          <ArrowRight size={14} />
        </button>
      </OverlayFooter>
    </>
  );
}

// ─── DoneBody ─────────────────────────────────────────────────────────────────

interface DoneBodyProps {
  destination: string;
  dates: HandoffGeneralizationDates;
  amounts: HandoffGeneralizationAmounts;
  locations: HandoffGeneralizationLocations;
  onCancel: () => void;
  onCopy: () => void;
}

function DoneBody({
  destination,
  dates,
  amounts,
  locations,
  onCancel,
  onCopy,
}: DoneBodyProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 2000);
  }

  const dateShort: Record<HandoffGeneralizationDates, string> = {
    exact: "e", quarter: "q", year: "y",
  };
  const amountShort: Record<HandoffGeneralizationAmounts, string> = {
    exact: "e", bucket: "b", redact: "r",
  };
  const locShort: Record<HandoffGeneralizationLocations, string> = {
    keep: "k", regional: "r",
  };
  const genStr = `d:${dateShort[dates]} · $:${amountShort[amounts]} · l:${locShort[locations]}`;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  return (
    <>
      <div className="px-7 py-10 max-w-[640px]">
        <div className="text-micro mb-2">Ready to copy</div>
        <h2 className="text-h2 m-0">Nothing is on the clipboard until you press Copy.</h2>
        <p className="mt-3 text-ink-2 leading-[1.6]">
          The redacted draft and extracted research questions will be copied to your clipboard.
          You paste them into{" "}
          <strong>{destination || "your chosen tool"}</strong>. Docket never makes an outbound
          connection.
        </p>

        {/* Audit preview card */}
        <div className="mt-5 bg-surface-2 border border-rule rounded-lg p-4">
          <div className="text-micro mb-2">Audit log entry preview</div>
          <div className="font-mono-sm text-[12.5px] leading-[1.7] text-ink-2">
            <div>
              <span className="text-ink-4">destination    </span>
              {destination || "(none)"}
            </div>
            <div>
              <span className="text-ink-4">brief version  </span>
              v1 · {now}
            </div>
            <div>
              <span className="text-ink-4">generalization </span>
              {genStr}
            </div>
            <div>
              <span className="text-ink-4">map TTL        </span>
              90 days · auto-burn
            </div>
          </div>
        </div>
      </div>

      <OverlayFooter>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-ink-2 px-3 py-1.5 rounded-md text-sm hover:text-ink hover:bg-[rgba(20,18,12,0.04)] transition-colors duration-[120ms]"
        >
          Cancel
        </button>

        {copied ? (
          <span className="inline-flex items-center gap-1.5 bg-sage-soft text-sage px-3 py-1.5 rounded-md text-sm font-medium border border-sage-soft-2">
            <Check size={14} strokeWidth={2.5} />
            Copied — paste into {destination || "your tool"}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 bg-navy text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-navy-2 transition-colors duration-[120ms]"
          >
            <Copy size={14} />
            Copy redacted draft
          </button>
        )}
      </OverlayFooter>
    </>
  );
}

// ─── HandoffComposer ──────────────────────────────────────────────────────────

export default function HandoffComposer({
  matterId: _matterId,
  pseudonyms,
  risks,
  briefSnapshotText,
  onClose,
  onCopyComplete,
}: HandoffComposerProps) {
  const [step, setStep] = useState<HandoffStep>("compose");

  const [destination, setDestination]   = useState("");
  const [dates, setDates]               = useState<HandoffGeneralizationDates>("quarter");
  const [amounts, setAmounts]           = useState<HandoffGeneralizationAmounts>("bucket");
  const [locations, setLocations]       = useState<HandoffGeneralizationLocations>("regional");

  function handleCopy() {
    onCopyComplete({ destination, dates, amounts, locations });
    onClose();
  }

  return (
    <OverlayShell maxWidth={1180} onClose={onClose}>
      {/* Constant header */}
      <div className="px-7 py-5 border-b border-rule">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-micro">Research Handoff</div>
            <h2 className="text-h2 m-0">Redacted draft for outside research</h2>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <HandoffSteps current={step} />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-3 hover:text-ink hover:bg-[rgba(20,18,12,0.06)] transition-colors duration-[120ms]"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <p className="text-small mt-0 mb-4 max-w-[820px] leading-[1.55] text-ink-2">
          This reduces but does not eliminate confidentiality risk. You remain responsible for
          client consent and verification of every citation that comes back.
        </p>
      </div>

      {/* Step bodies */}
      {step === "compose" && (
        <ComposerBody
          destination={destination}
          onDestinationChange={setDestination}
          dates={dates}
          onDatesChange={setDates}
          amounts={amounts}
          onAmountsChange={setAmounts}
          locations={locations}
          onLocationsChange={setLocations}
          pseudonyms={pseudonyms}
          onNext={() => setStep("preview")}
          onCancel={onClose}
        />
      )}
      {step === "preview" && (
        <PreviewBody
          briefSnapshotText={briefSnapshotText}
          pseudonyms={pseudonyms}
          onBack={() => setStep("compose")}
          onNext={() => setStep("risk")}
          onCancel={onClose}
        />
      )}
      {step === "risk" && (
        <RiskBody
          risks={risks}
          onBack={() => setStep("preview")}
          onNext={() => setStep("done")}
          onCancel={onClose}
        />
      )}
      {step === "done" && (
        <DoneBody
          destination={destination}
          dates={dates}
          amounts={amounts}
          locations={locations}
          onCancel={onClose}
          onCopy={handleCopy}
        />
      )}
    </OverlayShell>
  );
}
