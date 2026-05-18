"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirstRunStore } from "@/lib/firstrun-store";
import NetworkBadge from "./layout/NetworkBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

type Path = "trial" | "key" | "buy" | null;

// ─── Primitives ───────────────────────────────────────────────────────────────

function Chip({ children, variant }: { children: React.ReactNode; variant: "sage" | "neutral" }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-px rounded-full text-[11px] font-medium",
      variant === "sage" ? "bg-sage-soft text-sage" : "bg-surface-3 text-ink-3",
    )}>
      {children}
    </span>
  );
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function Hero({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-9 pt-8 pb-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center size-8 rounded-md bg-navy text-white
                           font-serif italic font-medium text-lg leading-none select-none">
            D
          </span>
          <div className="text-micro">Welcome to Docket LM</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-surface-3
                     transition-colors duration-[120ms]"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <h1 className="text-display text-[36px] m-0 leading-[1.15]">
        Built so your client material never has to leave this machine.
      </h1>
      <p className="text-body mt-3 text-ink-2 leading-[1.6] max-w-[560px]">
        Docket reads, indexes, and answers questions about your matter
        folder on-device. There is no cloud step. The Rust core verifies
        zero outbound traffic; you can confirm with{" "}
        <span className="font-mono-sm">lsof</span> or Little Snitch.
      </p>
    </div>
  );
}

function PathOption({
  title,
  note,
  primary,
  selected,
  onClick,
}: {
  title:    string;
  note:     string;
  primary?: boolean;
  selected: boolean;
  onClick:  () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-3.5 px-4 rounded-md text-left transition-all duration-[120ms] w-full",
        selected
          ? "border border-navy bg-navy-soft shadow-[0_0_0_3px_var(--navy-soft)]"
          : "border border-rule bg-surface hover:border-rule-strong",
      )}
    >
      <div className="flex flex-col mr-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[15px] text-ink">{title}</span>
          {primary && <Chip variant="sage">Recommended</Chip>}
        </div>
        <div className="text-small mt-1 text-ink-3">{note}</div>
      </div>
      <span className={cn(
        "size-[18px] rounded-full border-[1.5px] grid place-items-center shrink-0",
        selected ? "border-navy bg-navy" : "border-rule-strong bg-transparent",
      )}>
        {selected && <span className="size-1.5 rounded-full bg-white" />}
      </span>
    </button>
  );
}

function PathChooser({ path, setPath }: { path: Path; setPath: (p: Path) => void }) {
  return (
    <div className="px-9 pt-3">
      <div className="text-micro mb-3">Choose a path</div>
      <div className="flex flex-col gap-2 mb-6">
        <PathOption
          title="Start 14-day trial"
          note="All features unlocked. No credit card. Recommended."
          primary
          selected={path === "trial"}
          onClick={() => setPath("trial")}
        />
        <PathOption
          title="I have a license key"
          note="Paste the key from your purchase email below."
          selected={path === "key"}
          onClick={() => setPath("key")}
        />
        <PathOption
          title="Buy a license — $199.95 / year"
          note="Opens docketlm.app in your default browser."
          selected={path === "buy"}
          onClick={() => setPath("buy")}
        />
      </div>
    </div>
  );
}

function KeyEntry({ onKeyChange }: { onKeyChange: (k: string) => void }) {
  return (
    <div className="mx-9 mb-6 p-4 bg-surface-2 border border-rule rounded-md animate-slide-up">
      <div className="text-micro mb-2">License key</div>
      <input
        className="w-full bg-surface border border-rule rounded-md px-3 py-2
                   font-mono-sm text-[13px] text-ink outline-none
                   focus:border-navy focus:ring-[2px] focus:ring-navy-soft
                   transition-colors duration-[120ms]"
        placeholder="DLM-XXXX-XXXX-XXXX-XXXX-XXXX"
        onChange={(e) => onKeyChange(e.target.value)}
      />
      <div className="text-small mt-2 text-ink-3">
        Validated locally against the public key bundled with the binary. No network call.
      </div>
    </div>
  );
}

