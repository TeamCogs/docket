/**
 * Browser-dev ingestion endpoint. Real Tauri build uses an IPC command
 * instead of HTTP.
 *
 * Accepts: { folder: string, matterId: string, matterName: string }
 * Returns: streamed JSON progress lines.
 */

import { ingestFolder } from "@/lib/ingest";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { folder, matterId, matterName } = (await req.json()) as {
    folder: string;
    matterId: string;
    matterName: string;
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await ingestFolder(matterId, matterName, folder, (p) => {
          controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", ...p }) + "\n"));
        });
        controller.enqueue(encoder.encode(JSON.stringify({ type: "done", ...result }) + "\n"));
      } catch (err) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "error", message: (err as Error).message }) + "\n"),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
