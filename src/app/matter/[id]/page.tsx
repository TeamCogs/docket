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
      <div className="mx-auto max-w-prose py-10 text-ink-500">
        No brief yet. Run <code>pnpm tsx scripts/brief.ts</code> first.
      </div>
    );
  }

  return <BriefView brief={brief} />;
}
