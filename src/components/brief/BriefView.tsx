"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BarChart2, ChevronLeft, FileText, Plus, Share } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCitationPanel } from "./citation-panel-store";
import { useReadOnly } from "@/lib/license-store";
import CitationPanel from "./CitationPanel";
import ContradictionsPanel from "./ContradictionsPanel";
import type { Contradiction } from "./ContradictionsPanel";
import AskAnything from "../AskAnything";

// Living Matters
import VersionChip from "@/components/living-matters/VersionChip";
import HistoricalBanner from "@/components/living-matters/HistoricalBanner";
import MatterDragOverlay from "@/components/living-matters/MatterDragOverlay";
import AddMaterialPanel from "@/components/living-matters/AddMaterialPanel";
import IngestingPanel from "@/components/living-matters/IngestingPanel";
import ImpactReportOverlay from "@/components/living-matters/ImpactReportOverlay";
import RegenerationPreview from "@/components/living-matters/RegenerationPreview";
import VersionHistoryDrawer from "@/components/living-matters/VersionHistoryDrawer";
import UpdatedTag from "@/components/living-matters/UpdatedTag";

// Handoff
import ConsentAffirmationModal from "@/components/handoff/ConsentAffirmationModal";
import HandoffComposer from "@/components/handoff/HandoffComposer";
import ExternalResearchSection from "@/components/handoff/ExternalResearchSection";
import ResearchImportPanel from "@/components/handoff/ResearchImportPanel";

// Matter Quality
import { ReviewedClaimsProvider, useReviewedClaims } from "@/components/matter-quality/ReviewedClaimsContext";
import { ReviewedStateDot } from "@/components/matter-quality/ReviewedStateDot";
import { MatterQualityPanel } from "@/components/matter-quality/MatterQualityPanel";
import type { ClaimId } from "@/components/matter-quality/types";

import type {
  Brief,
  BriefSection,
  BriefSectionKind,
  BriefV11,
  BriefVersion,
  BriefVersionId,
  Citation,
  ClaimItem,
  ExternalResearch,
  ImpactReport,
  KeyFactsSection,
  MatterSnapshotSection,
  NextStep,
  OpenQuestion,
  PartiesSection,
  PartyRow,
  PseudonymEntry,
  ResidualRisk,
  RiskItem,
  RisksSection,
  TimelineEvent,
  TimelineSection,
} from "@/lib/types";

// ─── Section labels ───────────────────────────────────────────────────────────

const SECTION_LABEL: Record<BriefSectionKind, string> = {
  snapshot:       "Matter Snapshot",
  parties:        "Parties & Roles",
  timeline:       "Timeline of Material Events",
  claims:         "Claims & Causes of Action",
  key_facts:      "Key Facts & Admissions",
  risks:          "Risks & Red Flags",
  open_questions: "Open Questions",
  next_steps:     "Suggested Next Steps",
};

const TOC_LABEL: Record<BriefSectionKind, string> = {
  snapshot:       "Snapshot",
  parties:        "Parties",
  timeline:       "Timeline",
  claims:         "Claims",
  key_facts:      "Key Facts",
  risks:          "Risks",
  open_questions: "Open Questions",
  next_steps:     "Next Steps",
};

// ─── Mock v1.1 data (placeholder until pipeline wires it) ─────────────────────
// In production these come from the brief payload (BriefV11). These defaults
// ensure the UI renders gracefully with v1.0 brief data.

const MOCK_VERSIONS: BriefVersion[] = [
  {
    id: "v1",
    matterId: "",
    versionNumber: 1,
    generatedAt: new Date().toISOString(),
    trigger: "initial",
    triggerSourceIds: [],
    triggerSummary: "Initial brief from matter wizard",
    sectionsRegenerated: [],
    sectionsCarriedForward: [],
    schemaVersion: "general",
    modelVersion: "llama3.2",
    priorVersionId: null,
  },
];

