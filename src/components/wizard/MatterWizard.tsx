"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Check, ChevronLeft, ChevronRight,
  FileText, Folder, Image, Mail, MessageCircle, Mic, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DropZone from "@/components/library/DropZone";
import NetworkBadge from "@/components/layout/NetworkBadge";

// ─── Types ───────────────────────────────────────────────────────────────────

type SourceType = "folder" | "mail" | "message" | "photos" | "audio" | "note";
type OutlierDecision = "include" | "exclude";

interface Source {
  id: string;
  type: SourceType;
  label: string;
  count: number;
  scope: string;
}

interface Outlier {
  id: string;
  filename: string;
  reason: string;
}

// Shown in dev / demo. In production these come from the ingest stream result.
const MOCK_OUTLIERS: Outlier[] = [
  {
    id: "o1",
    filename: "personal-expenses-q3-2001.xlsx",
    reason: "Document cluster suggests personal finances — unrelated to the securities enforcement matter",
  },
  {
    id: "o2",
    filename: "watkins-voicemail-2001-10-12.m4a",
    reason: "Audio outside matter date range and speaker not found in parties list",
  },
];

const STEPS = ["Name", "Practice area", "Attach material", "Review"];

// ─── Practice areas ───────────────────────────────────────────────────────────

const PRACTICE_AREAS = [
  { id: "probate",    label: "Probate & Trusts",       schema: "Bespoke schema",  note: "Will contests, trust administration, estate planning" },
  { id: "family",     label: "Family Law",              schema: "Bespoke schema",  note: "Dissolution, custody, support, prenuptial" },
  { id: "pi",         label: "Personal Injury",         schema: "Bespoke schema",  note: "Tort, negligence, med-mal, products liability" },
  { id: "immigration",label: "Immigration",             schema: "General schema",  note: "Removal, asylum, visa, naturalization" },
  { id: "employment", label: "Employment",              schema: "General schema",  note: "Discrimination, wage & hour, wrongful termination" },
  { id: "criminal",   label: "Criminal Defense",        schema: "General schema",  note: "Felony, misdemeanor, appellate" },
  { id: "ip",         label: "Intellectual Property",   schema: "General schema",  note: "Patent, trademark, copyright, trade secret" },
  { id: "other",      label: "Other / Unlisted",        schema: "General schema",  note: "Business litigation, real estate, contracts, and more" },
] as const;

// ─── Ingest stages ────────────────────────────────────────────────────────────

