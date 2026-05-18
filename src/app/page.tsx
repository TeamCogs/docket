"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import MatterCard, { NewMatterCard } from "@/components/library/MatterCard";
import { useReadOnly } from "@/lib/license-store";
import type { MatterSummary } from "@/lib/types";

const MOCK_MATTERS: MatterSummary[] = [
  {
    id: "demo-enron",
    name: "Enron — first read",
    createdAt: new Date("2024-02-14").toISOString(),
    docCount: 62,
    status: "ready",
    matterTypeGuess: "Securities enforcement",
    matterTypeConfidence: "high",
    dateRangeCovered: { from: "1999-01-01", to: "2002-06-30" },
  },
];

export default function LibraryPage() {
  const router = useRouter();
  const readOnly = useReadOnly();

  const totalDocs = MOCK_MATTERS.reduce((sum, m) => sum + m.docCount, 0);

  return (
    <div className="max-w-[1280px] mx-auto px-7 pt-9 pb-20">
      {/* Page header */}
      <div className="flex items-start justify-between mb-9">
        <div className="max-w-[640px]">
          <div className="text-micro mb-2.5">Library</div>
          <h1 className="text-display m-0">Your matters</h1>
          <p className="text-body text-ink-2 mt-3.5 leading-[1.6] max-w-[580px]">
            Each matter is a folder on this machine. Docket reads it locally,
            builds a cited first-read brief, and shows the source paragraph
            behind every claim.
          </p>
        </div>
        <button
          type="button"
          disabled={readOnly}
          onClick={() => router.push("/new-matter")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md
                     bg-navy text-white text-sm font-[450]
                     hover:bg-navy-2 transition-colors duration-[120ms]
                     disabled:opacity-55 disabled:cursor-not-allowed"
          title={readOnly ? "Requires an active license · Renew" : undefined}
        >
          <Plus className="size-4" />
          New matter
        </button>
      </div>

      {/* Grid */}
      {MOCK_MATTERS.length === 0 ? (
        <div className="max-w-[420px]">
          <NewMatterCard
            disabled={readOnly}
            onClick={() => router.push("/new-matter")}
          />
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
          {MOCK_MATTERS.map((m) => (
            <MatterCard key={m.id} matter={m} />
          ))}
          <NewMatterCard
            disabled={readOnly}
            onClick={() => router.push("/new-matter")}
          />
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center gap-4 mt-8 pt-4 border-t border-rule text-[12.5px] text-ink-3">
        <span className="font-mono-sm">{MOCK_MATTERS.length} matters</span>
        <span>·</span>
        <span>~{totalDocs.toLocaleString()} documents indexed locally</span>
        <span className="ml-auto font-mono-sm">
          ~/Library/Application Support/Docket/matters/
        </span>
      </div>
    </div>
  );
}
