import { generateBrief } from "@/lib/generate";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { matterId, matterName } = (await req.json()) as {
    matterId: string;
    matterName: string;
  };
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const brief = await generateBrief({
          matterId,
          matterName,
          onSectionReady: (section) => {
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: "section", section }) + "\n"),
            );
          },
        });
        controller.enqueue(encoder.encode(JSON.stringify({ type: "done", brief }) + "\n"));
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
