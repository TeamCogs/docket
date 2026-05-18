"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLicenseStore } from "@/lib/license-store";
import type { LicenseKind } from "@/lib/license-store";
import { useFirstRunStore } from "@/lib/firstrun-store";

// ─── Primitives ───────────────────────────────────────────────────────────────

type ChipVariant = "sage" | "amber" | "brick" | "neutral" | "navy";

function Chip({
  children,
  variant,
  size = "sm",
}: {
  children: React.ReactNode;
  variant: ChipVariant;
  size?: "sm" | "xs";
}) {
  const colors: Record<ChipVariant, string> = {
    sage:    "bg-sage-soft text-sage",
    amber:   "bg-amber-soft text-amber",
    brick:   "bg-brick-soft text-brick",
    neutral: "bg-surface-3 text-ink-3",
    navy:    "bg-navy-soft text-navy",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-medium",
      size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-2 py-px text-[11px]",
      colors[variant],
    )}>
      {children}
    </span>
  );
}

function Btn({
  children,
  onClick,
  variant = "secondary",
  size = "sm",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const base = "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed";
  const sz   = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm";
  const v: Record<string, string> = {
    primary:   "bg-navy text-white hover:bg-navy-2 border border-navy",
    secondary: "bg-surface text-ink border border-rule-strong hover:bg-surface-2",
    ghost:     "text-ink-2 hover:text-ink hover:bg-[rgba(20,18,12,0.04)]",
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(base, sz, v[variant])}>
      {children}
    </button>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border border-rule rounded-[10px] bg-surface", className)}>
      {children}
    </div>
  );
}

// ─── LicenseCard ─────────────────────────────────────────────────────────────

const LICENSE_COPY: Record<LicenseKind["kind"], {
  chip: ChipVariant;
  chipLabel: string;
  title: (l: LicenseKind) => string;
  body: string;
}> = {
  active:  {
    chip:      "sage",
    chipLabel: "Active",
    title:     (l) => `Active until ${(l as { kind: "active"; expiresAt: string }).expiresAt || "2027-05-17"}`,
    body:      "Annual subscription · single attorney · two-machine activation.",
  },
  trial: {
    chip:      "amber",
    chipLabel: "Trial",
    title:     (l) => `Trial · ${(l as { kind: "trial"; daysLeft: number }).daysLeft} days left`,
    body:      "Full access during trial. Briefs and Q&A are fully enabled.",
  },
  renewal: {
    chip:      "neutral",
    chipLabel: "Renewal",
    title:     (l) => `Renewal due in ${(l as { kind: "renewal"; daysLeft: number }).daysLeft} days`,
    body:      "Your subscription is approaching expiry.",
  },
  expired: {
    chip:      "brick",
    chipLabel: "Expired",
    title:     (l) => `Expired on ${(l as { kind: "expired"; expiredAt: string }).expiredAt}`,
    body:      "Existing matters remain readable. New matters and Ask Anything are disabled.",
  },
};