const MOCK_IMPACT_REPORT: ImpactReport = {
  newSource: { label: "new-document.pdf", newChunks: 7 },
  againstVersion: { id: "v1", n: 1 },
  affected: [
    {
      sectionId: "s-risks",
      sectionKind: "risks",
      title: "Risks & Red Flags",
      contradicts: 1,
      adds: 2,
      supports: 3,
      noise: 0,
      summary: "The new material introduces one potential contradiction and adds two new risk items.",
    },
    {
      sectionId: "s-timeline",
      sectionKind: "timeline",
      title: "Timeline of Material Events",
      contradicts: 0,
      adds: 2,
      supports: 1,
      noise: 1,
      summary: "Two new dated events identified; one existing event supported by additional evidence.",
    },
  ],
  unchangedCount: 6,
  resolved: [],
};

const MOCK_PSEUDONYMS: PseudonymEntry[] = [
  { canonical: "Kenneth Lay", role: "Defendant", pseudonym: "Defendant_1", useCount: 47 },
  { canonical: "Jeffrey Skilling", role: "Defendant", pseudonym: "Defendant_2", useCount: 38 },
  { canonical: "Arthur Andersen LLP", role: "Auditor", pseudonym: "Auditor_1", useCount: 22 },
  { canonical: "SEC", role: "Agency", pseudonym: "Agency_1", useCount: 15 },
];

const MOCK_RISKS: ResidualRisk[] = [
  {
    id: "rr-1",
    kind: "specific_date",
    excerpt: "disclosure on October 16, 2001",
    note: "Exact dates in combination with specific corporate events are quasi-identifying.",
    suggestion: "Generalize → Q4 2001",
  },
  {
    id: "rr-2",
    kind: "unique_fact_pattern",
    excerpt: "the only Enron-affiliated SPE to receive preferential treatment in the restructuring",
    note: "Unique fact patterns narrow the universe of matching matters to near-zero.",
    suggestion: "Replace → 'affiliated SPE program'",
  },
];

// ─── Main export ──────────────────────────────────────────────────────────────

