import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { classifyDocument } from "@/lib/ai";
import { getRecord, updateRecord } from "@/lib/airtable";
import { getCurrentContext } from "@/lib/auth";
import { trackEvent } from "@/lib/events";
import { requestRatingRecompute } from "@/lib/rating";
import { ClassifyRequestSchema, type DocumentRecordFields } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const requestCorrelation = req.headers.get("x-correlation-id");
  const correlationId = requestCorrelation ?? randomUUID();
  let companyId: string | null = null;
  try {
    const payload = await req.json();
    const input = ClassifyRequestSchema.parse(payload);
    const context = await getCurrentContext(req);
    const documentRecord = await getRecord<DocumentRecordFields>("Documents", input.documentId);
    companyId = documentRecord.fields.CompanyId ?? null;

    if (!companyId) {
      return NextResponse.json(
        { error: { code: "COMPANY_REQUIRED", message: "Document missing company" }, correlationId },
        { status: 400, headers: { "x-correlation-id": correlationId } },
      );
    }

    await trackEvent({
      companyId,
      userId: context.userId ?? undefined,
      type: "ai.classify.started",
      source: "/api/ai/classify",
      correlationId,
      payload: { documentId: input.documentId },
    });

    const result = await classifyDocument(input);
    const now = new Date().toISOString();
    await updateRecord<DocumentRecordFields>("Documents", input.documentId, {
      LatestAiLabel: result.aiLabel,
      LatestAiConfidence: result.confidence,
      ClassifiedAt: now,
      UpdatedAt: now,
      Status: "classified",
    });

    await trackEvent({
      companyId,
      userId: context.userId ?? undefined,
      type: "ai.classify.completed",
      source: "/api/ai/classify",
      correlationId,
      payload: { documentId: input.documentId, confidence: result.confidence },
    });

    requestRatingRecompute(
      { scope: "document", documentId: input.documentId, reason: "ai.classify.completed" },
      correlationId,
    );

    return NextResponse.json({ ...result, correlationId }, { status: 200, headers: { "x-correlation-id": correlationId } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: error.issues[0]?.message ?? "Invalid payload",
          },
          correlationId,
        },
        { status: 400, headers: { "x-correlation-id": correlationId } },
      );
    }

    if (companyId) {
      await trackEvent({
        companyId,
        type: "ai.classify.failed",
        source: "/api/ai/classify",
        correlationId,
        payload: { message },
      });
    }

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
