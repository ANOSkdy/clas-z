import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { ReviewDecisionSchema } from "@/lib/schemas";

const ParamsSchema = z.object({
  documentId: z.string().uuid("documentId must be UUID"),
});

type RouteContext = { params: { documentId: string } | Promise<{ documentId: string }> };

export const runtime = "nodejs";

export async function POST(req: Request, context: RouteContext) {
  const correlationId = randomUUID();
  try {
    const { documentId } = ParamsSchema.parse(await context.params);
    const body = await req.json();
    const decision = ReviewDecisionSchema.parse(body);
    // TODO: Airtable documents を rejected に更新
    return NextResponse.json({ ok: true, documentId, reason: decision.reason, correlationId }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: error.issues[0]?.message ?? "Invalid payload",
          },
          correlationId,
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message,
        },
        correlationId,
      },
      { status: 500 },
    );
  }
}
