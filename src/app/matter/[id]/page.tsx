import BriefView from "@/components/brief/BriefView";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Brief } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MatterPage({ params }: PageProps) {
  const { id } = await params;
  const briefPath = join(
    process.env.DOCKET_DATA_DIR ?? "./data/matters",
    id,
    "brief.json",
  );

  let brief: Brief | null = null;
  try {
    brief = JSON.parse(await readFile(briefPath, "utf-8")) as Brief;
  } catch {
    /* no brief yet */
  }

  if (!brief) {
    return (
      <div className="max-w-[1280px] mx-auto px-7 pt-16 text-center">
        <div className="text-micro mb-3">No brief yet</div>
        <p className="text-body text-ink-3 max-w-[400px] mx-auto">
          Run <code className="font-mono-sm bg-surface-3 px-1.5 py-0.5 rounded">pnpm tsx scripts/brief.ts</code> to generate
          the brief for this matter.
        </p>
      </div>
    );
  }

  return <BriefView brief={brief} />;
}
