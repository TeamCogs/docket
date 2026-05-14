import Link from "next/link";
import DropZone from "@/components/library/DropZone";
import MatterCard from "@/components/library/MatterCard";
import type { MatterSummary } from "@/lib/types";

// In production this is fetched from the Tauri IPC layer (or a Node API route
// in browser-dev mode). For scaffolding we render one mock matter so the
// shape and responsive layout can be validated immediately.
const MOCK_MATTERS: MatterSummary[] = [
  {
    id: "demo-enron",
    name: "Enron — first read",
    createdAt: new Date().toISOString(),
    docCount: 62,
    status: "ready",
    matterTypeGuess: "Securities enforcement",
    matterTypeConfidence: "high",
    dateRangeCovered: { from: "1999-01-01", to: "2002-06-30" },
  },
];

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="font-sans text-2xl sm:text-3xl tracking-tight font-semibold text-ink-900">
          Matters
        </h1>
        <p className="text-ink-600 text-sm sm:text-base max-w-prose">
          Drag a folder of client documents here. Docket reads them locally,
          builds a cited summary brief, and shows you the source paragraph
          behind every claim. Nothing leaves this machine.
        </p>
      </header>

      <DropZone />

      <section className="space-y-3">
        <h2 className="font-sans text-sm font-medium uppercase tracking-wider text-ink-500">
          Recent matters
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_MATTERS.map((m) => (
            <Link key={m.id} href={`/matter/${m.id}`}>
              <MatterCard matter={m} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