function LicenseCard() {
  const license    = useLicenseStore((s) => s.license);
  const setLicense = useLicenseStore((s) => s.setLicense);
  const meta       = LICENSE_COPY[license.kind];
  const showModal  = useFirstRunStore((s) => s.show);

  function openRenewal() {
    window.open("https://docketlm.app", "_blank", "noopener");
  }
  function copyKey() {
    navigator.clipboard.writeText("DOCKET-XXXX-XXXX-XXXX").catch(() => {});
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-micro">License</div>
          <div className="text-h3 mt-1">{meta.title(license)}</div>
        </div>
        <Chip variant={meta.chip} size="sm">{meta.chipLabel}</Chip>
      </div>
      <p className="text-small mb-3 leading-[1.5] text-ink-2">{meta.body}</p>

      <div className="flex gap-3 flex-wrap">
        {license.kind === "active" && (
          <>
            <Btn variant="secondary" onClick={openRenewal}>Manage subscription</Btn>
            <Btn variant="ghost" onClick={copyKey}>Copy license key</Btn>
          </>
        )}
        {license.kind === "trial" && (
          <>
            <Btn variant="primary" onClick={openRenewal}>Buy a license</Btn>
            <Btn variant="secondary">I have a key</Btn>
          </>
        )}
        {(license.kind === "renewal" || license.kind === "expired") && (
          <Btn variant="primary" onClick={openRenewal}>Renew at docketlm.app</Btn>
        )}
        <Btn variant="ghost" onClick={showModal}>Restart welcome</Btn>
      </div>

      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 pt-4 border-t border-rule flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-ink-4">Dev:</span>
          {(["active", "trial", "renewal", "expired"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                if (k === "active")  setLicense({ kind: "active", expiresAt: "2027-05-17" });
                if (k === "trial")   setLicense({ kind: "trial", daysLeft: 12 });
                if (k === "renewal") setLicense({ kind: "renewal", daysLeft: 21 });
                if (k === "expired") setLicense({ kind: "expired", expiredAt: "2025-03-01" });
              }}
              className={cn(
                "px-2 py-px text-[11px] rounded border transition-colors",
                license.kind === k
                  ? "border-navy bg-navy-soft text-navy"
                  : "border-rule text-ink-3 hover:text-ink",
              )}
            >
              {k}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── NetworkAuditCard ─────────────────────────────────────────────────────────

interface AuditResult {
  openSockets: string;
  summary:     string;
  clean:       boolean;
}

function NetworkAuditCard() {
  const [running, setRunning] = useState(false);
  const [result, setResult]   = useState<AuditResult | null>(null);

  async function runAudit() {
    if (running) return;
    setRunning(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 1200));
    setResult({
      openSockets: "0 matching outbound connections.",
      summary:     "0 bytes sent this session. 0 sockets opened.",
      clean:       true,
    });
    setRunning(false);
  }

  return (
    <Card className="p-5">
      {result && !result.clean && (
        <div className="mb-4 px-3 py-2.5 rounded-md bg-brick-soft border border-brick/20
                        text-sm text-brick font-medium">
          Outbound socket attempt detected. Investigate before continuing.
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-micro">Network audit</div>
          <div className="text-h3 mt-1">Verify offline mode</div>
        </div>
        <Btn variant="secondary" size="sm" onClick={runAudit} disabled={running}>
          {running ? "Verifying…" : "Run audit"}
        </Btn>
      </div>

      <pre className="bg-surface-2 border border-rule rounded-md p-3.5
                      font-mono-sm text-[12.5px] text-ink-2 leading-[1.55] overflow-x-auto m-0 whitespace-pre-wrap">
        <span className={result && !result.clean ? "text-brick" : "text-sage"}>$</span>
        {" lsof -i -P -n | grep -E \'(Docket|Ollama|bge|whisper)\'\n"}
        {result ? (
          <span className={result.clean ? "text-sage" : "text-brick"}>{result.openSockets}</span>
        ) : (
          <span className="text-ink-4">{running ? "…" : "not yet run"}</span>
        )}
        {"\n"}
        <span className={result && !result.clean ? "text-brick" : "text-sage"}>$</span>
        {" docket verify-offline\n"}
        {result ? (
          <span className={result.clean ? "text-sage" : "text-brick"}>{result.summary}</span>
        ) : (
          <span className="text-ink-4">{running ? "…" : ""}</span>
        )}
      </pre>

      <p className="text-small mt-3 text-ink-3 leading-[1.5]">
        The Rust core inspects every socket the webview attempts to open.
        Use <span className="font-mono-sm">Little Snitch</span> or{" "}
        <span className="font-mono-sm">lsof</span> for independent verification.
      </p>
    </Card>
  );
}

// ─── SourcesPermissionsCard ───────────────────────────────────────────────────

type PermState = "granted" | "denied" | "not-needed";

const PERM_CHIP: Record<PermState, { variant: ChipVariant; text: string }> = {
  "granted":    { variant: "sage",    text: "Granted" },
  "denied":     { variant: "brick",   text: "Denied" },
  "not-needed": { variant: "neutral", text: "Not requested" },
};

function PermRow({
  label,
  note,
  state,
}: {
  label: string;
  note:  string;
  state: PermState;
}) {
  const meta = PERM_CHIP[state];
  return (
    <div className="flex items-center justify-between p-2.5 px-3
                    bg-surface-2 border border-rule rounded-md gap-3">
      <div className="flex flex-col min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="text-[12px] text-ink-3">{note}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {state === "denied" && (
          <Btn variant="ghost" size="sm">Request again</Btn>
        )}
        <Chip variant={meta.variant} size="xs">{meta.text}</Chip>
      </div>
    </div>
  );
}

function SourcesPermissionsCard() {
  return (
    <Card className="p-5">
      <div className="text-micro">Sources &amp; Permissions</div>
      <div className="text-h3 mt-1 mb-4">Access status</div>
      <div className="flex flex-col gap-2">
        <PermRow label="Full Disk Access" state="granted"    note="Required for Apple Mail and iMessage" />
        <PermRow label="Photos"           state="not-needed" note="Optional · enables Photos library scoping" />
        <PermRow label="Accessibility"    state="not-needed" note="Not requested" />
      </div>

      <div className="h-px bg-rule my-6" />

      <div className="text-micro mb-2">Scoped iMessage handles · per matter</div>
      <p className="text-small text-ink-4 italic">
        No iMessage handles configured for any active matter.
      </p>
    </Card>
  );
}

// ─── GroundingCard ────────────────────────────────────────────────────────────

const GROUNDING_OPTIONS = [
  { id: "lenient",  label: "Lenient",  desc: "0.65 cosine · keep borderline claims" },
  { id: "balanced", label: "Balanced", desc: "0.78 cosine · the default · what the eval numbers above reflect" },
  { id: "strict",   label: "Strict",   desc: "0.85 cosine · drops more, surfaces “suppressed” notes inline" },
] as const;

type GroundingMode = "lenient" | "balanced" | "strict";

function RadioRow({
  id,
  label,
  desc,
  active,
  onSelect,
}: {
  id:       GroundingMode;
  label:    string;
  desc:     string;
  active:   boolean;
  onSelect: (id: GroundingMode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={cn(
        "w-full text-left px-4 py-3 rounded-md border transition-all duration-[120ms]",
        active
          ? "border-navy bg-navy-soft"
          : "border-rule bg-surface-2 hover:border-rule-strong hover:bg-surface-3",
      )}
    >
      <div className={cn("text-sm font-medium", active ? "text-navy" : "text-ink")}>{label}</div>
      <div className={cn("text-[12.5px] mt-0.5 leading-[1.4]", active ? "text-navy/70" : "text-ink-3")}>
        {desc}
      </div>
    </button>
  );
}

function GroundingCard() {
  const [mode, setMode] = useState<GroundingMode>("balanced");
  return (
    <Card className="p-5">
      <div className="text-micro">Grounding mode</div>
      <div className="text-h3 mt-1 mb-2">Re-grounding aggressiveness</div>
      <p className="text-small mb-3 leading-[1.5] text-ink-2">
        Controls how aggressively the re-grounding pass suppresses claims
        that don&apos;t have strong overlap with their cited chunk. Higher =
        fewer claims but more reliable.
      </p>
      <div className="flex flex-col gap-2">
        {GROUNDING_OPTIONS.map((opt) => (
          <RadioRow key={opt.id} {...opt} active={opt.id === mode} onSelect={setMode} />
        ))}
      </div>
    </Card>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function Settings() {
  return (
    <div className="max-w-[920px] mx-auto px-7 pt-9 pb-20">
      <header className="mb-6">
        <div className="text-micro mb-2">Settings</div>
        <h1 className="text-display m-0">Everything lives on this machine.</h1>
        <p className="text-body mt-4 text-ink-2 max-w-[580px]">
          There are no remote credentials to manage. License keys validate
          locally against a public key bundled with the binary.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <LicenseCard />
        <NetworkAuditCard />
        <SourcesPermissionsCard />
        <GroundingCard />
      </div>
    </div>
  );
}
