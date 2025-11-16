import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { updateRecord } from "@/lib/airtable";
import { RejectRequestSchema } from "@/lib/schemas/review";
import { DOCUMENTS_TABLE } from "../../utils";

const ParamsSchema = z.object({
  documentId: z.string().min(1, "documentId is required"),
});

type RouteContext = { params: { documentId: string } | Promise<{ documentId: string }> };

export const runtime = "nodejs";

export async function POST(req: Request, context: RouteContext) {
  const correlationId = randomUUID();
  try {
    const { documentId } = ParamsSchema.parse(await context.params);
    const body = await req.json();
    const decision = RejectRequestSchema.parse(body);
    const now = new Date().toISOString();

    await updateRecord(DOCUMENTS_TABLE, documentId, {
      Status: "rejected",
      RejectReason: decision.reason,
      UpdatedAt: now,
    });

    return NextResponse.json(
      { ok: true, status: "rejected", correlationId },
      { headers: { "x-correlation-id": correlationId } },
    );
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