const STAGES: { label: string; range: [number, number] }[] = [
  { label: "Hashing & deduplicating",                        range: [0.00, 0.12] },
  { label: "Extracting text (unpdf · mammoth · tesseract)",  range: [0.12, 0.38] },
  { label: "OCR pass on scanned PDFs and images",            range: [0.38, 0.52] },
  { label: "Local audio transcription (Whisper.cpp)",        range: [0.52, 0.62] },
  { label: "Chunking & embedding (nomic-embed-text)",        range: [0.62, 0.85] },
  { label: "Building LanceDB index & clustering pass",       range: [0.85, 1.00] },
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MatterWizard() {
  const router = useRouter();
  const matterId = useRef(`matter-${Date.now()}`);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [practice, setPractice] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [itemsDone, setItemsDone] = useState(0);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [ingestDone, setIngestDone] = useState(false);
  const [outliers, setOutliers] = useState<Outlier[]>([]);
  const [decisions, setDecisions] = useState<Record<string, OutlierDecision>>({});

  const canAdvance =
    step === 0 ? name.trim().length > 0 :
    step === 1 ? practice !== null :
    step === 2 ? sources.length > 0 :
    true;

  const isLast = step === STEPS.length - 1;

  function back() { setStep((s) => Math.max(0, s - 1)); }
  function next() {
    if (!canAdvance) return;
    if (isLast) { startIngest(); return; }
    setStep((s) => s + 1);
  }

  function addSource(type: SourceType, label: string, count: number, scope: string) {
    setSources((prev) => [...prev, { id: crypto.randomUUID(), type, label, count, scope }]);
    setPickerOpen(false);
  }

  function removeSource(id: string) {
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  function attachFolder(name: string, fileCount: number) {
    addSource("folder", name, fileCount, `~/Documents/${name}`);
  }

  function startIngest() {
    const total = Math.max(sources.reduce((sum, s) => sum + s.count, 0), 20);
    setItemsTotal(total);
    setIngesting(true);
  }

  // Simulate streaming ingest progress
  useEffect(() => {
    if (!ingesting) return;
    const startTime = Date.now();
    const totalMs = 8000;
    const id = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / totalMs, 1);
      setProgress(p);
      setItemsDone(Math.round(p * itemsTotal));
      if (p >= 1) {
        clearInterval(id);
        // Surface outlier confirm before navigating away.
        setTimeout(() => {
          setIngestDone(true);
          setOutliers(MOCK_OUTLIERS);
        }, 800);
      }
    }, 80);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingesting]);

  // Navigate once every outlier has a decision.
  useEffect(() => {
    if (!ingestDone || outliers.length === 0) return;
    const allDecided = outliers.every((o) => o.id in decisions);
    if (allDecided) router.push(`/matter/${matterId.current}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisions, ingestDone, outliers]);

  if (ingesting) {
    return (
      <IngestProgress
        matterName={name}
        progress={progress}
        itemsDone={itemsDone}
        itemsTotal={itemsTotal}
        done={ingestDone}
        outliers={outliers}
        decisions={decisions}
        onDecide={(id, decision) =>
          setDecisions((prev) => ({ ...prev, [id]: decision }))
        }
        onAutoAcceptAll={() => {
          const all: Record<string, OutlierDecision> = {};
          for (const o of outliers) all[o.id] = "include";
          setDecisions(all);
        }}
      />
    );
  }

  return (
    <div className="max-w-[880px] mx-auto px-7 pt-9 pb-20">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 -ml-2 rounded-md text-sm text-ink-2
                     hover:text-ink hover:bg-[rgba(20,18,12,0.04)] transition-colors duration-[120ms]"
        >
          <ChevronLeft className="size-4" />
          Library
        </Link>
        <span className="font-mono-sm text-ink-3">Step {step + 1} of {STEPS.length}</span>
      </header>

      <Stepper steps={STEPS} current={step} onJump={setStep} />

      {/* Step content */}
      <div className="mt-8 animate-slide-up" key={step}>
        {step === 0 && (
          <StepName name={name} setName={setName} onSubmit={() => canAdvance && next()} />
        )}
        {step === 1 && (
          <StepPractice practice={practice} setPractice={setPractice} />
        )}
        {step === 2 && (
          <StepAttach
            sources={sources}
            onAttachFolder={attachFolder}
            onRemove={removeSource}
            onAddOther={() => setPickerOpen(true)}
          />
        )}
        {step === 3 && (
          <StepReview name={name} practice={practice} sources={sources} />
        )}
      </div>

      {/* Footer nav */}
      <footer className="flex items-center justify-between mt-8 pt-6 border-t border-rule">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-rule-strong bg-surface
                     text-sm text-ink hover:bg-surface-2 transition-colors duration-[120ms]
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-md text-sm text-ink-2
                       hover:text-ink hover:bg-[rgba(20,18,12,0.04)] transition-colors duration-[120ms]"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={next}
            disabled={!canAdvance}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-navy text-white text-sm font-[450]
                       hover:bg-navy-2 transition-colors duration-[120ms]
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLast ? (
              <>Ingest workspace <ArrowRight className="size-4" /></>
            ) : (
              <>Continue <ChevronRight className="size-4" /></>
            )}
          </button>
        </div>
      </footer>

      {pickerOpen && (
        <SourcePickerModal
          onAdd={addSource}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({
  steps,
  current,
  onJump,
}: {
  steps: readonly string[];
  current: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      {steps.map((s, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <button
            key={s}
            type="button"
            disabled={i > current}
            onClick={() => i <= current && onJump(i)}
            className={cn(
              "px-3.5 py-2.5 rounded-md text-[13.5px] flex items-center gap-2 transition-colors duration-[120ms]",
              active && "bg-surface border border-rule-strong font-medium text-ink",
              done && "text-ink-2 hover:bg-[rgba(20,18,12,0.04)]",
              !active && !done && "text-ink-4 cursor-default",
            )}
          >
            <span
              className={cn(
                "size-5 rounded-full grid place-items-center text-[11px] font-medium tabular-nums",
                done && "bg-navy text-white",
                active && "bg-ink text-white",
                !active && !done && "bg-surface-3 text-ink-3",
              )}
            >
              {done ? <Check className="size-2.5" strokeWidth={2.5} /> : i + 1}
            </span>
            {s}
          </button>
        );
      })}
    </div>
  );
}

// ─── Step 0 — Name ────────────────────────────────────────────────────────────

function StepName({
  name,
  setName,
  onSubmit,
}: {
  name: string;
  setName: (v: string) => void;
  onSubmit: () => void;
}) {
  const slug = slugify(name);
  return (
    <div>
      <h1 className="text-h1 m-0">What&apos;s the matter called?</h1>
      <p className="text-body-2 mt-2 max-w-[540px]">
        Use the caption you&apos;d write at the top of a memo. Docket stores it as a
        folder name and uses it only on this machine.
      </p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="e.g. In re Enron — first read"
        className="w-full px-4 py-3 mt-6 rounded-md border border-rule-strong bg-surface
                   text-[15px] text-ink placeholder:text-ink-4
                   focus:outline-none focus:shadow-[0_0_0_3px_var(--navy-soft)]
                   transition-shadow duration-[120ms]"
      />
      {slug && (
        <p className="text-small mt-2 text-ink-3">
          A folder will be created at{" "}
          <span className="font-mono-sm">
            ~/Library/Application Support/Docket/matters/{slug}/
          </span>
        </p>
      )}
    </div>
  );
}

// ─── Step 1 — Practice area ───────────────────────────────────────────────────

function StepPractice({
  practice,
  setPractice,
}: {
  practice: string | null;
  setPractice: (v: string) => void;
}) {
  return (
    <div>
      <h1 className="text-h1 m-0">What kind of matter is this?</h1>
      <p className="text-body-2 mt-2 max-w-[540px]">
        The practice area selects the brief schema — what sections are generated
        and in what order.
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2.5 mt-6">
        {PRACTICE_AREAS.map((area) => {
          const selected = practice === area.id;
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => setPractice(area.id)}
              className={cn(
                "relative text-left p-4 rounded-md border transition-all duration-[120ms]",
                selected
                  ? "border-navy bg-navy-soft shadow-[0_0_0_3px_var(--navy-soft)]"
                  : "border-rule bg-surface hover:border-rule-strong",
              )}
            >
              {selected && (
                <span className="absolute top-3 right-3 grid place-items-center size-5 rounded-full bg-navy text-white">
                  <Check className="size-3" strokeWidth={2.5} />
                </span>
              )}
              <div className="font-medium text-[14px] text-ink pr-7">{area.label}</div>
              <div
                className={cn(
                  "text-micro mt-1",
                  selected ? "text-navy" : "text-ink-4",
                )}
              >
                {area.schema}
              </div>
              <div className="text-small mt-2 text-ink-3 leading-snug">{area.note}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2 — Attach material ─────────────────────────────────────────────────

function StepAttach({
  sources,
  onAttachFolder,
  onRemove,
  onAddOther,
}: {
  sources: Source[];
  onAttachFolder: (name: string, count: number) => void;
  onRemove: (id: string) => void;
  onAddOther: () => void;
}) {
  return (
    <div>
      <h1 className="text-h1 m-0">Attach material</h1>
      <p className="text-body-2 mt-2 max-w-[540px]">
        Drop a folder, connect a mailbox, or add individual files. Docket reads
        everything locally — nothing is uploaded.
      </p>
      <div className="mt-6">
        <DropZone onAttach={onAttachFolder} onAddOther={onAddOther} />
      </div>
      {sources.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {sources.map((src) => (
            <SourceRow key={src.id} source={src} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 3 — Review ─────────────────────────────────────────────────────────

function StepReview({
  name,
  practice,
  sources,
}: {
  name: string;
  practice: string | null;
  sources: Source[];
}) {
  const area = PRACTICE_AREAS.find((a) => a.id === practice);
  const totalItems = sources.reduce((sum, s) => sum + s.count, 0);

  return (
    <div>
      <h1 className="text-h1 m-0">Review & ingest</h1>
      <p className="text-body-2 mt-2 max-w-[540px]">
        Confirm the matter details, then start local ingestion.
      </p>

      {/* Summary card */}
      <div className="mt-6 p-5 rounded-md border border-rule bg-surface shadow-1">
        <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-rule">
          <div>
            <div className="text-micro mb-1.5">Matter name</div>
            <div className="text-h3">{name}</div>
          </div>
          {area && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-navy-soft text-navy text-xs font-medium shrink-0">
              {area.label}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <ReviewStat label="Sources" value={String(sources.length)} />
          <ReviewStat label="Items" value={totalItems.toLocaleString()} />
          <ReviewStat label="Network calls" value="0" />
        </div>

        <div className="flex flex-col gap-2">
          {sources.map((src) => (
            <SourceRow key={src.id} source={src} />
          ))}
        </div>
      </div>

      {/* Privacy confirmation strip */}
      <div className="flex gap-3 p-4 mt-4 bg-sage-soft border border-sage-soft-2 rounded-lg">
        <Check className="size-4 text-sage mt-0.5 shrink-0" strokeWidth={2.4} />
        <div className="text-small text-sage leading-[1.5]">
          Nothing about these documents will leave the machine. The Rust core
          has zero outbound network commands. You can verify this in
          Settings → Network audit.
        </div>
      </div>
    </div>
  );
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <div className="text-micro mb-1">{label}</div>
      <div className="text-[20px] font-medium text-ink">{value}</div>
    </div>
  );
}

// ─── Source row ───────────────────────────────────────────────────────────────

const SOURCE_ICONS: Record<SourceType, React.ElementType> = {
  folder:  Folder,
  mail:    Mail,
  message: MessageCircle,
  photos:  Image,
  audio:   Mic,
  note:    FileText,
};

function SourceRow({
  source,
  onRemove,
}: {
  source: Source;
  onRemove?: (id: string) => void;
}) {
  const Icon = SOURCE_ICONS[source.type];
  return (
    <div className="flex items-center gap-3.5 p-3 bg-surface border border-rule rounded-lg">
      <span className="grid place-items-center size-8 rounded-md bg-navy-soft text-navy shrink-0">
        <Icon className="size-4" />
      </span>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-ink">{source.label}</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-3 text-xs text-ink-3">
            {source.count} item{source.count !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="font-mono-sm text-xs mt-[3px] text-ink-3 truncate">{source.scope}</div>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(source.id)}
          className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-surface-3 transition-colors duration-[120ms]"
          aria-label="Remove source"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Source picker modal ──────────────────────────────────────────────────────

const SOURCE_PICKER_ITEMS: { type: SourceType; label: string; note: string }[] = [
  { type: "folder",  label: "Folder",       note: "Any folder on this machine" },
  { type: "mail",    label: "Mailbox",       note: "Apple Mail or Outlook" },
  { type: "message", label: "Messages",      note: "iMessage or SMS threads" },
  { type: "photos",  label: "Photos",        note: "Album or individual images" },
  { type: "audio",   label: "Audio / video", note: "Voicemails, recordings, depositions" },
  { type: "note",    label: "Scratch note",  note: "Type or paste text directly" },
];

function SourcePickerModal({
  onAdd,
  onClose,
}: {
  onAdd: (type: SourceType, label: string, count: number, scope: string) => void;
  onClose: () => void;
}) {
  const dialogId = useId();

  function pick(type: SourceType, label: string) {
    // Stub — in Tauri this opens the OS picker for each source type.
    onAdd(type, label, 1, `${label} source`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-ink/20" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogId}
        className="relative z-10 w-full max-w-[420px] mx-4 bg-surface rounded-lg border border-rule shadow-3 animate-slide-up"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-rule">
          <h2 id={dialogId} className="text-[15px] font-medium text-ink">Add a source</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-ink-3 hover:text-ink hover:bg-surface-3 transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-2">
          {SOURCE_PICKER_ITEMS.map((item) => {
            const Icon = SOURCE_ICONS[item.type];
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => pick(item.type, item.label)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md
                           hover:bg-surface-2 transition-colors duration-[120ms] text-left"
              >
                <span className="grid place-items-center size-8 rounded-md bg-navy-soft text-navy shrink-0">
                  <Icon className="size-4" />
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium text-ink">{item.label}</span>
                  <span className="text-small text-ink-3">{item.note}</span>
                </div>
                <ChevronRight className="size-4 text-ink-4 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── IngestProgress ───────────────────────────────────────────────────────────

function IngestProgress({
  matterName,
  progress,
  itemsDone,
  itemsTotal,
  done,
  outliers,
  decisions,
  onDecide,
  onAutoAcceptAll,
}: {
  matterName: string;
  progress: number;
  itemsDone: number;
  itemsTotal: number;
  done: boolean;
  outliers: Outlier[];
  decisions: Record<string, OutlierDecision>;
  onDecide: (id: string, decision: OutlierDecision) => void;
  onAutoAcceptAll: () => void;
}) {
  return (
    <div className="max-w-[880px] mx-auto px-7 pt-10">
      <div className="p-8 rounded-lg border border-rule bg-surface shadow-1 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <NetworkBadge verbose />
          <span className="font-mono-sm text-ink-3">· Rust core verifies via socket inspection</span>
        </div>
        <h1 className="text-h1 m-0">Reading {matterName} locally…</h1>
        <p className="text-body-2 mt-2">
          Embeddings, OCR, and transcription all run on this machine. The
          first brief section will stream in seconds after ingest finishes.
        </p>

        {/* Progress bar */}
        <div className="mt-6 h-1.5 bg-surface-3 rounded-sm overflow-hidden">
          <div
            className="h-full bg-navy transition-[width] duration-[100ms] rounded-sm"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="font-mono-sm">{itemsDone} / {itemsTotal} items</span>
          <span className="font-mono-sm">{Math.round(progress * 100)}%</span>
        </div>

        {/* Stages */}
        <div className="mt-6 flex flex-col gap-2">
          {STAGES.map((s) => <StageRow key={s.label} stage={s} progress={progress} />)}
        </div>
      </div>

      {/* Outlier confirmation — appears inline below the progress card */}
      {done && outliers.length > 0 && (
        <OutlierConfirm
          outliers={outliers}
          decisions={decisions}
          onDecide={onDecide}
          onAutoAcceptAll={onAutoAcceptAll}
        />
      )}
    </div>
  );
}

function StageRow({
  stage,
  progress,
}: {
  stage: { label: string; range: [number, number] };
  progress: number;
}) {
  const done   = progress >= stage.range[1];
  const active = progress >= stage.range[0] && !done;

  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "size-4 rounded-full shrink-0 grid place-items-center",
          done   && "bg-sage",
          active && "bg-navy-soft border border-navy-soft-2",
          !done && !active && "bg-surface-2 border border-rule",
        )}
      >
        {done   && <Check className="size-2.5 text-white" strokeWidth={3} />}
        {active && <span className="size-1.5 rounded-full bg-navy animate-docket-pulse" />}
      </span>
      <span
        className={cn(
          "text-[13.5px]",
          done   && "text-ink-3 line-through",
          active && "text-ink font-medium",
          !done && !active && "text-ink-4",
        )}
      >
        {stage.label}
      </span>
    </div>
  );
}

// ─── Outlier confirmation ─────────────────────────────────────────────────────

function OutlierConfirm({
  outliers,
  decisions,
  onDecide,
  onAutoAcceptAll,
}: {
  outliers: Outlier[];
  decisions: Record<string, OutlierDecision>;
  onDecide: (id: string, decision: OutlierDecision) => void;
  onAutoAcceptAll: () => void;
}) {
  const [countdown, setCountdown] = useState(5);

  // Auto-accept all undecided items after countdown.
  useEffect(() => {
    if (countdown <= 0) { onAutoAcceptAll(); return; }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  // Stop countdown once all items are manually decided.
  const allDecided = outliers.every((o) => o.id in decisions);
  useEffect(() => {
    if (allDecided) setCountdown(0);
  }, [allDecided]);

  return (
    <div className="mt-4 p-6 rounded-lg border border-amber-soft bg-amber-soft animate-slide-up">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-micro text-amber mb-1">Clustering review</div>
          <h2 className="text-h3 m-0">
            {outliers.length} item{outliers.length !== 1 ? "s" : ""} flagged as possible outlier{outliers.length !== 1 ? "s" : ""}
          </h2>
          <p className="text-small mt-1.5 text-ink-2 max-w-[520px]">
            The clustering pass found these items may be unrelated to the matter.
            Decide per item — flagged items are included but marked in the brief.
          </p>
        </div>
        {!allDecided && (
          <span className="shrink-0 font-mono-sm text-amber-500 tabular-nums">
            auto-include in {countdown}s
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {outliers.map((outlier) => {
          const decision = decisions[outlier.id] ?? null;
          return (
            <div
              key={outlier.id}
              className={cn(
                "p-4 rounded-md border bg-surface transition-colors duration-[120ms]",
                decision === "include" ? "border-sage-soft-2 bg-sage-soft/40" :
                decision === "exclude" ? "border-rule bg-surface-2 opacity-60" :
                "border-rule",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-mono-sm text-ink truncate">{outlier.filename}</div>
                  <div className="text-small mt-1 text-ink-3 leading-snug">{outlier.reason}</div>
                </div>
                {decision ? (
                  <span className={cn(
                    "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    decision === "include" ? "bg-sage-soft text-sage" : "bg-surface-3 text-ink-3",
                  )}>
                    {decision === "include" ? (
                      <><Check className="size-3" strokeWidth={2.5} /> Included with flag</>
                    ) : (
                      <><X className="size-3" /> Excluded</>
                    )}
                  </span>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onDecide(outlier.id, "include")}
                      className="px-3 py-1.5 rounded-md bg-navy text-white text-sm font-[450]
                                 hover:bg-navy-2 transition-colors duration-[120ms]"
                    >
                      Include with flag
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecide(outlier.id, "exclude")}
                      className="px-3 py-1.5 rounded-md border border-rule-strong bg-surface text-sm text-ink
                                 hover:bg-surface-2 transition-colors duration-[120ms]"
                    >
                      Exclude
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
