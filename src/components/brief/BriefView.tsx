"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCitationPanel } from "./citation-panel-store";
import CitationPanel from "./CitationPanel";
import ContradictionsPanel from "./ContradictionsPanel";
import type { Contradiction } from "./ContradictionsPanel";
import AskAnything from "../AskAnything";
import type {
  Brief,
  BriefSection,
  BriefSectionKind,
  Citation,
  ClaimItem,
  KeyFactsSection,
  MatterSnapshotSection,
  NextStep,
  OpenQuestion,
  PartiesSection,
  PartyRow,
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

// ─── Main export ──────────────────────────────────────────────────────────────

export default function BriefView({ brief }: { brief: Brief }) {
  const citationOpen = useCitationPanel((s) => s.isOpen);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement>>({});

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

  return (
    <>
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
            <h1 className="text-h1 m-0">{caption}</h1>
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
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rule-strong
                         bg-surface text-sm text-ink hover:bg-surface-2 transition-colors duration-[120ms]"
            >
              <FileText className="size-3.5" />
              Export PDF
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-md border border-rule-strong bg-surface text-sm text-ink
                         hover:bg-surface-2 transition-colors duration-[120ms]"
            >
              Regenerate
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
          onJump={scrollToSection}
        />

        <article className="min-w-0 max-w-[760px]">
          {brief.sections.map((s, i) => (
            <BriefSectionView
              key={s.id}
              section={s}
              index={i}
              sectionRef={(el) => {
                if (el) sectionRefs.current[s.id] = el;
              }}
            />
          ))}
        </article>

        {/* CitationPanel occupies the 3rd grid column when open.
            The component still renders fixed for now; CitationPanel.md will
            convert it to in-grid positioning. */}
        {citationOpen && <CitationPanel />}
      </div>

      <AskAnything matterId={brief.matterId} />
    </>
  );
}

// ─── TOC ──────────────────────────────────────────────────────────────────────

function TOC({
  sections,
  activeSection,
  contradictionCount,
  onJump,
}: {
  sections: BriefSection[];
  activeSection: string | null;
  contradictionCount: number;
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
  sectionRef,
}: {
  section: BriefSection;
  index: number;
  sectionRef: (el: HTMLElement | null) => void;
}) {
  return (
    <section
      ref={sectionRef}
      id={`brief-${section.id}`}
      className="mb-14 scroll-mt-24"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-h2 m-0">
          <span className="font-mono-sm text-ink-4 mr-3 font-normal">
            {String(index + 1).padStart(2, "0")}
          </span>
          {SECTION_LABEL[section.kind]}
        </h2>
        {section.suppressedCount > 0 && (
          <span className="text-micro text-ink-4" title="Claims dropped by re-grounding pass">
            {section.suppressedCount} suppressed
          </span>
        )}
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

  // Contradiction risks are surfaced in ContradictionsPanel; the remaining
  // risks render as the prose list below it.
  // The richer Contradiction type will be populated once the pipeline
  // attaches it to the section payload. Until then the panel receives [].
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
}: {
  citation: Citation;
  index: number;
}) {
  const open = useCitationPanel((s) => s.open);
  const activeCitation = useCitationPanel((s) => s.citation);
  const isActive = activeCitation?.id === citation.id;

  return (
    <button
      type="button"
      className="fn-chip"
      data-active={isActive || undefined}
      onClick={(e) => { e.stopPropagation(); open(citation); }}
      title={`Source ${index}`}
    >
      {index}
    </button>
  );
}

// Keep old CitationFootnote export shape so the file can still be imported
// from other modules during migration. BriefView uses FootnoteChip directly.
export { FootnoteChip };
