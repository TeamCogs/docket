"use client";

import type {
  Brief,
  BriefSection,
  Claim,
  MatterSnapshotSection,
  NextStep,
  OpenQuestion,
  PartyRow,
  ClaimItem,
  RiskItem,
  TimelineEvent,
} from "@/lib/types";
import CitationFootnote from "./CitationFootnote";
import CitationPanel from "./CitationPanel";
import { cn } from "@/lib/utils";

/**
 * The main brief surface. Responsive:
 *   - Mobile: single column, sections collapsible with the Snapshot expanded.
 *   - Tablet/desktop: single column with a wider max-width and a slide-in
 *     citation panel from the right.
 *
 * Sections render in the order specified by the spec. Each section maps to
 * a small renderer below. The renderers are intentionally simple — the
 * complexity belongs in lib/generate.ts, not here.
 */
export default function BriefView({ brief }: { brief: Brief }) {
  return (
    <div className="mx-auto max-w-brief px-4 sm:px-6 py-6 sm:py-10 prose-brief space-y-10">
      {brief.sections.map((s) => (
        <SectionWrapper key={s.id} section={s}>
          {renderSection(s)}
        </SectionWrapper>
      ))}
      <CitationPanel />
    </div>
  );
}

function SectionWrapper({
  section,
  children,
}: {
  section: BriefSection;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3" aria-labelledby={`sec-${section.id}`}>
      <header className="flex items-baseline justify-between gap-3 border-b border-ink-200 pb-1">
        <h2 id={`sec-${section.id}`} className="font-sans text-lg sm:text-xl font-semibold tracking-tight">
          {SECTION_TITLES[section.kind]}
        </h2>
        {section.suppressedCount > 0 && (
          <span className="text-xs text-ink-400" title="Ungrounded claims dropped by the re-grounding pass">
            {section.suppressedCount} suppressed
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

const SECTION_TITLES: Record<BriefSection["kind"], string> = {
  snapshot: "Matter Snapshot",
  parties: "Parties & Roles",
  timeline: "Timeline of Material Events",
  claims: "Claims, Causes of Action & Defenses",
  key_facts: "Key Facts & Admissions",
  risks: "Risks, Red Flags & Adverse Facts",
  open_questions: "Open Questions",
  next_steps: "Suggested Next Steps",
};

function renderSection(s: BriefSection): React.ReactNode {
  switch (s.kind) {
    case "snapshot":
      return <SnapshotRenderer section={s} />;
    case "parties":
      return <PartiesRenderer rows={s.content.parties} />;
    case "timeline":
      return <TimelineRenderer events={s.content.events} />;
    case "claims":
      return <ClaimsRenderer items={s.content.claims} />;
    case "key_facts":
      return <KeyFactsRenderer facts={s.content.facts} />;
    case "risks":
      return <RisksRenderer items={s.content.risks} />;
    case "open_questions":
      return <OpenQuestionsRenderer items={s.content.questions} />;
    case "next_steps":
      return <NextStepsRenderer items={s.content.steps} />;
  }
}

// ─── renderers ───────────────────────────────────────────────────────────────

function SnapshotRenderer({ section }: { section: MatterSnapshotSection }) {
  const c = section.content;
  return (
    <div className="grid sm:grid-cols-2 gap-3 not-prose">
      <Stat label="Matter type" value={c.matterTypeGuess} chip={c.matterTypeConfidence} />
      <Stat label="Jurisdiction" value={c.jurisdiction ?? "—"} />
      <Stat label="Documents" value={String(c.documentCount)} />
      <Stat
        label="Date range"
        value={c.dateRange.from && c.dateRange.to ? `${c.dateRange.from} – ${c.dateRange.to}` : "—"}
      />
    </div>
  );
}

function Stat({ label, value, chip }: { label: string; value: string; chip?: "high" | "medium" | "low" }) {
  return (
    <div className="card p-3">
      <div className="text-xs uppercase tracking-wider text-ink-500 font-medium">{label}</div>
      <div className="mt-1 flex items-center gap-2 font-sans text-ink-900 text-sm">
        <span>{value}</span>
        {chip && (
          <span
            className={cn(
              "chip",
              chip === "high" && "chip-grounded",
              chip === "low" && "chip-flag",
              chip === "medium" && "chip-neutral",
            )}
          >
            {chip}
          </span>
        )}
      </div>
    </div>
  );
}

function PartiesRenderer({ rows }: { rows: PartyRow[] }) {
  if (rows.length === 0) return <Empty>No parties extracted yet.</Empty>;
  return (
    <div className="not-prose overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-ink-500">
          <tr>
            <th className="py-2 pr-3 font-medium">Name</th>
            <th className="py-2 pr-3 font-medium">Role</th>
            <th className="py-2 font-medium">First appearance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map((p, i) => (
            <tr key={i}>
              <td className="py-2 pr-3 font-medium text-ink-900">{p.name}</td>
              <td className="py-2 pr-3 text-ink-700 capitalize">{p.role.replace("_", " ")}</td>
              <td className="py-2 text-ink-700">
                <CitationFootnote citation={p.firstAppearance} index={i + 1} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimelineRenderer({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return <Empty>No dated events extracted yet.</Empty>;
  return (
    <ol className="not-prose space-y-3 border-l-2 border-ink-200 pl-4">
      {events.map((e, i) => (
        <li key={e.id} className="relative pl-2">
          <span className="absolute -left-[1.4rem] top-1.5 size-2 rounded-full bg-navy-500" aria-hidden />
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <time className="tabular-nums text-sm font-medium text-ink-900">{e.date}</time>
            <span className="text-ink-800">{e.description}</span>
            <CitationFootnote citation={e.citation} index={i + 1} />
            {e.conflictsWith?.length && (
              <span className="chip-flag">contradiction</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ClaimsRenderer({ items }: { items: ClaimItem[] }) {
  if (items.length === 0) return <Empty>No claims surfaced yet.</Empty>;
  return (
    <ul className="not-prose space-y-3">
      {items.map((c, i) => (
        <li key={i} className="card p-3">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "chip",
                c.status === "asserted" ? "chip-neutral" : "chip-flag",
              )}
            >
              {c.status}
            </span>
            <span className="font-sans font-medium text-ink-900">{c.label}</span>
            <CitationFootnote citation={c.citation} index={i + 1} />
          </div>
          <p className="mt-1 text-sm text-ink-700 font-serif leading-relaxed">{c.text}</p>
        </li>
      ))}
    </ul>
  );
}

function KeyFactsRenderer({ facts }: { facts: Claim[] }) {
  if (facts.length === 0) return <Empty>No key facts extracted yet.</Empty>;
  return (
    <ul className="space-y-2">
      {facts.map((f, i) => (
        <li key={i}>
          {f.text}
          <CitationFootnote citation={f.citation} index={i + 1} />
        </li>
      ))}
    </ul>
  );
}

function RisksRenderer({ items }: { items: RiskItem[] }) {
  if (items.length === 0) return <Empty>No risks flagged.</Empty>;
  return (
    <ul className="not-prose space-y-2">
      {items.map((r, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="chip-flag mt-0.5 capitalize">{r.kind.replace("_", " ")}</span>
          <div className="flex-1">
            <span className="text-ink-800">{r.text}</span>
            <CitationFootnote citation={r.citation} index={i + 1} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function OpenQuestionsRenderer({ items }: { items: OpenQuestion[] }) {
  if (items.length === 0) return <Empty>No open questions.</Empty>;
  return (
    <ul className="not-prose space-y-2">
      {items.map((q, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="chip-neutral mt-0.5 capitalize">{q.kind.replace("_", " ")}</span>
          <div className="flex-1">
            <span className="text-ink-800">{q.text}</span>
            {q.citation && <CitationFootnote citation={q.citation} index={i + 1} />}
          </div>
        </li>
      ))}
    </ul>
  );
}

function NextStepsRenderer({ items }: { items: NextStep[] }) {
  if (items.length === 0) return <Empty>No suggested next steps yet.</Empty>;
  return (
    <ul className="not-prose space-y-2">
      {items.map((s, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="chip-neutral mt-0.5 capitalize">{s.kind.replace("_", " ")}</span>
          <span className="flex-1 text-ink-800">{s.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm italic text-ink-400">{children}</p>;
}
