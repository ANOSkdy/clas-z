import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getRecord, updateRecord } from "@/lib/airtable";
import { getCurrentContext } from "@/lib/auth";
import { trackEvent } from "@/lib/events";
import { requestRatingRecompute } from "@/lib/rating";
import { ConfirmRequestSchema } from "@/lib/schemas/review";
import { DOCUMENTS_TABLE } from "../../utils";

const ParamsSchema = z.object({
  documentId: z.string().min(1, "documentId is required"),
});

export const runtime = "nodejs";

type RouteContext = { params: { documentId: string } | Promise<{ documentId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const correlationId = randomUUID();
  try {
    const { documentId } = ParamsSchema.parse(await context.params);
    const body = req.headers.get("content-length") ? await req.json() : undefined;
    const payload = ConfirmRequestSchema.parse(body ?? {});
    const now = new Date().toISOString();
    const docRecord = await getRecord(DOCUMENTS_TABLE, documentId);
    const companyId = docRecord.fields.CompanyId ?? null;
    const authContext = await getCurrentContext(req);

    await updateRecord(DOCUMENTS_TABLE, documentId, {
      Status: "confirmed",
      UpdatedAt: now,
      RejectReason: null,
      Note: payload.note ?? null,
    });

    if (companyId) {
      await trackEvent({
        companyId,
        userId: authContext.userId ?? undefined,
        type: "review.confirmed",
        source: "/api/review/[documentId]/confirm",
        correlationId,
        payload: { documentId },
      });
    }

    requestRatingRecompute({ scope: "document", documentId, reason: "review.confirmed" }, correlationId);

    return NextResponse.json(
      { ok: true, status: "confirmed", correlationId },
      { headers: { "x-correlation-id": correlationId } },
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: error.issues[0]?.message ?? "Invalid request",
          },
          correlationId,
        },
        { status: 400, headers: { "x-correlation-id": correlationId } },
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
      { status: 500, headers: { "x-correlation-id": correlationId } },
    );
  }
}
