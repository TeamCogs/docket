"use client";

import { useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import OverlayShell, { OverlayFooter } from "@/components/living-matters/OverlayShell";
import { cn } from "@/lib/utils";

// ─── Internal: ConsentCheck ───────────────────────────────────────────────────

interface ConsentCheckProps {
  label: string;
  help: string;
  checked: boolean;
  onToggle: () => void;
}

function ConsentCheck({ label, help, checked, onToggle }: ConsentCheckProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-start gap-3 text-left w-full"
    >
      {/* Custom checkbox square */}
      <div
        className={cn(
          "flex-shrink-0 w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center transition-colors duration-[120ms] mt-0.5",
          checked
            ? "bg-[var(--navy)] border-[var(--navy)]"
            : "bg-[var(--surface)] border-[var(--rule-strong)]",
        )}
      >
        {checked && <Check size={11} className="text-white" strokeWidth={2.5} />}
      </div>

      {/* Label + help */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className={cn(
            "text-[14px] leading-[1.4] transition-colors duration-[120ms]",
            checked ? "text-ink font-medium" : "text-ink font-normal",
          )}
        >
          {label}
        </span>
        <span className="text-small text-ink-3 leading-[1.45]">{help}</span>
      </div>
    </button>
  );
}

// ─── ConsentAffirmationModal ──────────────────────────────────────────────────

export interface ConsentAffirmationModalProps {
  onClose: () => void;
  onAffirm: () => void;
}

export default function ConsentAffirmationModal({
  onClose,
  onAffirm,
}: ConsentAffirmationModalProps) {
  const [consentObtained, setConsentObtained] = useState(false);
  const [riskUnderstood, setRiskUnderstood] = useState(false);

  const allChecked = consentObtained && riskUnderstood;

  return (
    <OverlayShell maxWidth={620} onClose={onClose}>
      {/* Content */}
      <div className="px-[34px] py-[30px]">
        {/* Micro label row + close */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-micro">Research Handoff · informed consent</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-3 hover:text-ink hover:bg-[rgba(20,18,12,0.06)] transition-colors duration-[120ms]"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Heading */}
        <h1 className="text-h1 m-0 text-[28px]">Before this matter&apos;s first export.</h1>

        {/* Body paragraph */}
        <p className="mt-3 text-ink-2 leading-[1.6] text-body">
          Sending even a redacted draft to a cloud research tool introduces residual
          confidentiality risk. ABA Formal Opinion 512 (2024) and California&apos;s Practical
          Guidance on Generative AI both place the responsibility for obtaining informed
          client consent on you.
        </p>

        {/* Affirmation card */}
        <div className="mt-4 bg-surface-2 border border-rule rounded-lg p-4">
          <div className="text-micro mb-3">Affirmations</div>
          <div className="flex flex-col gap-3.5">
            <ConsentCheck
              label="I have obtained informed client consent for cloud-tool research on this matter."
              help="A sample disclosure for engagement letters is at docketlm.app/consent."
              checked={consentObtained}
              onToggle={() => setConsentObtained((v) => !v)}
            />
            <ConsentCheck
              label="I understand redaction reduces but does not eliminate confidentiality risk."
              help="Quasi-identifiers (rare dates, fact patterns, geography) may re-identify even with names removed."
              checked={riskUnderstood}
              onToggle={() => setRiskUnderstood((v) => !v)}
            />
          </div>
        </div>

        {/* Sage info card */}
        <div className="mt-4 bg-sage-soft border border-sage-soft-2 rounded-lg p-3 flex gap-3">
          <Check
            size={14}
            className="text-sage mt-0.5 shrink-0"
            strokeWidth={2.5}
          />
          <p className="text-small text-sage leading-[1.5] m-0">
            Affirmation is recorded per-matter with a 12-month TTL. The encrypted pseudonym
            map and export artifact live in{" "}
            <span className="font-mono-sm">matters/&lt;id&gt;/handoff/</span>; nothing leaves
            the machine until you copy.
          </p>
        </div>
      </div>

      {/* Footer */}
      <OverlayFooter>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-ink-2 px-3 py-1.5 rounded-md text-sm hover:text-ink hover:bg-[rgba(20,18,12,0.04)] transition-colors duration-[120ms]"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={onAffirm}
          disabled={!allChecked}
          className="inline-flex items-center gap-1.5 bg-navy text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-navy-2 transition-colors duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Affirm and continue
          <ArrowRight size={14} />
        </button>
      </OverlayFooter>
    </OverlayShell>
  );
}