export default function BriefView({ brief }: { brief: Brief }) {
  const b = brief as BriefV11;
  const citationOpen = useCitationPanel((s) => s.isOpen);
  const readOnly     = useReadOnly();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement>>({});

  // ── Living Matters state ──
  const versions   = b.versions ?? MOCK_VERSIONS;
  const latestId   = versions[versions.length - 1]?.id ?? "v1";
  const [viewingId, setViewingId] = useState<BriefVersionId>(latestId);
  const isHistorical = viewingId !== latestId;

  const [dragActive, setDragActive]   = useState(false);
  const dragCounter = useRef(0);

  const [showAddMaterial,     setShowAddMaterial]     = useState(false);
  const [pendingFile,         setPendingFile]         = useState<File | null>(null);
  const [showIngesting,       setShowIngesting]       = useState(false);
  const [showImpactReport,    setShowImpactReport]    = useState(false);
  const [showRegenPreview,    setShowRegenPreview]    = useState(false);
  const [showVersionHistory,  setShowVersionHistory]  = useState(false);

  // ── Handoff state ──
  const [showConsent,         setShowConsent]         = useState(false);
  const [consentGiven,        setConsentGiven]        = useState(false);
  const [showHandoffComposer, setShowHandoffComposer] = useState(false);
  const [showImportPanel,     setShowImportPanel]     = useState(false);

  // ── Quality state ──
  const [showQuality, setShowQuality] = useState(false);

  const externalResearch: ExternalResearch[] = b.externalResearch ?? [];

  // Drag handlers — counter trick avoids flicker when crossing child elements
  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) setDragActive(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragActive(false);
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setPendingFile(file);
      setShowAddMaterial(true);
    }
  }

  function openHandoff() {
    if (consentGiven) {
      setShowHandoffComposer(true);
    } else {
      setShowConsent(true);
    }
  }

  // Derive matter metadata from the snapshot section.
  const snap = brief.sections.find((s) => s.kind === "snapshot") as
    | MatterSnapshotSection
    | undefined;
  const sc = snap?.content;
  const caption = brief.matterId
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const dateRange = sc?.dateRange
    ? `${sc.dateRange.from.slice(0, 4)}–${sc.dateRange.to.slice(0, 4)}`
    : "";
  const lastActivity = new Date(brief.generatedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  // Count contradiction risks for the TOC brick dot.
  const contradictionCount = (
    brief.sections.filter((s) => s.kind === "risks") as RisksSection[]
  )
    .flatMap((s) => s.content.risks)
    .filter((r) => r.kind === "contradiction").length;

  // Scroll-spy — RAF-throttled, updates activeSection.
  const scrollToSection = useCallback((id: string) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    let rafId: number;
    function onScroll() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        let found: string | null = null;
        for (const [id, el] of Object.entries(sectionRefs.current)) {
          if (el.getBoundingClientRect().top <= 200) found = id;
        }
        setActiveSection(found);
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const currentVersion  = versions.find((v) => v.id === latestId)  ?? versions[0];
  const viewingVersion  = versions.find((v) => v.id === viewingId) ?? versions[0];

  return (
    <ReviewedClaimsProvider>
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      <MatterDragOverlay active={dragActive} />

      {/* Historical mode banner */}
      {isHistorical && (
        <HistoricalBanner
          viewingVersion={viewingVersion}
          currentVersion={currentVersion}
          onViewCurrent={() => setViewingId(latestId)}
          onRestoreAsCurrent={() => {
            // Creates a new version; wired via IPC in production
            setViewingId(latestId);
          }}
        />
      )}

      {/* Matter header band */}
      <div className="bg-paper-2 border-b border-rule">
        <div className="max-w-[1280px] mx-auto px-7 py-5 flex items-start justify-between gap-6">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 -ml-2 mb-2 px-2 py-1 rounded-md
                         text-sm text-ink-2 hover:text-ink hover:bg-[rgba(20,18,12,0.04)]
                         transition-colors duration-[120ms]"
            >
              <ChevronLeft className="size-4" />
              Library
            </Link>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-h1 m-0">{caption}</h1>
              {/* VersionChip — v1.1 */}
              <VersionChip
                versions={versions}
                currentId={viewingId}
                historical={isHistorical}
                onOpenHistory={() => setShowVersionHistory(true)}
              />
            </div>
            <div className="flex items-center gap-3 mt-2 text-[13px] text-ink-3">
              {sc?.matterTypeGuess && <span>{sc.matterTypeGuess}</span>}
              {sc?.matterTypeGuess && <span>·</span>}
              {sc && <span className="font-mono-sm">{sc.documentCount} documents</span>}
              {sc && <span>·</span>}
              {dateRange && <span className="font-mono-sm">{dateRange}</span>}
              {dateRange && <span>·</span>}
              <span>{lastActivity}</span>
            </div>
          </div>

          <div className="flex gap-2 shrink-0 pt-1">
            {/* Add to matter — disabled in historical / read-only mode */}
            {!isHistorical && (
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setShowAddMaterial(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rule-strong
                           bg-surface text-sm text-ink hover:bg-surface-2 transition-colors duration-[120ms]
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="size-3.5" />
                Add to matter
              </button>
            )}
            {/* Research Handoff — disabled in historical / read-only mode */}
            {!isHistorical && (
              <button
                type="button"
                disabled={readOnly}
                onClick={openHandoff}
                title={readOnly ? "Subscription required" : "Send a redacted draft to outside research"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rule-strong
                           bg-surface text-sm text-ink hover:bg-surface-2 transition-colors duration-[120ms]
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Share className="size-3.5" />
                Research Handoff
              </button>
            )}
            {/* Quality panel */}
            <button
              type="button"
              onClick={() => setShowQuality(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rule-strong
                         bg-surface text-sm text-ink hover:bg-surface-2 transition-colors duration-[120ms]"
            >
              <BarChart2 className="size-3.5" />
              Quality
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rule-strong
                         bg-surface text-sm text-ink hover:bg-surface-2 transition-colors duration-[120ms]"
            >
              <FileText className="size-3.5" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* 3-column grid */}
      <div
        className="max-w-[1280px] mx-auto px-7 pt-8 pb-[140px] grid gap-8
                   transition-[grid-template-columns] duration-[240ms] ease-out-soft"
        style={{
          gridTemplateColumns: citationOpen ? "180px 1fr 460px" : "180px 1fr",
        }}
      >
        <TOC
          sections={brief.sections}
          activeSection={activeSection}
          contradictionCount={contradictionCount}
          hasExternalResearch={externalResearch.length > 0}
          onJump={scrollToSection}
        />

        <article className="min-w-0 max-w-[760px]">
          {brief.sections.map((s, i) => (
            <BriefSectionView
              key={s.id}
              section={s}
              index={i}
              wasRegenerated={false}
              regeneratedAt={undefined}
              sectionRef={(el) => {
                if (el) sectionRefs.current[s.id] = el;
              }}
            />
          ))}

          {/* 09 External Research — only when findings exist */}
          {externalResearch.length > 0 && (
            <div
              id="brief-external-research"
              ref={(el) => { if (el) sectionRefs.current["external-research"] = el; }}
            >
              <ExternalResearchSection
                findings={externalResearch}
                onBringFindingsBack={() => setShowImportPanel(true)}
              />
            </div>
          )}
        </article>

        {citationOpen && <CitationPanel />}
      </div>

      <AskAnything matterId={brief.matterId} />

      {/* ── Living Matters overlays / panels ── */}

      {showAddMaterial && (
        <AddMaterialPanel
          sourceLabel={pendingFile?.name ?? "New source"}
          sourceDetected={pendingFile ? `${pendingFile.type || "File"} · ${Math.round(pendingFile.size / 1024)} KB` : "Document"}
          sourcePreview="First-line text preview will appear here after extraction."
          onClose={() => { setShowAddMaterial(false); setPendingFile(null); }}
          onIngest={() => {
            setShowAddMaterial(false);
            setShowIngesting(true);
          }}
        />
      )}

      {showIngesting && (
        <IngestingPanel
          onDone={() => {
            setShowIngesting(false);
            setShowImpactReport(true);
          }}
        />
      )}

      {showImpactReport && (
        <ImpactReportOverlay
          report={MOCK_IMPACT_REPORT}
          onClose={() => setShowImpactReport(false)}
          onSkip={() => setShowImpactReport(false)}
          onShowChanges={() => {
            setShowImpactReport(false);
            setShowRegenPreview(true);
          }}
          onRegenerate={() => {
            setShowImpactReport(false);
            setShowRegenPreview(true);
          }}
        />
      )}

      {showRegenPreview && (
        <RegenerationPreview
          sections={[
            {
              sectionId: "s-risks",
              sectionKind: "risks",
              title: "Risks & Red Flags",
              summary: "+1 contradicts · +2 adds · 3 supports",
              priorVersionLabel: `Current — v${currentVersion.versionNumber}`,
              nextVersionLabel:  `Proposed — v${currentVersion.versionNumber + 1}`,
              nextRegenDate: new Date().toISOString().slice(0, 10),
              prior: {
                items: [
                  { text: "No signed engagement letter found in the document set.", op: "kept" },
                  { text: "Statute of limitations risk: complaint filed 3 years after alleged injury.", op: "kept" },
                ],
              },
              next: {
                items: [
                  { text: "No signed engagement letter found in the document set.", op: "kept" },
                  { text: "Statute of limitations risk: complaint filed 3 years after alleged injury.", op: "kept" },
                  { text: "Auditor independence compromised by non-audit fee ratio exceeding 40%.", op: "added" },
                  { text: "Side letter contradicts Form 10-K disclosure on SPE consolidation treatment.", op: "added" },
                ],
              },
            },
          ]}
          onClose={() => setShowRegenPreview(false)}
          onCommit={() => setShowRegenPreview(false)}
        />
      )}

      {showVersionHistory && (
        <VersionHistoryDrawer
          versions={versions}
          viewingId={viewingId}
          latestId={latestId}
          onClose={() => setShowVersionHistory(false)}
          onJump={(id) => { setViewingId(id); setShowVersionHistory(false); }}
          onRestoreAsCurrent={(id) => { setViewingId(latestId); setShowVersionHistory(false); }}
        />
      )}

      {/* ── Research Handoff overlays / panels ── */}

      {showConsent && (
        <ConsentAffirmationModal
          onClose={() => setShowConsent(false)}
          onAffirm={() => {
            setConsentGiven(true);
            setShowConsent(false);
            setShowHandoffComposer(true);
          }}
        />
      )}

      {showHandoffComposer && (
        <HandoffComposer
          matterId={brief.matterId}
          pseudonyms={MOCK_PSEUDONYMS}
          risks={MOCK_RISKS}
          briefSnapshotText={sc ? `Matter type: ${sc.matterTypeGuess}. ${sc.documentCount} documents spanning ${sc.dateRange?.from ?? ""} to ${sc.dateRange?.to ?? ""}.` : ""}
          onClose={() => setShowHandoffComposer(false)}
          onCopyComplete={() => setShowHandoffComposer(false)}
        />
      )}

      {showImportPanel && (
        <ResearchImportPanel
          onClose={() => setShowImportPanel(false)}
          onSave={() => setShowImportPanel(false)}
          pseudonyms={MOCK_PSEUDONYMS}
        />
      )}

      {/* ── Matter Quality panel ── */}
      <MatterQualityPanel
        matterId={brief.matterId}
        open={showQuality}
        onClose={() => setShowQuality(false)}
        onJumpToSection={scrollToSection}
      />
    </div>
    </ReviewedClaimsProvider>
  );
}

// ─── TOC ──────────────────────────────────────────────────────────────────────

function TOC({
  sections,
  activeSection,
  contradictionCount,
  hasExternalResearch,
  onJump,
}: {
  sections: BriefSection[];
  activeSection: string | null;
  contradictionCount: number;
  hasExternalResearch: boolean;
  onJump: (id: string) => void;
}) {
  return (
    <nav className="sticky top-20 self-start max-h-[calc(100vh-120px)] overflow-y-auto pb-5">
      <div className="text-micro mb-3">Brief</div>
      <div className="flex flex-col gap-0.5">
        {sections.map((s, i) => (
          <a
            key={s.id}
            href={`#brief-${s.id}`}
            onClick={(e) => { e.preventDefault(); onJump(s.id); }}
            data-active={activeSection === s.id || undefined}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-[13px]
                       text-ink-3 border-l-2 border-transparent transition-all duration-[120ms]
                       hover:text-ink hover:bg-surface-2
                       data-[active]:text-ink data-[active]:font-medium
                       data-[active]:border-l-navy data-[active]:bg-surface-2"
          >
            <span className="font-mono-sm text-[11px] text-ink-4 w-3.5 shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="truncate">{TOC_LABEL[s.kind]}</span>
            {s.kind === "risks" && contradictionCount > 0 && (
              <span className="size-1.5 rounded-full bg-brick ml-auto shrink-0" />
            )}
          </a>
        ))}
        {/* External Research — only if findings exist */}
        {hasExternalResearch && (
          <a
            href="#brief-external-research"
            onClick={(e) => { e.preventDefault(); onJump("external-research"); }}
            data-active={activeSection === "external-research" || undefined}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-[13px]
                       text-ink-3 border-l-2 border-transparent transition-all duration-[120ms]
                       hover:text-ink hover:bg-surface-2
                       data-[active]:text-ink data-[active]:font-medium
                       data-[active]:border-l-navy data-[active]:bg-surface-2"
          >
            <span className="font-mono-sm text-[11px] text-ink-4 w-3.5 shrink-0">09</span>
            <span className="truncate">Ext. Research</span>
          </a>
        )}
      </div>
      <div className="h-px bg-rule my-6" />
      <div className="text-small text-ink-3 leading-[1.5] px-3">
        Press{" "}
        <kbd className="font-mono-sm px-1 py-px rounded border border-rule text-ink-3">j</kbd>
        {" · "}
        <kbd className="font-mono-sm px-1 py-px rounded border border-rule text-ink-3">k</kbd>
        {" "}in the citation panel to step through sources.
      </div>
    </nav>
  );
}

// ─── Section container ────────────────────────────────────────────────────────

function BriefSectionView({
  section,
  index,
  wasRegenerated,
  regeneratedAt,
  sectionRef,
}: {
  section: BriefSection;
  index: number;
  wasRegenerated: boolean;
  regeneratedAt: string | undefined;
  sectionRef: (el: HTMLElement | null) => void;
}) {
  return (
    <section
      ref={sectionRef}
      id={`brief-${section.id}`}
      className="mb-14 scroll-mt-24"
    >
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="text-h2 m-0">
          <span className="font-mono-sm text-ink-4 mr-3 font-normal">
            {String(index + 1).padStart(2, "0")}
          </span>
          {SECTION_LABEL[section.kind]}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {/* UpdatedTag — shown for regenerated sections */}
          {wasRegenerated && regeneratedAt && (
            <UpdatedTag at={regeneratedAt} />
          )}
          {section.suppressedCount > 0 && (
            <span className="text-micro text-ink-4" title="Claims dropped by re-grounding pass">
              {section.suppressedCount} suppressed
            </span>
          )}
        </div>
      </div>
      <SectionContent section={section} />
    </section>
  );
}

function SectionContent({ section }: { section: BriefSection }) {
  switch (section.kind) {
    case "snapshot":
      return <SnapshotRenderer section={section} />;
    case "parties":
      return <PartiesRenderer section={section} />;
    case "timeline":
      return <TimelineRenderer section={section as TimelineSection} />;
    case "claims":
      return <ClaimsRenderer items={section.content.claims} />;
    case "key_facts":
      return <KeyFactsRenderer section={section as KeyFactsSection} />;
    case "risks":
      return <RisksRenderer section={section as RisksSection} />;
    case "open_questions":
      return <OpenQuestionsRenderer items={section.content.questions} />;
    case "next_steps":
      return <NextStepsRenderer items={section.content.steps} />;
  }
}

// ─── Block renderers ──────────────────────────────────────────────────────────

function SnapshotRenderer({ section }: { section: MatterSnapshotSection }) {
  const c = section.content;
  return (
    <dl className="grid grid-cols-[180px_1fr] gap-y-2.5 gap-x-6 mb-5">
      <dt className="text-small text-ink-3">Matter type</dt>
      <dd className="text-body text-ink m-0">{c.matterTypeGuess}</dd>
      {c.jurisdiction && (
        <>
          <dt className="text-small text-ink-3">Jurisdiction</dt>
          <dd className="text-body text-ink m-0">{c.jurisdiction}</dd>
        </>
      )}
      <dt className="text-small text-ink-3">Documents</dt>
      <dd className="text-body text-ink m-0 font-mono-sm">{c.documentCount}</dd>
      <dt className="text-small text-ink-3">Date range</dt>
      <dd className="text-body text-ink m-0 font-mono-sm">
        {c.dateRange.from} – {c.dateRange.to}
      </dd>
      {c.parties.length > 0 && (
        <>
          <dt className="text-small text-ink-3">Parties</dt>
          <dd className="text-body text-ink m-0">{c.parties.join(", ")}</dd>
        </>
      )}
    </dl>
  );
}

function PartiesRenderer({ section }: { section: PartiesSection }) {
  const rows = section.content.parties;
  if (rows.length === 0) return <Empty>No parties extracted yet.</Empty>;
  return (
    <div className="flex flex-col gap-2 mb-5">
      {rows.map((p, i) => (
        <PartyCard key={i} party={p} index={i + 1} />
      ))}
    </div>
  );
}

function PartyCard({ party, index }: { party: PartyRow; index: number }) {
  const init = party.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-4 p-3 px-4 bg-surface border border-rule rounded-lg">
      <div className="size-8 rounded-full bg-navy-soft text-navy
                      grid place-items-center font-serif italic font-medium text-sm shrink-0">
        {init}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="font-medium text-[14.5px]">{party.name}</div>
        <div className="text-small text-ink-3 capitalize">
          {party.role.replace("_", " ")}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <FootnoteChip citation={party.firstAppearance} index={index} />
      </div>
    </div>
  );
}

function TimelineRenderer({ section }: { section: TimelineSection }) {
  const events = section.content.events;
  if (events.length === 0) return <Empty>No dated events extracted yet.</Empty>;
  return (
    <ol className="list-none p-0 m-0 mb-5">
      {events.map((ev, i) => (
        <TimelineRow key={ev.id} event={ev} index={i + 1} isLast={i === events.length - 1} />
      ))}
    </ol>
  );
}

function TimelineRow({
  event,
  index,
  isLast,
}: {
  event: TimelineEvent;
  index: number;
  isLast: boolean;
}) {
  return (
    <li className="flex items-start gap-4 relative pb-3.5">
      <span className="font-mono-sm text-[12.5px] text-ink-2 w-[100px] shrink-0 pt-px">
        {event.date}
      </span>
      <span className="size-2.5 rounded-full bg-navy mt-[7px] z-10 shrink-0
                       shadow-[0_0_0_3px_var(--paper)]" />
      <div
        className={cn(
          "flex-1 pl-3.5 -ml-1.5",
          !isLast && "border-l border-rule",
        )}
      >
        <span className="prose-brief text-[15px]">
          {event.description}
          <FootnotesInline citations={[{ citation: event.citation, index }]} />
        </span>
        {event.conflictsWith && event.conflictsWith.length > 0 && (
          <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded bg-brick-soft text-brick text-xs font-medium">
            contradiction
          </span>
        )}
      </div>
    </li>
  );
}

function ClaimsRenderer({ items }: { items: ClaimItem[] }) {
  if (items.length === 0) return <Empty>No claims surfaced yet.</Empty>;
  return (
    <ul className="pl-0 m-0 mb-5 list-none flex flex-col gap-3">
      {items.map((c, i) => (
        <li key={i} className="flex flex-col gap-1.5 p-4 rounded-md border border-rule bg-surface">
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
              c.status === "asserted"
                ? "bg-navy-soft text-navy"
                : "bg-surface-3 text-ink-3",
            )}>
              {c.status}
            </span>
            <span className="font-medium text-[14.5px] text-ink">{c.label}</span>
            <FootnotesInline citations={[{ citation: c.citation, index: i + 1 }]} />
          </div>
          <p className="prose-brief text-[15px] m-0">{c.text}</p>
        </li>
      ))}
    </ul>
  );
}

function KeyFactsRenderer({ section }: { section: KeyFactsSection }) {
  const facts = section.content.facts;
  if (facts.length === 0) return <Empty>No key facts extracted yet.</Empty>;
  return (
    <ul className="pl-0 m-0 mb-5 list-none">
      {facts.map((f, i) => (
        <li key={i} className="prose-brief flex items-start gap-3 mb-2.5">
          <span className="text-ink-4 mt-[11px] leading-none shrink-0">—</span>
          <span>
            {f.text}
            <FootnotesInline citations={[{ citation: f.citation, index: i + 1 }]} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function RisksRenderer({ section }: { section: RisksSection }) {
  const risks = section.content.risks;
  if (risks.length === 0) return <Empty>No risks flagged.</Empty>;

  const contradictions: Contradiction[] = [];
  const nonContradictions = risks.filter((r) => r.kind !== "contradiction");

  return (
    <>
      <ContradictionsPanel contradictions={contradictions} />
      {nonContradictions.length === 0 && contradictions.length === 0 && (
        <Empty>No risks flagged.</Empty>
      )}
      {nonContradictions.length > 0 && (
        <ul className="pl-0 m-0 mb-5 list-none">
          {nonContradictions.map((r, i) => (
            <RiskRow key={i} risk={r} index={i + 1} />
          ))}
        </ul>
      )}
    </>
  );
}

function RiskRow({ risk, index }: { risk: RiskItem; index: number }) {
  const kindLabel = risk.kind.replace(/_/g, " ");
  const isContradiction = risk.kind === "contradiction";
  return (
    <li className="prose-brief flex items-start gap-3 mb-2.5">
      <span className="text-ink-4 mt-[11px] leading-none shrink-0">—</span>
      <span className="flex-1">
        <span className={cn(
          "inline-flex items-center mr-2 px-1.5 py-px rounded text-xs font-medium capitalize",
          isContradiction
            ? "bg-brick-soft text-brick"
            : "bg-surface-3 text-ink-3",
        )}>
          {kindLabel}
        </span>
        {risk.text}
        <FootnotesInline citations={[{ citation: risk.citation, index }]} />
      </span>
    </li>
  );
}

function OpenQuestionsRenderer({ items }: { items: OpenQuestion[] }) {
  if (items.length === 0) return <Empty>No open questions.</Empty>;
  return (
    <ul className="pl-0 m-0 mb-5 list-none">
      {items.map((q, i) => (
        <li key={i} className="prose-brief flex items-start gap-3 mb-2.5">
          <span className="text-ink-4 mt-[11px] leading-none shrink-0">—</span>
          <span className="flex-1">
            <span className="inline-flex items-center mr-2 px-1.5 py-px rounded bg-surface-3 text-ink-3 text-xs font-medium capitalize">
              {q.kind.replace(/_/g, " ")}
            </span>
            {q.text}
            {q.citation && (
              <FootnotesInline citations={[{ citation: q.citation, index: i + 1 }]} />
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function NextStepsRenderer({ items }: { items: NextStep[] }) {
  if (items.length === 0) return <Empty>No suggested next steps yet.</Empty>;
  return (
    <ul className="pl-0 m-0 mb-5 list-none">
      {items.map((s, i) => (
        <li key={i} className="prose-brief flex items-start gap-3 mb-2.5">
          <span className="text-ink-4 mt-[11px] leading-none shrink-0">—</span>
          <span className="flex-1">
            <span className="inline-flex items-center mr-2 px-1.5 py-px rounded bg-surface-3 text-ink-3 text-xs font-medium capitalize">
              {s.kind.replace(/_/g, " ")}
            </span>
            {s.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-small text-ink-4 italic m-0">{children}</p>;
}

// ─── Footnote chips ───────────────────────────────────────────────────────────

function FootnotesInline({
  citations,
}: {
  citations: { citation: Citation; index: number }[];
}) {
  return (
    <span className="inline-flex gap-0.5 ml-0.5 align-baseline">
      {citations.map(({ citation, index }) => (
        <FootnoteChip key={citation.id} citation={citation} index={index} />
      ))}
    </span>
  );
}

function FootnoteChip({
  citation,
  index,
  claimId,
}: {
  citation: Citation;
  index: number;
  claimId?: ClaimId;
}) {
  const open = useCitationPanel((s) => s.open);
  const activeCitation = useCitationPanel((s) => s.citation);
  const isActive = activeCitation?.id === citation.id;
  const { reviewed, mark, toggle } = useReviewedClaims();
  const isReviewed = claimId ? reviewed.has(claimId) : false;

  return (
    <button
      type="button"
      className="fn-chip"
      data-active={isActive || undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (claimId) mark(claimId, "source_view");
        open(citation);
      }}
      title={`Source ${index}`}
    >
      {index}
      {claimId && (
        <ReviewedStateDot
          reviewed={isReviewed}
          onToggle={(e) => { e.stopPropagation(); toggle(claimId); }}
        />
      )}
    </button>
  );
}

export { FootnoteChip };
