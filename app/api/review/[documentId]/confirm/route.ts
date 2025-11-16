import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

const ParamsSchema = z.object({
  documentId: z.string().uuid("documentId must be UUID"),
});

export const runtime = "nodejs";

type RouteContext = { params: { documentId: string } | Promise<{ documentId: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const correlationId = randomUUID();
  try {
    const { documentId } = ParamsSchema.parse(await context.params);
    // TODO: Airtable の JournalEntries/Tasks を更新
    return NextResponse.json({ ok: true, documentId, correlationId }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: error.issues[0]?.message ?? "Invalid documentId",
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
