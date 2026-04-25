import { NextRequest } from "next/server";
import { z } from "zod";
import { runAgent } from "@/lib/agent";
import type { ChatTurn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.any()).optional().default([]),
});

function sse(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return new Response(
      JSON.stringify({ kind: "error", message: "Invalid request body." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({
        kind: "error",
        message: "Sandigan is not configured. Set GROQ_API_KEY in your environment.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  (async () => {
    try {
      const result = await runAgent(
        body.message,
        (body.history as ChatTurn[]) ?? [],
        (stage) => writer.write(sse({ type: "stage", stage })),
      );
      await writer.write(sse({ type: "done", result }));
    } catch (err) {
      console.error("[/api/agent] unhandled", err);
      await writer.write(
        sse({
          type: "done",
          result: { kind: "error", message: "Unexpected error. Please try again." },
        }),
      );
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