function PermItem({ name, purpose }: { name: string; purpose: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="size-1.5 rounded-full bg-ink-3 mt-[7px] shrink-0" />
      <div>
        <span className="text-sm font-medium text-ink">{name}</span>
        <span className="text-small text-ink-3"> — {purpose}</span>
      </div>
    </div>
  );
}

function PermissionsList() {
  return (
    <div className="px-9 mb-6">
      <div className="h-px bg-rule mb-6" />
      <div className="text-micro mb-3">Permissions Docket will request</div>
      <div className="flex flex-col gap-1">
        <PermItem
          name="Full Disk Access"
          purpose="Read your Apple Mail and iMessage stores (scoped per matter)."
        />
        <PermItem
          name="Photos"
          purpose="Read image folders or scoped Photos albums you attach to a matter."
        />
      </div>

      <div className="flex gap-3 mt-4 p-3.5 px-4 bg-sage-soft border border-sage/20 rounded-lg">
        <Check className="size-4 text-sage mt-0.5 shrink-0" strokeWidth={2.4} />
        <div className="text-small text-sage leading-[1.5]">
          You are responsible for the lawyer-client privilege of what you
          ingest, and for verifying every citation before relying. Docket
          does not provide legal advice, and using it does not relieve you
          of competence, confidentiality, supervision, or billing
          obligations under ABA Rule 1.6 and Op. 512.
        </div>
      </div>
    </div>
  );
}

const CONTINUE_LABEL: Record<NonNullable<Path>, string> = {
  trial: "Start trial",
  key:   "Activate",
  buy:   "Open browser",
};

function Footer({
  path,
  keyValue,
  onClose,
}: {
  path:     Path;
  keyValue: string;
  onClose:  () => void;
}) {
  const { dismiss } = useFirstRunStore();

  function handleContinue() {
    if (!path) return;
    if (path === "trial") {
      dismiss();
    } else if (path === "key") {
      console.log("activating key:", keyValue);
      dismiss();
    } else if (path === "buy") {
      window.open("https://docketlm.app/pricing", "_blank", "noopener");
      dismiss();
    }
  }

  return (
    <div className="flex items-center justify-between px-9 py-4
                    border-t border-rule bg-surface-2">
      <NetworkBadge verbose />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-ink-2 rounded-md
                     hover:text-ink hover:bg-[rgba(20,18,12,0.04)]
                     transition-colors duration-[120ms]"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!path}
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium",
            "transition-colors duration-[120ms]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            path
              ? "bg-navy text-white hover:bg-navy-2"
              : "bg-surface-3 text-ink-3",
          )}
        >
          {path ? CONTINUE_LABEL[path] : "Choose a path to continue"}
          {path && <ArrowRight className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function FirstRunModal() {
  const { isOpen, show, dismiss } = useFirstRunStore();
  const [path, setPath]     = useState<Path>(null);
  const [keyValue, setKey]  = useState("");

  // Check localStorage on first mount.
  useEffect(() => {
    if (localStorage.getItem("docket-firstrun-seen") !== "1") {
      show();
    }
  }, [show]);

  if (!isOpen) return null;

  function handleClose() {
    dismiss();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        className="fixed inset-0 bg-[rgba(20,18,12,0.42)] z-[70] animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal card */}
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-6 pointer-events-none">
        <div
          className="max-w-[760px] w-full max-h-[calc(100vh-48px)] overflow-y-auto
                     bg-paper border border-rule rounded-[14px] shadow-3
                     animate-slide-up pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to Docket LM"
          onClick={(e) => e.stopPropagation()}
        >
          <Hero onClose={handleClose} />
          <PathChooser path={path} setPath={setPath} />
          {path === "key" && <KeyEntry onKeyChange={setKey} />}
          <PermissionsList />
          <Footer path={path} keyValue={keyValue} onClose={handleClose} />
        </div>
      </div>
    </>
  );
}
